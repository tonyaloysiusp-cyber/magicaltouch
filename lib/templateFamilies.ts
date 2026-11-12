// One design, many sizes: the Creative Universe brand sets come as the same
// layout in up to 12 formats (Instagram post, story, flyer, poster…). The
// gallery shows each design once; its other sizes open from the template.

export interface FamilyRow { name: string; width: number; height: number; tags?: string[] | null }

// Which size represents the family in the gallery (first match wins).
const PREFER = [/instagram post/i, /portrait post/i, /\bflyer\b/i, /\bposter\b/i, /\bstory\b/i, /facebook post/i, /linkedin post/i];

/** Family key for templates that are size variants of one design, or null. */
export function familyKey(r: FamilyRow): string | null {
  const tags = r.tags || [];
  if (!tags.includes('universe-2026-11')) return null;
  const brand = tags.find((t) => t.startsWith('brand-set-'));
  const layout = tags.find((t) => t.startsWith('layout-'));
  if (!brand || !layout) return null;
  return `${brand}|${layout}`;
}

const rank = (r: FamilyRow) => { const i = PREFER.findIndex((re) => re.test(r.name)); return i === -1 ? PREFER.length : i; };

/**
 * Keeps one template per family (the preferred size) and every template that
 * is not part of a family, in the original order. `sizes` counts the family.
 */
export function collapseFamilies<T extends FamilyRow>(rows: T[]): { rows: T[]; sizes: Map<T, number> } {
  const best = new Map<string, T>();
  const count = new Map<string, number>();
  for (const r of rows) {
    const k = familyKey(r);
    if (!k) continue;
    count.set(k, (count.get(k) || 0) + 1);
    const cur = best.get(k);
    if (!cur || rank(r) < rank(cur)) best.set(k, r);
  }
  const sizes = new Map<T, number>();
  const out = rows.filter((r) => {
    const k = familyKey(r);
    if (!k) return true;
    if (best.get(k) !== r) return false;
    sizes.set(r, count.get(k) || 1);
    return true;
  });
  return { rows: out, sizes };
}
