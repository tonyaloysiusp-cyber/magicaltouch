'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  PixelMask,
  combineMasks,
  rectMask,
  ellipseMask,
  softBrushMask,
  polygonMask,
  magicWandMask,
  invertMask,
  featherMask,
  maskHasSelection,
  clearMaskedPixels,
  applyMaskKeepSelected,
  maskToTintCanvas,
  maskToCanvas,
  cloneMask,
  createEmptyMask,
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
import { imageObjectToDataURL, nativeResMultiplier, clampMultiplierForSafety, configureHighQualityContext, devicePixelRatioSafe } from '@/lib/editor/imageQuality';
import { LayersPanel } from '@/components/editor/LayersPanel';
import {
  Hand,
  MousePointer2,
  Pointer,
  Crop as CropIcon,
  PenTool as PenToolIcon,
  SquareDashedMousePointer,
  CircleDashed,
  Lasso as LassoIcon,
  Wand2,
  Eraser as EraserIcon,
  Paintbrush,
  Sun,
  Moon,
  Pipette,
  Blend,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';

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
  // Lets the host page's own top-bar Undo/Redo buttons (which otherwise
  // stay wired to Main Design even while this workspace is showing —
  // silently editing the hidden canvas instead of doing nothing useful)
  // reflect and control THIS workspace's own history while it's active.
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onShowShortcuts?: () => void;
}

export interface PhotoEditorHandle {
  undo: () => void;
  redo: () => void;
}

type PhotoTool =
  | 'hand'
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
  | 'levels'
  | 'mask-reveal'
  | 'mask-hide';

const PAINT_TOOLS: PhotoTool[] = ['eraser', 'brush', 'dodge', 'burn'];
const MASK_PAINT_TOOLS: PhotoTool[] = ['mask-reveal', 'mask-hide'];

// Icons + shortcut labels for every tool — matching Photoshop's own key
// bindings (and icon meaning) wherever a real equivalent exists, so
// nothing here is an invented convention. Rendered at size 16 to read
// clearly in the toolbar's compact 44px column.
const ICON_SIZE = 16;
const TOOL_ICONS: Record<PhotoTool, React.ReactNode> = {
  hand: <Hand size={ICON_SIZE} />,
  select: <MousePointer2 size={ICON_SIZE} />,
  crop: <CropIcon size={ICON_SIZE} />,
  pen: <PenToolIcon size={ICON_SIZE} />,
  direct: <Pointer size={ICON_SIZE} />,
  'marquee-rect': <SquareDashedMousePointer size={ICON_SIZE} />,
  'marquee-ellipse': <CircleDashed size={ICON_SIZE} />,
  lasso: <LassoIcon size={ICON_SIZE} />,
  'magic-wand': <Wand2 size={ICON_SIZE} />,
  eraser: <EraserIcon size={ICON_SIZE} />,
  brush: <Paintbrush size={ICON_SIZE} />,
  dodge: <Sun size={ICON_SIZE} />,
  burn: <Moon size={ICON_SIZE} />,
  eyedropper: <Pipette size={ICON_SIZE} />,
  gradient: <Blend size={ICON_SIZE} />,
  levels: <SlidersHorizontal size={ICON_SIZE} />,
  'mask-reveal': <Eye size={ICON_SIZE} />,
  'mask-hide': <EyeOff size={ICON_SIZE} />,
};

const SHORTCUT_LABEL: Partial<Record<PhotoTool, string>> = {
  hand: 'H',
  select: 'V',
  crop: 'C',
  pen: 'P',
  direct: 'A',
  'marquee-rect': 'M',
  'marquee-ellipse': 'Shift+M',
  lasso: 'L',
  'magic-wand': 'W',
  eraser: 'E',
  brush: 'B',
  dodge: 'O',
  burn: 'Shift+O',
  eyedropper: 'I',
  gradient: 'G',
  levels: 'Ctrl/Cmd+L',
  'mask-reveal': 'R',
  'mask-hide': 'Shift+R',
};

const MAX_LOCAL_HISTORY = 30;
const ZOOM_PRESETS = [25, 50, 100, 200, 400];
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 8;

function cropToCanvas(source: CanvasImageSource, sw: number, sh: number, rect: CropRect): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(rect.width));
  out.height = Math.max(1, Math.round(rect.height));
  const ctx = out.getContext('2d') as CanvasRenderingContext2D;
  configureHighQualityContext(ctx);
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height);
  return out;
}

// Decodes a PNG data URL (the same encoding maskToCanvas produces — RGB
// irrelevant, mask value carried entirely in alpha) back into a PixelMask.
// Used to restore a mask from a history entry, where masks are kept as
// compressed PNG strings rather than raw Uint8ClampedArrays — a 6000x4000
// mask is ~24MB uncompressed; PNG's lossless compression of what's
// usually large uniform regions keeps 30 history entries affordable.
function maskDataUrlToMask(dataUrl: string): Promise<PixelMask> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const mask = createEmptyMask(c.width, c.height);
      for (let i = 0; i < mask.data.length; i++) mask.data[i] = data[i * 4 + 3];
      resolve(mask);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

interface HistoryEntry {
  dataUrl: string;
  cropRect: CropRect;
  maskDataUrl: string | null;
  maskEnabled: boolean;
  maskInverted: boolean;
}

let layerIdCounter = 0;
function nextLayerId() {
  layerIdCounter += 1;
  return `layer_${Date.now()}_${layerIdCounter}`;
}

// The Photo Editor workspace: a self-contained, real multi-layer Fabric
// canvas for all raster/pixel editing. Every raster layer is a genuine,
// independent fabric.Image on the canvas's own object stack (visibility/
// opacity/lock/reorder/duplicate are just that object's real Fabric
// properties — not a simulated list) tagged with a handful of custom
// `__`-prefixed fields (pristine source, natural size, crop rect,
// adjustments, mask data, local history) the same way the rest of this
// app already stashes per-object metadata (__uid, __artboardId, ...).
//
// It never touches the main design canvas directly — the caller (app/
// editor's openPhotoEditor/applyPhotoEdits) hands it a pristine source
// and gets back a finished, native-resolution data URL to swap into the
// target image layer, the same "update in place, preserve frame" pattern
// replaceSelectedImage already uses for Replace Image.
export const PhotoEditorWorkspace = forwardRef<PhotoEditorHandle, Props>(function PhotoEditorWorkspace(
  { active, sourceDataUrl, initialAdjustments, initialCropRect, onApply, onCancel, onHistoryChange, onShowShortcuts },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModRef = useRef<any>(null);
  // Always points at the currently ACTIVE layer's fabric.Image — kept in
  // sync with canvas.getActiveObject() by setActiveLayer(). Every tool
  // function below reads/writes through this, so switching the active
  // layer in the Layers panel transparently retargets every tool at the
  // newly-selected layer's own pristine source / crop / mask / history.
  const imageRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState<PhotoTool>('select');
  const activeToolRef = useRef<PhotoTool>('select');
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // ---- Zoom / pan: real viewport-transform based zoom (not "scale the
  // image object"), so multiple layers of different native resolutions
  // stay correctly aligned in one shared document space, and 100% zoom
  // really is one image pixel per screen pixel. ----
  const [zoomPct, setZoomPct] = useState(100);
  const spaceDownRef = useRef(false);
  const panningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

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

  // Shared by every brush-like tool (eraser/brush/dodge/burn/mask paint):
  // brush radius + softness, plus the running dab mask a stroke paints
  // into before its operation bakes once on mouse-up.
  const [brushSize, setBrushSize] = useState(40);
  const brushSizeRef = useRef(40);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  const [brushHardness, setBrushHardness] = useState(0.5);
  const brushHardnessRef = useRef(0.5);
  useEffect(() => {
    brushHardnessRef.current = brushHardness;
  }, [brushHardness]);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const brushOpacityRef = useRef(1);
  useEffect(() => {
    brushOpacityRef.current = brushOpacity;
  }, [brushOpacity]);
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

  // ---- Vector path (Pen tool) — same reused hooks as before. A
  // finished path can be turned into a real mask contribution (painted
  // into the active layer's mask data) via "Add Path to Mask" below. ----
  const lastPathRef = useRef<any>(null);
  const [hasVectorPath, setHasVectorPath] = useState(false);

  // ---- UI mirrors of the ACTIVE layer's own state, resynced by
  // setActiveLayer() whenever the selection changes. The real values
  // always live on the fabric object itself (imageRef.current.__...). ----
  const [hasMask, setHasMask] = useState(false);
  const [maskEnabled, setMaskEnabled] = useState(true);
  const [maskInverted, setMaskInverted] = useState(false);
  const [maskFeather, setMaskFeather] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Bumped on ANY mutation to the active layer's history/mask/layer list
  // that the panels need to re-render for, since that state mostly lives
  // as mutable properties on Fabric objects rather than React state.
  const [, setRenderTick] = useState(0);
  const bump = useCallback(() => setRenderTick((v) => v + 1), []);

  const [bgTolerance, setBgTolerance] = useState(24);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------
  // Layer helpers
  // ---------------------------------------------------------------
  const getLayers = useCallback((): any[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];
    return canvas.getObjects().filter((o: any) => o.__layerId);
  }, []);

  const getBaseLayer = useCallback((): any => {
    const layers = getLayers();
    return layers.length ? layers[0] : null;
  }, [getLayers]);

  const refreshMaskClip = (layer: any, F: any) => {
    if (!layer.__maskData || !layer.__maskEnabled) {
      layer.clipPath = null;
    } else {
      const canvasEl = maskToCanvas(layer.__maskData);
      const clipImg = new F.Image(canvasEl, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      clipImg.inverted = !!layer.__maskInverted;
      layer.clipPath = clipImg;
    }
    layer.dirty = true;
  };

  // Pushes the layer's CURRENT full state (pixels + crop + mask) as a new
  // history step. Masks are stored as compressed PNGs, not raw arrays —
  // see maskDataUrlToMask's comment on why that matters for memory.
  const pushLayerHistory = (layer: any, dataUrl: string, cropRect: CropRect) => {
    const entry: HistoryEntry = {
      dataUrl,
      cropRect,
      maskDataUrl: layer.__maskData ? maskToCanvas(layer.__maskData).toDataURL('image/png') : null,
      maskEnabled: !!layer.__maskEnabled,
      maskInverted: !!layer.__maskInverted,
    };
    const stack: HistoryEntry[] = layer.__historyStack || [];
    const trimmed = stack.slice(0, (layer.__historyIndex ?? -1) + 1);
    trimmed.push(entry);
    if (trimmed.length > MAX_LOCAL_HISTORY) trimmed.shift();
    layer.__historyStack = trimmed;
    layer.__historyIndex = trimmed.length - 1;
    // canUndo/canRedo are React state (so the Undo/Redo buttons re-render),
    // but were previously only refreshed on switching the active layer —
    // meaning after the very first edit in a session, Undo stayed
    // whatever it was at load time (usually disabled) no matter how many
    // real edits followed. Refresh them here, on every push, for
    // whichever layer is currently active.
    if (imageRef.current === layer) {
      setCanUndo(layer.__historyIndex > 0);
      setCanRedo(false); // a new push always truncates any redo branch
    }
    bump();
  };

  const restoreLayerHistory = (layer: any, index: number) => {
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    const stack: HistoryEntry[] = layer.__historyStack || [];
    const entry = stack[index];
    if (!entry || !F || !canvas) return;
    layer.setSrc(entry.dataUrl, async () => {
      layer.__cropRect = entry.cropRect;
      if (entry.maskDataUrl) {
        layer.__maskData = await maskDataUrlToMask(entry.maskDataUrl);
      } else {
        layer.__maskData = null;
      }
      layer.__maskEnabled = entry.maskEnabled;
      layer.__maskInverted = entry.maskInverted;
      refreshMaskClip(layer, F);
      applyAdjustments(layer, F, layer.__adjustments || DEFAULT_ADJUSTMENTS);
      layer.set({ left: 0, top: 0 });
      layer.setCoords();
      layer.__historyIndex = index;
      if (imageRef.current === layer) syncUiFromActiveLayer(layer);
      canvas.requestRenderAll();
      bump();
    });
  };

  const undoLocal = () => {
    const layer = imageRef.current;
    if (!layer) return;
    const idx = layer.__historyIndex ?? 0;
    if (idx > 0) restoreLayerHistory(layer, idx - 1);
  };
  const redoLocal = () => {
    const layer = imageRef.current;
    if (!layer) return;
    const stack: HistoryEntry[] = layer.__historyStack || [];
    const idx = layer.__historyIndex ?? 0;
    if (idx < stack.length - 1) restoreLayerHistory(layer, idx + 1);
  };

  // Exposes undo/redo to the host page so its OWN top-bar Undo/Redo
  // buttons can drive this workspace's history while it's the one
  // showing, instead of staying wired to Main Design's (hidden) canvas.
  useImperativeHandle(ref, () => ({ undo: undoLocal, redo: redoLocal }));
  useEffect(() => {
    onHistoryChange?.(canUndo, canRedo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo]);

  // Re-reads all the per-layer UI mirrors (adjustments/mask/history
  // button state) from whichever fabric object is now active, so the
  // panels reflect THAT layer instead of the previously-selected one.
  const syncUiFromActiveLayer = (layer: any) => {
    if (!layer) return;
    setAdjustments(layer.__adjustments || DEFAULT_ADJUSTMENTS);
    setHasMask(!!layer.__maskData);
    setMaskEnabled(layer.__maskEnabled !== false);
    setMaskInverted(!!layer.__maskInverted);
    const stack: HistoryEntry[] = layer.__historyStack || [];
    const idx = layer.__historyIndex ?? 0;
    setCanUndo(idx > 0);
    setCanRedo(idx < stack.length - 1);
  };

  const setActiveLayer = (layer: any) => {
    const canvas = fabricCanvasRef.current;
    if (!layer || !canvas) return;
    imageRef.current = layer;
    if (canvas.getActiveObject() !== layer && activeToolRef.current !== 'pen' && activeToolRef.current !== 'direct') {
      canvas.setActiveObject(layer);
    }
    syncUiFromActiveLayer(layer);
    bump();
  };

  // ---------------------------------------------------------------
  // Zoom / pan
  // ---------------------------------------------------------------
  const applyZoomAtCenter = (z: number) => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    if (!canvas || !F) return;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    const center = new F.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, clamped);
    setZoomPct(Math.round(clamped * 100));
  };
  const setZoomLevel = (pct: number) => applyZoomAtCenter(pct / 100);
  const zoomIn = () => applyZoomAtCenter((fabricCanvasRef.current?.getZoom() || 1) * 1.25);
  const zoomOut = () => applyZoomAtCenter((fabricCanvasRef.current?.getZoom() || 1) / 1.25);

  const fitToView = () => {
    const canvas = fabricCanvasRef.current;
    const base = getBaseLayer();
    const el = containerRef.current;
    if (!canvas || !base || !el) return;
    const pad = 60;
    const vw = el.clientWidth || 800;
    const vh = el.clientHeight || 600;
    canvas.setWidth(vw);
    canvas.setHeight(vh);
    const docW = base.width || 1;
    const docH = base.height || 1;
    let z = Math.min((vw - pad * 2) / docW, (vh - pad * 2) / docH, 4);
    if (!isFinite(z) || z <= 0) z = 1;
    z = Math.max(MIN_ZOOM, z);
    const panX = (vw - docW * z) / 2 - (base.left || 0) * z;
    const panY = (vh - docH * z) / 2 - (base.top || 0) * z;
    canvas.setViewportTransform([z, 0, 0, z, panX, panY]);
    setZoomPct(Math.round(z * 100));
  };

  // ---------------------------------------------------------------
  // Layer creation / lifecycle
  // ---------------------------------------------------------------
  // Builds one real, independent raster layer from a pristine source URL
  // and adds it to the canvas. Every tool (crop/adjust/mask/brush/history)
  // reads its working state from the `__`-prefixed fields set here.
  const addLayerFromSource = (
    pristineSrc: string,
    opts: { name: string; cropRect?: CropRect | null; adjustments?: PhotoAdjustments; makeActive?: boolean }
  ) => {
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas) return;
    const pristine = new Image();
    pristine.onload = () => {
      const naturalSize = { w: pristine.naturalWidth, h: pristine.naturalHeight };
      const startRect: CropRect = opts.cropRect || { x: 0, y: 0, width: naturalSize.w, height: naturalSize.h };
      const startCanvas = cropToCanvas(pristine, naturalSize.w, naturalSize.h, startRect);
      const startDataUrl = startCanvas.toDataURL('image/png');
      F.Image.fromURL(startDataUrl, (img: any) => {
        img.set({
          left: 0,
          top: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
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
        img.__layerId = nextLayerId();
        img.__layerName = opts.name;
        img.__pristineEl = pristine;
        img.__naturalSize = naturalSize;
        img.__cropRect = startRect;
        img.__adjustments = opts.adjustments || DEFAULT_ADJUSTMENTS;
        img.__maskData = null;
        img.__maskEnabled = true;
        img.__maskInverted = false;
        img.__historyStack = [{ dataUrl: startDataUrl, cropRect: startRect, maskDataUrl: null, maskEnabled: true, maskInverted: false }] as HistoryEntry[];
        img.__historyIndex = 0;
        applyAdjustments(img, F, img.__adjustments);
        canvas.add(img);
        if (opts.makeActive !== false) setActiveLayer(img);
        if (getLayers().length === 1) fitToView();
        canvas.requestRenderAll();
        bump();
        setReady(true);
      });
    };
    pristine.src = pristineSrc;
  };

  const duplicateActiveLayer = () => {
    const layer = imageRef.current;
    if (!layer) return;
    const dataUrl = imageObjectToDataURL(layer);
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas) return;
    F.Image.fromURL(dataUrl, (img: any) => {
      img.set({
        left: layer.left,
        top: layer.top,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: layer.opacity,
        visible: layer.visible,
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
      img.__layerId = nextLayerId();
      img.__layerName = `${layer.__layerName || 'Layer'} copy`;
      img.__pristineEl = layer.__pristineEl;
      img.__naturalSize = layer.__naturalSize;
      img.__cropRect = { ...layer.__cropRect };
      img.__adjustments = { ...layer.__adjustments };
      img.__maskData = layer.__maskData ? cloneMask(layer.__maskData) : null;
      img.__maskEnabled = layer.__maskEnabled;
      img.__maskInverted = layer.__maskInverted;
      img.__historyStack = [{ dataUrl, cropRect: img.__cropRect, maskDataUrl: layer.__maskData ? maskToCanvas(layer.__maskData).toDataURL('image/png') : null, maskEnabled: img.__maskEnabled, maskInverted: img.__maskInverted }] as HistoryEntry[];
      img.__historyIndex = 0;
      refreshMaskClip(img, F);
      // Stack the duplicate directly above the original.
      canvas.add(img);
      canvas.moveTo(img, canvas.getObjects().indexOf(layer) + 1);
      setActiveLayer(img);
      canvas.requestRenderAll();
      bump();
    });
  };

  const addImageLayerFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) addLayerFromSource(dataUrl, { name: `Layer ${getLayers().length + 1}` });
    };
    reader.readAsDataURL(file);
  };

  const deleteActiveLayer = () => {
    const canvas = fabricCanvasRef.current;
    const layer = imageRef.current;
    const layers = getLayers();
    if (!canvas || !layer || layers.length <= 1) return; // always keep at least one layer
    const idx = layers.indexOf(layer);
    canvas.remove(layer);
    const remaining = getLayers();
    const nextActive = remaining[Math.max(0, idx - 1)] || remaining[0];
    setActiveLayer(nextActive);
    canvas.requestRenderAll();
    bump();
  };

  const toggleLayerVisible = (layer: any) => {
    layer.set({ visible: layer.visible === false });
    fabricCanvasRef.current?.requestRenderAll();
    bump();
  };
  const toggleLayerLock = (layer: any) => {
    const nextLocked = !layer.__locked;
    layer.__locked = nextLocked;
    layer.locked = nextLocked;
    layer.selectable = !nextLocked;
    layer.evented = !nextLocked;
    if (nextLocked && fabricCanvasRef.current?.getActiveObject() === layer) {
      fabricCanvasRef.current.discardActiveObject();
    }
    fabricCanvasRef.current?.requestRenderAll();
    bump();
  };
  const renameLayer = (layer: any, name: string) => {
    layer.__layerName = name;
    bump();
  };
  const setLayerOpacity = (layer: any, opacity: number) => {
    layer.set({ opacity });
    fabricCanvasRef.current?.requestRenderAll();
    bump();
  };
  const reorderLayers = (fromIndex: number, toIndex: number) => {
    const canvas = fabricCanvasRef.current;
    const displayLayers = getLayers().slice().reverse(); // top-of-stack first, matching LayersPanel's convention
    const obj = displayLayers[fromIndex];
    const objs = canvas.getObjects();
    const targetCanvasIdx = objs.length - 1 - toIndex;
    canvas.moveTo(obj, targetCanvasIdx);
    canvas.requestRenderAll();
    bump();
  };
  const layerThumbnail = (layer: any): string | null => {
    try {
      // Draws directly from the source element scaled down in one
      // hardware-accelerated step — NOT via a full-native-resolution
      // intermediate canvas, which would mean materializing (e.g.) a
      // 6000x4000 canvas on every Layers-panel render just to shrink it
      // to a 40px thumbnail.
      const el = layer.getElement ? layer.getElement() : layer._element;
      if (!el) return null;
      const w = layer.width || 1;
      const h = layer.height || 1;
      const THUMB = 40;
      const scale = Math.min(1, THUMB / Math.max(w, h));
      const t = document.createElement('canvas');
      t.width = Math.max(1, Math.round(w * scale));
      t.height = Math.max(1, Math.round(h * scale));
      const ctx = t.getContext('2d') as CanvasRenderingContext2D;
      configureHighQualityContext(ctx);
      ctx.drawImage(el, 0, 0, t.width, t.height);
      return t.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  // ---- Setup: load the pristine source as the base layer. ----
  useEffect(() => {
    let disposed = false;
    import('fabric').then((mod) => {
      if (disposed) return;
      const F: any = mod.fabric;
      fabricModRef.current = F;
      F.enableGLFiltering = false;

      const el = containerRef.current;
      const dpr = devicePixelRatioSafe();
      const canvas = new F.Canvas(canvasElRef.current, {
        width: el?.clientWidth || 800,
        height: el?.clientHeight || 600,
        backgroundColor: '#e5e7eb',
        enableRetinaScaling: true,
      });
      canvas.__retinaDpr = dpr;
      fabricCanvasRef.current = canvas;

      addLayerFromSource(sourceDataUrl, { name: 'Background', cropRect: initialCropRect, adjustments: initialAdjustments, makeActive: true });

      canvas.on('selection:created', () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.__layerId) setActiveLayer(obj);
      });
      canvas.on('selection:updated', () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.__layerId) setActiveLayer(obj);
      });

      canvas.on('after:render', () => {
        const ctx = canvasElRef.current?.getContext('2d');
        const vt = canvas.viewportTransform;
        const layer = imageRef.current;
        if (!ctx || !vt || !layer) return;
        const mask = selectionMaskRef.current;
        if (mask && maskHasSelection(mask)) {
          const tint = maskToTintCanvas(mask, [56, 145, 255]);
          ctx.save();
          ctx.globalAlpha = 1;
          const x = (layer.left || 0) * vt[0] + vt[4];
          const y = (layer.top || 0) * vt[3] + vt[5];
          const w = tint.width * vt[0];
          const h = tint.height * vt[3];
          ctx.drawImage(tint, x, y, w, h);
          ctx.restore();
        }
      });

      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent;
        e.preventDefault();
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          applyZoomAtCenter2(canvas, F, e);
        } else {
          canvas.relativePan(new F.Point(-e.deltaX, -e.deltaY));
        }
      });

      function applyZoomAtCenter2(canvas: any, F: any, e: WheelEvent) {
        let z = canvas.getZoom();
        z *= 0.999 ** e.deltaY;
        z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
        canvas.zoomToPoint(new F.Point(e.offsetX, e.offsetY), z);
        setZoomPct(Math.round(z * 100));
      }
    });

    return () => {
      disposed = true;
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDataUrl]);

  // Re-fit on container resize (e.g. side panels toggling) so the
  // viewport always matches the actual available space.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      canvas.setWidth(el.clientWidth);
      canvas.setHeight(el.clientHeight);
      canvas.requestRenderAll();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canvasToImageLocal = (pt: { x: number; y: number }) => {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };
    return { x: (pt.x - (img.left || 0)) / (img.scaleX || 1), y: (pt.y - (img.top || 0)) / (img.scaleY || 1) };
  };

  const pushLocalHistory = (dataUrl: string, cropRect: CropRect) => {
    const layer = imageRef.current;
    if (!layer) return;
    pushLayerHistory(layer, dataUrl, cropRect);
  };

  // ---- Adjustments (live, non-destructive until Apply) ----
  const setAdjustment = (key: keyof PhotoAdjustments, value: number | boolean) => {
    const layer = imageRef.current;
    if (!layer) return;
    const next = { ...(layer.__adjustments || DEFAULT_ADJUSTMENTS), [key]: value };
    layer.__adjustments = next;
    setAdjustments(next);
    const F = fabricModRef.current;
    if (F) {
      applyAdjustments(layer, F, next);
      fabricCanvasRef.current?.requestRenderAll();
    }
  };

  // ---- Crop tool ----
  const cropObjRef = useRef<any>(null);
  const startCrop = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    if (!canvas || !F || !img) return;
    setActiveTool('crop');
    const w = img.width;
    const h = img.height;
    const rect = new F.Rect({
      left: (img.left || 0) + w * 0.1,
      top: (img.top || 0) + h * 0.1,
      width: w * 0.8,
      height: h * 0.8,
      fill: 'transparent',
      stroke: '#3891ff',
      strokeDashArray: [6, 4],
      strokeWidth: 1.5 / Math.max(0.05, canvas.getZoom()),
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

  // Single entry point for switching tools, used by both the toolbar's
  // own clicks and every keyboard shortcut below, so the two can never
  // drift out of sync (e.g. a shortcut bypassing the crop-tool cleanup a
  // click would have done).
  const selectTool = (id: PhotoTool) => {
    // Reads the ref, not the `activeTool` state variable — this function
    // is also called from the keydown handler's long-lived closure
    // (subscribed once, not re-created on every tool change), where the
    // state variable would be stale.
    if (activeToolRef.current === 'crop' && cropObjRef.current) cancelCrop();
    if (id === 'crop') startCrop();
    else setActiveTool(id);
  };

  const applyCrop = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    const rect = cropObjRef.current;
    const pristine = img?.__pristineEl;
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
    const cur: CropRect = img.__cropRect;
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
    img.__cropRect = newRect;

    canvas.remove(rect);
    cropObjRef.current = null;
    // A mask's clip region is fixed in absolute pixel coordinates from
    // when it was painted — cropping repositions/resizes the image
    // under it, which would leave the mask visibly misaligned. Rather
    // than render something silently wrong, clear it.
    if (img.__maskData) {
      img.__maskData = null;
      img.clipPath = null;
      setHasMask(false);
    }
    img.setSrc(dataUrl, () => {
      img.set({ left: 0, top: 0 });
      applyAdjustments(img, F, img.__adjustments);
      img.setCoords();
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
      fabricCanvasRef.current?.requestRenderAll();
    },
    onNoImageSelected: () => {},
  });

  const isSelectTool = (t: PhotoTool) => t === 'marquee-rect' || t === 'marquee-ellipse' || t === 'lasso' || t === 'magic-wand';

  // ---- Pen tool + Direct Selection (anchor editing), reused verbatim
  // from the main editor's own hooks — real bezier path drawing/editing,
  // not a simplified stand-in. A finished path can be painted into the
  // active layer's mask (see addPathToMask below). ----
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

  // Rasterizes the finished path's filled interior, in the active
  // layer's own native pixel space, and unions it into that layer's
  // real mask data — the path is a genuine input to the SAME mask a
  // brush paints on, not a separate competing masking system.
  const addPathToMask = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    const path = lastPathRef.current;
    if (!canvas || !F || !img || !path) return;
    clearHandles();

    const naturalW = img.__naturalSize?.w || img.width;
    const naturalH = img.__naturalSize?.h || img.height;
    const temp = new F.StaticCanvas(null, { width: naturalW, height: naturalH });
    path.clone((cloned: any) => {
      // Reposition the cloned path from the shared document/canvas space
      // (where it was drawn, aligned with img.left/top at scale 1) into
      // the mask raster's own local origin.
      cloned.set({ fill: '#ffffff', stroke: '', absolutePositioned: true });
      const offsetX = -(img.left || 0);
      const offsetY = -(img.top || 0);
      cloned.set({ left: (cloned.left || 0) + offsetX, top: (cloned.top || 0) + offsetY });
      temp.add(cloned);
      temp.renderAll();
      const dataUrl = temp.toDataURL({ format: 'png' });
      temp.dispose();
      canvas.remove(path);
      lastPathRef.current = null;
      setHasVectorPath(false);

      const rasterImg = new Image();
      rasterImg.onload = () => {
        const c = document.createElement('canvas');
        c.width = naturalW;
        c.height = naturalH;
        const ctx = c.getContext('2d') as CanvasRenderingContext2D;
        ctx.drawImage(rasterImg, 0, 0);
        const data = ctx.getImageData(0, 0, naturalW, naturalH).data;
        const pathMask = createEmptyMask(naturalW, naturalH);
        for (let i = 0; i < pathMask.data.length; i++) pathMask.data[i] = data[i * 4 + 3];
        img.__maskData = img.__maskData ? combineMasks(img.__maskData, pathMask, 'add') : pathMask;
        img.__maskEnabled = true;
        setMaskEnabled(true);
        setHasMask(true);
        refreshMaskClip(img, F);
        canvas.requestRenderAll();
        pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
      };
      rasterImg.src = dataUrl;
    });
  };

  const toggleMaskEnabled = () => {
    const img = imageRef.current;
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !img.__maskData) return;
    img.__maskEnabled = !img.__maskEnabled;
    setMaskEnabled(img.__maskEnabled);
    refreshMaskClip(img, F);
    canvas.requestRenderAll();
    pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
  };

  const toggleMaskInverted = () => {
    const img = imageRef.current;
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !img.__maskData) return;
    img.__maskInverted = !img.__maskInverted;
    setMaskInverted(img.__maskInverted);
    refreshMaskClip(img, F);
    canvas.requestRenderAll();
    pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
  };

  const removeMask = () => {
    const img = imageRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img) return;
    img.__maskData = null;
    img.clipPath = null;
    setHasMask(false);
    canvas.requestRenderAll();
    pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
  };

  const applyMaskFeather = () => {
    const img = imageRef.current;
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!img || !img.__maskData || maskFeather <= 0) return;
    img.__maskData = featherMask(img.__maskData, maskFeather);
    refreshMaskClip(img, F);
    canvas.requestRenderAll();
    pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
  };

  const maskThumbnail = (): string | null => {
    const img = imageRef.current;
    if (!img || !img.__maskData) return null;
    try {
      const full = maskToCanvas(img.__maskData);
      const THUMB = 32;
      const scale = Math.min(1, THUMB / Math.max(full.width, full.height));
      const t = document.createElement('canvas');
      t.width = Math.max(1, Math.round(full.width * scale));
      t.height = Math.max(1, Math.round(full.height * scale));
      const ctx = t.getContext('2d') as CanvasRenderingContext2D;
      configureHighQualityContext(ctx);
      ctx.drawImage(full, 0, 0, t.width, t.height);
      return t.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const bakeAndPush = (dataUrl: string) => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    const F = fabricModRef.current;
    img.setSrc(dataUrl, () => {
      applyAdjustments(img, F, img.__adjustments);
      canvas.requestRenderAll();
      pushLocalHistory(dataUrl, img.__cropRect);
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
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    img.__maskData = img.__maskData ? combineMasks(img.__maskData, mask, 'add') : cloneMask(mask);
    img.__maskEnabled = true;
    setMaskEnabled(true);
    setHasMask(true);
    refreshMaskClip(img, F);
    canvas.requestRenderAll();
    pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
    setSelectionMask(null);
  };
  const invertSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(invertMask(selectionMaskRef.current));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const featherSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(featherMask(selectionMaskRef.current, 4));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const deselect = () => {
    setSelectionMask(null);
    fabricCanvasRef.current?.requestRenderAll();
  };

  // ---- Brush-like tools: circular soft dabs unioned into one running
  // mask as the stroke moves, with the actual operation (clear/paint-
  // color/lighten/darken/reveal-mask/hide-mask) applied once on
  // mouse-up. A real soft (feathered) brush shape, not a hard-edged
  // stamped circle. ----
  const paintDab = (local: { x: number; y: number }) => {
    const img = imageRef.current;
    if (!img) return;
    const r = brushSizeRef.current / 2;
    const dab = softBrushMask(img.width, img.height, local.x, local.y, r, brushHardnessRef.current, brushOpacityRef.current);
    paintDraftRef.current = paintDraftRef.current ? combineMasks(paintDraftRef.current, dab, 'add') : dab;
    setSelectionMask(paintDraftRef.current);
    fabricCanvasRef.current?.requestRenderAll();
  };

  const bakePaintStroke = (tool: PhotoTool) => {
    const mask = paintDraftRef.current;
    const img = imageRef.current;
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    if (MASK_PAINT_TOOLS.includes(tool)) {
      // A brand-new mask starts fully revealed (255 everywhere), matching
      // Photoshop's default "Reveal All" layer mask, so painting HIDE
      // immediately has something to subtract from.
      let base = img.__maskData;
      if (!base) {
        base = createEmptyMask(img.width, img.height);
        base.data.fill(255);
      }
      img.__maskData = tool === 'mask-reveal' ? combineMasks(base, mask, 'add') : combineMasks(base, mask, 'subtract');
      img.__maskEnabled = true;
      setMaskEnabled(true);
      setHasMask(true);
      refreshMaskClip(img, F);
      canvas.requestRenderAll();
      pushLocalHistory(imageObjectToDataURL(img), img.__cropRect);
      return;
    }
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

  // ---- Space+drag / Hand-tool pan, layered on top of every other tool's
  // own mouse handling so panning always works without switching tools —
  // a genuinely free-feeling canvas instead of one locked to whatever
  // tool happens to be active. ----
  const isPanGesture = () => spaceDownRef.current || activeToolRef.current === 'hand';

  const handleCanvasMouseDown = (opt: any) => {
    const canvas = fabricCanvasRef.current;
    if (isPanGesture()) {
      panningRef.current = true;
      lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      canvas.setCursor('grabbing');
      canvas.selection = false;
      return;
    }
    const tool = activeToolRef.current;
    if (PAINT_TOOLS.includes(tool) || MASK_PAINT_TOOLS.includes(tool)) {
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
    const canvas = fabricCanvasRef.current;
    if (panningRef.current) {
      const dx = opt.e.clientX - lastPanPointRef.current.x;
      const dy = opt.e.clientY - lastPanPointRef.current.y;
      lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      const F = fabricModRef.current;
      canvas.relativePan(new F.Point(dx, dy));
      return;
    }
    const tool = activeToolRef.current;
    if ((PAINT_TOOLS.includes(tool) || MASK_PAINT_TOOLS.includes(tool)) && paintingRef.current) {
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
    const canvas = fabricCanvasRef.current;
    if (panningRef.current) {
      panningRef.current = false;
      canvas.setCursor(activeToolRef.current === 'hand' ? 'grab' : 'default');
      return;
    }
    const tool = activeToolRef.current;
    if (PAINT_TOOLS.includes(tool) || MASK_PAINT_TOOLS.includes(tool)) {
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
  // the image becoming the active object first. Every other tool leaves
  // the active layer selectable/movable-by-tool-only (never draggable —
  // lockMovement* stays true) so the canvas never feels like a locked
  // preview: you can always pan/zoom/select regardless of tool.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    if (activeTool === 'pen' || activeTool === 'direct') {
      canvas.discardActiveObject();
      canvas.selection = false;
      getLayers().forEach((l: any) => (l.evented = false));
    } else {
      getLayers().forEach((l: any) => (l.evented = !l.__locked));
      canvas.selection = false;
      if (activeTool !== 'crop' && !isPanGesture()) canvas.setActiveObject(img);
    }
    if (activeTool !== 'pen') clearPenDraft();
    if (activeTool !== 'direct') clearHandles();
    canvas.defaultCursor = activeTool === 'hand' ? 'grab' : 'default';
    canvas.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Keyboard handling only while this workspace is the one actually
  // showing — otherwise Enter/Escape/Delete/Space here would also fire
  // while the user is looking at Main Design.
  useEffect(() => {
    if (!active) return;
    const handleDown = (e: KeyboardEvent) => {
      const isTypingInField = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (isTypingInField) return;
      if (e.code === 'Space' && !spaceDownRef.current) {
        spaceDownRef.current = true;
        fabricCanvasRef.current?.setCursor('grab');
        e.preventDefault();
        return;
      }
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

      const isMeta = e.ctrlKey || e.metaKey;

      if (e.key === '?' && !isMeta) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undoLocal(); return; }
      if ((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) { e.preventDefault(); redoLocal(); return; }
      if (isMeta && e.key.toLowerCase() === 'l') { e.preventDefault(); selectTool('levels'); return; }
      if (isMeta && e.key === '=') { e.preventDefault(); zoomIn(); return; }
      if (isMeta && e.key === '-') { e.preventDefault(); zoomOut(); return; }
      if (isMeta && e.key === '0') { e.preventDefault(); fitToView(); return; }
      if (isMeta && e.key === '1') { e.preventDefault(); setZoomLevel(100); return; }

      // Tool switches — same letters Photoshop itself uses wherever a real
      // equivalent tool exists here, so muscle memory carries over.
      if (!isMeta && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') { e.preventDefault(); selectTool('select'); return; }
        if (key === 'h') { e.preventDefault(); selectTool('hand'); return; }
        if (key === 'c') { e.preventDefault(); selectTool('crop'); return; }
        if (key === 'p') { e.preventDefault(); selectTool('pen'); return; }
        if (key === 'a') { e.preventDefault(); selectTool('direct'); return; }
        if (key === 'm') { e.preventDefault(); selectTool('marquee-rect'); return; }
        if (key === 'l') { e.preventDefault(); selectTool('lasso'); return; }
        if (key === 'w') { e.preventDefault(); selectTool('magic-wand'); return; }
        if (key === 'b') { e.preventDefault(); selectTool('brush'); return; }
        if (key === 'e') { e.preventDefault(); selectTool('eraser'); return; }
        if (key === 'o') { e.preventDefault(); selectTool('dodge'); return; }
        if (key === 'i') { e.preventDefault(); selectTool('eyedropper'); return; }
        if (key === 'g') { e.preventDefault(); selectTool('gradient'); return; }
        if (key === 'r') { e.preventDefault(); selectTool('mask-reveal'); return; }
      }
      if (!isMeta && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'm') { e.preventDefault(); selectTool('marquee-ellipse'); return; }
        if (key === 'o') { e.preventDefault(); selectTool('burn'); return; }
        if (key === 'r') { e.preventDefault(); selectTool('mask-hide'); return; }
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        fabricCanvasRef.current?.setCursor(activeToolRef.current === 'hand' ? 'grab' : 'default');
      }
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, finishPenPath, clearPenDraft, deleteActiveAnchor]);

  // ---- Background removal (heuristic): flood-fills from all 4 corners
  // by color similarity and clears the matched pixels. Not ML-based
  // segmentation — an honest edge-color heuristic, works best on a
  // fairly flat/uniform background. ----
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
    const pristine = img?.__pristineEl;
    if (!img || !canvas || !F || !pristine) return;
    const fullRect: CropRect = { x: 0, y: 0, width: pristine.naturalWidth, height: pristine.naturalHeight };
    const dataUrl = cropToCanvas(pristine, pristine.naturalWidth, pristine.naturalHeight, fullRect).toDataURL('image/png');
    img.__cropRect = fullRect;
    img.__adjustments = DEFAULT_ADJUSTMENTS;
    setAdjustments(DEFAULT_ADJUSTMENTS);
    if (img.__maskData) {
      img.__maskData = null;
      img.clipPath = null;
      setHasMask(false);
    }
    img.setSrc(dataUrl, () => {
      img.set({ left: 0, top: 0 });
      applyAdjustments(img, F, DEFAULT_ADJUSTMENTS);
      img.setCoords();
      fitToView();
      canvas.requestRenderAll();
      pushLocalHistory(dataUrl, fullRect);
      setSelectionMask(null);
    });
  };

  // Flattens every visible layer into one final, native-resolution image
  // for Main Design. A single-layer document (by far the common case)
  // takes the simple, well-tested single-object path; a multi-layer one
  // composites the whole canvas at the BASE layer's own native
  // resolution (clamped for safety) with the editor's own gray backdrop
  // stripped out so transparency survives the flatten.
  const handleApply = () => {
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    const layers = getLayers();
    if (!layers.length || !F || !canvas) return;
    layers.forEach((l: any) => applyAdjustments(l, F, l.__adjustments || DEFAULT_ADJUSTMENTS));

    if (layers.length === 1) {
      const only = layers[0];
      const dataUrl = imageObjectToDataURL(only);
      const nat = only.__naturalSize || { w: only.width, h: only.height };
      const cur: CropRect = only.__cropRect;
      const isFullImage = cur && cur.x === 0 && cur.y === 0 && Math.round(cur.width) === nat.w && Math.round(cur.height) === nat.h;
      onApply({ dataUrl, adjustments: only.__adjustments || DEFAULT_ADJUSTMENTS, cropRect: isFullImage ? null : cur });
      return;
    }

    const base = layers[0];
    const rect = base.getBoundingRect(true, true);
    const multiplier = clampMultiplierForSafety(base, nativeResMultiplier(base));
    const prevBg = canvas.backgroundColor;
    canvas.backgroundColor = null;
    try {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        multiplier,
      });
      onApply({ dataUrl, adjustments: base.__adjustments || DEFAULT_ADJUSTMENTS, cropRect: null });
    } finally {
      canvas.backgroundColor = prevBg;
      canvas.requestRenderAll();
    }
  };

  const hasSelection = maskHasSelection(selectionMask);
  const activeLayerName = imageRef.current?.__layerName || 'Background';
  const docSize = getBaseLayer()?.__naturalSize || { w: 0, h: 0 };
  const layersForPanel = getLayers().slice().reverse();
  const maskThumbUrl = hasMask ? maskThumbnail() : null;

  const toolGroups: { label: string; tools: { id: PhotoTool; label: string }[] }[] = [
    { label: 'View', tools: [{ id: 'hand', label: 'Hand' }] },
    {
      label: 'Select',
      tools: [
        { id: 'select', label: 'Move' },
        { id: 'marquee-rect', label: 'Marquee' },
        { id: 'marquee-ellipse', label: 'Ellipse' },
        { id: 'lasso', label: 'Lasso' },
        { id: 'magic-wand', label: 'Magic Wand' },
      ],
    },
    { label: 'Crop', tools: [{ id: 'crop', label: 'Crop' }] },
    {
      label: 'Retouch',
      tools: [
        { id: 'eraser', label: 'Eraser' },
        { id: 'dodge', label: 'Dodge' },
        { id: 'burn', label: 'Burn' },
      ],
    },
    {
      label: 'Paint',
      tools: [
        { id: 'brush', label: 'Brush' },
        { id: 'gradient', label: 'Gradient' },
        { id: 'eyedropper', label: 'Color Picker' },
      ],
    },
    {
      label: 'Paths',
      tools: [
        { id: 'pen', label: 'Pen' },
        { id: 'direct', label: 'Direct Select' },
      ],
    },
    {
      label: 'Mask',
      tools: [
        { id: 'mask-reveal', label: 'Reveal (paint)' },
        { id: 'mask-hide', label: 'Hide (paint)' },
      ],
    },
    { label: 'Adjust', tools: [{ id: 'levels', label: 'Levels' }] },
  ];

  return (
    <div className="flex flex-1 overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-44 border-r bg-white p-2 flex flex-col gap-2 overflow-y-auto">
          {toolGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 px-1">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTool(t.id)}
                    title={`${t.label}${SHORTCUT_LABEL[t.id] ? ` (${SHORTCUT_LABEL[t.id]})` : ''}`}
                    className={`flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded ${activeTool === t.id ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {TOOL_ICONS[t.id]}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t pt-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1 px-1">History</p>
            <button onClick={undoLocal} disabled={!canUndo} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30">↶ Undo</button>
            <button onClick={redoLocal} disabled={!canRedo} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 disabled:opacity-30">↷ Redo</button>
            <button onClick={restoreOriginal} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700">Restore Original</button>
          </div>
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

        <div className="w-72 border-l bg-white overflow-y-auto flex flex-col text-sm">
          <div className="border-b">
            <LayersPanel
              layers={layersForPanel}
              selected={imageRef.current}
              onSelect={setActiveLayer}
              onToggleVisible={toggleLayerVisible}
              onToggleLock={toggleLayerLock}
              onRename={renameLayer}
              onReorder={reorderLayers}
              onOpacityChange={setLayerOpacity}
              onDuplicate={duplicateActiveLayer}
              onDelete={layersForPanel.length > 1 ? deleteActiveLayer : undefined}
              getThumbnail={layerThumbnail}
            />
            <div className="px-3 pb-3 flex gap-1.5">
              <button onClick={duplicateActiveLayer} className="flex-1 text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Duplicate Layer</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Add Image Layer</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addImageLayerFromFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="p-3 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Adjustments — {activeLayerName}</p>
                <button onClick={() => { const layer = imageRef.current; if (layer) { layer.__adjustments = DEFAULT_ADJUSTMENTS; } setAdjustments(DEFAULT_ADJUSTMENTS); const F = fabricModRef.current; if (layer && F) { applyAdjustments(layer, F, DEFAULT_ADJUSTMENTS); fabricCanvasRef.current?.requestRenderAll(); } }} className="text-[11px] text-gray-400 hover:text-gray-700">Reset</button>
              </div>
              {([
                ['exposure', 'Exposure', -2, 2],
                ['brightness', 'Brightness', -1, 1],
                ['contrast', 'Contrast', -1, 1],
                ['vibrance', 'Vibrance', -1, 1],
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
                  <button onClick={applySelectionAsMask} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Add to Mask</button>
                  <button onClick={deleteSelectedPixels} disabled={!hasSelection} className="col-span-2 text-[11px] px-2 py-1 border rounded text-red-500 disabled:opacity-30">Delete Selected Pixels</button>
                </div>
              </div>
            )}

            {(activeTool === 'eraser' || activeTool === 'brush' || activeTool === 'dodge' || activeTool === 'burn' || MASK_PAINT_TOOLS.includes(activeTool)) && (
              <div className="border-t pt-3">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
                  {activeTool === 'eraser' ? 'Eraser' : activeTool === 'brush' ? 'Brush' : activeTool === 'dodge' ? 'Dodge (lighten)' : activeTool === 'burn' ? 'Burn (darken)' : activeTool === 'mask-reveal' ? 'Mask: Paint Reveal' : 'Mask: Paint Hide'}
                </p>
                <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                  <span>Brush size</span>
                  <span>{brushSize}px</span>
                </div>
                <input type="range" min={4} max={400} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full mb-2" />
                <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                  <span>Hardness</span>
                  <span>{Math.round(brushHardness * 100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={brushHardness} onChange={(e) => setBrushHardness(parseFloat(e.target.value))} className="w-full mb-2" />
                <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                  <span>Opacity</span>
                  <span>{Math.round(brushOpacity * 100)}%</span>
                </div>
                <input type="range" min={0.05} max={1} step={0.05} value={brushOpacity} onChange={(e) => setBrushOpacity(parseFloat(e.target.value))} className="w-full mb-2" />
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
                <p className="text-[11px] text-gray-500 mb-2">
                  {activeTool === 'pen'
                    ? 'Click to place anchors, drag for curve handles. Enter finishes an open path; click the first anchor to close it. Esc cancels.'
                    : 'Drag an anchor to move it. Alt/Option-click toggles corner/smooth. Click a green square to add an anchor. Delete removes the selected anchor.'}
                </p>
                {activeTool === 'direct' && hasVectorPath && (
                  <button onClick={addPathToMask} className="w-full text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Add Path to Mask</button>
                )}
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Mask — {activeLayerName}</p>
                {hasMask && (
                  <span className="w-8 h-8 rounded border overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0_25%,white_0_50%)] bg-[length:6px_6px]">
                    {maskThumbUrl && <img src={maskThumbUrl} alt="Mask preview" className="w-full h-full object-cover" />}
                  </span>
                )}
              </div>
              {!hasMask ? (
                <p className="text-[11px] text-gray-400 mb-2">
                  Use the Pen tool + "Add Path to Mask", a selection's "Add to Mask", or the Mask Reveal/Hide brushes (Paths group / Mask group in the toolbar) to add a real, editable layer mask — black hides, white reveals, gray is partial.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={toggleMaskEnabled} className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50">
                      {maskEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={toggleMaskInverted} className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50">
                      {maskInverted ? 'Un-invert' : 'Invert'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500 shrink-0">Feather</span>
                    <input type="range" min={0} max={40} value={maskFeather} onChange={(e) => setMaskFeather(parseInt(e.target.value))} className="flex-1" />
                    <button onClick={applyMaskFeather} disabled={maskFeather <= 0} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Apply</button>
                  </div>
                  <button onClick={removeMask} className="text-[11px] px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">
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

            {(() => {
              const stack: HistoryEntry[] = imageRef.current?.__historyStack || [];
              const idx = imageRef.current?.__historyIndex ?? -1;
              if (stack.length <= 1) return null;
              return (
                <div className="border-t pt-3">
                  <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">History — {activeLayerName}</p>
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    {stack.map((_entry, i) => (
                      <button
                        key={i}
                        onClick={() => restoreLayerHistory(imageRef.current, i)}
                        className={`text-left text-[11px] px-2 py-1 rounded ${i === idx ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        {i === 0 ? 'Original' : `Step ${i}`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-auto border-t pt-3 flex gap-2">
              <button onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-full border">Cancel</button>
              <button onClick={handleApply} className="flex-1 text-xs px-3 py-2 rounded-full bg-brand-gradient text-white font-semibold">Apply to Design</button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-9 border-t bg-white flex items-center justify-between px-3 text-[11px] text-gray-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>{docSize.w} × {docSize.h} px</span>
          {layersForPanel.length > 1 && <span>· {layersForPanel.length} layers</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="px-2 py-0.5 border rounded hover:bg-gray-50">−</button>
          <select
            value={ZOOM_PRESETS.includes(zoomPct) ? zoomPct : ''}
            onChange={(e) => e.target.value && setZoomLevel(parseInt(e.target.value))}
            className="border rounded px-1 py-0.5 text-[11px]"
          >
            <option value="">{zoomPct}%</option>
            {ZOOM_PRESETS.map((p) => (
              <option key={p} value={p}>{p}%</option>
            ))}
          </select>
          <button onClick={zoomIn} className="px-2 py-0.5 border rounded hover:bg-gray-50">+</button>
          <button onClick={fitToView} className="px-2 py-0.5 border rounded hover:bg-gray-50">Fit</button>
          <button onClick={() => setZoomLevel(100)} className="px-2 py-0.5 border rounded hover:bg-gray-50">100%</button>
        </div>
      </div>
    </div>
  );
});
