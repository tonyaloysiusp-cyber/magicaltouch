import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { writeTabs, SheetsConfigError, serviceAccountEmail, SheetTab } from '@/lib/sheets/googleSheets';

export const runtime = 'nodejs';
export const maxDuration = 60;

const date = (v: string | null | undefined) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) : '');

// GET: is Sheets configured? (so the Email Center can show the right button)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ configured: !!serviceAccountEmail(), serviceAccount: serviceAccountEmail() });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ configured: false });
  }
}

// POST: write a fresh snapshot of USERS, MARKETING LIST, CAMPAIGNS,
// OFFERS and EMAIL LOGS to the configured spreadsheet (email spec §26-30).
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);

    const [users, marketing, campaigns, offers, log] = await Promise.all([
      supabase.rpc('admin_list_users', { p_search: null }),
      supabase.rpc('admin_marketing_list'),
      supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('email_offers').select('*').order('created_at', { ascending: false }),
      supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(5000),
    ]);
    for (const r of [users, marketing, campaigns, offers, log]) if (r.error) throw r.error;

    const split = (name: string | null) => {
      const parts = (name || '').trim().split(/\s+/).filter(Boolean);
      return [parts[0] || '', parts.slice(1).join(' ')];
    };

    const tabs: SheetTab[] = [
      {
        title: 'USERS',
        header: ['User ID', 'First Name', 'Last Name', 'Email', 'Email Verified', 'Account Status', 'Registration Date', 'Last Login', 'Marketing Consent', 'Marketing Status', 'Country', 'Language', 'Total Designs', 'Last Design Date'],
        rows: (users.data || []).map((u: any) => {
          const [first, last] = split(u.name);
          return [u.user_id, first, last, u.email, u.email_verified ? 'Yes' : 'No', u.email_verified ? 'Active' : 'Pending verification', date(u.created_at), date(u.last_sign_in_at), u.marketing_status === 'subscribed' ? 'Yes' : 'No', u.marketing_status, '', '', '', ''];
        }),
      },
      {
        title: 'MARKETING LIST',
        header: ['Subscriber ID', 'User ID', 'Name', 'Email', 'Marketing Consent', 'Consent Date', 'Status', 'Subscription Date', 'Unsubscribe Date', 'Last Campaign', 'Last Email'],
        rows: (marketing.data || []).map((m: any) => [
          m.user_id, m.user_id, m.name || '', m.email, m.marketing_status === 'subscribed' ? 'Yes' : 'No', date(m.marketing_consent_at),
          String(m.marketing_status).toUpperCase(), date(m.marketing_consent_at), date(m.unsubscribed_at), m.last_campaign || '', date(m.last_email_at),
        ]),
      },
      {
        title: 'CAMPAIGNS',
        header: ['Campaign ID', 'Campaign Name', 'Campaign Type', 'Subject', 'Created Date', 'Scheduled Date', 'Status', 'Target Audience', 'Total Recipients', 'Sent', 'Delivered', 'Failed', 'Unsubscribed'],
        rows: (campaigns.data || []).map((c: any) => [
          c.id, c.name, c.campaign_type, c.subject, date(c.created_at), date(c.scheduled_at), String(c.status).toUpperCase(), c.audience,
          c.total_recipients, c.sent_count, '', c.failed_count, '',
        ]),
      },
      {
        title: 'OFFERS',
        header: ['Offer ID', 'Offer Name', 'Description', 'Discount', 'Start Date', 'End Date', 'Target Audience', 'Landing Page', 'Status'],
        rows: (offers.data || []).map((o: any) => [o.id, o.name, o.description || '', o.discount || '', o.start_date || '', o.end_date || '', o.target_audience, o.landing_page || '', String(o.status).toUpperCase()]),
      },
      {
        title: 'EMAIL LOGS',
        header: ['Email ID', 'User ID', 'Campaign ID', 'Email', 'Email Type', 'Subject', 'Status', 'Created Date', 'Sent Date', 'Provider Message ID', 'Failure Reason'],
        rows: (log.data || []).map((l: any) => [l.id, l.user_id || '', l.campaign_id || '', l.email, l.email_type, l.subject || '', l.status, date(l.created_at), date(l.sent_at), l.provider_message_id || '', l.failure_reason || '']),
      },
    ];

    const result = await writeTabs(tabs);
    return NextResponse.json({ ok: true, ...result, syncedAt: new Date().toISOString() });
  } catch (err: any) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof SheetsConfigError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('Sheets sync failed:', err);
    return NextResponse.json({ error: err?.message || 'Google Sheets sync failed.' }, { status: 500 });
  }
}
