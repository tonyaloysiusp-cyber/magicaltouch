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

// A raster image's real print size depends on ITS OWN dpi (pixels per
// inch), not the fixed 96px/in convention pxToUnit/unitToPx use for
// vector document geometry — 3600px at 300dpi really is 12in, regardless
// of what an on-screen CSS inch happens to be. Used by the Photo
// Editor's Resize Image dialog (Width/Height in px, cm, mm, in or pt).
export function pxToPhysicalUnit(px: number, unit: DocUnit, dpi: number): number {
  if (unit === 'px') return px;
  const inches = px / dpi;
  switch (unit) {
    case 'in': return inches;
    case 'cm': return inches * 2.54;
    case 'mm': return inches * 25.4;
    case 'pt': return inches * 72;
    default: return px;
  }
}

export function physicalUnitToPx(value: number, unit: DocUnit, dpi: number): number {
  if (unit === 'px') return value;
  let inches: number;
  switch (unit) {
    case 'in': inches = value; break;
    case 'cm': inches = value / 2.54; break;
    case 'mm': inches = value / 25.4; break;
    case 'pt': inches = value / 72; break;
    default: inches = value / dpi;
  }
  return inches * dpi;
}

export function formatPhysicalUnit(px: number, unit: DocUnit, dpi: number): string {
  const v = pxToPhysicalUnit(px, unit, dpi);
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
