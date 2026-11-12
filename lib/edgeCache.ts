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

export async function edgeCached(key: string, ttlSeconds: number, build: () => Promise<Response>): Promise<Response> {
  const c = store();
  const req = new Request(ORIGIN + key);
  if (c) {
    const hit = await c.match(req).catch(() => undefined);
    if (hit) { const r = new Response(hit.body, hit); r.headers.set('x-mt-cache', 'hit'); return r; }
  }
  const fresh = await build();
  if (!fresh.ok) return fresh;
  const body = await fresh.arrayBuffer();
  const headers = new Headers(fresh.headers);
  headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
  if (c) await c.put(req, new Response(body, { status: 200, headers })).catch(() => {});
  // Browsers keep it one minute; the edge copy keeps the database quiet.
  const out = new Headers(headers);
  out.set('Cache-Control', 'public, max-age=60');
  out.set('x-mt-cache', 'miss');
  return new Response(body, { status: 200, headers: out });
}

export async function purgeEdge(keys = EDGE_KEYS) {
  const c = store();
  if (!c) return 0;
  let n = 0;
  for (const k of keys) if (await c.delete(new Request(ORIGIN + k)).catch(() => false)) n++;
  return n;
}
