'use client';

import { useCallback, useRef, useState } from 'react';
import { DrawTool, DocUnit } from '@/lib/editor/types';
import { computeDragGeometry, buildDraftShape } from '@/lib/editor/geometry';
import { formatUnit } from '@/lib/editor/units';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  activeToolRef: React.MutableRefObject<string>;
  unitRef: React.MutableRefObject<DocUnit>;
  suppressHistoryRef: React.MutableRefObject<boolean>;
  onShapeFinished: (obj: any) => void;
}

export function useShapeTools({
  fabricCanvasRef,
  activeToolRef,
  unitRef,
  suppressHistoryRef,
  onShapeFinished,
}: Args) {
  const draftRef = useRef<{ tool: DrawTool | null; startX: number; startY: number; obj: any | null }>({
    tool: null,
    startX: 0,
    startY: 0,
    obj: null,
  });
  const [liveDim, setLiveDim] = useState<{ x: number; y: number; w: string; h: string } | null>(null);

  const clearDraft = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const draft = draftRef.current;
    if (canvas && draft.obj) canvas.remove(draft.obj);
    draftRef.current = { tool: null, startX: 0, startY: 0, obj: null };
    suppressHistoryRef.current = false;
    setLiveDim(null);
  }, [fabricCanvasRef, suppressHistoryRef]);

  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const tool = activeToolRef.current as DrawTool;

      suppressHistoryRef.current = true;
      draftRef.current = { tool, startX: pointer.x, startY: pointer.y, obj: null };

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        if (draftRef.current.tool !== tool) return;
        const obj =
          tool === 'line'
            ? buildDraftShape(F, tool, {
                left: 0,
                top: 0,
                w: 0,
                h: 0,
                x1: pointer.x,
                y1: pointer.y,
                x2: pointer.x,
                y2: pointer.y,
              })
            : buildDraftShape(F, tool, { left: pointer.x, top: pointer.y, w: 1, h: 1 });
        obj.__isShapeDraft = true;
        draftRef.current.obj = obj;
        canvas.add(obj);
        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef, activeToolRef, suppressHistoryRef]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      if (!canvas || !draft.tool) return;
      const pointer = canvas.getPointer(opt.e);
      const shiftKey = !!opt.e.shiftKey;
      const altKey = !!opt.e.altKey;
      const currentUnit = unitRef.current;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        if (draftRef.current.tool !== draft.tool) return;

        let newObj: any;
        let wLabel: string;
        let hLabel: string;

        if (draft.tool === 'line') {
          let x2 = pointer.x;
          let y2 = pointer.y;
          if (shiftKey) {
            const dx = pointer.x - draft.startX;
            const dy = pointer.y - draft.startY;
            const angle = Math.atan2(dy, dx);
            const snap = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const len = Math.hypot(dx, dy);
            x2 = draft.startX + Math.cos(snap) * len;
            y2 = draft.startY + Math.sin(snap) * len;
          }
          newObj = buildDraftShape(F, 'line', {
            left: 0,
            top: 0,
            w: 0,
            h: 0,
            x1: draft.startX,
            y1: draft.startY,
            x2,
            y2,
          });
          wLabel = formatUnit(Math.hypot(x2 - draft.startX, y2 - draft.startY), currentUnit);
          hLabel = '—';
        } else {
          const geo = computeDragGeometry(draft.startX, draft.startY, pointer.x, pointer.y, shiftKey, altKey);
          newObj = buildDraftShape(F, draft.tool as DrawTool, geo);
          wLabel = formatUnit(geo.w, currentUnit);
          hLabel = formatUnit(geo.h, currentUnit);
        }

        if (draftRef.current.obj) canvas.remove(draftRef.current.obj);
        newObj.__isShapeDraft = true;
        draftRef.current.obj = newObj;
        canvas.add(newObj);
        canvas.requestRenderAll();
        setLiveDim({ x: opt.e.clientX, y: opt.e.clientY, w: wLabel, h: hLabel });
      });
    },
    [fabricCanvasRef, unitRef]
  );

  const handleMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const draft = draftRef.current;
    setLiveDim(null);
    suppressHistoryRef.current = false;

    if (!canvas || !draft.tool || !draft.obj) {
      draftRef.current = { tool: null, startX: 0, startY: 0, obj: null };
      return;
    }

    const obj = draft.obj;
    const bw = obj.width || 0;
    const bh = obj.height || 0;

    if (bw < 3 && bh < 3) {
      canvas.remove(obj);
    } else {
      delete obj.__isShapeDraft;
      obj.set({ selectable: true, evented: true });
      obj.setCoords();
      onShapeFinished(obj);
    }

    canvas.requestRenderAll();
    draftRef.current = { tool: null, startX: 0, startY: 0, obj: null };
  }, [fabricCanvasRef, suppressHistoryRef, onShapeFinished]);

  return { draftRef, liveDim, clearDraft, handleMouseDown, handleMouseMove, handleMouseUp };
}
