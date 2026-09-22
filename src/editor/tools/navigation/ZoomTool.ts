// ---------------------------------------------------------------------
// src/editor/tools/navigation/ZoomTool.ts
// Real zoom-toward-cursor. Click zooms in, Alt/Option-click zooms out.
// View-only, like Hand — not part of the undo stack.
// ---------------------------------------------------------------------

import { BaseTool, ToolContext, ToolPointerEvent } from '../Tool';

const ZOOM_STEP = 1.5;

export class ZoomTool extends BaseTool {
  id = 'nav.zoom';
  name = 'Zoom';
  category = 'navigation';
  shortcut = 'Z';
  icon = 'zoom';
  cursor = 'zoom-in';
  description = 'Zooms the canvas view in or out, centered on the click point.';
  supportedModes: Array<'raster' | 'vector'> = ['raster', 'vector'];

  activate(): void {
    this.cursor = 'zoom-in';
  }

  pointerDown(ctx: ToolContext, e: ToolPointerEvent): void {
    const cs = ctx.editor.coordinateSystem;
    const factor = e.altKey ? 1 / ZOOM_STEP : ZOOM_STEP;
    cs.zoomAt(e.screenX, e.screenY, cs.current.zoom * factor);
  }

  keyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Alt') this.cursor = 'zoom-out';
  }

  keyUp(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Alt') this.cursor = 'zoom-in';
  }
}
