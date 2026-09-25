// ---------------------------------------------------------------------
// lib/editor/printSetup.ts
// Per-artboard print production settings: bleed, slug, safe area, target
// DPI, and which production marks to include. Settings live on the
// artboard's own Fabric rect (__print) the same way __artboardId/name do,
// so they round-trip through history/save automatically.
// ---------------------------------------------------------------------

import { PT_PER_PX } from './pdfExport';

export interface EdgeValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrintMarksSettings {
  crop: boolean;
  registration: boolean;
  // A GATF/SWOP-style color control bar (process + overprint solids and
  // a grayscale ramp) rendered as RGB screen approximations, not a real
  // color-managed CMYK/Pantone separation — this app's whole pipeline is
  // RGB, so it would be dishonest to label it as true ink values.
  colorBar: boolean;
}

export interface ArtboardPrintSettings {
  bleed: EdgeValues;
  bleedLinked: boolean;
  slug: EdgeValues;
  slugLinked: boolean;
  safeArea: EdgeValues;
  safeAreaLinked: boolean;
  dpi: number;
  marks: PrintMarksSettings;
}

export function createDefaultPrintSettings(): ArtboardPrintSettings {
  return {
    bleed: { top: 0, right: 0, bottom: 0, left: 0 },
    bleedLinked: true,
    slug: { top: 0, right: 0, bottom: 0, left: 0 },
    slugLinked: true,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    safeAreaLinked: true,
    dpi: 300,
    marks: { crop: false, registration: false, colorBar: false },
  };
}

export type ExportScope = 'artboard' | 'bleed' | 'marks' | 'slug';

export const EXPORT_SCOPE_LABELS: Record<ExportScope, string> = {
  artboard: 'Artboard only',
  bleed: 'Artboard + Bleed',
  marks: 'Artboard + Bleed + Marks',
  slug: 'Artboard + Bleed + Marks + Slug',
};

// Canonical crop-mark geometry — the single source of truth shared with
// printMarks.ts (which imports these instead of redefining them), so the
// marks' actual drawn geometry and the export rect sized to contain them
// can never drift apart again the way they did before (marks drawn at
// offset 6/length 18, export margin hand-tuned separately to a flat 48).
//
// These are expressed in the SAME canvas-pixel space as the artboard's
// own x/y/width/height (getExportRect below adds them directly to ab.x/
// ab.width, etc.) — but the values that were actually verified against
// two real Adobe-generated reference PDFs (a business card and an A4
// sheet, both with 3mm bleed + cutting marks) are in POINTS, the unit
// the final exported PDF is measured in: offset 6pt, length 18pt, page
// edge exactly 33pt from trim. The export pipeline converts canvas px
// to PDF points via toPt() (PT_PER_PX = 72/96) right before writing the
// file, so a constant meant to come out as N points in that final PDF
// has to be stored here as N / PT_PER_PX canvas px — otherwise it gets
// scaled down by that same 0.75 a second time and everything comes out
// visibly smaller than the verified reference (which is exactly the bug
// this conversion fixes: a naive 6/18/9 stored directly as px produced
// 4.5pt/13.5pt/6.75pt after export, not the real 6pt/18pt/9pt).
export const PT_TO_PX = 1 / PT_PER_PX; // 96/72
export const MARK_OFFSET = 6 * PT_TO_PX;
export const MARK_LENGTH = 18 * PT_TO_PX;
// How far a crop mark's outer tip sits from the TRIM edge. Marks are
// always anchored to trim, never to bleed, so this is independent of the
// bleed amount.
const MARK_REACH_FROM_TRIM = MARK_OFFSET + MARK_LENGTH;
// Fixed clear space left between the outermost thing (whichever is
// bigger: the bleed edge, or the crop marks' outer tip) and the page
// edge — 9pt (1/8") of breathing room beyond whichever extends furthest,
// matching both reference files' page edge sitting exactly 33pt from
// trim (max(bleed 8.504pt, markReach 24pt) + 9pt). Scales correctly to
// larger bleeds too: a 10mm bleed (28.35pt, bigger than the 24pt mark
// reach) puts the page edge at bleed + 9pt, still a 9pt clearance beyond
// the outermost content.
const MARKS_BREATHING_ROOM = 9 * PT_TO_PX;

// The color bar (when enabled) extends further past the bleed edge than
// the crop marks do — the CMY/overprint swatches run vertically down the
// LEFT and RIGHT sides, and a grayscale tint ramp runs along the BOTTOM,
// matching a real press sheet's control strip layout. These are how far
// past the bleed edge each extends, so the export margin can grow to fit
// them instead of getting clipped. Kept in sync with printMarks.ts's
// buildColorBar/buildGrayRamp, which import these same constants for
// their own gap/size.
export const COLOR_BAR_GAP = 3 * PT_TO_PX;
export const COLOR_BAR_SWATCH_H_MAX = 6 * PT_TO_PX;
export const COLOR_BAR_LABEL_H = 5 * PT_TO_PX;
const COLOR_BAR_FOOTPRINT = COLOR_BAR_GAP + COLOR_BAR_SWATCH_H_MAX + COLOR_BAR_LABEL_H;
export const COLOR_BAR_SIDE_WIDTH = 9 * PT_TO_PX;
const COLOR_BAR_SIDE_FOOTPRINT = COLOR_BAR_GAP + COLOR_BAR_SIDE_WIDTH;

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The world-space rect (already in the artboard's coordinate space, same
// units page.tsx uses for the artboard's own x/y/width/height) that a
// given export scope should crop to.
export function getExportRect(ab: RectLike, print: ArtboardPrintSettings, scope: ExportScope): RectLike {
  if (scope === 'artboard') return { x: ab.x, y: ab.y, width: ab.width, height: ab.height };

  const b = print.bleed;
  const bleedRect: RectLike = {
    x: ab.x - b.left,
    y: ab.y - b.top,
    width: ab.width + b.left + b.right,
    height: ab.height + b.top + b.bottom,
  };
  if (scope === 'bleed') return bleedRect;

  // Page edge sits MARKS_BREATHING_ROOM beyond whichever is further out
  // on each side — the bleed edge, or the crop marks' outer tip (a fixed
  // distance from trim) — never a flat margin added past the bleed box
  // regardless of how big the bleed already is. The bottom edge also has
  // to clear the color bar's own footprint when it's enabled.
  const marginFromTrim = (bleedSide: number, extraReachFromBleed = 0) =>
    Math.max(bleedSide, MARK_REACH_FROM_TRIM, print.marks.colorBar ? bleedSide + extraReachFromBleed : 0) + MARKS_BREATHING_ROOM;
  const mLeft = marginFromTrim(b.left, COLOR_BAR_SIDE_FOOTPRINT);
  const mRight = marginFromTrim(b.right, COLOR_BAR_SIDE_FOOTPRINT);
  const mTop = marginFromTrim(b.top);
  const mBottom = marginFromTrim(b.bottom, COLOR_BAR_FOOTPRINT);
  const withMargin: RectLike = {
    x: ab.x - mLeft,
    y: ab.y - mTop,
    width: ab.width + mLeft + mRight,
    height: ab.height + mTop + mBottom,
  };
  if (scope === 'marks') return withMargin;

  const s = print.slug;
  return {
    x: withMargin.x - s.left,
    y: withMargin.y - s.top,
    width: withMargin.width + s.left + s.right,
    height: withMargin.height + s.top + s.bottom,
  };
}
