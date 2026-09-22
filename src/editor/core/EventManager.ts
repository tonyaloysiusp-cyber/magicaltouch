// ---------------------------------------------------------------------
// src/editor/core/EventManager.ts
// Binds real DOM pointer/keyboard events on the canvas element to the
// active Tool's hooks, plus the global navigation shortcuts (§27/§41)
// that apply regardless of which tool is active, and the Space-for-
// temporary-Hand modifier (§42).
// ---------------------------------------------------------------------

import { Editor } from './Editor';
import { ToolContext, ToolPointerEvent } from '../tools/Tool';
import { ZOOM_PRESETS } from './CoordinateSystem';

function pointerTypeOf(e: PointerEvent): 'mouse' | 'pen' | 'touch' {
  if (e.pointerType === 'pen') return 'pen';
  if (e.pointerType === 'touch') return 'touch';
  return 'mouse';
}

export class EventManager {
  private spaceHeld = false;
  private previousToolId: string | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(private editor: Editor) {}

  private get ctx(): ToolContext {
    return { editor: this.editor };
  }

  private toDocEvent(e: PointerEvent, rect: DOMRect): ToolPointerEvent {
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const doc = this.editor.coordinateSystem.screenToDocument({ x: screenX, y: screenY });
    return {
      screenX,
      screenY,
      documentX: doc.x,
      documentY: doc.y,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      pointerType: pointerTypeOf(e),
    };
  }

  attach(canvasEl: HTMLCanvasElement): void {
    this.detach();

    const onPointerDown = (e: PointerEvent) => {
      canvasEl.setPointerCapture(e.pointerId);
      const tool = this.editor.activeTool;
      if (!tool) return;
      tool.pointerDown(this.ctx, this.toDocEvent(e, canvasEl.getBoundingClientRect()));
      this.editor.requestRender();
    };
    const onPointerMove = (e: PointerEvent) => {
      const tool = this.editor.activeTool;
      if (!tool) return;
      const rect = canvasEl.getBoundingClientRect();
      tool.pointerMove(this.ctx, this.toDocEvent(e, rect));
      const doc = this.editor.coordinateSystem.screenToDocument({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      this.editor.setCursorPosition(doc.x, doc.y);
      this.editor.requestRender();
    };
    const onPointerUp = (e: PointerEvent) => {
      const tool = this.editor.activeTool;
      if (tool) {
        tool.pointerUp(this.ctx, this.toDocEvent(e, canvasEl.getBoundingClientRect()));
        this.editor.requestRender();
      }
      if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId);
    };
    const onPointerCancel = () => {
      this.editor.activeTool?.pointerCancel(this.ctx);
      this.editor.requestRender();
    };
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain wheel scroll is left to the browser/page
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const cs = this.editor.coordinateSystem;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      cs.zoomAt(e.clientX - rect.left, e.clientY - rect.top, cs.current.zoom * factor);
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointercancel', onPointerCancel);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const cs = this.editor.coordinateSystem;
        cs.zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, cs.current.zoom * 1.25);
        return;
      }
      if (meta && e.key === '-') {
        e.preventDefault();
        const cs = this.editor.coordinateSystem;
        cs.zoomAt(canvasEl.clientWidth / 2, canvasEl.clientHeight / 2, cs.current.zoom / 1.25);
        return;
      }
      if (meta && e.key === '0') {
        e.preventDefault();
        this.editor.fitToView(canvasEl.clientWidth, canvasEl.clientHeight);
        return;
      }
      if (meta && e.key === '1') {
        e.preventDefault();
        this.editor.coordinateSystem.setZoom(1);
        return;
      }
      if (meta && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        this.editor.redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.editor.undo();
        return;
      }
      if (e.code === 'Space' && !this.spaceHeld) {
        this.spaceHeld = true;
        this.previousToolId = this.editor.activeToolId;
        this.editor.setActiveTool('nav.hand');
        return;
      }
      this.editor.activeTool?.keyDown(this.ctx, e);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && this.spaceHeld) {
        this.spaceHeld = false;
        if (this.previousToolId) this.editor.setActiveTool(this.previousToolId);
        this.previousToolId = null;
        return;
      }
      this.editor.activeTool?.keyUp(this.ctx, e);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.cleanupFns = [
      () => canvasEl.removeEventListener('pointerdown', onPointerDown),
      () => canvasEl.removeEventListener('pointermove', onPointerMove),
      () => canvasEl.removeEventListener('pointerup', onPointerUp),
      () => canvasEl.removeEventListener('pointercancel', onPointerCancel),
      () => canvasEl.removeEventListener('wheel', onWheel),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
    ];
  }

  detach(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}

export { ZOOM_PRESETS };
