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

async function waitUntil(p: Promise<unknown>) {
  try {
    const mod: any = await import('@opennextjs/cloudflare');
    const ctx = mod.getCloudflareContext?.()?.ctx;
    if (ctx?.waitUntil) { ctx.waitUntil(p); return; }
  } catch { /* not on Cloudflare */ }
  await p;
}

async function buildAndStore(c: Cache | null, req: Request, build: () => Promise<Response>): Promise<{ body: ArrayBuffer; headers: Headers } | Response> {
  const fresh = await build();
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
  if (c) {
    const hit = await c.match(req).catch(() => undefined);
    if (hit) {
      const age = (Date.now() - Number(hit.headers.get('x-mt-built') || 0)) / 1000;
      if (age > ttlSeconds && !building.has(key)) {
        // One background rebuild at a time per server.
        const job = buildAndStore(c, req, build).catch(() => null).finally(() => building.delete(key));
        building.set(key, job);
        await waitUntil(job);
      }
      return out(hit.body, hit.headers, age > ttlSeconds ? 'stale' : 'hit');
    }
  }
  const r = await buildAndStore(c, req, build);
  if (r instanceof Response) return r;
  return out(r.body, r.headers, 'miss');
}

export async function purgeEdge(keys = EDGE_KEYS) {
  const c = store();
  if (!c) return 0;
  let n = 0;
  for (const k of keys) if (await c.delete(new Request(ORIGIN + k)).catch(() => false)) n++;
  return n;
}
