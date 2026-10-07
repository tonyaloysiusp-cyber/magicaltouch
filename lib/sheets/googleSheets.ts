// ---------------------------------------------------------------------
// lib/sheets/googleSheets.ts -- server-only Google Sheets writer.
//
// Uses a Google Cloud *service account* (GOOGLE_SERVICE_ACCOUNT, the JSON
// key, stored only in Vercel env vars) and the spreadsheet id
// (GOOGLE_SHEETS_ID). Share the spreadsheet with the service account's
// e-mail as Editor. Sheets is a management view only: the app database
// stays the source of truth, and no password, hash, session, reset or
// unsubscribe token is ever written (email spec §25-26).
// ---------------------------------------------------------------------

import { createSign } from 'crypto';

export class SheetsConfigError extends Error {}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function readConfig(): { sheetId: string; account: ServiceAccount } {
  const sheetId = (process.env.GOOGLE_SHEETS_ID || '').trim();
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT || '';
  if (!sheetId || !raw) throw new SheetsConfigError('Google Sheets is not set up yet (GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT in Vercel).');
  let account: ServiceAccount;
  try {
    account = JSON.parse(raw);
  } catch {
    throw new SheetsConfigError('GOOGLE_SERVICE_ACCOUNT must be the full JSON key file contents.');
  }
  if (!account.client_email || !account.private_key) throw new SheetsConfigError('The service account key is missing client_email or private_key.');
  // Vercel sometimes stores the key's line breaks as literal "\n".
  account.private_key = account.private_key.replace(/\\n/g, '\n');
  return { sheetId, account };
}

export function serviceAccountEmail(): string | null {
  try {
    return readConfig().account.client_email;
  } catch {
    return null;
  }
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(account.private_key))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in for Sheets failed: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}

export type Cell = string | number | boolean | null | undefined;
export interface SheetTab {
  title: string;
  header: string[];
  rows: Cell[][];
}

// Replaces each tab's contents with a fresh snapshot (creating missing tabs).
export async function writeTabs(tabs: SheetTab[]): Promise<{ sheetUrl: string; written: Record<string, number> }> {
  const { sheetId, account } = readConfig();
  const token = await accessToken(account);
  const api = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  const auth = { Authorization: `Bearer ${token}` };

  const meta = await fetch(`${api}?fields=sheets.properties.title`, { headers: auth });
  if (meta.status === 403 || meta.status === 404) {
    throw new SheetsConfigError(`The spreadsheet can't be opened. Share it with ${account.client_email} as Editor, and check GOOGLE_SHEETS_ID.`);
  }
  if (!meta.ok) throw new Error(`Google Sheets error ${meta.status}`);
  const existing = new Set(((await meta.json()).sheets || []).map((s: any) => s.properties.title));
  const missing = tabs.filter((t) => !existing.has(t.title));
  if (missing.length) {
    const r = await fetch(`${api}:batchUpdate`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: missing.map((t) => ({ addSheet: { properties: { title: t.title, gridProperties: { frozenRowCount: 1 } } } })) }),
    });
    if (!r.ok) throw new Error(`Could not create sheet tabs (${r.status})`);
  }

  const q = (t: string) => `'${t.replace(/'/g, "''")}'`;
  const clear = await fetch(`${api}/values:batchClear`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ranges: tabs.map((t) => `${q(t.title)}!A:Z`) }),
  });
  if (!clear.ok) throw new Error(`Could not clear sheet tabs (${clear.status})`);

  // RAW: values are stored exactly as text/numbers -- a name starting
  // with "=" can never run as a formula.
  const update = await fetch(`${api}/values:batchUpdate`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: tabs.map((t) => ({
        range: `${q(t.title)}!A1`,
        values: [t.header, ...t.rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : v)))],
      })),
    }),
  });
  if (!update.ok) throw new Error(`Could not write to Google Sheets (${update.status})`);

  return {
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    written: Object.fromEntries(tabs.map((t) => [t.title, t.rows.length])),
  };
}
