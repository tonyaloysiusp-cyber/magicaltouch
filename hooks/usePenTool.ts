'use client';

import { useCallback, useRef } from 'react';
import { ANCHOR_HIT_RADIUS, PenAnchor } from '@/lib/editor/types';
import { buildPathD } from '@/lib/editor/geometry';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  onPathFinished: (pathObj: any) => void;
}

export function usePenTool({ fabricCanvasRef, onPathFinished }: Args) {
  const draftRef = useRef<{
    anchors: PenAnchor[];
    previewObj: any | null;
    mouseDownPoint: { x: number; y: number } | null;
  }>({ anchors: [], previewObj: null, mouseDownPoint: null });

  const updatePreview = useCallback(
    (rubberBandTo: { x: number; y: number } | null) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      if (!canvas || draft.anchors.length === 0) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const d = buildPathD(draft.anchors, rubberBandTo, false);
        if (draft.previewObj) canvas.remove(draft.previewObj);
        const preview: any = new F.Path(d, {
          fill: '',
          stroke: '#3FA9E8',
          strokeWidth: 1.5,
          strokeDashArray: [4, 3],
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        preview.__isPenPreview = true;
        draft.previewObj = preview;
        canvas.add(preview);
        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef]
  );

  const clearDraft = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const draft = draftRef.current;
    if (canvas && draft.previewObj) canvas.remove(draft.previewObj);
    draftRef.current = { anchors: [], previewObj: null, mouseDownPoint: null };
    canvas?.requestRenderAll();
  }, [fabricCanvasRef]);

  const finishPath = useCallback(
    (closed: boolean) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      if (!canvas || draft.anchors.length < 2) {
        clearDraft();
        return;
      }

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const d = buildPathD(draft.anchors, null, closed);
        const pathObj: any = new F.Path(d, {
          fill: closed ? '#3FA9E8' : '',
          stroke: '#1A1A1A',
          strokeWidth: 2,
          objectCaching: false,
        });
        pathObj.isVectorPath = true;
        pathObj.name = closed ? 'Path (closed)' : 'Path (open)';

        if (draft.previewObj) canvas.remove(draft.previewObj);
        draftRef.current = { anchors: [], previewObj: null, mouseDownPoint: null };

        onPathFinished(pathObj);
      });
    },
    [fabricCanvasRef, clearDraft, onPathFinished]
  );

  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = draftRef.current;

      if (draft.anchors.length >= 3) {
        const first = draft.anchors[0];
        const dist = Math.hypot(pointer.x - first.x, pointer.y - first.y);
        if (dist <= ANCHOR_HIT_RADIUS) {
          finishPath(true);
          return;
        }
      }

      draft.anchors.push({ x: pointer.x, y: pointer.y });
      draft.mouseDownPoint = { x: pointer.x, y: pointer.y };
      updatePreview(null);
    },
    [fabricCanvasRef, finishPath, updatePreview]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = draftRef.current;
      if (draft.anchors.length === 0) return;

      const isMouseDown = opt.e.buttons === 1 || opt.e.which === 1;
      const lastIndex = draft.anchors.length - 1;

      if (isMouseDown && draft.mouseDownPoint) {
        const anchor = draft.anchors[lastIndex];
        anchor.handleOut = { x: pointer.x, y: pointer.y };
        // Alt/Option breaks the symmetric handle: only the outgoing side
        // (toward the next segment) follows the drag, leaving whatever
        // incoming handle the anchor already had untouched.
        if (!opt.e.altKey) {
          anchor.handleIn = {
            x: anchor.x - (pointer.x - anchor.x),
            y: anchor.y - (pointer.y - anchor.y),
          };
        }
        updatePreview(null);
      } else {
        updatePreview({ x: pointer.x, y: pointer.y });
      }
    },
    [fabricCanvasRef, updatePreview]
  );

  const handleMouseUp = useCallback(() => {
    draftRef.current.mouseDownPoint = null;
  }, []);

  return { draftRef, clearDraft, finishPath, handleMouseDown, handleMouseMove, handleMouseUp };
}
