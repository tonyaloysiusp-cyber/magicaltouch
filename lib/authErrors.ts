// Turns Supabase Auth's technical messages into plain, friendly ones.
export function friendlyAuthError(message: string | undefined | null): string {
  const m = (message || '').toLowerCase();
  if (!m) return 'Something went wrong. Please try again.';
  if (m.includes('invalid login credentials')) return 'That email and password don’t match. Check them or reset your password.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox (and spam) for our link.';
  if (m.includes('user already registered') || m.includes('already been registered')) return 'An account with this email already exists. Please log in instead.';
  if (m.includes('error sending') || m.includes('smtp') || m.includes('sending confirmation') || m.includes('sending recovery'))
    return 'We couldn’t send the email right now. Please try again in a few minutes.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('password should be') || m.includes('weak password') || m.includes('at least'))
    return 'Please choose a stronger password — at least 8 characters with letters and numbers.';
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('email address') && m.includes('invalid'))
    return 'Please enter a valid email address.';
  if (m.includes('signups not allowed')) return 'New sign-ups are paused right now. Please try again later.';
  if (m.includes('context canceled') || m.includes('deadline exceeded') || m.includes('unexpected_failure') || m.includes('database error') || m.includes('timeout') || m.includes('internal server error') || m.includes('gateway'))
    return 'Our sign-in server is busy right now. Please wait a few seconds and press the button again — your account is safe.';
  if (m.includes('network') || m.includes('fetch') || m.includes('abort') || m.includes('timed out')) return 'We couldn’t reach our server just now. Please press the button again — it usually works on the second try.';
  return message as string;
}

/** Server-side or connection problems that are worth retrying automatically. */
export function isTransientAuthError(err: { message?: string; status?: number } | null | undefined): boolean {
  if (!err) return false;
  if (typeof err.status === 'number' && (err.status >= 500 || err.status === 0)) return true;
  return /context canceled|deadline exceeded|timeout|timed out|unexpected_failure|network|fetch|gateway|database error/i.test(err.message || '');
}

/** Runs an auth call, retrying up to twice on transient server errors (1 s, then 2.5 s). */
export async function withAuthRetry<T extends { error: any }>(call: () => Promise<T>): Promise<T> {
  let r = await call();
  for (const wait of [1000, 2500]) {
    if (!isTransientAuthError(r.error)) break;
    await new Promise((ok) => setTimeout(ok, wait));
    r = await call();
  }
  return r;
}
