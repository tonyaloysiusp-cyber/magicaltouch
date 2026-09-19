// ---------------------------------------------------------------------
// lib/authNav.ts
// Shared "route based on real auth state" check for public-page CTAs
// (Start Designing, Workspace, Use Template, ...). Every one of these
// buttons needs the same answer — is there a signed-in user right now —
// so it lives in one place instead of being re-implemented per page.
// ---------------------------------------------------------------------

import { supabase } from '@/lib/supabase';

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

// Resolves where a CTA should go: `loggedInPath` if there's a session,
// otherwise `/login` with `next` set so login lands the user back where
// they meant to go (e.g. a specific template's editor URL).
export async function resolveAuthedPath(loggedInPath: string): Promise<string> {
  const loggedIn = await isLoggedIn();
  return loggedIn ? loggedInPath : `/login?next=${encodeURIComponent(loggedInPath)}`;
}
