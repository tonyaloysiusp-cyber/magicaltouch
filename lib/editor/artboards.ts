// ---------------------------------------------------------------------
// lib/editor/artboards.ts
// Multi-artboard document model. Artboards are real Fabric Rect objects
// living on the shared pasteboard canvas (flagged __isArtboard, each
// carrying its own __artboardId). This module holds the pure data/
// geometry side: presets, naming, and the spatial membership test used
// to decide which artboard an object belongs to.
// ---------------------------------------------------------------------

import { ArtboardPrintSettings } from './printSetup';
import { SIZE_GROUPS, presetToPx } from './sizePresets';

export interface ArtboardMeta {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  print: ArtboardPrintSettings;
}

export interface ArtboardPreset {
  id: string;
  label: string;
  category: string;
  widthPx: number;
  heightPx: number;
}

// One preset list for the whole app (lib/editor/sizePresets.ts), so the
// New Design screen, the Pages panel, Resize and the quick start always
// agree. Sizes are exact (a 148 mm page is 559.37 px), never rounded.
export const ARTBOARD_PRESETS: ArtboardPreset[] = SIZE_GROUPS.flatMap((g) =>
  g.items.map((p) => {
    const { width, height } = presetToPx(p);
    return { id: p.id, label: p.label, category: g.label, widthPx: width, heightPx: height };
  })
);

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
