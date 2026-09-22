// ---------------------------------------------------------------------
// src/editor/raster/RasterCanvas.ts
// Phase 1 compositor: draws the document background, then every visible
// layer bottom-to-top honoring opacity and position, at the current
// viewport transform. See docs/rendering-architecture.md for what's
// deliberately NOT built yet (dirty regions, Workers, GPU).
//
// A layer with pixelDataUrl set (Phase 2+, once paint tools exist) draws
// that bitmap; a Phase-1 layer with no pixel data yet draws its seed
// `fill` color instead, so it's visible before any tool has touched it.
// ---------------------------------------------------------------------

import { DocumentModel } from '../core/Document';
import { ViewportTransform } from '../core/CoordinateSystem';

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(dataUrl: string): HTMLImageElement | null {
  const existing = imageCache.get(dataUrl);
  if (existing && existing.complete) return existing;
  if (!existing) {
    const img = new Image();
    img.src = dataUrl;
    imageCache.set(dataUrl, img);
  }
  return null; // not yet decoded — next render tick (triggered by img.onload elsewhere) will draw it
}

export function renderDocument(
  ctx: CanvasRenderingContext2D,
  doc: DocumentModel,
  viewport: ViewportTransform,
  canvasWidth: number,
  canvasHeight: number,
  requestRerender: () => void
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Pasteboard behind the document, so the document's own extent is
  // visually obvious regardless of background color.
  ctx.fillStyle = '#3a3a3f';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.panX, viewport.panY);

  ctx.fillStyle = doc.document.background || '#ffffff';
  ctx.fillRect(0, 0, doc.document.width, doc.document.height);

  const sorted = doc.layers.slice().sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of sorted) {
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity;
    if (layer.pixelDataUrl) {
      const img = getCachedImage(layer.pixelDataUrl);
      if (img) ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      else requestRerender(); // image still decoding; draw fill for now, re-render once ready
      if (!img) {
        ctx.fillStyle = layer.fill;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else {
      ctx.fillStyle = layer.fill;
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }
  }
  ctx.globalAlpha = 1;

  // Document bounds outline — helps distinguish the canvas edge from the
  // pasteboard at low zoom.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1 / viewport.zoom;
  ctx.strokeRect(0, 0, doc.document.width, doc.document.height);

  ctx.restore();
}
