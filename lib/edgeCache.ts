// A small edge cache for API lists that change when admins publish, hide or
// delete templates. The site's page cache is baked in at build time, so lists
// served from it would stay old until the next rebuild; these routes are
// dynamic instead and keep their answer in Cloudflare's cache for a few
// minutes. Admin → "Refresh site" clears it (lib/edgeCache.purge).

const ORIGIN = 'https://edge-cache.magicaltouchdesign.internal/';
const store = (): Cache | null => {
  try { return ((globalThis as any).caches?.default as Cache) || null; } catch { return null; }
};

export const EDGE_KEYS = ['public-templates-v3', 'home-showcase-v3'];

// Keeps the answer for a day but treats it as fresh for `ttlSeconds`: an
// older copy is served at once while a new one is built in the background
// (stale-while-revalidate), so no visitor waits for the database.
const KEEP = 86400;
const building = new Map<string, Promise<unknown>>();

// Protects the database when it is slow or down (24 Nov 2026: every page view
// asked it for the same settings; once it slowed, the piled-up queries took
// the login server down with it):
//  • every database call has a time limit, so a page never waits on it;
//  • answers are also kept in this server's memory, so most views never
//    reach the database at all;
//  • a failed answer is remembered for a minute, so a struggling database is
//    asked once a minute per server — not once per visitor;
//  • the same question asked by many visitors at once is sent only once.
const BUILD_TIMEOUT_MS = 4000;
const FAIL_TTL_MS = 60_000;
const memo = new Map<string, { at: number; body: ArrayBuffer; headers: Headers }>();
const failed = new Map<string, number>();
const inflight = new Map<string, Promise<{ body: ArrayBuffer; headers: Headers } | Response>>();
const MEMO_MAX = 400;

function withTimeout(build: () => Promise<Response>): Promise<Response> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(new Response('timeout', { status: 504 })), BUILD_TIMEOUT_MS);
    build().then((r) => { clearTimeout(t); resolve(r); }, () => { clearTimeout(t); resolve(new Response('error', { status: 502 })); });
  });
}
function remember(key: string, body: ArrayBuffer, headers: Headers) {
  if (memo.size >= MEMO_MAX) { const first = memo.keys().next().value; if (first !== undefined) memo.delete(first); }
  memo.set(key, { at: Number(headers.get('x-mt-built') || Date.now()), body, headers });
  failed.delete(key);
}

async function waitUntil(p: Promise<unknown>) {
  try {
    const mod: any = await import('@opennextjs/cloudflare');
    const ctx = mod.getCloudflareContext?.()?.ctx;
    if (ctx?.waitUntil) { ctx.waitUntil(p); return; }
  } catch { /* not on Cloudflare */ }
  await p;
}

async function buildAndStore(c: Cache | null, req: Request, build: () => Promise<Response>): Promise<{ body: ArrayBuffer; headers: Headers } | Response> {
  const fresh = await withTimeout(build);
  if (!fresh.ok) return fresh;
  const body = await fresh.arrayBuffer();
  const headers = new Headers(fresh.headers);
  headers.set('Cache-Control', `public, max-age=${KEEP}`);
  headers.set('x-mt-built', String(Date.now()));
  if (c) await c.put(req, new Response(body, { status: 200, headers })).catch(() => {});
  return { body, headers };
}

export async function edgeCached(key: string, ttlSeconds: number, build: () => Promise<Response>): Promise<Response> {
  const c = store();
  const req = new Request(ORIGIN + key);
  const out = (body: BodyInit | null, h: Headers, state: string) => {
    const o = new Headers(h);
    o.set('Cache-Control', 'public, max-age=60');
    o.set('x-mt-cache', state);
    return new Response(body, { status: 200, headers: o });
  };
  const rebuild = (cache: Cache | null) => {
    if (building.has(key)) return;
    const job = buildAndStore(cache, req, build)
      .then((r) => { if (r instanceof Response) failed.set(key, Date.now()); else remember(key, r.body, r.headers); })
      .catch(() => { failed.set(key, Date.now()); })
      .finally(() => building.delete(key));
    building.set(key, job);
    void waitUntil(job);
  };
  const recentlyFailed = () => Date.now() - (failed.get(key) || 0) < FAIL_TTL_MS;

  // 1. this server's memory
  const m = memo.get(key);
  if (m) {
    const age = (Date.now() - m.at) / 1000;
    if (age > ttlSeconds && !recentlyFailed()) rebuild(c);
    return out(m.body.slice(0), m.headers, age > ttlSeconds ? 'stale' : 'hit');
  }
  // 2. Cloudflare's cache in this data centre
  if (c) {
    const hit = await c.match(req).catch(() => undefined);
    if (hit) {
      const body = await hit.arrayBuffer();
      remember(key, body, new Headers(hit.headers));
      const age = (Date.now() - Number(hit.headers.get('x-mt-built') || 0)) / 1000;
      if (age > ttlSeconds && !recentlyFailed()) rebuild(c);
      return out(body.slice(0), hit.headers, age > ttlSeconds ? 'stale' : 'hit');
    }
  }
  // 3. the database — once per server at a time, and not again for a minute after a failure
  if (recentlyFailed()) return new Response('unavailable', { status: 503 });
  let p = inflight.get(key);
  if (!p) {
    p = buildAndStore(c, req, build).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  const r = await p;
  if (r instanceof Response) { failed.set(key, Date.now()); return new Response('unavailable', { status: r.status || 503 }); }
  remember(key, r.body, r.headers);
  return out(r.body.slice(0), r.headers, 'miss');
}

export async function purgeEdge(keys = EDGE_KEYS) {
  const c = store();
  if (!c) return 0;
  let n = 0;
  for (const k of keys) { memo.delete(k); failed.delete(k); if (await c.delete(new Request(ORIGIN + k)).catch(() => false)) n++; }
  return n;
}
