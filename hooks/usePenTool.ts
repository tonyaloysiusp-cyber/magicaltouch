'use client';

import { useCallback, useRef } from 'react';
import { ANCHOR_HIT_RADIUS, PenAnchor } from '@/lib/editor/types';
import { buildPathD, snapAngleTo45 } from '@/lib/editor/geometry';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  onPathFinished: (pathObj: any) => void;
}

// Pen tool: click to place corner points, click-drag to pull out curve
// handles (Alt breaks the handle, Shift snaps to 45°). Click the first
// point to close the shape; Enter or double-click finishes an open path;
// Backspace removes the last point; Esc cancels.
//
// The in-progress path is drawn as an overlay on top of the canvas
// (drawOverlay, called from the canvas's after:render), not as canvas
// objects — so drawing never touches undo history, saving or layers.
export function usePenTool({ fabricCanvasRef, onPathFinished }: Args) {
  const draftRef = useRef<{
    anchors: PenAnchor[];
    mouseDownPoint: { x: number; y: number } | null;
    hover: { x: number; y: number } | null;
  }>({ anchors: [], mouseDownPoint: null, hover: null });

  const render = () => fabricCanvasRef.current?.requestRenderAll();

  const clearDraft = useCallback(() => {
    draftRef.current = { anchors: [], mouseDownPoint: null, hover: null };
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvasRef]);

  const zoom = () => fabricCanvasRef.current?.getZoom?.() || 1;

  const finishPath = useCallback(
    (closed: boolean) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      const F = (window as any).fabric;
      if (!canvas || !F || draft.anchors.length < 2) {
        clearDraft();
        return;
      }
      const d = buildPathD(draft.anchors, null, closed);
      const pathObj: any = new F.Path(d, {
        fill: closed ? '#8CCBFF' : '',
        stroke: '#09090B',
        strokeWidth: 2,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        objectCaching: false,
      });
      pathObj.isVectorPath = true;
      pathObj.name = closed ? 'Shape' : 'Path';
      draftRef.current = { anchors: [], mouseDownPoint: null, hover: null };
      onPathFinished(pathObj);
      render();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvasRef, clearDraft, onPathFinished]
  );

  const removeLastAnchor = useCallback(() => {
    const draft = draftRef.current;
    if (!draft.anchors.length) return false;
    draft.anchors.pop();
    render();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvasRef]);

  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = draftRef.current;
      const hit = ANCHOR_HIT_RADIUS / zoom();

      // Double-click on the last point (or a quick second click there)
      // finishes an open path.
      if (draft.anchors.length >= 2) {
        const last = draft.anchors[draft.anchors.length - 1];
        if (Math.hypot(pointer.x - last.x, pointer.y - last.y) <= hit && (opt.e.detail || 1) >= 2) {
          finishPath(false);
          return;
        }
      }
      if (draft.anchors.length >= 2) {
        const first = draft.anchors[0];
        if (Math.hypot(pointer.x - first.x, pointer.y - first.y) <= hit) {
          finishPath(true);
          return;
        }
      }

      const lastAnchor = draft.anchors[draft.anchors.length - 1];
      const placed = lastAnchor && opt.e.shiftKey ? snapAngleTo45(lastAnchor, pointer) : pointer;
      draft.anchors.push({ x: placed.x, y: placed.y });
      draft.mouseDownPoint = { x: placed.x, y: placed.y };
      render();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvasRef, finishPath]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = draftRef.current;
      draft.hover = pointer;
      if (draft.anchors.length === 0) {
        render();
        return;
      }
      const lastIndex = draft.anchors.length - 1;
      const pressed = (opt.e.buttons & 1) === 1 || opt.e.type === 'touchmove' || opt.e.pointerType === 'touch' || opt.e.pointerType === 'pen';
      if (pressed && draft.mouseDownPoint) {
        const anchor = draft.anchors[lastIndex];
        const dragPoint = opt.e.shiftKey ? snapAngleTo45(anchor, pointer) : pointer;
        // Ignore tiny jitters so a tap stays a sharp corner.
        if (Math.hypot(dragPoint.x - anchor.x, dragPoint.y - anchor.y) < 2 / zoom()) return;
        anchor.handleOut = { x: dragPoint.x, y: dragPoint.y };
        if (!opt.e.altKey) {
          anchor.handleIn = { x: anchor.x - (dragPoint.x - anchor.x), y: anchor.y - (dragPoint.y - anchor.y) };
        }
      } else if (opt.e.shiftKey) {
        draft.hover = snapAngleTo45(draft.anchors[lastIndex], pointer);
      }
      render();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvasRef]
  );

  const handleMouseUp = useCallback(() => {
    draftRef.current.mouseDownPoint = null;
  }, []);

  // Draws the in-progress path, its points and handles. `vt` is the
  // canvas viewport transform.
  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D, vt: number[], active: boolean) => {
    const draft = draftRef.current;
    if (!active) return;
    const toScreen = (p: { x: number; y: number }) => ({ x: p.x * vt[0] + vt[4], y: p.y * vt[3] + vt[5] });
    ctx.save();
    ctx.setLineDash([]);
    if (draft.anchors.length) {
      const rubber = draft.mouseDownPoint ? null : draft.hover;
      const d = buildPathD(draft.anchors, rubber, false);
      try {
        const path = new Path2D(d);
        ctx.save();
        // Multiply onto the canvas's own (retina) transform.
        ctx.transform(vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]);
        ctx.lineWidth = 1.5 / vt[0];
        ctx.strokeStyle = '#3B82C4';
        ctx.stroke(path);
        ctx.restore();
      } catch {
        // Path2D unavailable: points and handles below still show.
      }
      // Handles of the last point
      const last = draft.anchors[draft.anchors.length - 1];
      [last.handleIn, last.handleOut].forEach((h) => {
        if (!h) return;
        const a = toScreen(last);
        const b = toScreen(h);
        ctx.strokeStyle = 'rgba(59,130,196,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = '#3B82C4';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      // Points: first one is larger and shows a ring when closing is possible.
      draft.anchors.forEach((p, i) => {
        const s = toScreen(p);
        const size = i === 0 ? 9 : 7;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#3B82C4';
        ctx.lineWidth = 1.5;
        ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
        ctx.strokeRect(s.x - size / 2, s.y - size / 2, size, size);
      });
      if (draft.hover && draft.anchors.length >= 2) {
        const first = toScreen(draft.anchors[0]);
        const hov = toScreen(draft.hover);
        if (Math.hypot(first.x - hov.x, first.y - hov.y) <= ANCHOR_HIT_RADIUS) {
          ctx.strokeStyle = '#F3A6B8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(first.x, first.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }, []);

  return { draftRef, clearDraft, finishPath, removeLastAnchor, handleMouseDown, handleMouseMove, handleMouseUp, drawOverlay };
}
