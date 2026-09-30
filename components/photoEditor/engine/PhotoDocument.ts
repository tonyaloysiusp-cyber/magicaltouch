// A typed, serializable description of a Photo Studio document -- the
// spec's requested Document/Layer model. This is documentation-as-types
// for now: it mirrors the REAL custom fields PhotoEditorWorkspace.tsx
// already stashes on its live fabric.Image layers (__layerId, __maskData,
// __adjustments, __historyStack, ...), it is not yet what the live canvas
// is driven by. Later phases can add a real toDocument(canvas)/
// applyDocument(canvas, doc) pair once enough of the engine layer exists
// to make that swap safely, tool by tool, without a single risky rewrite
// of a 3,600+ line production component. See docs/editor-architecture.md's
// own caution about exactly that risk for why this is staged rather than
// immediate.

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Mirrors lib/editor/photoFilters.ts's DEFAULT_ADJUSTMENTS shape at the
// field-name level; kept independent (not imported) so this module has no
// dependency on the live implementation while it's unused.
export interface PhotoAdjustments {
  brightness: number;
  contrast: number;
  exposure: number;
  vibrance: number;
  saturation: number;
  hue: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  blackAndWhite: boolean;
  invert: boolean;
}

export interface LayerMask {
  // Compressed PNG data URL, same storage format pushLayerHistory already
  // uses and documents the memory reasoning for.
  dataUrl: string | null;
  enabled: boolean;
  inverted: boolean;
}

export interface PhotoLayer {
  id: string; // __layerId
  name: string; // __layerName
  visible: boolean;
  locked: boolean; // __locked
  opacity: number; // 0-1
  blendMode: BlendMode;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  skewX: number;
  skewY: number;
  cropRect: CropRect | null; // __cropRect
  mask: LayerMask | null;
  adjustments: PhotoAdjustments | null; // __adjustments
  dpi: number; // __dpi
}

export interface PhotoDocument {
  width: number;
  height: number;
  resolution: number; // DPI the document was created at
  background: 'transparent' | string;
  layers: PhotoLayer[];
}
