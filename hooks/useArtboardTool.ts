'use client';

import { useCallback, useRef, useState } from 'react';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  activeToolRef: React.MutableRefObject<string>;
  onArtboardFinished: (rect: { x: number; y: number; width: number; height: number }) => void;
}

// Drag-to-create-artboard, mirroring useShapeTools' draft-drag pattern.
// Clicking an existing artboard rect is left alone here (opt.target set)
// so Fabric's own selection/resize handles take over instead of starting
// a new draft.
export function useArtboardTool({ fabricCanvasRef, activeToolRef, onArtboardFinished }: Args) {
  const draftRef = useRef<{ startX: number; startY: number; obj: any | null }>({
    startX: 0,
    startY: 0,
    obj: null,
  });
  const [liveDim, setLiveDim] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const clearDraft = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && draftRef.current.obj) canvas.remove(draftRef.current.obj);
    draftRef.current = { startX: 0, startY: 0, obj: null };
    setLiveDim(null);
  }, [fabricCanvasRef]);

  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || activeToolRef.current !== 'artboard') return;
      if (opt.target) return; // clicking an existing artboard: let Fabric select/resize it

      const pointer = canvas.getPointer(opt.e);
      draftRef.current = { startX: pointer.x, startY: pointer.y, obj: null };

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        if (activeToolRef.current !== 'artboard') return;
        const rect = new F.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'rgba(63,169,232,0.15)',
          stroke: '#3FA9E8',
          strokeWidth: 1,
          strokeDashArray: [4, 3],
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        rect.__isArtboardDraft = true;
        draftRef.current.obj = rect;
        canvas.add(rect);
        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef, activeToolRef]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      if (!canvas || !draft.obj) return;
      const pointer = canvas.getPointer(opt.e);
      const left = Math.min(pointer.x, draft.startX);
      const top = Math.min(pointer.y, draft.startY);
      const width = Math.abs(pointer.x - draft.startX);
      const height = Math.abs(pointer.y - draft.startY);
      draft.obj.set({ left, top, width, height });
      draft.obj.setCoords();
      canvas.requestRenderAll();
      setLiveDim({ x: opt.e.clientX, y: opt.e.clientY, w: Math.round(width), h: Math.round(height) });
    },
    [fabricCanvasRef]
  );

  const handleMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const draft = draftRef.current;
    setLiveDim(null);

    if (!canvas || !draft.obj) {
      draftRef.current = { startX: 0, startY: 0, obj: null };
      return;
    }

    const { left, top, width, height } = draft.obj;
    canvas.remove(draft.obj);
    draftRef.current = { startX: 0, startY: 0, obj: null };
    canvas.requestRenderAll();

    if (width < 10 || height < 10) return; // too small to be a useful artboard
    onArtboardFinished({ x: left, y: top, width, height });
  }, [fabricCanvasRef, onArtboardFinished]);

  return { liveDim, clearDraft, handleMouseDown, handleMouseMove, handleMouseUp };
}
