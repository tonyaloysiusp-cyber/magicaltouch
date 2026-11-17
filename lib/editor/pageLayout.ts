// Page layout for the editor: columns (for alignment only) or folding panels
// (columns that are also folds — a bi-fold or tri-fold card). With folds the
// page is split into equal panels across the full trim width, a fold line
// sits on every panel edge, and the gutter becomes a safe zone either side
// of each fold. Align-to-column uses the same rectangles.

export interface Rect { x: number; y: number; width: number; height: number }
export interface LayoutPrint {
  margins?: { top: number; right: number; bottom: number; left: number };
  columns?: number; gutter?: number; foldColumns?: boolean;
}

export const LAYOUT_PRESETS: { id: string; label: string; cols: number; fold: boolean }[] = [
  { id: 'none', label: 'No columns', cols: 1, fold: false },
  { id: 'col2', label: '2 columns', cols: 2, fold: false },
  { id: 'col3', label: '3 columns', cols: 3, fold: false },
  { id: 'fold2', label: '2 panels · folded (bi-fold card)', cols: 2, fold: true },
  { id: 'fold3', label: '3 panels · folded (tri-fold)', cols: 3, fold: true },
  { id: 'fold4', label: '4 panels · folded (concertina)', cols: 4, fold: true },
];

export function presetOf(p: LayoutPrint): string {
  const cols = Math.max(1, p.columns || 1);
  if (cols === 1) return 'none';
  return LAYOUT_PRESETS.find((x) => x.cols === cols && x.fold === !!p.foldColumns)?.id || (p.foldColumns ? 'fold' : 'cols');
}

/** Fold positions (canvas x) on a page; empty without folding columns. */
export function foldXs(ab: Rect, p: LayoutPrint): number[] {
  const n = Math.max(1, Math.round(p.columns || 1));
  if (!p.foldColumns || n < 2) return [];
  return Array.from({ length: n - 1 }, (_, i) => ab.x + (ab.width * (i + 1)) / n);
}

/** Content rectangles of the columns (canvas coordinates). */
export function columnRects(ab: Rect, p: LayoutPrint): Rect[] {
  const n = Math.max(1, Math.round(p.columns || 1));
  const m = p.margins || { top: 0, right: 0, bottom: 0, left: 0 };
  const g = Math.max(0, p.gutter ?? 16);
  const y = ab.y + m.top, h = Math.max(0, ab.height - m.top - m.bottom);
  if (p.foldColumns && n > 1) {
    const pw = ab.width / n;
    return Array.from({ length: n }, (_, i) => {
      const l = i === 0 ? m.left : g / 2, r = i === n - 1 ? m.right : g / 2;
      return { x: ab.x + i * pw + l, y, width: Math.max(0, pw - l - r), height: h };
    });
  }
  const x0 = ab.x + m.left, w = Math.max(0, ab.width - m.left - m.right);
  const cw = (w - g * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + g), y, width: Math.max(0, cw), height: h }));
}

/** The column under a point (nearest by centre when between columns). */
export function columnAt(rects: Rect[], x: number): Rect | null {
  if (!rects.length) return null;
  const hit = rects.find((r) => x >= r.x && x <= r.x + r.width);
  if (hit) return hit;
  return rects.reduce((a, b) => (Math.abs(b.x + b.width / 2 - x) < Math.abs(a.x + a.width / 2 - x) ? b : a));
}
