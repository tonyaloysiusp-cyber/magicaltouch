// Visitor counter and error log for the admin panel. The browser sends a
// tiny message per page view; we add the country and city that Vercel
// already knows from the connection (no cookies, no third parties) and
// store daily counts. POST { kind: 'view' | 'error', ... }.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function browserOf(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}
function osOf(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

export async function POST(req: NextRequest) {
  if (!URL_ || !KEY) return new NextResponse(null, { status: 204 });
  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(ua)) return new NextResponse(null, { status: 204 });
  let b: any;
  try { b = await req.json(); } catch { return new NextResponse(null, { status: 400 }); }
  const auth = req.headers.get('authorization');
  const headers = { apikey: KEY, Authorization: auth && /^Bearer [\w.-]+$/.test(auth) ? auth : `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  const city = req.headers.get('x-vercel-ip-city');
  const body =
    b?.kind === 'search'
      ? { fn: 'track_search', args: { p_q: String(b.q || '').slice(0, 60), p_results: Number(b.results) || 0 } }
      : b?.kind === 'error'
      ? { fn: 'track_error', args: { p_path: String(b.path || '/'), p_message: String(b.message || '').slice(0, 300) } }
      : {
          fn: 'track_visit2',
          args: {
            p_path: String(b.path || '/'), p_visitor: String(b.visitor || ''), p_referrer: b.referrer ? String(b.referrer) : null, p_device: b.device ? String(b.device) : null,
            p_country: req.headers.get('x-vercel-ip-country'), p_city: city ? decodeURIComponent(city) : null,
            p_browser: browserOf(ua), p_os: osOf(ua), p_utm: b.utm ? String(b.utm).slice(0, 80) : null,
            p_load_ms: Number.isFinite(b.loadMs) ? Math.round(b.loadMs) : null,
          },
        };
  let r = await fetch(`${URL_}/rest/v1/rpc/${body.fn}`, { method: 'POST', headers, body: JSON.stringify(body.args) }).catch(() => null);
  // An expired sign-in shouldn't lose the count.
  if (r && r.status === 401 && headers.Authorization !== `Bearer ${KEY}`) {
    r = await fetch(`${URL_}/rest/v1/rpc/${body.fn}`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body.args) }).catch(() => null);
  }
  return new NextResponse(null, { status: 204 });
}
