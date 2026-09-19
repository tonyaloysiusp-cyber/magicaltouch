// ---------------------------------------------------------------------
// lib/editor/units.ts
// Document unit conversion. Geometry stays in px internally.
// ---------------------------------------------------------------------

import type { DocUnit } from './types';

export const PX_PER_INCH = 96;

export const UNIT_FACTORS: Record<DocUnit, number> = {
  px: 1,
  in: PX_PER_INCH,
  cm: PX_PER_INCH / 2.54,
  mm: PX_PER_INCH / 25.4,
  pt: PX_PER_INCH / 72,
};

export function pxToUnit(px: number, unit: DocUnit) {
  return px / UNIT_FACTORS[unit];
}

export function unitToPx(value: number, unit: DocUnit) {
  return value * UNIT_FACTORS[unit];
}

export function formatUnit(px: number, unit: DocUnit) {
  const v = pxToUnit(px, unit);
  return unit === 'px' ? Math.round(v).toString() : v.toFixed(2);
}

export function getObjectPixelSize(obj: any): { w: number; h: number } {
  if (!obj) return { w: 0, h: 0 };
  if (obj.type === 'circle') {
    const d = (obj.radius || 0) * 2;
    return { w: d * (obj.scaleX || 1), h: d * (obj.scaleY || 1) };
  }
  return {
    w: (obj.width || 0) * (obj.scaleX || 1),
    h: (obj.height || 0) * (obj.scaleY || 1),
  };
}
