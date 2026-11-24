// Cloudflare Worker entry: a page cache in front of the Next.js site (OpenNext).
//
// Why: pages that are not pre-built (16,000 template pages, landing pages,
// category pages) were rendered on every visit and every search-engine crawl,
// each one asking the database again. On 24 Nov 2026 that load exhausted the
// database and took login down with it.
//
// Public pages are the same for every visitor (sign-in lives in the browser,
// no page reads cookies), so their HTML (and the RSC data used for in-site
// navigation) is kept in Cloudflare's cache: fresh for 10 minutes, then served
// at once while a new copy is built in the background, and kept for up to a
// day. If the site answers with an error, the last good copy is served.
// Private and interactive areas (account, admin, editor, API, auth) are never cached.

// @ts-ignore — built by `opennextjs-cloudflare build`
import handler from './.open-next/worker.js';
// @ts-ignore — Durable Object classes the OpenNext worker may define
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

const FRESH_S = 600;
const KEEP_S = 86400;
const PRIVATE = /^\/(api|admin|ai-studio|auth|dashboard|editor|login|signup|reset-password|profile|storage|unsubscribe|verify|open|create|packaging-editor|textile-designer|wallpaper-designer|sb|_next\/data|cdn-cgi)(\/|$)/;

type Ctx = { waitUntil(p: Promise<unknown>): void };

function cacheable(req: Request, url: URL): boolean {
  if (req.method !== 'GET') return false;
  if (PRIVATE.test(url.pathname)) return false;
  if (url.pathname.startsWith('/_next/static/') || /\.[a-z0-9]{2,5}$/i.test(url.pathname) && !/\.(xml|txt)$/i.test(url.pathname)) return false; // static files are served by the assets layer
  if (req.headers.get('authorization')) return false;
  if (url.searchParams.has('preview') || url.searchParams.has('nocache')) return false;
  return true;
}

function cacheKey(req: Request, url: URL): Request {
  // RSC requests (in-site navigation) get their own entry; prefetches share it.
  const k = new URL(url.href);
  const rsc = req.headers.get('rsc') === '1' || url.searchParams.has('_rsc');
  k.searchParams.delete('_rsc');
  k.searchParams.set('__mt', rsc ? `rsc-${req.headers.get('next-router-state-tree') ? 'nav' : 'full'}` : 'html');
  if (rsc && req.headers.get('next-router-state-tree')) {
    // The router tree changes the RSC answer; keep a short hash of it in the key.
    let h = 2166136261; const s = req.headers.get('next-router-state-tree') || '';
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    k.searchParams.set('__t', (h >>> 0).toString(36));
  }
  return new Request(k.href, { method: 'GET' });
}

function storable(res: Response): boolean {
  if (res.status !== 200) return false;
  if (res.headers.has('set-cookie')) return false;
  const ct = res.headers.get('content-type') || '';
  if (!/text\/html|text\/x-component|application\/xml|text\/xml|text\/plain/.test(ct)) return false;
  // Next marks request-time pages "no-store", but on these public paths the HTML is the same for
  // every visitor (no cookies are read), so it is safe to keep. Set-Cookie answers are never kept.
  return true;
}

async function store(cache: Cache, key: Request, res: Response) {
  const body = await res.arrayBuffer();
  const h = new Headers(res.headers);
  h.set('cache-control', `public, max-age=${KEEP_S}`);
  h.set('x-mt-page-built', String(Date.now()));
  await cache.put(key, new Response(body, { status: 200, headers: h }));
}

function deliver(res: Response, state: string): Response {
  const h = new Headers(res.headers);
  h.delete('x-mt-page-built');
  h.set('cache-control', 'public, max-age=0, must-revalidate');
  h.set('x-mt-page-cache', state);
  return new Response(res.body, { status: res.status, headers: h });
}

const refreshing = new Set<string>();

export default {
  async fetch(req: Request, env: unknown, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (!cacheable(req, url)) return handler.fetch(req, env, ctx);
    const cache = (globalThis as any).caches?.default as Cache | undefined;
    if (!cache) return handler.fetch(req, env, ctx);
    const key = cacheKey(req, url);

    let hit: Response | undefined;
    try { hit = await cache.match(key); } catch { hit = undefined; }
    if (hit) {
      const age = (Date.now() - Number(hit.headers.get('x-mt-page-built') || 0)) / 1000;
      if (age > FRESH_S && !refreshing.has(key.url)) {
        refreshing.add(key.url);
        ctx.waitUntil((async () => {
          try {
            const fresh = await handler.fetch(new Request(req.url, { headers: req.headers }), env, ctx);
            if (storable(fresh)) await store(cache, key, fresh);
          } catch { /* keep the old copy */ } finally { refreshing.delete(key.url); }
        })());
      }
      return deliver(hit, age > FRESH_S ? 'stale' : 'hit');
    }

    const res: Response = await handler.fetch(req, env, ctx);
    if (storable(res)) {
      const copy = res.clone();
      ctx.waitUntil(store(cache, key, copy).catch(() => {}));
      return deliver(res, 'miss');
    }
    return res;
  },
};
