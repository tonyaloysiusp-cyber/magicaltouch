import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';
import { passwordChangedEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { firstNameFor } from '@/lib/email/firstName';

export const runtime = 'nodejs';

// POST /api/email/password-changed -- called by /reset-password right
// after supabase.auth.updateUser({ password }) succeeds. The recipient
// is always the signed-in user's own verified address from Supabase
// Auth (never a request-body value), and only when Supabase shows the
// account was updated in the last few minutes, so this can't be used to
// email anyone else or to repeatedly spam yourself.
const RECENT_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser(request);
    if (!user.email) return NextResponse.json({ sent: false, reason: 'no-email' });

    const updatedAt = user.updated_at ? new Date(user.updated_at).getTime() : 0;
    if (Date.now() - updatedAt > RECENT_MS) {
      return NextResponse.json({ sent: false, reason: 'no-recent-change' });
    }

    const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
    const changedAt = new Date().toUTCString().replace('GMT', 'UTC');
    const { data: copy } = await supabase.from('email_copy').select('subject, heading, intro, body').eq('key', 'password_changed').maybeSingle();
    await sendEmail(user.email, passwordChangedEmail({ firstName: firstNameFor(profile?.name, user.email), changedAt }, copy || {}));
    return NextResponse.json({ sent: true });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('Password-changed email failed:', err);
    return NextResponse.json({ sent: false, reason: 'send-failed' }, { status: 502 });
  }
}
