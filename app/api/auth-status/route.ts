// Is sign-in available? One tiny database read (sign-in needs the database),
// with a 4-second limit, remembered for 30 seconds per server so this check
// never adds load. The login and sign-up pages show a clear notice when it is down.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let last: { at: number; ok: boolean } | null = null;

async function check(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`${url}/rest/v1/site_settings?select=key&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: ctl.signal, cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  if (!last || Date.now() - last.at > 30_000) last = { at: Date.now(), ok: await check() };
  return NextResponse.json({ ok: last.ok, checked: new Date(last.at).toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
