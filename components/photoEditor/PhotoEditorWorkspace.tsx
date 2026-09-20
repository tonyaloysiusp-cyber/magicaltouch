'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PixelMask,
  combineMasks,
  rectMask,
  ellipseMask,
  polygonMask,
  magicWandMask,
  invertMask,
  featherMask,
  maskHasSelection,
  clearMaskedPixels,
  applyMaskKeepSelected,
  maskToTintCanvas,
} from '@/lib/editor/pixelSelection';
import { usePixelSelectionTool, getImagePixelCanvas } from '@/hooks/usePixelSelectionTool';
import { usePenTool } from '@/hooks/usePenTool';
import { useDirectSelection } from '@/hooks/useDirectSelection';
import {
  PhotoAdjustments,
  DEFAULT_ADJUSTMENTS,
  applyAdjustments,
} from '@/lib/editor/photoFilters';
import {
  paintColorInMask,
  dodgeBurnInMask,
  applyLevels,
  applyGradientOverlay,
  pickColorAt,
  LevelsSettings,
  DEFAULT_LEVELS,
} from '@/lib/editor/photoBrush';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoEditResult {
  dataUrl: string;
  adjustments: PhotoAdjustments;
  cropRect: CropRect | null;
}

interface Props {
  active: boolean;
  sourceDataUrl: string;
  initialAdjustments: PhotoAdjustments;
  initialCropRect: CropRect | null;
  onApply: (result: PhotoEditResult) => void;
  onCancel: () => void;
}

type PhotoTool =
  | 'select'
  | 'crop'
  | 'pen'
  | 'direct'
  | 'marquee-rect'
  | 'marquee-ellipse'
  | 'lasso'
  | 'magic-wand'
  | 'eraser'
  | 'brush'
  | 'dodge'
  | 'burn'
  | 'eyedropper'
  | 'gradient'
  | 'levels';

const PAINT_TOOLS: PhotoTool[] = ['eraser', 'brush', 'dodge', 'burn'];

const MAX_LOCAL_HISTORY = 30;

function cropToCanvas(source: CanvasImageSource, sw: number, sh: number, rect: CropRect): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(rect.width));
  out.height = Math.max(1, Math.round(rect.height));
  const ctx = out.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height);
  return out;
}

// The Photo Editor workspace: a self-contained, single-image Fabric
// canvas used for all raster/pixel editing (crop, adjustments, pixel
// selection + delete/mask, eraser, background removal). It never
// touches the main design canvas directly — the caller (app/editor's
// openPhotoEditor/applyPhotoEdits) hands it a pristine source and gets
// back a finished data URL to swap into the target image layer, the
// same "update in place, preserve frame" pattern replaceSelectedImage
// already uses for Replace Image.
export function PhotoEditorWorkspace({ active, sourceDataUrl, initialAdjustments, initialCropRect, onApply, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModRef = useRef<any>(null);
  const imageRef = useRef<any>(null);
  const pristineElRef = useRef<HTMLImageElement | null>(null);
  const naturalSizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const cropRectRef = useRef<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const viewScaleRef = useRef(1);
  const cropObjRef = useRef<any>(null);

  // Vector path mask: a Fabric clipPath applied to the image, built from
  // a path drawn with the Pen tool — real, non-destructive masking
  // (toggle/invert/remove all just change what's rendered, no pixel data
  // is touched) exactly like the main editor's own "Apply Path as Mask",
  // just scoped to this single image.
  const maskPathRef = useRef<any>(null);
  const [hasMask, setHasMask] = useState(false);
  const [maskEnabled, setMaskEnabled] = useState(true);
  const [maskInverted, setMaskInverted] = useState(false);
  const lastPathRef = useRef<any>(null);
  const [hasVectorPath, setHasVectorPath] = useState(false);

  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState<PhotoTool>('select');
  const activeToolRef = useRef<PhotoTool>('select');
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(initialAdjustments);
  const adjustmentsRef = useRef(adjustments);
  useEffect(() => {
    adjustmentsRef.current = adjustments;
  }, [adjustments]);

  const [tolerance, setTolerance] = useState(30);
  const toleranceRef = useRef(30);
  useEffect(() => {
    toleranceRef.current = tolerance;
  }, [tolerance]);
  const [contiguous, setContiguous] = useState(true);
  const contiguousRef = useRef(true);
  useEffect(() => {
    contiguousRef.current = contiguous;
  }, [contiguous]);

  // Shared by every brush-like tool (eraser/brush/dodge/burn): brush
  // radius, plus the running mask a stroke paints into before its
  // operation (clear/paint-color/lighten/darken) bakes once on mouse-up.
  const [brushSize, setBrushSize] = useState(40);
  const brushSizeRef = useRef(40);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  const paintDraftRef = useRef<PixelMask | null>(null);
  const paintingRef = useRef(false);

  const [brushColor, setBrushColor] = useState('#ff2d55');
  const [dodgeBurnStrength, setDodgeBurnStrength] = useState(0.35);

  const [gradientColor1, setGradientColor1] = useState('#000000');
  const [gradientColor2, setGradientColor2] = useState('#ffffff');
  const [gradientOpacity, setGradientOpacity] = useState(0.5);
  const gradientDraftRef = useRef<{ start: { x: number; y: number }; line: any } | null>(null);

  const [levels, setLevels] = useState<LevelsSettings>(DEFAULT_LEVELS);

  const [selectionMask, setSelectionMask] = useState<PixelMask | null>(null);
  const selectionMaskRef = useRef<PixelMask | null>(null);
  useEffect(() => {
    selectionMaskRef.current = selectionMask;
  }, [selectionMask]);

  const historyRef = useRef<{ stack: { dataUrl: string; cropRect: CropRect }[]; index: number }>({ stack: [], index: -1 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const updateHistoryButtons = () => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  };

  const renderTint = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.requestRenderAll();
  }, []);

  // ---- Setup: load the pristine source, reconstruct any previously
  // applied crop, and bake in whatever adjustments were saved. ----
  useEffect(() => {
    let disposed = false;
    import('fabric').then((mod) => {
      if (disposed) return;
      const F: any = mod.fabric;
      fabricModRef.current = F;

      const el = containerRef.current;
      const canvas = new F.Canvas(canvasElRef.current, {
        width: el?.clientWidth || 800,
        height: el?.clientHeight || 600,
        backgroundColor: '#e5e7eb',
      });
      fabricCanvasRef.current = canvas;

      const pristine = new Image();
      pristine.onload = () => {
        if (disposed) return;
        pristineElRef.current = pristine;
        naturalSizeRef.current = { w: pristine.naturalWidth, h: pristine.naturalHeight };
        const startRect: CropRect = initialCropRect || { x: 0, y: 0, width: pristine.naturalWidth, height: pristine.naturalHeight };
        cropRectRef.current = startRect;
        const startCanvas = cropToCanvas(pristine, pristine.naturalWidth, pristine.naturalHeight, startRect);
        const startDataUrl = startCanvas.toDataURL('image/png');

        F.Image.fromURL(startDataUrl, (img: any) => {
          if (disposed) return;
          // Stays selectable (never draggable/resizable) so it can be the
          // canvas's active object — usePixelSelectionTool's marquee/
          // lasso/magic-wand tools all key off getActiveObject().
          img.set({
            left: 0,
            top: 0,
            angle: 0,
            originX: 'left',
            originY: 'top',
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
          imageRef.current = img;
          applyAdjustments(img, F, adjustmentsRef.current);
          canvas.add(img);
          canvas.setActiveObject(img);
          fitToView();
          canvas.requestRenderAll();
          historyRef.current = { stack: [{ dataUrl: startDataUrl, cropRect: startRect }], index: 0 };
          updateHistoryButtons();
          setReady(true);
        });
      };
      pristine.src = sourceDataUrl;

      canvas.on('after:render', () => {
        const ctx = canvasElRef.current?.getContext('2d');
        const vt = canvas.viewportTransform;
        if (!ctx || !vt || !imageRef.current) return;
        const mask = selectionMaskRef.current;
        if (mask && maskHasSelection(mask)) {
          const tint = maskToTintCanvas(mask, [56, 145, 255]);
          const img = imageRef.current;
          ctx.save();
          ctx.globalAlpha = 1;
          const x = (img.left || 0) * vt[0] + vt[4];
          const y = (img.top || 0) * vt[3] + vt[5];
          const w = tint.width * (img.scaleX || 1) * vt[0];
          const h = tint.height * (img.scaleY || 1) * vt[3];
          ctx.drawImage(tint, x, y, w, h);
          ctx.restore();
        }
      });
    });

    return () => {
      disposed = true;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDataUrl]);

  const fitToView = () => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    const el = containerRef.current;
    if (!canvas || !img || !el) return;
    const pad = 60;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    canvas.setWidth(vw);
    canvas.setHeight(vh);
    const scale = Math.min((vw - pad * 2) / img.width, (vh - pad * 2) / img.height, 4);
    const s = Math.max(0.02, scale);
    viewScaleRef.current = s;
    img.set({ scaleX: s, scaleY: s, left: (vw - img.width * s) / 2, top: (vh - img.height * s) / 2 });
    img.setCoords();
    canvas.requestRenderAll();
  };

  const canvasToImageLocal = (pt: { x: number; y: number }) => {
    const img = imageRef.current;
    return { x: (pt.x - (img.left || 0)) / (img.scaleX || 1), y: (pt.y - (img.top || 0)) / (img.scaleY || 1) };
  };

  const pushLocalHistory = (dataUrl: string, cropRect: CropRect) => {
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push({ dataUrl, cropRect });
    if (h.stack.length > MAX_LOCAL_HISTORY) h.stack.shift();
    h.index = h.stack.length - 1;
    updateHistoryButtons();
  };

  const restoreHistoryState = (index: number) => {
    const h = historyRef.current;
    const entry = h.stack[index];
    const img = imageRef.current;
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!entry || !img || !canvas) return;
    img.setSrc(entry.dataUrl, () => {
      cropRectRef.current = entry.cropRect;
      applyAdjustments(img, F, adjustmentsRef.current);
      fitToView();
      canvas.requestRenderAll();
      h.index = index;
      updateHistoryButtons();
    });
  };

  const undoLocal = () => {
    const h = historyRef.current;
    if (h.index > 0) restoreHistoryState(h.index - 1);
  };
  const redoLocal = () => {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) restoreHistoryState(h.index + 1);
  };

  // ---- Adjustments (live, non-destructive until Apply) ----
  const setAdjustment = (key: keyof PhotoAdjustments, value: number | boolean) => {
    const next = { ...adjustmentsRef.current, [key]: value };
    setAdjustments(next);
    const img = imageRef.current;
    const F = fabricModRef.current;
    if (img && F) {
      applyAdjustments(img, F, next);
      fabricCanvasRef.current?.requestRenderAll();
    }
  };
  // ---- Crop tool ----
  const startCrop = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    if (!canvas || !F || !img) return;
    setActiveTool('crop');
    const w = img.width * (img.scaleX || 1);
    const h = img.height * (img.scaleY || 1);
    const rect = new F.Rect({
      left: (img.left || 0) + w * 0.1,
      top: (img.top || 0) + h * 0.1,
      width: w * 0.8,
      height: h * 0.8,
      fill: 'transparent',
      stroke: '#3891ff',
      strokeDashArray: [6, 4],
      strokeWidth: 1.5,
      cornerColor: '#3891ff',
      cornerStyle: 'circle',
      transparentCorners: false,
      hasRotatingPoint: false,
      lockRotation: true,
    });
    rect.setControlsVisibility({ mtr: false });
    cropObjRef.current = rect;
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  };

  const cancelCrop = () => {
    const canvas = fabricCanvasRef.current;
    if (cropObjRef.current && canvas) canvas.remove(cropObjRef.current);
    cropObjRef.current = null;
    setActiveTool('select');
    if (canvas && imageRef.current) canvas.setActiveObject(imageRef.current);
  };

  const applyCrop = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    const rect = cropObjRef.current;
    const pristine = pristineElRef.current;
    if (!canvas || !F || !img || !rect || !pristine) return;

    const localA = canvasToImageLocal({ x: rect.left, y: rect.top });
    const localRect = {
      x: Math.max(0, localA.x),
      y: Math.max(0, localA.y),
      width: Math.min(img.width - Math.max(0, localA.x), rect.width * (rect.scaleX || 1)),
      height: Math.min(img.height - Math.max(0, localA.y), rect.height * (rect.scaleY || 1)),
    };
    if (localRect.width < 2 || localRect.height < 2) {
      cancelCrop();
      return;
    }

    // Compose into the ORIGINAL pristine image's pixel space so re-
    // cropping never re-samples an already-cropped/re-encoded copy —
    // every crop in this session is drawn straight from the pristine
    // source, with zero cumulative quality loss.
    const cur = cropRectRef.current;
    const sx = cur.width / img.width;
    const sy = cur.height / img.height;
    const newRect: CropRect = {
      x: cur.x + localRect.x * sx,
      y: cur.y + localRect.y * sy,
      width: localRect.width * sx,
      height: localRect.height * sy,
    };

    const cropped = cropToCanvas(pristine, pristine.naturalWidth, pristine.naturalHeight, newRect);
    const dataUrl = cropped.toDataURL('image/png');
    cropRectRef.current = newRect;

    canvas.remove(rect);
    cropObjRef.current = null;
    // A mask's clip region is fixed in absolute canvas coordinates from
    // when it was created — cropping repositions/rescales the image
    // under it (via fitToView below), which would leave the mask visibly
    // misaligned. Rather than render something silently wrong, clear it.
    if (img.clipPath) {
      img.clipPath = null;
      maskPathRef.current = null;
      setHasMask(false);
    }
    img.setSrc(dataUrl, () => {
      applyAdjustments(img, F, adjustmentsRef.current);
      fitToView();
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      pushLocalHistory(dataUrl, newRect);
      setActiveTool('select');
    });
  };

  // ---- Pixel selection tools (marquee/lasso/magic-wand), reused as-is
  // from the main editor's own hook. ----
  const { handleMouseDown: selDown, handleMouseMove: selMove, handleMouseUp: selUp } = usePixelSelectionTool({
    fabricCanvasRef,
    activeToolRef: activeToolRef as any,
    toleranceRef,
    contiguousRef,
    getSelectionMask: () => selectionMaskRef.current,
    onSelectionChanged: (_uid: string, mask: PixelMask | null) => {
      setSelectionMask(mask);
      renderTint();
    },
    onNoImageSelected: () => {},
  });

  const isSelectTool = (t: PhotoTool) => t === 'marquee-rect' || t === 'marquee-ellipse' || t === 'lasso' || t === 'magic-wand';

  // ---- Pen tool + Direct Selection (anchor editing), reused verbatim
  // from the main editor's own hooks — real bezier path drawing/editing,
  // not a simplified stand-in. A finished path becomes selectable and
  // can be used to build a real mask (see maskPathRef below). ----
  const { clearDraft: clearPenDraft, finishPath: finishPenPath, handleMouseDown: handlePenMouseDown, handleMouseMove: handlePenMouseMove, handleMouseUp: handlePenMouseUp } =
    usePenTool({
      fabricCanvasRef,
      onPathFinished: (pathObj) => {
        const canvas = fabricCanvasRef.current;
        pathObj.set({ selectable: true, evented: true, stroke: '#3891ff', strokeWidth: 1.5, fill: '' });
        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        lastPathRef.current = pathObj;
        setHasVectorPath(true);
        canvas.requestRenderAll();
        setActiveTool('direct');
        renderHandles(pathObj);
      },
    });

  const { clearHandles, renderHandles, deleteActiveAnchor } = useDirectSelection({
    fabricCanvasRef,
    onAnchorMoved: () => {},
  });

  const handleDirectClick = (opt: any) => {
    const canvas = fabricCanvasRef.current;
    const target = canvas.findTarget ? canvas.findTarget(opt.e, false) : null;
    if (target && target.isVectorPath) {
      lastPathRef.current = target;
      setHasVectorPath(true);
      canvas.setActiveObject(target);
      renderHandles(target);
    } else if (!target || !target.__isAnchorHandle) {
      clearHandles();
    }
  };

  // ---- Real, non-destructive masking: clips the image to the last
  // drawn/selected vector path. This never touches pixel data (so it
  // isn't part of the crop/pixel-op undo stack above) — toggling,
  // inverting or removing it is instant and fully reversible.
  const createMaskFromPath = () => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    const path = lastPathRef.current;
    if (!canvas || !img || !path) return;
    clearHandles();
    path.clone((clip: any) => {
      clip.set({ absolutePositioned: true, inverted: false });
      img.clipPath = clip;
      maskPathRef.current = clip;
      setHasMask(true);
      setMaskEnabled(true);
      setMaskInverted(false);
      canvas.remove(path);
      lastPathRef.current = null;
      setHasVectorPath(false);
      canvas.requestRenderAll();
    });
  };

  const toggleMaskEnabled = () => {
    const img = imageRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !maskPathRef.current) return;
    const next = !maskEnabled;
    img.clipPath = next ? maskPathRef.current : null;
    setMaskEnabled(next);
    canvas.requestRenderAll();
  };

  const toggleMaskInverted = () => {
    const img = imageRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !maskPathRef.current) return;
    const next = !maskInverted;
    maskPathRef.current.inverted = next;
    setMaskInverted(next);
    if (maskEnabled) canvas.requestRenderAll();
  };

  const removeMask = () => {
    const img = imageRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img) return;
    img.clipPath = null;
    maskPathRef.current = null;
    setHasMask(false);
    canvas.requestRenderAll();
  };

  const bakeAndPush = (dataUrl: string) => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    const F = fabricModRef.current;
    img.setSrc(dataUrl, () => {
      applyAdjustments(img, F, adjustmentsRef.current);
      canvas.requestRenderAll();
      pushLocalHistory(dataUrl, cropRectRef.current);
    });
  };

  const deleteSelectedPixels = () => {
    const mask = selectionMaskRef.current;
    const img = imageRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    bakeAndPush(clearMaskedPixels(getImagePixelCanvas(img), mask));
    setSelectionMask(null);
  };
  const applySelectionAsMask = () => {
    const mask = selectionMaskRef.current;
    const img = imageRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    bakeAndPush(applyMaskKeepSelected(getImagePixelCanvas(img), mask));
    setSelectionMask(null);
  };
  const invertSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(invertMask(selectionMaskRef.current));
    renderTint();
  };
  const featherSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(featherMask(selectionMaskRef.current, 4));
    renderTint();
  };
  const deselect = () => {
    setSelectionMask(null);
    renderTint();
  };

  // ---- Brush-like tools (eraser/brush/dodge/burn): circular dabs
  // unioned into one running mask as the stroke moves, with the actual
  // pixel operation (clear/paint-color/lighten/darken) applied once on
  // mouse-up — same mechanics as the selection tools, just fed by a
  // moving brush instead of a drag shape. ----
  const paintDab = (local: { x: number; y: number }) => {
    const img = imageRef.current;
    if (!img) return;
    const r = brushSizeRef.current / 2;
    const dab = ellipseMask(img.width, img.height, local.x, local.y, r, r);
    paintDraftRef.current = paintDraftRef.current ? combineMasks(paintDraftRef.current, dab, 'add') : dab;
    setSelectionMask(paintDraftRef.current);
    renderTint();
  };

  const bakePaintStroke = (tool: PhotoTool) => {
    const mask = paintDraftRef.current;
    const img = imageRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    const pixelCanvas = getImagePixelCanvas(img);
    if (tool === 'eraser') bakeAndPush(clearMaskedPixels(pixelCanvas, mask));
    else if (tool === 'brush') bakeAndPush(paintColorInMask(pixelCanvas, mask, brushColor));
    else if (tool === 'dodge') bakeAndPush(dodgeBurnInMask(pixelCanvas, mask, dodgeBurnStrength));
    else if (tool === 'burn') bakeAndPush(dodgeBurnInMask(pixelCanvas, mask, -dodgeBurnStrength));
  };

  // ---- Gradient: click-drag draws a live preview line; releasing bakes
  // a real two-stop linear gradient along it. ----
  const startGradientDraft = (local: { x: number; y: number }, canvasPoint: { x: number; y: number }) => {
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    const line = new F.Line([canvasPoint.x, canvasPoint.y, canvasPoint.x, canvasPoint.y], {
      stroke: '#3891ff',
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      selectable: false,
      evented: false,
    });
    canvas.add(line);
    gradientDraftRef.current = { start: local, line };
  };

  const handleCanvasMouseDown = (opt: any) => {
    const tool = activeToolRef.current;
    const canvas = fabricCanvasRef.current;
    if (PAINT_TOOLS.includes(tool)) {
      paintingRef.current = true;
      paintDraftRef.current = null;
      const pointer = canvas.getPointer(opt.e);
      paintDab(canvasToImageLocal(pointer));
      return;
    }
    if (tool === 'eyedropper') {
      const img = imageRef.current;
      if (!img) return;
      const pointer = canvas.getPointer(opt.e);
      const local = canvasToImageLocal(pointer);
      const picked = pickColorAt(getImagePixelCanvas(img), local.x, local.y);
      if (picked) setBrushColor(picked);
      return;
    }
    if (tool === 'gradient') {
      const pointer = canvas.getPointer(opt.e);
      startGradientDraft(canvasToImageLocal(pointer), pointer);
      return;
    }
    if (tool === 'pen') {
      handlePenMouseDown(opt);
      return;
    }
    if (tool === 'direct') {
      handleDirectClick(opt);
      return;
    }
    if (isSelectTool(tool)) selDown(opt);
  };
  const handleCanvasMouseMove = (opt: any) => {
    const tool = activeToolRef.current;
    const canvas = fabricCanvasRef.current;
    if (PAINT_TOOLS.includes(tool) && paintingRef.current) {
      const pointer = canvas.getPointer(opt.e);
      paintDab(canvasToImageLocal(pointer));
      return;
    }
    if (tool === 'gradient' && gradientDraftRef.current) {
      const pointer = canvas.getPointer(opt.e);
      gradientDraftRef.current.line.set({ x2: pointer.x, y2: pointer.y });
      canvas.requestRenderAll();
      return;
    }
    if (tool === 'pen') {
      handlePenMouseMove(opt);
      return;
    }
    if (isSelectTool(tool)) selMove(opt);
  };
  const handleCanvasMouseUp = (opt: any) => {
    const tool = activeToolRef.current;
    const canvas = fabricCanvasRef.current;
    if (PAINT_TOOLS.includes(tool)) {
      paintingRef.current = false;
      bakePaintStroke(tool);
      paintDraftRef.current = null;
      setSelectionMask(null);
      return;
    }
    if (tool === 'gradient' && gradientDraftRef.current) {
      const { start, line } = gradientDraftRef.current;
      const pointer = canvas.getPointer(opt.e);
      const end = canvasToImageLocal(pointer);
      canvas.remove(line);
      gradientDraftRef.current = null;
      const img = imageRef.current;
      if (img && Math.hypot(end.x - start.x, end.y - start.y) > 2) {
        bakeAndPush(applyGradientOverlay(getImagePixelCanvas(img), start.x, start.y, end.x, end.y, gradientColor1, gradientColor2, gradientOpacity));
      } else {
        canvas.requestRenderAll();
      }
      return;
    }
    if (tool === 'pen') {
      handlePenMouseUp();
      return;
    }
    if (isSelectTool(tool)) selUp(opt);
  };

  const applyLevelsNow = () => {
    const img = imageRef.current;
    if (!img) return;
    bakeAndPush(applyLevels(getImagePixelCanvas(img), levels));
  };

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !ready) return;
    canvas.on('mouse:down', handleCanvasMouseDown);
    canvas.on('mouse:move', handleCanvasMouseMove);
    canvas.on('mouse:up', handleCanvasMouseUp);
    return () => {
      canvas.off('mouse:down', handleCanvasMouseDown);
      canvas.off('mouse:move', handleCanvasMouseMove);
      canvas.off('mouse:up', handleCanvasMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Pen/Direct Selection need clicks to reach the canvas itself (to place
  // an anchor, or hit-test a path/handle) rather than being swallowed by
  // the image becoming the active object first.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    if (activeTool === 'pen' || activeTool === 'direct') {
      canvas.discardActiveObject();
      canvas.selection = false;
      img.evented = false;
    } else {
      img.evented = true;
      canvas.selection = false; // image is the only real object; nothing to marquee-select
      if (activeTool !== 'crop') canvas.setActiveObject(img);
    }
    if (activeTool !== 'pen') clearPenDraft();
    if (activeTool !== 'direct') clearHandles();
    canvas.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Keyboard handling only while this workspace is the one actually
  // showing — otherwise Enter/Escape/Delete here would also fire while
  // the user is looking at Main Design.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const isTypingInField = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (isTypingInField) return;
      if (activeToolRef.current === 'pen') {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishPenPath(false);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          clearPenDraft();
          return;
        }
      }
      if (activeToolRef.current === 'direct' && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (deleteActiveAnchor()) e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, finishPenPath, clearPenDraft, deleteActiveAnchor]);

  // ---- Background removal (heuristic): flood-fills from all 4 corners
  // by color similarity and clears the matched pixels. Not ML-based
  // segmentation — an honest edge-color heuristic, works best on a
  // fairly flat/uniform background. ----
  const [bgTolerance, setBgTolerance] = useState(24);
  const removeBackground = () => {
    const img = imageRef.current;
    if (!img) return;
    const pixelCanvas = getImagePixelCanvas(img);
    const ctx = pixelCanvas.getContext('2d') as CanvasRenderingContext2D;
    const data = ctx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
    const corners = [
      [0, 0],
      [pixelCanvas.width - 1, 0],
      [0, pixelCanvas.height - 1],
      [pixelCanvas.width - 1, pixelCanvas.height - 1],
    ];
    let mask: PixelMask | null = null;
    for (const [cx, cy] of corners) {
      const shape = magicWandMask(data, cx, cy, bgTolerance, true);
      mask = mask ? combineMasks(mask, shape, 'add') : shape;
    }
    if (mask && maskHasSelection(mask)) bakeAndPush(clearMaskedPixels(pixelCanvas, mask));
  };

  const restoreOriginal = () => {
    const img = imageRef.current;
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const pristine = pristineElRef.current;
    if (!img || !canvas || !F || !pristine) return;
    const fullRect: CropRect = { x: 0, y: 0, width: pristine.naturalWidth, height: pristine.naturalHeight };
    const dataUrl = cropToCanvas(pristine, pristine.naturalWidth, pristine.naturalHeight, fullRect).toDataURL('image/png');
    cropRectRef.current = fullRect;
    setAdjustments(DEFAULT_ADJUSTMENTS);
    if (img.clipPath) {
      img.clipPath = null;
      maskPathRef.current = null;
      setHasMask(false);
    }
    img.setSrc(dataUrl, () => {
      applyAdjustments(img, F, DEFAULT_ADJUSTMENTS);
      fitToView();
      canvas.requestRenderAll();
      pushLocalHistory(dataUrl, fullRect);
      setSelectionMask(null);
    });
  };

  const handleApply = () => {
    const img = imageRef.current;
    const F = fabricModRef.current;
    if (!img || !F) return;
    applyAdjustments(img, F, adjustmentsRef.current);
    const dataUrl = img.toDataURL({});
    const nat = naturalSizeRef.current;
    const cur = cropRectRef.current;
    const isFullImage = cur.x === 0 && cur.y === 0 && Math.round(cur.width) === nat.w && Math.round(cur.height) === nat.h;
    onApply({ dataUrl, adjustments: adjustmentsRef.current, cropRect: isFullImage ? null : cur });
  };

  const hasSelection = maskHasSelection(selectionMask);

  const toolButtons: { id: PhotoTool; label: string }[] = [
    { id: 'select', label: 'Select' },
    { id: 'crop', label: 'Crop' },
    { id: 'pen', label: 'Pen' },
    { id: 'direct', label: 'Direct Select' },
    { id: 'marquee-rect', label: 'Marquee' },
    { id: 'marquee-ellipse', label: 'Ellipse' },
    { id: 'lasso', label: 'Lasso' },
    { id: 'magic-wand', label: 'Magic Wand' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'brush', label: 'Brush' },
    { id: 'dodge', label: 'Dodge' },
    { id: 'burn', label: 'Burn' },
    { id: 'eyedropper', label: 'Color Picker' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'levels', label: 'Levels' },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-40 border-r bg-white p-2 flex flex-col gap-1 overflow-y-auto">
        {toolButtons.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (activeTool === 'crop' && cropObjRef.current) cancelCrop();
              if (t.id === 'crop') startCrop();
              else setActiveTool(t.id);
            }}
            className={`text-left text-xs px-2 py-1.5 rounded ${activeTool === t.id ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}

        <div className="border-t my-2" />
        <button onClick={undoLocal} disabled={!canUndo} className="text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30">↶ Undo</button>
        <button onClick={redoLocal} disabled={!canRedo} className="text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30">↷ Redo</button>
        <button onClick={restoreOriginal} className="text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700">Restore Original</button>
      </div>

      <div ref={containerRef} className="flex-1 relative bg-gray-200">
        <canvas ref={canvasElRef} />
        {activeTool === 'crop' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-full shadow px-3 py-1.5">
            <button onClick={cancelCrop} className="text-xs px-3 py-1 rounded-full border">Cancel Crop</button>
            <button onClick={applyCrop} className="text-xs px-3 py-1 rounded-full bg-gray-800 text-white">Apply Crop</button>
          </div>
        )}
      </div>

      <div className="w-64 border-l bg-white p-3 overflow-y-auto flex flex-col gap-4 text-sm">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Adjustments</p>
            <button onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)} className="text-[11px] text-gray-400 hover:text-gray-700">Reset</button>
          </div>
          {([
            ['brightness', 'Brightness', -1, 1],
            ['contrast', 'Contrast', -1, 1],
            ['saturation', 'Saturation', -1, 1],
            ['hue', 'Hue', -1, 1],
            ['blur', 'Blur', 0, 1],
            ['sharpen', 'Sharpen', 0, 1],
          ] as [keyof PhotoAdjustments, string, number, number][]).map(([key, label, min, max]) => (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                <span>{label}</span>
                <span>{(adjustments[key] as number).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={0.01}
                value={adjustments[key] as number}
                onChange={(e) => setAdjustment(key, parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1">
            <input
              type="checkbox"
              checked={adjustments.blackAndWhite}
              onChange={(e) => setAdjustment('blackAndWhite', e.target.checked)}
            />
            Black &amp; White
          </label>
        </div>

        {(isSelectTool(activeTool) || hasSelection) && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Selection</p>
            {activeTool === 'magic-wand' && (
              <>
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                    <span>Tolerance</span>
                    <span>{tolerance}</span>
                  </div>
                  <input type="range" min={0} max={100} value={tolerance} onChange={(e) => setTolerance(parseInt(e.target.value))} className="w-full" />
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-2">
                  <input type="checkbox" checked={contiguous} onChange={(e) => setContiguous(e.target.checked)} /> Contiguous
                </label>
              </>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={invertSelection} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Invert</button>
              <button onClick={deselect} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Deselect</button>
              <button onClick={featherSelection} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Feather</button>
              <button onClick={applySelectionAsMask} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Apply as Mask</button>
              <button onClick={deleteSelectedPixels} disabled={!hasSelection} className="col-span-2 text-[11px] px-2 py-1 border rounded text-red-500 disabled:opacity-30">Delete Selected Pixels</button>
            </div>
          </div>
        )}

        {(activeTool === 'eraser' || activeTool === 'brush' || activeTool === 'dodge' || activeTool === 'burn') && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
              {activeTool === 'eraser' ? 'Eraser' : activeTool === 'brush' ? 'Brush' : activeTool === 'dodge' ? 'Dodge (lighten)' : 'Burn (darken)'}
            </p>
            <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
              <span>Brush size</span>
              <span>{brushSize}px</span>
            </div>
            <input type="range" min={4} max={200} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full mb-2" />
            {activeTool === 'brush' && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-gray-500">Color</label>
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-6 border rounded" />
              </div>
            )}
            {(activeTool === 'dodge' || activeTool === 'burn') && (
              <>
                <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                  <span>Strength</span>
                  <span>{dodgeBurnStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={dodgeBurnStrength}
                  onChange={(e) => setDodgeBurnStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </>
            )}
          </div>
        )}

        {activeTool === 'eyedropper' && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Color Picker</p>
            <p className="text-[11px] text-gray-500 mb-2">Click anywhere on the image to pick its color — sets the Brush color.</p>
            <div className="flex items-center gap-2">
              <span className="w-8 h-6 border rounded" style={{ background: brushColor }} />
              <span className="text-[11px] text-gray-600 font-mono">{brushColor}</span>
            </div>
          </div>
        )}

        {activeTool === 'gradient' && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Gradient</p>
            <p className="text-[11px] text-gray-500 mb-2">Click and drag across the image to draw a linear gradient.</p>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-[11px] text-gray-500">From</label>
              <input type="color" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} className="w-8 h-6 border rounded" />
              <label className="text-[11px] text-gray-500">To</label>
              <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-8 h-6 border rounded" />
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
              <span>Opacity</span>
              <span>{gradientOpacity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={gradientOpacity} onChange={(e) => setGradientOpacity(parseFloat(e.target.value))} className="w-full" />
          </div>
        )}

        {activeTool === 'levels' && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Levels</p>
            {([
              ['inputBlack', 'Input black', 0, 254],
              ['inputWhite', 'Input white', 1, 255],
            ] as [keyof LevelsSettings, string, number, number][]).map(([key, label, min, max]) => (
              <div key={key} className="mb-2">
                <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                  <span>{label}</span>
                  <span>{levels[key]}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={levels[key]}
                  onChange={(e) => setLevels((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            ))}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                <span>Gamma</span>
                <span>{levels.gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.05}
                value={levels.gamma}
                onChange={(e) => setLevels((prev) => ({ ...prev, gamma: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setLevels(DEFAULT_LEVELS)} className="flex-1 text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Reset</button>
              <button onClick={applyLevelsNow} className="flex-1 text-[11px] px-2 py-1.5 border rounded bg-gray-800 text-white hover:bg-gray-700">Apply</button>
            </div>
          </div>
        )}

        {(activeTool === 'pen' || activeTool === 'direct') && (
          <div className="border-t pt-3">
            <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
              {activeTool === 'pen' ? 'Pen' : 'Direct Selection'}
            </p>
            <p className="text-[11px] text-gray-500">
              {activeTool === 'pen'
                ? 'Click to place anchors, drag for curve handles. Enter finishes an open path; click the first anchor to close it. Esc cancels.'
                : 'Drag an anchor to move it. Alt/Option-click toggles corner/smooth. Click a green square to add an anchor. Delete removes the selected anchor.'}
            </p>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Mask</p>
          {!hasMask ? (
            <>
              <p className="text-[11px] text-gray-400 mb-2">
                Draw a path with the Pen tool, then create a mask from it — a real, non-destructive clip that can be toggled, inverted or removed.
              </p>
              <button
                onClick={createMaskFromPath}
                disabled={!hasVectorPath}
                className="w-full text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Create Mask from Path
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={toggleMaskEnabled} className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50">
                {maskEnabled ? 'Disable' : 'Enable'}
              </button>
              <button onClick={toggleMaskInverted} className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50">
                {maskInverted ? 'Un-invert' : 'Invert'}
              </button>
              <button onClick={removeMask} className="col-span-2 text-[11px] px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">
                Remove Mask
              </button>
            </div>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Background Removal</p>
          <p className="text-[11px] text-gray-400 mb-2">Heuristic edge-color removal — works best on a flat background, not ML segmentation.</p>
          <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
            <span>Tolerance</span>
            <span>{bgTolerance}</span>
          </div>
          <input type="range" min={0} max={100} value={bgTolerance} onChange={(e) => setBgTolerance(parseInt(e.target.value))} className="w-full mb-2" />
          <button onClick={removeBackground} className="w-full text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Remove Background</button>
        </div>

        <div className="mt-auto border-t pt-3 flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-full border">Cancel</button>
          <button onClick={handleApply} className="flex-1 text-xs px-3 py-2 rounded-full bg-brand-gradient text-white font-semibold">Apply to Design</button>
        </div>
      </div>
    </div>
  );
}
