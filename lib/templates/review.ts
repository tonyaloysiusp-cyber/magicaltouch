// Template Quality & Review — shared rules for the admin review screen.
// Decisions are stored as tags (no schema change needed):
//   review:keep | review:improve | review:replace | review:later
// Archive = status "unpublished" + tag "archived" + a redirect from the old
// URL to the template's category page (restorable at any time).

export type Decision = 'keep' | 'improve' | 'replace' | 'archive' | 'later';
export const DECISIONS: { id: Decision; label: string; hint: string; tone: string }[] = [
  { id: 'keep', label: 'Keep', hint: 'Good as it is — stays published', tone: 'bg-emerald-600 text-white' },
  { id: 'improve', label: 'Improve', hint: 'Good idea, needs better design', tone: 'bg-sky-600 text-white' },
  { id: 'replace', label: 'Replace', hint: 'Weak design — make a new one first', tone: 'bg-amber-500 text-white' },
  { id: 'archive', label: 'Archive', hint: 'Remove from the gallery (restorable)', tone: 'bg-rose-600 text-white' },
  { id: 'later', label: 'Review later', hint: 'Not sure yet', tone: 'bg-zinc-500 text-white' },
];

export interface ReviewRow {
  id: string; name: string; slug: string | null; category: string | null; status: string; tags: string[] | null;
  thumbnail: string | null; preview: string | null; width: number; height: number; color1: string | null; color2: string | null;
  is_free: boolean; description: string | null; hashtags: string[] | null; updated_at: string | null; created_at: string | null;
}

export function decisionOf(r: Pick<ReviewRow, 'tags' | 'status'>): Decision | null {
  const t = r.tags || [];
  if (t.includes('archived')) return 'archive';
  const d = t.find((x) => x.startsWith('review:'));
  return d ? (d.slice(7) as Decision) : null;
}

export function collectionOf(tags: string[] | null): string {
  const t = tags || [];
  if (t.includes('pro-pilot-2026-11')) return 'Pro brand sets';
  if (t.includes('birthday-pro-2026-11')) return 'Birthday collection';
  if (t.includes('diwali-pro-2026-11')) return 'Diwali Pro';
  if (t.includes('universe-2026-11')) return 'Creative Universe';
  if (t.includes('mass-collection')) return 'Mass collection';
  if (t.includes('wave-2026-11')) return 'Wave 2';
  if (t.includes('collection-500')) return 'Collection 500';
  if (t.includes('albums-2026-11')) return 'Photo albums';
  return 'Earlier library';
}

/** Suggested score out of 100 (automatic — a hint, not a verdict). */
export function suggestedScore(r: ReviewRow): { score: number; level: string; notes: string[] } {
  const notes: string[] = [];
  const base: Record<string, number> = { 'Pro brand sets': 92, 'Birthday collection': 88, 'Diwali Pro': 86, 'Creative Universe': 82, 'Photo albums': 80, 'Collection 500': 74, 'Earlier library': 74, 'Wave 2': 70, 'Mass collection': 68 };
  let s = base[collectionOf(r.tags)] ?? 72;
  if (!r.thumbnail) { s -= 25; notes.push('No preview image'); }
  if (!r.description || r.description.length < 80) { s -= 4; notes.push('Short description'); }
  if (!r.hashtags || r.hashtags.length < 3) { s -= 3; notes.push('Few hashtags'); }
  if (!r.category) { s -= 5; notes.push('No category'); }
  if (/\b(\d{2,})$/.test(r.name) || /template \d+/i.test(r.name)) { s -= 6; notes.push('Generic name'); }
  s = Math.max(0, Math.min(100, s));
  const level = s >= 90 ? 'Premium' : s >= 80 ? 'Professional' : s >= 70 ? 'Needs refinement' : s >= 60 ? 'Major improvement' : 'Redesign';
  return { score: s, level, notes };
}

export const categorySlug = (c: string) => c.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** New tag list for a decision (removes any earlier review decision). */
export function tagsFor(tags: string[] | null, d: Decision | 'restore'): string[] {
  const t = (tags || []).filter((x) => !x.startsWith('review:') && x !== 'archived');
  if (d === 'restore') return t;
  if (d === 'archive') return [...t, 'archived'];
  return [...t, `review:${d}`];
}
