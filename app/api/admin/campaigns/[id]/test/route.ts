import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { campaignEmail, unsubscribeUrlFor } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { firstNameFor } from '@/lib/email/firstName';

export const runtime = 'nodejs';

// POST /api/admin/campaigns/:id/test -- sends the campaign to the admin's
// own address only, marked [TEST], so it can be checked in a real inbox.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user, adminName } = await requireAdmin(request);
    if (!user.email) return NextResponse.json({ error: 'Your account has no e-mail address.' }, { status: 400 });
    const { data: c, error } = await supabase.from('email_campaigns').select('*').eq('id', params.id).single();
    if (error || !c) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    if (!c.subject?.trim() || !c.content?.trim()) return NextResponse.json({ error: 'Add a subject and content first.' }, { status: 400 });

    const { data: me } = await supabase.from('profiles').select('unsubscribe_token').eq('id', user.id).maybeSingle();
    const email = campaignEmail(
      { subject: `[TEST] ${c.subject}`, preheader: c.preheader, content: c.content, imageUrl: c.image_url, ctaLabel: c.cta_label, ctaUrl: c.cta_url },
      { firstName: firstNameFor(adminName, user.email), unsubscribeUrl: unsubscribeUrlFor(me?.unsubscribe_token || 'test', c.id) },
    );
    await sendEmail(user.email, email);
    return NextResponse.json({ sent: true, to: user.email });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Test send failed:', err);
    return NextResponse.json({ error: 'The test e-mail could not be sent.' }, { status: 502 });
  }
}
