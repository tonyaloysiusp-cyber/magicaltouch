// The template catalog as static files (public/catalog, written by
// scripts/export-catalog.mjs). Read by the server (template pages, gallery
// list, search, sitemap, counts) and by the browser (opening a template), so
// the free database only serves sign-in and users' own designs.
// Every function returns null when the catalog is missing, and callers then
// fall back to the database exactly as before.

export const CATALOG_SHARDS = 256;
export function shardOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % CATALOG_SHARDS;
}

export interface CatalogRow {
  id: string; name: string; slug: string | null; category: string; category_id: string | null;
  width: number; height: number; color1: string | null; color2: string | null; sort_order: number | null;
  thumbnail: string | null; preview: string | null; description: string | null; tags: string[] | null;
  status: string; is_featured: boolean; is_free: boolean; unit: string | null; dpi: number | null; color_mode: string | null;
  current_version: string | null; published_at: string | null; updated_at: string | null; orientation: string | null;
  occasion: string | null; industry: string | null; language: string | null; search_keywords: string | null;
  hashtags: string[] | null; rights_status: string | null; has_design: boolean;
}
interface CatalogIndex { v: number; built: string; count: number; rows: CatalogRow[] }

const TTL = 10 * 60 * 1000;
let indexMemo: { at: number; p: Promise<CatalogIndex | null> } | null = null;
const shardMemo = new Map<number, { at: number; p: Promise<Record<string, any> | null> }>();

async function getFile(path: string): Promise<Response | null> {
  try {
    if (typeof window !== 'undefined') return await fetch(path);
    // On Cloudflare, read the file straight from the site's own assets (no network hop).
    try {
      const mod: any = await import('@opennextjs/cloudflare');
      const assets = mod.getCloudflareContext?.()?.env?.ASSETS;
      if (assets?.fetch) return await assets.fetch(new Request(`https://assets.local${path}`));
    } catch { /* not on Cloudflare */ }
    const site = process.env.SITE_URL || 'https://www.magicaltouchdesign.com';
    return await fetch(`${site}${path}`);
  } catch {
    return null;
  }
}

async function loadIndex(): Promise<CatalogIndex | null> {
  const r = await getFile('/catalog/index.json');
  if (!r || !r.ok) return null;
  try {
    const j = (await r.json()) as CatalogIndex;
    return j && Array.isArray(j.rows) && j.rows.length ? j : null;
  } catch { return null; }
}

/** Every published template (list fields), or null when there is no catalog. */
export async function catalogRows(): Promise<CatalogRow[] | null> {
  if (!indexMemo || Date.now() - indexMemo.at > TTL) {
    const p = loadIndex();
    indexMemo = { at: Date.now(), p };
    p.then((v) => { if (!v && indexMemo?.p === p) indexMemo = null; });
  }
  const p = indexMemo.p;
  return (await p)?.rows ?? null;
}

/** Published templates that have a design, in gallery order (featured, sort order, id). */
export async function catalogGallery(): Promise<CatalogRow[] | null> {
  const rows = await catalogRows();
  if (!rows) return null;
  return rows.filter((r) => r.has_design).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.id < b.id ? -1 : 1));
}

/** One full template row (with its design) from the catalog, or null. */
export async function catalogTemplate(id: string): Promise<any | null> {
  if (!id) return null;
  const s = shardOf(id);
  let m = shardMemo.get(s);
  if (!m || Date.now() - m.at > TTL) {
    const p = getFile(`/catalog/t/${s}.json`).then(async (r) => (r && r.ok ? ((await r.json()) as Record<string, any>) : null)).catch(() => null);
    m = { at: Date.now(), p };
    shardMemo.set(s, m);
    if (shardMemo.size > 32) { const first = shardMemo.keys().next().value; if (first !== undefined) shardMemo.delete(first); }
    p.then((v) => { if (!v && shardMemo.get(s)?.p === p) shardMemo.delete(s); });
  }
  const shard = await m.p; // m is a local copy, safe after the await
  return shard?.[id] ?? null;
}
