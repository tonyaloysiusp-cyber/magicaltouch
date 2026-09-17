// ---------------------------------------------------------------------
// lib/editor/artboards.ts
// Multi-artboard document model. Artboards are real Fabric Rect objects
// living on the shared pasteboard canvas (flagged __isArtboard, each
// carrying its own __artboardId). This module holds the pure data/
// geometry side: presets, naming, and the spatial membership test used
// to decide which artboard an object belongs to.
// ---------------------------------------------------------------------

import { DocUnit } from './types';
import { unitToPx } from './units';

export interface ArtboardMeta {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtboardPreset {
  id: string;
  label: string;
  category: string;
  widthPx: number;
  heightPx: number;
}

function fromUnit(value: number, unit: DocUnit) {
  return Math.round(unitToPx(value, unit));
}

// Print-format presets are computed through the same 96px/inch factor the
// rest of the app already uses for its unit system (rulers, mm/cm/in
// fields). Real print-resolution output (300dpi etc.) is a separate,
// export-time concern (see the print-production phase), not baked into
// artboard pixel dimensions here.
export const ARTBOARD_PRESETS: ArtboardPreset[] = [
  { id: 'a0', label: 'A0', category: 'Print', widthPx: fromUnit(841, 'mm'), heightPx: fromUnit(1189, 'mm') },
  { id: 'a1', label: 'A1', category: 'Print', widthPx: fromUnit(594, 'mm'), heightPx: fromUnit(841, 'mm') },
  { id: 'a2', label: 'A2', category: 'Print', widthPx: fromUnit(420, 'mm'), heightPx: fromUnit(594, 'mm') },
  { id: 'a3', label: 'A3', category: 'Print', widthPx: fromUnit(297, 'mm'), heightPx: fromUnit(420, 'mm') },
  { id: 'a4', label: 'A4', category: 'Print', widthPx: fromUnit(210, 'mm'), heightPx: fromUnit(297, 'mm') },
  { id: 'a5', label: 'A5', category: 'Print', widthPx: fromUnit(148, 'mm'), heightPx: fromUnit(210, 'mm') },
  { id: 'letter', label: 'Letter', category: 'Print', widthPx: fromUnit(8.5, 'in'), heightPx: fromUnit(11, 'in') },
  { id: 'legal', label: 'Legal', category: 'Print', widthPx: fromUnit(8.5, 'in'), heightPx: fromUnit(14, 'in') },
  { id: 'tabloid', label: 'Tabloid', category: 'Print', widthPx: fromUnit(11, 'in'), heightPx: fromUnit(17, 'in') },
  { id: 'business-card', label: 'Business Card', category: 'Print', widthPx: fromUnit(89, 'mm'), heightPx: fromUnit(51, 'mm') },
  { id: 'poster', label: 'Poster (18×24 in)', category: 'Print', widthPx: fromUnit(18, 'in'), heightPx: fromUnit(24, 'in') },
  { id: 'flyer', label: 'Flyer (A5)', category: 'Print', widthPx: fromUnit(148, 'mm'), heightPx: fromUnit(210, 'mm') },
  { id: 'banner', label: 'Banner', category: 'Print', widthPx: fromUnit(36, 'in'), heightPx: fromUnit(9, 'in') },

  { id: 'square', label: 'Square Post', category: 'Social', widthPx: 1080, heightPx: 1080 },
  { id: 'ig-post', label: 'Instagram Post', category: 'Social', widthPx: 1080, heightPx: 1080 },
  { id: 'ig-story', label: 'Instagram Story', category: 'Social', widthPx: 1080, heightPx: 1920 },
  { id: 'fb-post', label: 'Facebook Post', category: 'Social', widthPx: 1200, heightPx: 630 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', category: 'Social', widthPx: 1280, heightPx: 720 },
];

let idCounter = 0;
export function createArtboardId() {
  idCounter += 1;
  return `artboard_${Date.now()}_${idCounter}`;
}

export function nextArtboardName(existing: ArtboardMeta[]) {
  const names = new Set(existing.map((a) => a.name));
  let n = existing.length + 1;
  while (names.has(`Artboard ${n}`)) n += 1;
  return `Artboard ${n}`;
}

// Where a newly created artboard should land: to the right of whatever
// already exists, with a visible gap — matching how Illustrator lays out
// new artboards on the pasteboard.
export function nextArtboardPosition(existing: ArtboardMeta[], gap = 80) {
  if (existing.length === 0) return { x: 0, y: 0 };
  const maxRight = Math.max(...existing.map((a) => a.x + a.width));
  return { x: maxRight + gap, y: existing[0].y };
}

export function pointInArtboard(px: number, py: number, a: ArtboardMeta) {
  return px >= a.x && px <= a.x + a.width && py >= a.y && py <= a.y + a.height;
}

// Which artboard "owns" an object, by its center point — matches how
// Illustrator assigns objects to artboards for per-artboard export.
// null means the object is floating on the pasteboard, outside every
// artboard, which is a real, valid state (not an error).
export function findOwningArtboard(centerX: number, centerY: number, artboards: ArtboardMeta[]): string | null {
  for (const a of artboards) {
    if (pointInArtboard(centerX, centerY, a)) return a.id;
  }
  return null;
}

export function boundingBoxOfArtboards(artboards: ArtboardMeta[]) {
  if (artboards.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...artboards.map((a) => a.x));
  const minY = Math.min(...artboards.map((a) => a.y));
  const maxX = Math.max(...artboards.map((a) => a.x + a.width));
  const maxY = Math.max(...artboards.map((a) => a.y + a.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
