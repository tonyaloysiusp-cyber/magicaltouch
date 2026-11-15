// Garment measurements, measured from the pattern pieces themselves (so they
// are true for the standard template, an imported factory pattern and every
// graded size alike). Widths follow the width grade, lengths the length grade.

import type { Piece } from '../garments.ts';
import { flatten, normalize } from './vector.ts';

type Ring = [number, number][];
const ringsOf = (d: string): Ring[] => flatten(normalize(d), 0.5).map((r) => r.pts as Ring);

/** x positions where the outline crosses the horizontal line y. */
function crossX(rings: Ring[], y: number): number[] {
  const xs: number[] = [];
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
  }
  return xs.sort((a, b) => a - b);
}
/** y positions where the outline crosses the vertical line x. */
function crossY(rings: Ring[], x: number): number[] {
  const ys: number[] = [];
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) ys.push(y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
  }
  return ys.sort((a, b) => a - b);
}
const span = (xs: number[]) => (xs.length >= 2 ? xs[xs.length - 1] - xs[0] : 0);

export interface Measure { key: string; label: string; mm: number; how: string }

/** Measurements of a garment (size M block) from its pieces; `k` / `ky` grade widths / lengths. */
export function measureGarment(pieces: Piece[], k = 1, ky = k): Measure[] {
  const out: Measure[] = [];
  const front = pieces.find((p) => p.id === 'front'), back = pieces.find((p) => p.id === 'back');
  const sleeve = pieces.find((p) => p.id === 'sleeve-l') || pieces.find((p) => p.id.startsWith('sleeve'));
  const collar = pieces.find((p) => p.id === 'collar');
  if (front) {
    const R = ringsOf(front.d);
    let chest = 0;
    for (let t = 0.2; t <= 0.46; t += 0.01) chest = Math.max(chest, span(crossX(R, front.h * t)));
    out.push({ key: 'chest', label: 'Chest width (flat, armpit to armpit)', mm: chest * k, how: 'widest point of the front between 20 % and 46 % of its length' });
    out.push({ key: 'length', label: 'Body length (front, shoulder to hem)', mm: front.h * ky, how: 'height of the front piece' });
    out.push({ key: 'hem', label: 'Hem width (flat)', mm: span(crossX(R, front.h - 1)) * k, how: 'front width 1 mm above the hem' });
    // Shoulder: the width across the shoulder points (a little below the highest point of the piece).
    out.push({ key: 'shoulder', label: 'Shoulder width', mm: span(crossX(R, front.h * 0.065)) * k, how: 'front width at the shoulder points' });
    const top = crossX(R, 1);
    let gap = 0; for (let i = 1; i < top.length; i++) gap = Math.max(gap, top[i] - top[i - 1]);
    out.push({ key: 'neckW', label: 'Neck width (seam to seam)', mm: gap * k, how: 'opening between the shoulder seams at the top' });
    const ys = crossY(R, front.w / 2);
    out.push({ key: 'neckF', label: 'Front neck depth', mm: (ys[0] || 0) * ky, how: 'neckline drop at the centre front' });
  }
  if (back) {
    const ys = crossY(ringsOf(back.d), back.w / 2);
    out.push({ key: 'neckB', label: 'Back neck depth', mm: (ys[0] || 0) * ky, how: 'neckline drop at the centre back' });
  }
  if (sleeve) {
    const R = ringsOf(sleeve.d);
    out.push({ key: 'sleeveL', label: 'Sleeve length (cap to hem)', mm: sleeve.h * ky, how: 'height of the sleeve piece' });
    out.push({ key: 'sleeveO', label: 'Sleeve opening (around)', mm: span(crossX(R, sleeve.h - 1)) * k, how: 'width of the flat sleeve at its hem = the opening around the arm' });
    out.push({ key: 'bicep', label: 'Bicep (around)', mm: span(crossX(R, Math.min(sleeve.h - 1, 110))) * k, how: 'width of the flat sleeve just under the cap' });
  }
  if (collar) out.push({ key: 'collar', label: `${collar.label} (length × height)`, mm: collar.w * k, how: `${Math.round(collar.w * k)} × ${Math.round(collar.h)} mm` });
  return out.map((m) => ({ ...m, mm: Math.round(m.mm * 10) / 10 }));
}

export type Unit = 'mm' | 'cm' | 'in';
export const fmtLen = (mm: number, u: Unit) => (u === 'mm' ? `${Math.round(mm)} mm` : u === 'cm' ? `${(mm / 10).toFixed(1)} cm` : `${(mm / 25.4).toFixed(2)}″`);
