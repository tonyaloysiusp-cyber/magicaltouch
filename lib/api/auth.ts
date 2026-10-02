import { NextRequest } from 'next/server';
import { createRequestSupabaseClient } from '@/lib/supabase/server';

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Every API route handler for designs/templates/assets must call this
// first. It extracts the caller's Supabase access token from the
// Authorization header and verifies it against Supabase Auth itself --
// it never trusts a client-supplied userId (there isn't one to trust;
// the real user comes back from auth.getUser(), not the request body).
export async function requireUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new ApiAuthError('Missing Authorization header');

  const supabase = createRequestSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiAuthError('Invalid or expired session');

  return { supabase, user: data.user };
}
