import { SITE_URL } from '@/lib/seo';

// Tell Bing, Yandex and the shared IndexNow service about pages (new or
// changed), so they are picked up in days instead of weeks. With no list,
// every address in the sitemap is sent. Server only.
const KEY = 'b2e48e40a28ff25772f97a10d0c1869a';
const HOST = new URL(SITE_URL).host;
const ENGINES = ['https://www.bing.com/indexnow', 'https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];

export async function submitIndexNow(list?: string[]) {
  let urls = (list || []).filter((u) => typeof u === 'string' && u.startsWith(SITE_URL));
  if (!list?.length) {
    const xml = await fetch(`${SITE_URL}/sitemap.xml`, { cache: 'no-store' }).then((r) => r.text());
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }
  urls = [...new Set(urls)].slice(0, 10000);
  if (!urls.length) return { submitted: 0, results: [] as { engine: string; status: number; ok: boolean; error?: string }[] };
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
  return { submitted: urls.length, results };
}
