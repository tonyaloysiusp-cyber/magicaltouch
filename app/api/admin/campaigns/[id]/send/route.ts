import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { campaignEmail, unsubscribeUrlFor } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { firstNameFor } from '@/lib/email/firstName';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Gmail allows ~500 messages a day; keep headroom for account e-mails
// (verification, password reset, welcome) that must never be blocked.
const DAILY_MARKETING_CAP = 400;
// Each call sends one small batch and returns; the Email Center keeps
// calling until done. Never a whole campaign in one web request (§35).
const BATCH = 15;
const PAUSE_MS = 400; // gentle pacing between messages

// POST /api/admin/campaigns/:id/send
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireAdmin(request);
    const { data: c, error } = await supabase.from('email_campaigns').select('*').eq('id', params.id).single();
    if (error || !c) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    if (c.status === 'sent' || c.status === 'cancelled') return NextResponse.json({ done: true, status: c.status });
    if (!c.subject?.trim() || !c.content?.trim()) return NextResponse.json({ error: 'Add a subject and content first.' }, { status: 400 });

    // Only people who opted in and haven't unsubscribed (checked in SQL).
    const { data: recipients, error: rErr } = await supabase.rpc('admin_campaign_recipients', {
      p_verified_only: c.audience === 'verified_subscribers',
    });
    if (rErr) throw rErr;

    // Duplicate prevention: anyone already in this campaign's log is done.
    const { data: logged } = await supabase.from('email_log').select('user_id, status').eq('campaign_id', c.id);
    const done = new Set((logged || []).map((l: any) => l.user_id));
    const remaining = (recipients || []).filter((r: any) => !done.has(r.user_id) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email || ''));

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: sentToday } = await supabase
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .in('status', ['SENT', 'DELIVERED'])
      .gte('sent_at', since);
    const allowance = Math.max(0, DAILY_MARKETING_CAP - (sentToday || 0));

    if (c.status !== 'sending') {
      await supabase
        .from('email_campaigns')
        .update({ status: 'sending', total_recipients: (recipients || []).length, updated_at: new Date().toISOString() })
        .eq('id', c.id);
    }

    let sent = 0;
    let failed = 0;
    for (const r of remaining.slice(0, Math.min(BATCH, allowance))) {
      // Claim first: the unique (campaign_id, user_id) index means a second
      // tab or a retried request can never e-mail the same person twice.
      const { data: claim, error: claimErr } = await supabase
        .from('email_log')
        .insert({ user_id: r.user_id, campaign_id: c.id, email: r.email, email_type: `campaign:${c.campaign_type}`, subject: c.subject, status: 'PROCESSING' })
        .select('id')
        .single();
      if (claimErr || !claim) continue;
      try {
        const message = campaignEmail(
          { subject: c.subject, preheader: c.preheader, content: c.content, imageUrl: c.image_url, ctaLabel: c.cta_label, ctaUrl: c.cta_url },
          { firstName: firstNameFor(r.name, r.email), unsubscribeUrl: unsubscribeUrlFor(r.unsubscribe_token, c.id) },
        );
        const messageId = await sendEmail(r.email, message);
        await supabase.from('email_log').update({ status: 'SENT', sent_at: new Date().toISOString(), provider_message_id: messageId }).eq('id', claim.id);
        sent++;
      } catch (err: any) {
        await supabase.from('email_log').update({ status: 'FAILED', failure_reason: String(err?.message || err).slice(0, 500) }).eq('id', claim.id);
        failed++;
      }
      await new Promise((res) => setTimeout(res, PAUSE_MS));
    }

    const left = remaining.length - sent - failed;
    const { data: totals } = await supabase.from('email_log').select('status').eq('campaign_id', c.id);
    const sentTotal = (totals || []).filter((t: any) => t.status === 'SENT' || t.status === 'DELIVERED').length;
    const failedTotal = (totals || []).filter((t: any) => t.status === 'FAILED').length;
    const finished = left <= 0;
    await supabase
      .from('email_campaigns')
      .update({
        sent_count: sentTotal,
        failed_count: failedTotal,
        status: finished ? (sentTotal === 0 && failedTotal > 0 ? 'failed' : 'sent') : 'sending',
        sent_at: finished ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id);

    return NextResponse.json({
      done: finished,
      sentThisBatch: sent,
      failedThisBatch: failed,
      remaining: Math.max(0, left),
      total: (recipients || []).length,
      paused: !finished && allowance <= sent + failed ? 'The daily sending limit was reached. Sending continues tomorrow — press Send again then.' : null,
    });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Campaign send failed:', err);
    return NextResponse.json({ error: 'Sending failed. Please try again.' }, { status: 500 });
  }
}
