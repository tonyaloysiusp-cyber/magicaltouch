// ---------------------------------------------------------------------
// lib/storage/providers.ts -- Google Drive, OneDrive and Dropbox.
//
// Each provider keeps Magical Touch Design projects in one predictable
// place inside the customer's own drive, and asks only for the narrowest
// permission that allows it:
//   Google Drive  "Magical Touch Design/Projects"   scope drive.file
//                 (only files this app created or the customer opened
//                 with it -- never the rest of their Drive)
//   OneDrive      "Apps/Magical Touch Design/Projects"  Files.ReadWrite.AppFolder
//   Dropbox       "Apps/Magical Touch Design/Projects"  App-folder access
//
// A provider is offered only when its public app id is configured in
// Vercel (NEXT_PUBLIC_GOOGLE_CLIENT_ID / NEXT_PUBLIC_MICROSOFT_CLIENT_ID /
// NEXT_PUBLIC_DROPBOX_APP_KEY). These ids are public by design; there
// are no secrets in this file.
// ---------------------------------------------------------------------

import {
  type CloudProviderId,
  type CloudSession,
  CloudAuthError,
  callbackUrl,
  getSession,
  setSession,
  randomString,
  pkceChallenge,
  openAuthWindow,
  waitForAuth,
} from './oauth';

export type { CloudProviderId, CloudSession };

export interface CloudFile {
  id: string;
  name: string;
  modifiedAt: string | null;
  size: number | null;
  path?: string | null; // Dropbox needs the path to overwrite
}

export interface CloudProvider {
  id: CloudProviderId;
  label: string;
  folderLabel: string;
  configured: boolean;
  connect(popup: Window, signal?: AbortSignal): Promise<CloudSession>;
  upload(session: CloudSession, file: { name: string; blob: Blob; existing?: CloudFile | null }): Promise<CloudFile>;
  download(session: CloudSession, file: { id: string; path?: string | null }): Promise<Blob>;
  list(session: CloudSession): Promise<CloudFile[]>;
  revoke?(session: CloudSession): Promise<void>;
}

export class CloudStorageError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const APP_FOLDER = 'Magical Touch Design';
const PROJECTS = 'Projects';

async function check(res: Response, what: string): Promise<Response> {
  if (res.ok) return res;
  if (res.status === 401) throw new CloudStorageError('Your connection expired. Please connect again.', 401);
  if (res.status === 404 || res.status === 409) throw new CloudStorageError(`${what}: the file was not found. It may have been moved or deleted.`, res.status);
  if (res.status === 403) throw new CloudStorageError(`${what}: permission was denied.`, 403);
  if (res.status === 507) throw new CloudStorageError(`${what}: your drive is full.`, 507);
  throw new CloudStorageError(`${what} failed (error ${res.status}). Please try again.`, res.status);
}

const expires = (seconds?: number) => Date.now() + (seconds && seconds > 0 ? seconds : 3600) * 1000;

// =====================================================================
// Google Drive
// =====================================================================

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function driveFolder(token: string, name: string, parent: string | null): Promise<string> {
  const safe = name.replace(/'/g, "\\'");
  const q = `name='${safe}' and mimeType='${FOLDER_MIME}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
  const found = await check(
    await fetch(`${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`, { headers: { Authorization: `Bearer ${token}` } }),
    'Google Drive',
  ).then((r) => r.json());
  if (found.files?.[0]?.id) return found.files[0].id;
  const created = await check(
    await fetch(`${DRIVE}/files?fields=id`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) }),
    }),
    'Creating the folder in Google Drive',
  ).then((r) => r.json());
  return created.id;
}

const driveFile = (f: any): CloudFile => ({ id: f.id, name: f.name, modifiedAt: f.modifiedTime ?? null, size: f.size ? Number(f.size) : null });

export const googleDrive: CloudProvider = {
  id: 'google',
  label: 'Google Drive',
  folderLabel: `${APP_FOLDER}/${PROJECTS}`,
  configured: !!GOOGLE_ID,

  async connect(popup, signal) {
    const state = randomString();
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: GOOGLE_ID,
        redirect_uri: callbackUrl(),
        response_type: 'token',
        scope: 'https://www.googleapis.com/auth/drive.file openid email profile',
        include_granted_scopes: 'true',
        prompt: 'select_account',
        state,
      });
    const result = await waitForAuth(popup, url, state, signal);
    if (!result.accessToken) throw new CloudAuthError('Google did not grant access.');
    const me: any = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${result.accessToken}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    const session: CloudSession = {
      accessToken: result.accessToken,
      expiresAt: expires(result.expiresIn),
      account: { email: me.email ?? null, name: me.name ?? null },
    };
    setSession('google', session);
    return session;
  },

  async upload(session, { name, blob, existing }) {
    const token = session.accessToken;
    if (existing?.id) {
      const res = await check(
        await fetch(`${DRIVE_UPLOAD}/files/${encodeURIComponent(existing.id)}?uploadType=media&fields=id,name,modifiedTime,size`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
          body: blob,
        }),
        'Saving to Google Drive',
      );
      return driveFile(await res.json());
    }
    const root = await driveFolder(token, APP_FOLDER, null);
    const folder = await driveFolder(token, PROJECTS, root);
    const boundary = 'mtd' + randomString(12);
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name, parents: [folder], mimeType: 'application/octet-stream' }),
      `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ]);
    const res = await check(
      await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,modifiedTime,size`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      }),
      'Saving to Google Drive',
    );
    return driveFile(await res.json());
  },

  async download(session, { id }) {
    const res = await check(
      await fetch(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
      'Opening from Google Drive',
    );
    return res.blob();
  },

  async list(session) {
    const q = `name contains '.mtd' and trashed=false and mimeType != '${FOLDER_MIME}'`;
    const res = await check(
      await fetch(`${DRIVE}/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=100&fields=files(id,name,modifiedTime,size)`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }),
      'Listing Google Drive',
    );
    return ((await res.json()).files || []).map(driveFile);
  },

  async revoke(session) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.accessToken)}`, { method: 'POST' }).catch(() => {});
  },
};

// =====================================================================
// OneDrive (Microsoft Graph) -- personal and work/school accounts
// =====================================================================

const MS_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '';
const MS_AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const MS_SCOPE = 'Files.ReadWrite.AppFolder User.Read';
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;

const graphFile = (f: any): CloudFile => ({ id: f.id, name: f.name, modifiedAt: f.lastModifiedDateTime ?? null, size: typeof f.size === 'number' ? f.size : null });

// Files above 4 MB must use an upload session (chunks of 320 KiB multiples).
async function graphLargeUpload(token: string, createUrl: string, blob: Blob, conflict: 'rename' | 'replace'): Promise<CloudFile> {
  const session = await check(
    await fetch(createUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': conflict } }),
    }),
    'Saving to OneDrive',
  ).then((r) => r.json());
  const CHUNK = 320 * 1024 * 16; // 5 MiB
  let last: any = null;
  for (let start = 0; start < blob.size; start += CHUNK) {
    const end = Math.min(start + CHUNK, blob.size);
    const res = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${start}-${end - 1}/${blob.size}` },
      body: blob.slice(start, end),
    });
    await check(res, 'Saving to OneDrive');
    last = await res.json().catch(() => null);
  }
  return graphFile(last);
}

export const oneDrive: CloudProvider = {
  id: 'onedrive',
  label: 'OneDrive',
  folderLabel: `Apps/${APP_FOLDER}/${PROJECTS}`,
  configured: !!MS_ID,

  async connect(popup, signal) {
    const state = randomString();
    const verifier = randomString(48);
    const url =
      `${MS_AUTH}/authorize?` +
      new URLSearchParams({
        client_id: MS_ID,
        response_type: 'code',
        redirect_uri: callbackUrl(),
        response_mode: 'query',
        scope: MS_SCOPE,
        code_challenge: await pkceChallenge(verifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
        state,
      });
    const result = await waitForAuth(popup, url, state, signal);
    if (!result.code) throw new CloudAuthError('Microsoft did not grant access.');
    const token = await fetch(`${MS_AUTH}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_ID,
        grant_type: 'authorization_code',
        code: result.code,
        redirect_uri: callbackUrl(),
        code_verifier: verifier,
        scope: MS_SCOPE,
      }),
    }).then((r) => r.json());
    if (!token.access_token) throw new CloudAuthError(token.error_description || 'Microsoft did not grant access.');
    const me: any = await fetch(`${GRAPH}/me?$select=displayName,mail,userPrincipalName`, { headers: { Authorization: `Bearer ${token.access_token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    const session: CloudSession = {
      accessToken: token.access_token,
      expiresAt: expires(token.expires_in),
      account: { email: me.mail || me.userPrincipalName || null, name: me.displayName ?? null },
    };
    setSession('onedrive', session);
    return session;
  },

  async upload(session, { name, blob, existing }) {
    const token = session.accessToken;
    if (existing?.id) {
      const base = `${GRAPH}/me/drive/items/${encodeURIComponent(existing.id)}`;
      if (blob.size > SIMPLE_UPLOAD_LIMIT) return graphLargeUpload(token, `${base}/createUploadSession`, blob, 'replace');
      const res = await check(
        await fetch(`${base}/content`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: blob }),
        'Saving to OneDrive',
      );
      return graphFile(await res.json());
    }
    const path = `${GRAPH}/me/drive/special/approot:/${PROJECTS}/${encodeURIComponent(name)}`;
    if (blob.size > SIMPLE_UPLOAD_LIMIT) return graphLargeUpload(token, `${path}:/createUploadSession`, blob, 'rename');
    const res = await check(
      await fetch(`${path}:/content?@microsoft.graph.conflictBehavior=rename`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: blob,
      }),
      'Saving to OneDrive',
    );
    return graphFile(await res.json());
  },

  async download(session, { id }) {
    const res = await check(
      await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(id)}/content`, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
      'Opening from OneDrive',
    );
    return res.blob();
  },

  async list(session) {
    const res = await fetch(`${GRAPH}/me/drive/special/approot:/${PROJECTS}:/children?$select=id,name,lastModifiedDateTime,size,file&$top=200`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (res.status === 404) return []; // nothing saved yet
    await check(res, 'Listing OneDrive');
    const items = ((await res.json()).value || []).filter((f: any) => f.file && /\.mtd$/i.test(f.name));
    return items.map(graphFile).sort((a: CloudFile, b: CloudFile) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''));
  },
};

// =====================================================================
// Dropbox -- App-folder access
// =====================================================================

const DROPBOX_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

// Dropbox-API-Arg must be ASCII; non-ASCII characters are \u-escaped.
export function dropboxArg(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

const dbxFile = (f: any): CloudFile => ({
  id: f.id,
  name: f.name,
  modifiedAt: f.server_modified ?? null,
  size: typeof f.size === 'number' ? f.size : null,
  path: f.path_display ?? f.path_lower ?? null,
});

export const dropbox: CloudProvider = {
  id: 'dropbox',
  label: 'Dropbox',
  folderLabel: `Apps/${APP_FOLDER}/${PROJECTS}`,
  configured: !!DROPBOX_KEY,

  async connect(popup, signal) {
    const state = randomString();
    const verifier = randomString(48);
    const url =
      'https://www.dropbox.com/oauth2/authorize?' +
      new URLSearchParams({
        client_id: DROPBOX_KEY,
        response_type: 'code',
        redirect_uri: callbackUrl(),
        code_challenge: await pkceChallenge(verifier),
        code_challenge_method: 'S256',
        token_access_type: 'online',
        state,
      });
    const result = await waitForAuth(popup, url, state, signal);
    if (!result.code) throw new CloudAuthError('Dropbox did not grant access.');
    const token = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: result.code, grant_type: 'authorization_code', client_id: DROPBOX_KEY, redirect_uri: callbackUrl(), code_verifier: verifier }),
    }).then((r) => r.json());
    if (!token.access_token) throw new CloudAuthError(token.error_description || 'Dropbox did not grant access.');
    const me: any = await fetch('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    const session: CloudSession = {
      accessToken: token.access_token,
      expiresAt: expires(token.expires_in),
      account: { email: me.email ?? null, name: me.name?.display_name ?? null },
    };
    setSession('dropbox', session);
    return session;
  },

  async upload(session, { name, blob, existing }) {
    // Files over 150 MB would need Dropbox's chunked upload API; .mtd
    // projects are far smaller, so this keeps to the simple endpoint.
    if (blob.size > 150 * 1024 * 1024) throw new CloudStorageError('This project is too large for Dropbox simple upload (150 MB).');
    const target = existing?.path ? { path: existing.path, mode: 'overwrite', autorename: false } : { path: `/${PROJECTS}/${name}`, mode: 'add', autorename: true };
    const res = await check(
      await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': dropboxArg({ ...target, mute: true }) },
        body: blob,
      }),
      'Saving to Dropbox',
    );
    return dbxFile(await res.json());
  },

  async download(session, { id, path }) {
    const res = await check(
      await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'Dropbox-API-Arg': dropboxArg({ path: id || path }) },
      }),
      'Opening from Dropbox',
    );
    return res.blob();
  },

  async list(session) {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/${PROJECTS}`, limit: 200 }),
    });
    if (res.status === 409) return []; // folder doesn't exist yet
    await check(res, 'Listing Dropbox');
    const entries = ((await res.json()).entries || []).filter((e: any) => e['.tag'] === 'file' && /\.mtd$/i.test(e.name));
    return entries.map(dbxFile).sort((a: CloudFile, b: CloudFile) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''));
  },

  async revoke(session) {
    await fetch('https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` } }).catch(() => {});
  },
};

// =====================================================================

export const CLOUD_PROVIDERS: CloudProvider[] = [googleDrive, oneDrive, dropbox];

export function providerById(id: CloudProviderId): CloudProvider {
  return CLOUD_PROVIDERS.find((p) => p.id === id)!;
}

// Returns a usable session, signing in through a popup only if needed.
// `popup` must have been opened synchronously in the click handler.
export async function ensureSession(provider: CloudProvider, popup: Window | null, signal?: AbortSignal): Promise<CloudSession> {
  const existing = getSession(provider.id);
  if (existing) {
    try {
      popup?.close();
    } catch {
      /* ignore */
    }
    return existing;
  }
  if (!popup) throw new CloudStorageError('Please connect again.', 401);
  return provider.connect(popup, signal);
}

// Helper for click handlers: opens the sign-in window right away only
// when one will be needed (keeps Safari's popup blocker happy).
export function popupIfNeeded(provider: CloudProvider): Window | null {
  return getSession(provider.id) ? null : openAuthWindow();
}
