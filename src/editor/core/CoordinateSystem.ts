// ---------------------------------------------------------------------
// src/editor/core/CoordinateSystem.ts
// Real screen <-> document point conversion given the current pan/zoom
// viewport transform. Every tool that needs to know "where in the
// document did the user click" goes through this, not ad hoc math
// scattered across tools.
// ---------------------------------------------------------------------

export interface ViewportTransform {
  zoom: number; // 1 = 100%
  panX: number; // screen-space pan offset
  panY: number;
}

export const ZOOM_MIN = 0.02;
export const ZOOM_MAX = 32;
export const ZOOM_PRESETS = [12.5, 25, 50, 100, 200, 400, 800];

export class CoordinateSystem {
  private transform: ViewportTransform = { zoom: 1, panX: 0, panY: 0 };
  private listeners = new Set<() => void>();

  get current(): ViewportTransform {
    return this.transform;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  setPan(panX: number, panY: number): void {
    this.transform = { ...this.transform, panX, panY };
    this.notify();
  }

  panBy(dx: number, dy: number): void {
    this.setPan(this.transform.panX + dx, this.transform.panY + dy);
  }

  // Zooms so that the given SCREEN point stays visually fixed — the
  // standard "zoom toward the cursor" behavior.
  zoomAt(screenX: number, screenY: number, nextZoom: number): void {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    const docPoint = this.screenToDocument({ x: screenX, y: screenY });
    this.transform = { ...this.transform, zoom: clamped };
    const newScreenPoint = this.documentToScreen(docPoint);
    this.transform = {
      ...this.transform,
      panX: this.transform.panX + (screenX - newScreenPoint.x),
      panY: this.transform.panY + (screenY - newScreenPoint.y),
    };
    this.notify();
  }

  setZoom(zoom: number): void {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
    this.transform = { ...this.transform, zoom: clamped };
    this.notify();
  }

  reset(): void {
    this.transform = { zoom: 1, panX: 0, panY: 0 };
    this.notify();
  }

  screenToDocument(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (point.x - this.transform.panX) / this.transform.zoom,
      y: (point.y - this.transform.panY) / this.transform.zoom,
    };
  }

  documentToScreen(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x * this.transform.zoom + this.transform.panX,
      y: point.y * this.transform.zoom + this.transform.panY,
    };
  }

  // Centers the document (of the given size) inside a viewport of the
  // given size, at a zoom that fits it entirely — used by "Fit" and on
  // first load.
  fit(docWidth: number, docHeight: number, viewportWidth: number, viewportHeight: number, padding = 40): void {
    const availW = Math.max(1, viewportWidth - padding * 2);
    const availH = Math.max(1, viewportHeight - padding * 2);
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(availW / docWidth, availH / docHeight)));
    const panX = (viewportWidth - docWidth * zoom) / 2;
    const panY = (viewportHeight - docHeight * zoom) / 2;
    this.transform = { zoom, panX, panY };
    this.notify();
  }
}
