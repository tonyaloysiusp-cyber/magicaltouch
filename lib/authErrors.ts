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
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check your internet and try again.';
  return message as string;
}
