'use client';

import { useCallback, useRef, useState } from 'react';
import { PixelMask, CombineMode, rectMask, ellipseMask, polygonMask, magicWandMask, combineMasks } from '@/lib/editor/pixelSelection';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  activeToolRef: React.MutableRefObject<string>;
  toleranceRef: React.MutableRefObject<number>;
  contiguousRef: React.MutableRefObject<boolean>;
  getSelectionMask: () => PixelMask | null;
  onSelectionChanged: (imageUid: string, mask: PixelMask | null) => void;
  onNoImageSelected: () => void;
}

function getTargetImage(canvas: any) {
  const active = canvas.getActiveObject();
  if (active && active.type === 'image') return active;
  return null;
}

// Maps a canvas/world point into the image object's own local pixel space
// (0,0 to width,height), correctly accounting for the image's position,
// rotation, and scale via its own transform matrix — the same matrix-
// inversion pattern useDirectSelection.ts uses for anchor dragging.
function toLocalPoint(F: any, obj: any, canvasPoint: { x: number; y: number }) {
  const inv = F.util.invertTransform(obj.calcTransformMatrix());
  const p: any = F.util.transformPoint(new F.Point(canvasPoint.x, canvasPoint.y), inv);
  return { x: p.x + obj.width / 2, y: p.y + obj.height / 2 };
}

export function getImagePixelCanvas(obj: any): HTMLCanvasElement {
  const el = obj.getElement ? obj.getElement() : obj._element;
  const canvas = document.createElement('canvas');
  canvas.width = obj.width;
  canvas.height = obj.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(el, 0, 0, obj.width, obj.height);
  return canvas;
}

function modeFromEvent(e: any): CombineMode {
  if (e?.shiftKey) return 'add';
  if (e?.altKey) return 'subtract';
  return 'new';
}

export function usePixelSelectionTool({
  fabricCanvasRef,
  activeToolRef,
  toleranceRef,
  contiguousRef,
  getSelectionMask,
  onSelectionChanged,
  onNoImageSelected,
}: Args) {
  const draftRef = useRef<{
    tool: string | null;
    imageObj: any | null;
    startLocal: { x: number; y: number } | null;
    points: { x: number; y: number }[];
  }>({ tool: null, imageObj: null, startLocal: null, points: [] });
  const [liveRect, setLiveRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const clearDraft = useCallback(() => {
    draftRef.current = { tool: null, imageObj: null, startLocal: null, points: [] };
    setLiveRect(null);
  }, []);

  const handleMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const tool = activeToolRef.current;
      const imageObj = getTargetImage(canvas);
      if (!imageObj) {
        onNoImageSelected();
        return;
      }

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const pointer = canvas.getPointer(opt.e);
        const local = toLocalPoint(F, imageObj, pointer);

        if (tool === 'magic-wand') {
          const pixelCanvas = getImagePixelCanvas(imageObj);
          const ctx = pixelCanvas.getContext('2d') as CanvasRenderingContext2D;
          const imageData = ctx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
          const shape = magicWandMask(imageData, local.x, local.y, toleranceRef.current, contiguousRef.current);
          const mode = modeFromEvent(opt.e);
          const base = mode === 'new' ? null : getSelectionMask();
          onSelectionChanged(imageObj.__uid, combineMasks(base, shape, mode));
          return;
        }

        draftRef.current = { tool, imageObj, startLocal: local, points: [local] };
      });
    },
    [fabricCanvasRef, activeToolRef, toleranceRef, contiguousRef, getSelectionMask, onSelectionChanged, onNoImageSelected]
  );

  const handleMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      if (!canvas || !draft.tool || !draft.imageObj || draft.tool === 'magic-wand') return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        if (draftRef.current !== draft) return;
        const pointer = canvas.getPointer(opt.e);
        const local = toLocalPoint(F, draft.imageObj, pointer);

        if (draft.tool === 'lasso') {
          draft.points.push(local);
        } else if (draft.startLocal) {
          setLiveRect({
            x: Math.min(draft.startLocal.x, local.x),
            y: Math.min(draft.startLocal.y, local.y),
            w: Math.abs(local.x - draft.startLocal.x),
            h: Math.abs(local.y - draft.startLocal.y),
          });
          draft.points = [draft.startLocal, local];
        }
        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef]
  );

  const handleMouseUp = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      const draft = draftRef.current;
      setLiveRect(null);
      if (!canvas || !draft.tool || !draft.imageObj || draft.tool === 'magic-wand') {
        clearDraft();
        return;
      }

      const imageObj = draft.imageObj;
      const w = imageObj.width;
      const h = imageObj.height;
      let shape: PixelMask | null = null;

      if (draft.tool === 'marquee-rect' && draft.points.length >= 2) {
        const [a, b] = draft.points;
        shape = rectMask(w, h, a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (draft.tool === 'marquee-ellipse' && draft.points.length >= 2) {
        const [a, b] = draft.points;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        shape = ellipseMask(w, h, cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2);
      } else if (draft.tool === 'lasso' && draft.points.length >= 3) {
        shape = polygonMask(w, h, draft.points);
      }

      if (shape) {
        const mode = modeFromEvent(opt?.e);
        const base = mode === 'new' ? null : getSelectionMask();
        onSelectionChanged(imageObj.__uid, combineMasks(base, shape, mode));
      }
      clearDraft();
    },
    [fabricCanvasRef, getSelectionMask, onSelectionChanged, clearDraft]
  );

  return { liveRect, draftRef, clearDraft, handleMouseDown, handleMouseMove, handleMouseUp };
}
