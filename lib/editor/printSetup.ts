// ---------------------------------------------------------------------
// lib/editor/printSetup.ts
// Per-artboard print production settings: bleed, slug, safe area, target
// DPI, and which production marks to include. Settings live on the
// artboard's own Fabric rect (__print) the same way __artboardId/name do,
// so they round-trip through history/save automatically.
// ---------------------------------------------------------------------

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

// Extra room left outside the bleed box for crop/registration marks — and
// the color bar's swatches plus their labels, the tallest thing drawn out
// there — to be drawn into without getting clipped by the export crop
// rect. Kept generous and uniform on all four sides rather than
// conditional on which marks are enabled, so toggling a mark on never
// needs a matching change here.
const MARKS_MARGIN = 48;

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

  const withMargin: RectLike = {
    x: bleedRect.x - MARKS_MARGIN,
    y: bleedRect.y - MARKS_MARGIN,
    width: bleedRect.width + MARKS_MARGIN * 2,
    height: bleedRect.height + MARKS_MARGIN * 2,
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
