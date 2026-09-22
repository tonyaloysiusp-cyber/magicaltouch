// ---------------------------------------------------------------------
// src/editor/core/Document.ts
// Plain, serializable document data. No methods, no class — this is the
// shape CommandManager-driven mutations produce, and what ProjectStore
// persists verbatim. See docs/file-format.md for the on-disk schema this
// mirrors exactly (version 1).
// ---------------------------------------------------------------------

export type LayerType = 'raster';
// 'vector' | 'text' | 'shape' | 'group' | 'adjustment' | 'fill' are
// reserved for later phases (see docs/tool-capability-matrix.md) — do not
// add them here until a real implementation exists for that layer type.

export type BlendMode = 'normal';
// Additional blend modes are a Phase 2+ concern (real per-pixel
// compositing math, not a CSS globalCompositeOperation cosplay of one).

export interface RasterLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  x: number;
  y: number;
  zIndex: number;
  // Phase-1-only seed content so a new layer is visibly distinct before
  // any paint tool exists — see docs/file-format.md's note on `fill`.
  fill: string;
  // PNG data URL of the layer's own offscreen canvas once something has
  // actually painted on it (Phase 2+). Null in Phase 1.
  pixelDataUrl: string | null;
  width: number;
  height: number;
}

export interface DocumentMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  resolution: number;
  colorMode: 'rgb';
  background: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentModel {
  version: 1;
  document: DocumentMeta;
  layers: RasterLayer[];
  vectorObjects: unknown[];
  artboards: unknown[];
  guides: unknown[];
  metadata: Record<string, unknown>;
}

let uidCounter = 0;
export function generateId(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDocument(opts: { name?: string; width: number; height: number; background?: string }): DocumentModel {
  const now = new Date().toISOString();
  return {
    version: 1,
    document: {
      id: generateId(),
      name: opts.name || 'Untitled',
      width: opts.width,
      height: opts.height,
      resolution: 72,
      colorMode: 'rgb',
      background: opts.background || '#ffffff',
      createdAt: now,
      updatedAt: now,
    },
    layers: [],
    vectorObjects: [],
    artboards: [],
    guides: [],
    metadata: {},
  };
}

export function createRasterLayer(doc: DocumentModel, opts: { name?: string; fill?: string } = {}): RasterLayer {
  const maxZ = doc.layers.reduce((m, l) => Math.max(m, l.zIndex), -1);
  return {
    id: generateId(),
    name: opts.name || `Layer ${doc.layers.length + 1}`,
    type: 'raster',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 0,
    y: 0,
    zIndex: maxZ + 1,
    fill: opts.fill || '#e5e7eb',
    pixelDataUrl: null,
    width: doc.document.width,
    height: doc.document.height,
  };
}

export function cloneDocument(doc: DocumentModel): DocumentModel {
  return JSON.parse(JSON.stringify(doc));
}
