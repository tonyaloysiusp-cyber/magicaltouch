// Roll nesting for sublimation print files.
//
// Pieces are placed as rectangles (their bounding box plus bleed and a
// label line) on a roll of fixed width and open length, using MaxRects with
// a "lowest end first" rule: every piece goes where it ends nearest the start
// of the roll, then furthest left. Pieces may be turned 90° when allowed.
// This packs far tighter than rows of pieces, never overlaps (checked), and
// reports the real fabric use from each piece's true area.

export interface NestItem { id: string; w: number; h: number; /** True shape area (mm²) for utilisation; defaults to w × h. */ area?: number; canRotate?: boolean; /** Fixed position (manual move / lock). */ fixed?: { x: number; y: number; rot?: boolean } }
export interface NestPlaced { id: string; x: number; y: number; w: number; h: number; rot: boolean }
export interface NestResult { placed: NestPlaced[]; length: number; utilisation: number; overlaps: [string, string][]; tooWide: string[] }
export interface NestOptions { rollW: number; gap: number; /** Leave pieces in the given order (rows by player) instead of largest first. */ keepOrder?: boolean }

type Rect = { x: number; y: number; w: number; h: number };
const EPS = 1e-6;

/** Tries a few orderings and orientation preferences and keeps the shortest layout. */
export function nest(items: NestItem[], o: NestOptions): NestResult {
  const prefs: ('any' | 'tall' | 'wide')[] = ['any', 'tall', 'wide'];
  const sorts: ('size' | 'height' | 'width' | 'area')[] = o.keepOrder ? ['size'] : ['size', 'height', 'width', 'area'];
  let best: NestResult | null = null;
  for (const pref of prefs) for (const sort of sorts) {
    const r = nestOnce(items, o, pref, sort);
    if (!best || r.length < best.length - 1e-6) best = r;
  }
  return best!;
}

function nestOnce(items: NestItem[], o: NestOptions, pref: 'any' | 'tall' | 'wide', sort: 'size' | 'height' | 'width' | 'area'): NestResult {
  const { rollW, gap } = o;
  const H = items.reduce((s, it) => s + Math.max(it.w, it.h) + gap, gap) + 10;
  // Free rectangles live inside the usable band [gap, rollW - gap]; each piece reserves its size + gap.
  let free: Rect[] = [{ x: gap, y: gap, w: rollW - gap, h: H }];
  const placed: NestPlaced[] = [];
  const tooWide: string[] = [];
  const reserve = (r: Rect) => {
    const next: Rect[] = [];
    for (const f of free) {
      if (r.x >= f.x + f.w - EPS || r.x + r.w <= f.x + EPS || r.y >= f.y + f.h - EPS || r.y + r.h <= f.y + EPS) { next.push(f); continue; }
      if (r.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w - EPS) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
      if (r.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h - EPS) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
    }
    // Drop rectangles contained in others.
    free = next.filter((a, i) => a.w > EPS && a.h > EPS && !next.some((b, j) => j !== i && b.x <= a.x + EPS && b.y <= a.y + EPS && b.x + b.w >= a.x + a.w - EPS && b.y + b.h >= a.y + a.h - EPS && (j < i || b.w * b.h > a.w * a.h + EPS)));
  };
  // Fixed (locked / moved by hand) pieces first.
  for (const it of items) if (it.fixed) {
    const rot = !!it.fixed.rot, w = rot ? it.h : it.w, h = rot ? it.w : it.h;
    placed.push({ id: it.id, x: it.fixed.x, y: it.fixed.y, w, h, rot });
    reserve({ x: it.fixed.x, y: it.fixed.y, w: w + gap, h: h + gap });
  }
  const order = items.filter((it) => !it.fixed);
  const key = (it: NestItem) => sort === 'height' ? Math.min(it.w, it.h) : sort === 'width' ? Math.max(it.w, it.h) * 1e6 + Math.min(it.w, it.h) : sort === 'area' ? it.w * it.h : Math.max(it.w, it.h) * 1e6 + it.w * it.h;
  if (!o.keepOrder) order.sort((a, b) => key(b) - key(a));
  for (const it of order) {
    let best: { x: number; y: number; rot: boolean; end: number } | null = null;
    // Orientation preference: the preferred way first. The other way is weighed too when it does not fit,
    // or when the preferred way would make the roll longer than it already is.
    const wantRot = pref === 'tall' ? it.w > it.h : pref === 'wide' ? it.h > it.w : null;
    const curLen = placed.length ? Math.max(...placed.map((p) => p.y + p.h + gap)) : 0;
    const tries: boolean[][] = it.canRotate === false ? [[false]] : wantRot == null ? [[false, true]] : [[wantRot], [!wantRot]];
    for (const set of tries) { if (best && (!curLen || best.end <= curLen + EPS)) break; for (const rot of set) {
      const w = (rot ? it.h : it.w) + gap, h = (rot ? it.w : it.h) + gap;
      for (const f of free) {
        if (w > f.w + EPS || h > f.h + EPS) continue;
        if (f.x + w - gap > rollW - gap + EPS) continue;
        const end = f.y + h;
        if (!best || end < best.end - EPS || (Math.abs(end - best.end) <= EPS && f.x < best.x)) best = { x: f.x, y: f.y, rot, end };
      }
    } }
    if (!best) {
      // Wider than the roll both ways: put it on its own band after everything, flagged.
      tooWide.push(it.id);
      const y = Math.max(gap, ...placed.map((p) => p.y + p.h + gap));
      placed.push({ id: it.id, x: gap, y, w: it.w, h: it.h, rot: false });
      reserve({ x: 0, y, w: rollW + it.w, h: it.h + gap });
      continue;
    }
    const w = best.rot ? it.h : it.w, h = best.rot ? it.w : it.h;
    placed.push({ id: it.id, x: best.x, y: best.y, w, h, rot: best.rot });
    reserve({ x: best.x, y: best.y, w: w + gap, h: h + gap });
  }
  const length = Math.ceil(Math.max(gap, ...placed.map((p) => p.y + p.h)) + gap);
  const area = items.reduce((s, it) => s + (it.area ?? it.w * it.h), 0);
  return { placed, length, utilisation: length > 0 ? Math.min(1, area / (rollW * length)) : 0, overlaps: findOverlaps(placed, 0), tooWide };
}

/** Pairs of pieces that overlap (or come closer than `gap`). A layout with any is never ready to print. */
export function findOverlaps(placed: { id: string; x: number; y: number; w: number; h: number }[], gap = 0): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    if (a.x < b.x + b.w + gap - EPS && b.x < a.x + a.w + gap - EPS && a.y < b.y + b.h + gap - EPS && b.y < a.y + a.h + gap - EPS) out.push([a.id, b.id]);
  }
  return out;
}

/** Area of a closed polygon (shoelace), for true fabric use. */
export function polyArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(s / 2);
}
