// ---------------------------------------------------------------------
// lib/storage/oauth.ts -- browser-only sign-in to a customer's cloud drive
//
// A popup goes to Google / Microsoft / Dropbox, the customer approves,
// and the provider redirects the popup to /auth/storage-callback, which
// hands the result back to this window and closes. No secret is involved
// (PKCE for Microsoft & Dropbox, the token flow for Google), nothing is
// sent to the Magical Touch Design server, and the access token lives
// only in this browser tab (sessionStorage) until it expires (~1 hour).
// ---------------------------------------------------------------------

export type CloudProviderId = 'google' | 'onedrive' | 'dropbox';

export interface CloudSession {
  accessToken: string;
  expiresAt: number; // epoch ms
  account: { email: string | null; name: string | null };
}

const SESSION_KEY = 'mtd-cloud-sessions';
const MESSAGE_TYPE = 'mtd-storage-oauth';

export function callbackUrl(): string {
  return `${window.location.origin}/auth/storage-callback`;
}

// ---------- token cache (this tab only) ----------

function readAll(): Partial<Record<CloudProviderId, CloudSession>> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getSession(provider: CloudProviderId): CloudSession | null {
  const s = readAll()[provider];
  // A minute of margin so an upload never starts with a token about to die.
  return s && s.expiresAt - 60_000 > Date.now() ? s : null;
}

export function setSession(provider: CloudProviderId, session: CloudSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...readAll(), [provider]: session }));
  } catch {
    /* private mode: the session just won't survive a reload */
  }
}

export function clearSession(provider: CloudProviderId) {
  try {
    const all = readAll();
    delete all[provider];
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// ---------- PKCE helpers ----------

function base64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

// ---------- popup ----------

export interface PopupResult {
  code?: string;
  accessToken?: string;
  expiresIn?: number;
}

export class CloudAuthError extends Error {}

// Must be called directly inside a click/tap handler (before any await),
// otherwise Safari/iPad block the popup. The URL is filled in afterwards.
export function openAuthWindow(): Window {
  const w = 500;
  const h = 650;
  const left = Math.max(0, (window.screenX || 0) + (window.outerWidth - w) / 2);
  const top = Math.max(0, (window.screenY || 0) + (window.outerHeight - h) / 2);
  const popup = window.open('about:blank', 'mtd-storage-auth', `width=${w},height=${h},left=${left},top=${top}`);
  if (!popup) throw new CloudAuthError('Please allow pop-ups for this site, then try again.');
  return popup;
}

// The result comes back over a BroadcastChannel (and window.opener when
// available): provider sign-in pages often cut the popup's link to this
// window (Cross-Origin-Opener-Policy), so relying on window.opener or on
// popup.closed alone is unreliable. A closed popup therefore can't be
// detected; callers offer a Cancel button wired to `signal` instead.
export function waitForAuth(popup: Window, url: string, state: string, signal?: AbortSignal): Promise<PopupResult> {
  popup.location.href = url;
  return new Promise((resolve, reject) => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(MESSAGE_TYPE) : null;
    const timeout = setTimeout(() => finish(new CloudAuthError('Sign-in took too long. Please try again.')), 5 * 60_000);
    const onAbort = () => finish(new CloudAuthError('Sign-in was cancelled.'));
    signal?.addEventListener('abort', onAbort);
    function handle(data: any) {
      if (!data || data.type !== MESSAGE_TYPE || data.state !== state) return;
      if (data.error) finish(new CloudAuthError(data.errorDescription || 'Access was not granted.'));
      else finish(null, { code: data.code, accessToken: data.accessToken, expiresIn: data.expiresIn ? Number(data.expiresIn) : undefined });
    }
    function onMessage(e: MessageEvent) {
      if (e.origin === window.location.origin) handle(e.data);
    }
    if (channel) channel.onmessage = (e) => handle(e.data);
    window.addEventListener('message', onMessage);
    let done = false;
    function finish(err: Error | null, result?: PopupResult) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      window.removeEventListener('message', onMessage);
      channel?.close();
      try {
        if (!popup.closed) popup.close();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve(result!);
    }
  });
}

// Used by app/auth/storage-callback/page.tsx.
export function postAuthResultToOpener() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const get = (k: string) => params.get(k) ?? hash.get(k);
  const message = {
    type: MESSAGE_TYPE,
    state: get('state'),
    code: get('code'),
    accessToken: get('access_token'),
    expiresIn: get('expires_in'),
    error: get('error'),
    errorDescription: get('error_description'),
  };
  let delivered = false;
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(MESSAGE_TYPE);
    channel.postMessage(message);
    channel.close();
    delivered = true;
  }
  try {
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
      delivered = true;
    }
  } catch {
    /* opener gone */
  }
  return delivered;
}
