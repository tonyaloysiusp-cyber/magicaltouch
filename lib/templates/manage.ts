// Helpers for Admin → Template Manager (app/admin/library/page.tsx).
// Kept free of React and Supabase so they can be unit tested.

export interface Cat { id: string; name: string; slug: string; parent_id: string | null; sort_order: number | null }
export interface CatNode extends Cat { children: CatNode[]; depth: number }

export const BIN_TAG = 'bin';
const FROM_PREFIX = 'bin-from:';

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'category';
}

/** A slug not already in `taken` (adds -2, -3 … when needed). */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const root = slugify(base);
  if (!set.has(root)) return root;
  for (let i = 2; ; i++) if (!set.has(`${root}-${i}`)) return `${root}-${i}`;
}

/** Categories as a sorted tree (sort_order, then name). */
export function buildTree(cats: Cat[]): CatNode[] {
  const byId = new Map<string, CatNode>();
  cats.forEach((c) => byId.set(c.id, { ...c, children: [], depth: 0 }));
  const roots: CatNode[] = [];
  for (const n of byId.values()) {
    const p = n.parent_id ? byId.get(n.parent_id) : undefined;
    if (p && p.id !== n.id) p.children.push(n); else roots.push(n);
  }
  const sort = (list: CatNode[], depth: number) => {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    list.forEach((n) => { n.depth = depth; sort(n.children, depth + 1); });
  };
  sort(roots, 0);
  return roots;
}

/** Flattened tree in display order. */
export function flatten(tree: CatNode[]): CatNode[] {
  const out: CatNode[] = [];
  const walk = (l: CatNode[]) => l.forEach((n) => { out.push(n); walk(n.children); });
  walk(tree);
  return out;
}

/** The id plus every descendant id. */
export function withDescendants(id: string, cats: Cat[]): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) cats.forEach((c) => { if (c.parent_id === out[i] && !out.includes(c.id)) out.push(c.id); });
  return out;
}

/** Name of the top-level category: the gallery files templates under it. */
export function rootName(id: string | null, cats: Cat[]): string {
  let c = cats.find((x) => x.id === id);
  const seen = new Set<string>();
  while (c && c.parent_id && !seen.has(c.id)) { seen.add(c.id); const p = cats.find((x) => x.id === c!.parent_id); if (!p) break; c = p; }
  return c?.name || '';
}

/** Can `id` be moved under `newParent` without making a loop? */
export function canMoveUnder(id: string, newParent: string | null, cats: Cat[]): boolean {
  if (!newParent) return true;
  return !withDescendants(id, cats).includes(newParent);
}

/** Tags after moving a template to the bin (remembers its old status). */
export function binTags(tags: string[] | null, status: string): string[] {
  const t = (tags || []).filter((x) => x !== BIN_TAG && !x.startsWith(FROM_PREFIX));
  return [...t, BIN_TAG, `${FROM_PREFIX}${status || 'draft'}`];
}

/** Tags and status after restoring from the bin. */
export function unbin(tags: string[] | null): { tags: string[]; status: string } {
  const from = (tags || []).find((x) => x.startsWith(FROM_PREFIX))?.slice(FROM_PREFIX.length);
  return { tags: (tags || []).filter((x) => x !== BIN_TAG && !x.startsWith(FROM_PREFIX)), status: from === 'published' || from === 'unpublished' ? from : 'draft' };
}

export function inBin(tags: string[] | null): boolean { return (tags || []).includes(BIN_TAG); }

/** Short label for a canvas size, e.g. "1080 × 1080 · Square". */
export function sizeLabel(w: number, h: number): string {
  const shape = Math.abs(w - h) < Math.max(w, h) * 0.04 ? 'Square' : w > h ? 'Landscape' : 'Portrait';
  return `${w} × ${h} · ${shape}`;
}

/** Copy name for a duplicate: "Name (copy)", "Name (copy 2)" … */
export function copyName(name: string): string {
  const m = name.match(/^(.*) \(copy(?: (\d+))?\)$/);
  if (!m) return `${name} (copy)`;
  return `${m[1]} (copy ${m[2] ? Number(m[2]) + 1 : 2})`;
}
