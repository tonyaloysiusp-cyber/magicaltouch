import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { SITE_URL } from '@/lib/seo';

// Admin → SEO & promotion → "Send to search engines": submits every URL in
// the sitemap (or a given list) to Bing, Yandex and the shared IndexNow
// endpoint, which then shares them with other participating engines.
export const runtime = 'nodejs';
export const maxDuration = 60;

const KEY = 'b2e48e40a28ff25772f97a10d0c1869a';
const HOST = new URL(SITE_URL).host;
const ENGINES = ['https://www.bing.com/indexnow', 'https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    let urls: string[] = Array.isArray(body?.urls) ? body.urls.filter((u: unknown) => typeof u === 'string' && u.startsWith(SITE_URL)) : [];
    if (!urls.length) {
      const xml = await fetch(`${SITE_URL}/sitemap.xml`, { cache: 'no-store' }).then((r) => r.text());
      urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    }
    urls = [...new Set(urls)].slice(0, 10000);
    const payload = JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList: urls });
    const results = await Promise.all(
      ENGINES.map(async (e) => {
        try {
          const r = await fetch(e, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: payload });
          return { engine: new URL(e).host, status: r.status, ok: r.status === 200 || r.status === 202 };
        } catch (err: any) {
          return { engine: new URL(e).host, status: 0, ok: false, error: String(err?.message || err) };
        }
      }),
    );
    return NextResponse.json({ submitted: urls.length, results });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not submit' }, { status: 500 });
  }
}
