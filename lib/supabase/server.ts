import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// A request-scoped Supabase client authenticated as the CALLING USER'S
// OWN access token -- never the service role (no key for that even
// exists in this app's env today). Row Level Security still applies
// per-user exactly as it does for the browser client; the point of
// routing table access through here instead of the browser isn't to
// bypass RLS, it's so API route handlers have a place to add their own
// explicit ownership checks as defense-in-depth (see lib/api/auth.ts),
// rather than RLS being the only thing standing between a request and
// someone else's row.
export function createRequestSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
