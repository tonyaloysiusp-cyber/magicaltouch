// ---------------------------------------------------------------------
// src/editor/tools/navigation/HandTool.ts
// Real viewport panning. View-only — never touches the document, so it
// deliberately does not go through CommandManager (matching Photoshop/
// Illustrator: panning isn't in the undo stack).
// ---------------------------------------------------------------------

import { BaseTool, ToolContext, ToolPointerEvent } from '../Tool';

export class HandTool extends BaseTool {
  id = 'nav.hand';
  name = 'Hand';
  category = 'navigation';
  shortcut = 'H';
  icon = 'hand';
  cursor = 'grab';
  description = 'Pans the canvas view. Does not modify the document.';
  supportedModes: Array<'raster' | 'vector'> = ['raster', 'vector'];

  private dragging = false;
  private lastScreen = { x: 0, y: 0 };

  activate(): void {
    this.cursor = 'grab';
  }

  pointerDown(_ctx: ToolContext, e: ToolPointerEvent): void {
    this.dragging = true;
    this.cursor = 'grabbing';
    this.lastScreen = { x: e.screenX, y: e.screenY };
  }

  pointerMove(ctx: ToolContext, e: ToolPointerEvent): void {
    if (!this.dragging) return;
    const dx = e.screenX - this.lastScreen.x;
    const dy = e.screenY - this.lastScreen.y;
    this.lastScreen = { x: e.screenX, y: e.screenY };
    ctx.editor.coordinateSystem.panBy(dx, dy);
  }

  pointerUp(): void {
    this.dragging = false;
    this.cursor = 'grab';
  }

  pointerCancel(): void {
    this.dragging = false;
    this.cursor = 'grab';
  }
}
