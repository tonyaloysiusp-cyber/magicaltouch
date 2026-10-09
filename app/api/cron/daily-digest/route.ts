import { NextRequest, NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { adminDigestEmail, DigestItem } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/cron/daily-digest -- called every morning by the database's
// own scheduler (pg_cron + pg_net, see migration 0018) right after it
// posts the day's festival and renewal reminders. The private token it
// sends is checked inside the database, so no secret lives in this code.
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token') || '';
  if (!token) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc('cron_digest', { p_token: token });
  if (error || !data) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });

  const messages: DigestItem[] = data.messages || [];
  const contacts: any[] = data.contacts || [];
  const admins: string[] = (data.admins || []).filter(Boolean);
  if (!messages.length && !contacts.length) return NextResponse.json({ sent: 0, reason: 'nothing-new' });
  if (!admins.length) return NextResponse.json({ sent: 0, reason: 'no-admins' });

  const email = adminDigestEmail(
    messages,
    contacts.map((c) => ({ title: c.title, body: c.body, email: c.meta?.email || '', name: c.meta?.name || '' }))
  );
  let sent = 0;
  for (const to of admins) {
    try {
      await sendEmail(to, email);
      sent++;
    } catch (err) {
      console.error('Digest send failed for an admin:', err);
    }
  }
  if (sent) {
    await supabase.rpc('cron_mark_emailed', { p_token: token, p_ids: [...messages.map((m) => m.id), ...contacts.map((c) => c.id)] });
  }
  return NextResponse.json({ sent });
}
