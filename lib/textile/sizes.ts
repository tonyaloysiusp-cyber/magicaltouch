// Ready-made sizes (XS–XXXL) like the size labels in clothing shops, so a
// customer can pick "M" and then change only what differs (hip, waist…).
// These are typical market body measurements (cm), graded by fixed steps per
// size — a starting point, NOT a manufacturer's specification. The UI marks
// them as "standard ready-made chart — check against your brand".

import type { Measures } from './draft.ts';

export const READY_SIZE_NAMES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
export type ReadySize = (typeof READY_SIZE_NAMES)[number];

type Chart = { base: Measures; grade: Measures }; // base = size M, grade = change per size step
const CHARTS: Record<'kurta' | 'chudidar' | 'tee', Chart> = {
  kurta: {
    base: { bust: 91, waist: 76, hip: 99, shoulder: 36.5, length: 107, waistLength: 39, armhole: 42, frontNeck: 17.5, backNeck: 6, sleeveLength: 45, bicep: 29.5, sleeveOpening: 23 },
    grade: { bust: 5, waist: 5, hip: 5, shoulder: 1.5, length: 1, waistLength: 1, armhole: 2, frontNeck: 0.5, backNeck: 0, sleeveLength: 1, bicep: 1.5, sleeveOpening: 1 },
  },
  chudidar: {
    base: { waist: 71, hip: 99, crotch: 27, thigh: 57, knee: 38, calf: 35, ankle: 24, length: 99, kneeLength: 57 },
    grade: { waist: 5, hip: 5, crotch: 1, thigh: 3, knee: 2, calf: 2, ankle: 1, length: 1, kneeLength: 1 },
  },
  tee: {
    base: { chest: 101, length: 71, shoulder: 44, armhole: 46, sleeveLength: 21, bicep: 34, sleeveOpening: 34, hem: 101, neckWidth: 17.5, frontNeck: 9.5, backNeck: 2 },
    grade: { chest: 5, length: 2, shoulder: 2, armhole: 2, sleeveLength: 1, bicep: 2, sleeveOpening: 2, hem: 5, neckWidth: 0.5, frontNeck: 0.5, backNeck: 0 },
  },
};

export const hasReadySizes = (type: string): type is 'kurta' | 'chudidar' | 'tee' => type in CHARTS;

/** Body measurements (cm) of a ready-made size. */
export function readySize(type: 'kurta' | 'chudidar' | 'tee', size: ReadySize): Measures {
  const c = CHARTS[type], step = READY_SIZE_NAMES.indexOf(size) - READY_SIZE_NAMES.indexOf('M');
  const out: Measures = {};
  for (const k of Object.keys(c.base)) out[k] = Math.round(((c.base[k] as number) + (c.grade[k] || 0) * step) * 10) / 10;
  return out;
}

/** Which ready size the measurements started from and which values were changed by hand. */
export function changedFrom(type: 'kurta' | 'chudidar' | 'tee', size: ReadySize | null | undefined, m: Measures): string[] {
  if (!size) return [];
  const r = readySize(type, size);
  return Object.keys(r).filter((k) => m[k] != null && Math.abs((m[k] as number) - (r[k] as number)) > 0.05);
}
