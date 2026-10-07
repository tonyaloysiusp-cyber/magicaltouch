import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';
import { welcomeEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { firstNameFor } from '@/lib/email/firstName';

export const runtime = 'nodejs';

// Only accounts created this recently get the welcome email, so existing
// users don't suddenly receive one the first time they open the
// dashboard after this feature ships.
const WELCOME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// POST /api/email/welcome -- called by the dashboard after sign-in.
// Sends the CEO welcome email at most once per user: the profiles row is
// atomically "claimed" (welcome_email_sent_at set only where it is still
// null) BEFORE sending, so two tabs or a double request can never both
// send. If sending fails, the claim is released so a later visit retries.
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser(request);

    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ sent: false, reason: 'email-not-verified' });
    }
    if (Date.now() - new Date(user.created_at).getTime() > WELCOME_WINDOW_MS) {
      return NextResponse.json({ sent: false, reason: 'existing-account' });
    }

    const { data: claimed, error: claimError } = await supabase
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('welcome_email_sent_at', null)
      .select('name');

    if (claimError) {
      // 42703 = column missing: migration 0009 hasn't been applied yet.
      // Never send without the duplicate guard in place.
      console.error('Welcome email claim failed:', claimError);
      return NextResponse.json({ sent: false, reason: 'not-configured' });
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ sent: false, reason: 'already-sent' });
    }

    // Record the marketing choice made at signup, once the address is
    // verified -- only if they ticked the box and haven't decided since.
    if (user.user_metadata?.marketing_consent === true) {
      await supabase
        .from('profiles')
        .update({ marketing_status: 'subscribed', marketing_consent_at: new Date().toISOString() })
        .eq('id', user.id)
        .eq('marketing_status', 'none');
    }

    try {
      const email = welcomeEmail({ firstName: firstNameFor(claimed[0].name, user.email) });
      await sendEmail(user.email, email);
      return NextResponse.json({ sent: true });
    } catch (err) {
      console.error('Welcome email send failed:', err);
      await supabase.from('profiles').update({ welcome_email_sent_at: null }).eq('id', user.id);
      return NextResponse.json({ sent: false, reason: 'send-failed' }, { status: 502 });
    }
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Welcome email route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
