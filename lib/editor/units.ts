// ---------------------------------------------------------------------
// lib/editor/units.ts
// The single unit-conversion module for the whole app -- Main Design,
// Photo Studio, and every export path (PDF/print) all convert through
// this file rather than each keeping its own copy of the same
// px-per-inch/pt-per-px math. Document geometry always stays in px
// internally (see pxToUnit/unitToPx below); everything else is a display
// conversion computed from that stored px value, never the other way
// around -- so switching the displayed unit can never resize a document.
// ---------------------------------------------------------------------

import { useSyncExternalStore } from 'react';
import type { DocUnit } from './types';

export const PX_PER_INCH = 96;

// Real PDF points, independent of any artboard's own print DPI (a raster-
// quality setting, not a geometry scale) -- see pdfExport.ts's header for
// the empirical reason this app's whole document/canvas coordinate space
// is fixed at 96px = 1in. Canonical home for this constant: pdfExport.ts
// and preflight.ts both import it from here instead of each redefining
// their own copy of the same 72/96 ratio.
export const PT_PER_PX = 72 / PX_PER_INCH;
export const toPt = (px: number): number => px * PT_PER_PX;

// ---------------------------------------------------------------------
// Global display-unit preference
// ---------------------------------------------------------------------
// One shared, persisted "what unit am I looking at" setting for the
// whole app -- Main Design, /create, and Photo Studio all read and write
// the SAME preference (via useDisplayUnit()) instead of each keeping its
// own disconnected local unit state, so choosing "mm" in one workspace
// is still "mm" when you open the other. Backed by localStorage so it
// survives navigating between these separate Next.js pages, and kept
// live across open tabs via the native `storage` event.
//
// This is deliberately just a DISPLAY preference: no document's actual
// width/height/DPI is stored here, and nothing here can resize a
// document -- it only changes which unit existing px values are shown
// in. See CHANGING UNIT MUST NOT CHANGE DOCUMENT SIZE in the engineering
// brief this implements.
const DISPLAY_UNIT_STORAGE_KEY = 'magicaltouch:displayUnit';
const displayUnitListeners = new Set<() => void>();

function isDocUnit(value: unknown): value is DocUnit {
  return value === 'px' || value === 'mm' || value === 'cm' || value === 'in' || value === 'pt';
}

export function getDisplayUnit(): DocUnit {
  if (typeof window === 'undefined') return 'px';
  const stored = window.localStorage.getItem(DISPLAY_UNIT_STORAGE_KEY);
  return isDocUnit(stored) ? stored : 'px';
}

export function setDisplayUnit(unit: DocUnit): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISPLAY_UNIT_STORAGE_KEY, unit);
  displayUnitListeners.forEach((listener) => listener());
}

function subscribeDisplayUnit(listener: () => void): () => void {
  displayUnitListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DISPLAY_UNIT_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    displayUnitListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Drop-in replacement for `useState<DocUnit>('px')` that every editor/page shares the same live value through. */
export function useDisplayUnit(): [DocUnit, (unit: DocUnit) => void] {
  const unit = useSyncExternalStore(subscribeDisplayUnit, getDisplayUnit, () => 'px' as DocUnit);
  return [unit, setDisplayUnit];
}

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
