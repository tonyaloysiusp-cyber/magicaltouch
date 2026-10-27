import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------
// Network resilience (browser only)
//
// Some networks (mobile carriers, office firewalls, a slow first DNS lookup)
// sometimes fail or stall requests to *.supabase.co even though the rest
// of the internet works — that is what showed "No connection. Check your
// internet" and sent people back to the login page. Every request now:
//   1. has a time limit (a stalled request is retried instead of hanging);
//   2. on a network failure, is retried through our own domain
//      (/sb/... → Supabase, see next.config.mjs), and later requests in
//      this tab go that way straight away.
// Uploads (large bodies) are never timed out.
// ---------------------------------------------------------------------
const PROXY_KEY = 'mt:sbProxy';
const TIMEOUT_MS = 15000;

const viaProxy = (url: string) => `${window.location.origin}/sb${url.slice(supabaseUrl.length)}`;
const useProxy = () => {
  try {
    return window.sessionStorage.getItem(PROXY_KEY) === '1';
  } catch {
    return false;
  }
};
const rememberProxy = () => {
  try {
    window.sessionStorage.setItem(PROXY_KEY, '1');
  } catch {
    // not critical
  }
};

function isBigBody(body: unknown) {
  return typeof Blob !== 'undefined' && (body instanceof Blob || body instanceof ArrayBuffer || (typeof FormData !== 'undefined' && body instanceof FormData) || ArrayBuffer.isView(body as any));
}

async function timedFetch(url: string, init: RequestInit | undefined, ms: number | null) {
  if (!ms || init?.signal) return fetch(url, init);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

const resilientFetch: typeof fetch = async (input: any, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (typeof window === 'undefined' || typeof url !== 'string' || !url.startsWith(supabaseUrl) || typeof input !== 'string') return fetch(input, init);
  // Storage uploads and downloads stay direct (big files, public URLs).
  const isStorage = url.startsWith(`${supabaseUrl}/storage/`);
  const ms = isBigBody(init?.body) || isStorage ? null : TIMEOUT_MS;
  if (useProxy() && !isStorage) {
    try {
      return await timedFetch(viaProxy(url), init, ms);
    } catch {
      return timedFetch(url, init, ms ? ms * 2 : null);
    }
  }
  try {
    return await timedFetch(url, init, ms);
  } catch (err) {
    if (isStorage || (init?.signal && init.signal.aborted)) throw err;
    rememberProxy();
    return timedFetch(viaProxy(url), init, ms ? ms * 2 : null);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: resilientFetch },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/**
 * The signed-in user, read from this device's saved session (refreshed
 * automatically when it expires). Use this to decide what a page shows.
 * Unlike auth.getUser() it does not need a round trip to the server on
 * every page, so a slow or dropped request never logs anyone out.
 * Security is enforced by the database (row level security), not here.
 */
export async function getSessionUser() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { data: { user: data.session.user }, error: null };
  } catch {
    // fall through to the server check
  }
  try {
    const r = await supabase.auth.getUser();
    return { data: { user: r.data.user ?? null }, error: r.error };
  } catch (error: any) {
    return { data: { user: null }, error };
  }
}
