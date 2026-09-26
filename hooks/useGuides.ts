'use client';

import { useCallback, useRef, useState } from 'react';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  activeToolRef: React.MutableRefObject<string>;
  // Called once a guide is actually created/moved/deleted -- the caller
  // hooks this up to pushHistory() so guide edits are undoable/redoable
  // exactly like any other canvas mutation (they're real Fabric objects,
  // so they already round-trip through save/undo JSON for free).
  onGuideChange: () => void;
}

const GUIDE_COLOR = '#3FA9E8';
const GUIDE_SPAN = 200000; // world-px each end extends -- effectively infinite at any real zoom/pan

function guideLineOpts(axis: 'v' | 'h') {
  return {
    stroke: GUIDE_COLOR,
    strokeWidth: 1,
    fill: '',
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    hoverCursor: axis === 'h' ? 'row-resize' : 'col-resize',
    moveCursor: axis === 'h' ? 'row-resize' : 'col-resize',
    lockMovementX: axis === 'h',
    lockMovementY: axis === 'v',
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    objectCaching: false,
    perPixelTargetFind: false,
    padding: 4,
  };
}

// Real, persistent ruler guides -- plain Fabric Line objects marked
// `__isGuide`/`__guideAxis` rather than a parallel data structure. Riding
// on the existing Fabric object model means guides get undo/redo, tab
// snapshots and save/load for free (same custom-property mechanism
// `__isArtboard` already uses) -- every consumer that must never draw or
// export them (PDF/SVG/PNG export, the dashboard thumbnail renderer,
// preflight, artboard-membership) explicitly filters `__isGuide` instead.
export function useGuides({ fabricCanvasRef, activeToolRef, onGuideChange }: Args) {
  const [guidesLocked, setGuidesLockedState] = useState(false);
  const guidesLockedRef = useRef(false);

  const applyGuideInteractivity = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const interactive = activeToolRef.current === 'select' && !guidesLockedRef.current;
    canvas.getObjects().forEach((o: any) => {
      if (!o.__isGuide) return;
      o.selectable = interactive;
      o.evented = interactive;
    });
  }, [fabricCanvasRef, activeToolRef]);

  const setGuidesLocked = useCallback(
    (value: boolean) => {
      guidesLockedRef.current = value;
      setGuidesLockedState(value);
      applyGuideInteractivity();
    },
    [applyGuideInteractivity]
  );

  // Starts a brand-new guide from a ruler drag. `clientX`/`clientY` are
  // the raw pointer coordinates (from the ruler's own onMouseDown), since
  // the drag begins outside the Fabric canvas element itself -- window-
  // level listeners track it until mouseup, mirroring how a native
  // drag-out-of-the-ruler gesture works in every other design tool.
  const startGuideFromRuler = useCallback(
    (axis: 'v' | 'h', startClientX: number, startClientY: number) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const canvasEl: HTMLCanvasElement | undefined = canvas.upperCanvasEl || canvas.lowerCanvasEl;
        if (!canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        const vt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vt[0] || 1;
        const toWorldX = (clientX: number) => (clientX - rect.left - vt[4]) / zoom;
        const toWorldY = (clientY: number) => (clientY - rect.top - vt[5]) / zoom;

        const line =
          axis === 'h'
            ? new F.Line([-GUIDE_SPAN, toWorldY(startClientY), GUIDE_SPAN, toWorldY(startClientY)], guideLineOpts(axis))
            : new F.Line([toWorldX(startClientX), -GUIDE_SPAN, toWorldX(startClientX), GUIDE_SPAN], guideLineOpts(axis));
        line.__isGuide = true;
        line.__guideAxis = axis;
        canvas.add(line);
        canvas.bringToFront(line);
        canvas.requestRenderAll();

        let moved = false;
        const onMove = (e: MouseEvent) => {
          moved = true;
          if (axis === 'h') {
            const y = toWorldY(e.clientY);
            line.set({ y1: y, y2: y });
          } else {
            const x = toWorldX(e.clientX);
            line.set({ x1: x, x2: x });
          }
          line.setCoords();
          canvas.requestRenderAll();
        };
        const onUp = (e: MouseEvent) => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          // Released back over the ruler (or never actually dragged out):
          // treat as a cancelled guide, matching every other design tool.
          const droppedOnRuler = axis === 'h' ? e.clientY <= rect.top : e.clientX <= rect.left;
          if (!moved || droppedOnRuler) {
            canvas.remove(line);
            canvas.requestRenderAll();
            return;
          }
          applyGuideInteractivity();
          onGuideChange();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    },
    [fabricCanvasRef, applyGuideInteractivity, onGuideChange]
  );

  const clearGuides = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const guides = canvas.getObjects().filter((o: any) => o.__isGuide);
    if (!guides.length) return;
    guides.forEach((g: any) => canvas.remove(g));
    canvas.requestRenderAll();
    onGuideChange();
  }, [fabricCanvasRef, onGuideChange]);

  const deleteGuide = useCallback(
    (obj: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !obj?.__isGuide) return;
      canvas.remove(obj);
      canvas.requestRenderAll();
      onGuideChange();
    },
    [fabricCanvasRef, onGuideChange]
  );

  const setGuidesVisible = useCallback(
    (visible: boolean) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      canvas.getObjects().forEach((o: any) => {
        if (o.__isGuide) o.visible = visible;
      });
      canvas.requestRenderAll();
    },
    [fabricCanvasRef]
  );

  return {
    guidesLocked,
    setGuidesLocked,
    startGuideFromRuler,
    clearGuides,
    deleteGuide,
    setGuidesVisible,
    applyGuideInteractivity,
  };
}
