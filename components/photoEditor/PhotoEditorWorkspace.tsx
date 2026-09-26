'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  PixelMask,
  CombineMode,
  combineMasks,
  rectMask,
  ellipseMask,
  softBrushMask,
  polygonMask,
  magicWandMask,
  invertMask,
  featherMask,
  expandMask,
  contractMask,
  growMask,
  maskHasSelection,
  clearMaskedPixels,
  applyMaskKeepSelected,
  maskToTintCanvas,
  maskToCanvas,
  cloneMask,
  createEmptyMask,
  traceMaskBoundarySegments,
  BoundarySegment,
} from '@/lib/editor/pixelSelection';
import { contentAwareFill } from '@/lib/editor/inpaint';
import { usePixelSelectionTool, getImagePixelCanvas } from '@/hooks/usePixelSelectionTool';
import { CurvePoint, Histogram, computeHistogram, DEFAULT_CURVE_POINTS } from '@/lib/editor/curves';
import { CurveEditor } from './CurveEditor';
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
  cloneStampPaint,
  applyHueSaturation,
  LevelsSettings,
  DEFAULT_LEVELS,
  HueSaturationSettings,
  DEFAULT_HUE_SATURATION,
} from '@/lib/editor/photoBrush';
import { imageObjectToDataURL, nativeResMultiplier, clampMultiplierForSafety, configureHighQualityContext, devicePixelRatioSafe } from '@/lib/editor/imageQuality';
import { DocUnit } from '@/lib/editor/types';
import { pxToPhysicalUnit, physicalUnitToPx } from '@/lib/editor/units';
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
  Stamp,
  Droplet,
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
  // Lets a host that isn't "apply this photo edit back into a Main
  // Design document" (e.g. a standalone photo-only page with nothing to
  // apply back TO) relabel these two buttons without forking the
  // component. Default text matches the original embedded-in-Main-Design
  // usage exactly, so nothing changes for it.
  applyLabel?: string;
  cancelLabel?: string;
}

export interface PhotoEditorHandle {
  undo: () => void;
  redo: () => void;
  // Same flatten-and-hand-off as clicking "Apply to Design", callable
  // from outside (Export/Save while this workspace is still open) so
  // those never ship the Main Design canvas's stale, pre-edit image.
  // Returns false when there was nothing to apply (no layers yet).
  applyNow: () => boolean;
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
  | 'clone'
  | 'eyedropper'
  | 'gradient'
  | 'levels'
  | 'hue-sat'
  | 'mask-reveal'
  | 'mask-hide';

const PAINT_TOOLS: PhotoTool[] = ['eraser', 'brush', 'dodge', 'burn', 'clone'];
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
  clone: <Stamp size={ICON_SIZE} />,
  eyedropper: <Pipette size={ICON_SIZE} />,
  gradient: <Blend size={ICON_SIZE} />,
  levels: <SlidersHorizontal size={ICON_SIZE} />,
  'hue-sat': <Droplet size={ICON_SIZE} />,
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
  clone: 'S',
  gradient: 'G',
  levels: 'Ctrl/Cmd+L',
  'hue-sat': 'Ctrl/Cmd+U',
  'mask-reveal': 'R',
  'mask-hide': 'Shift+R',
};

const MODE_LABEL: Record<CombineMode, string> = { new: 'New', add: 'Add', subtract: 'Sub', intersect: 'Int' };
const MODE_TITLE: Record<CombineMode, string> = {
  new: 'New Selection — replaces the current selection',
  add: 'Add to Selection',
  subtract: 'Subtract from Selection',
  intersect: 'Intersect with Selection',
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

// Real resampling (as distinct from cropToCanvas's trim-only crop):
// draws the full source into a canvas at NEW target pixel dimensions,
// genuinely changing the pixel count rather than just selecting a
// sub-region — this is what "Resize Image" / Photoshop's Image Size
// does, backing the Resize dialog below.
function resampleToCanvas(source: CanvasImageSource, srcW: number, srcH: number, destW: number, destH: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(destW));
  out.height = Math.max(1, Math.round(destH));
  const ctx = out.getContext('2d') as CanvasRenderingContext2D;
  configureHighQualityContext(ctx);
  ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, out.width, out.height);
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
  {
    active,
    sourceDataUrl,
    initialAdjustments,
    initialCropRect,
    onApply,
    onCancel,
    onHistoryChange,
    onShowShortcuts,
    applyLabel = 'Apply to Design',
    cancelLabel = 'Cancel',
  },
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

  // Persistent selection combine mode (New/Add/Subtract/Intersect), set
  // from the options panel — Shift/Alt held during a click still
  // temporarily override this, same as Photoshop.
  const [selectionMode, setSelectionMode] = useState<CombineMode>('new');
  const selectionModeRef = useRef<CombineMode>('new');
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);
  // Feather applied to a selection AS it's drawn (marquee/lasso/wand),
  // not just as a one-shot action on an existing selection.
  const [selectionFeather, setSelectionFeather] = useState(0);
  const selectionFeatherRef = useRef(0);
  useEffect(() => {
    selectionFeatherRef.current = selectionFeather;
  }, [selectionFeather]);
  // Shared pixel amount for the one-shot Expand/Contract Selection
  // actions below (distinct from selectionFeather, which softens edges
  // rather than growing/shrinking the selected region).
  const [selectionGrowAmount, setSelectionGrowAmount] = useState(4);
  // Named selection masks, kept for the current Photo Editor session
  // only (like Photoshop's Select > Save Selection, but scoped to this
  // editing session rather than written into the document format).
  const [savedSelections, setSavedSelections] = useState<{ name: string; mask: PixelMask }[]>([]);

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
  // Real stroke smoothing: the raw pointer position is exponentially
  // smoothed (a lightweight "stabilizer") before it's used, and every
  // move interpolates dabs along the segment from the last stamped point
  // instead of stamping once at the new position — without this, a
  // normal-speed stroke leaves visible gaps/segments between mousemove
  // events instead of a continuous line.
  const lastPaintPointRef = useRef<{ x: number; y: number } | null>(null);
  const smoothedPaintPointRef = useRef<{ x: number; y: number } | null>(null);
  const PAINT_SMOOTHING = 0.55; // 0 = raw input, closer to 1 = more lag/smoothing

  // These four are read inside bakePaintStroke/handleCanvasMouseUp, which
  // are bound to the canvas's mouse events ONCE (see the `[ready]`-only
  // effect below) and never rebound — so anything they read directly off
  // React state instead of a ref stays frozen at whatever it was when the
  // canvas first mounted. brushSize/Hardness/Opacity and tolerance/
  // contiguous already avoid this via their own refs (below); these four
  // previously didn't, which meant changing the Brush color, Dodge/Burn
  // strength, or Gradient colors/opacity mid-session visually updated the
  // control but silently had NO effect on the actual painted pixels — a
  // real "looks functional but isn't" bug, not a hypothetical one.
  const [brushColor, setBrushColor] = useState('#ff2d55');
  const brushColorRef = useRef('#ff2d55');
  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  const [dodgeBurnStrength, setDodgeBurnStrength] = useState(0.35);
  const dodgeBurnStrengthRef = useRef(0.35);
  useEffect(() => {
    dodgeBurnStrengthRef.current = dodgeBurnStrength;
  }, [dodgeBurnStrength]);

  const [gradientColor1, setGradientColor1] = useState('#000000');
  const [gradientColor2, setGradientColor2] = useState('#ffffff');
  const [gradientOpacity, setGradientOpacity] = useState(0.5);
  const gradientColor1Ref = useRef('#000000');
  const gradientColor2Ref = useRef('#ffffff');
  const gradientOpacityRef = useRef(0.5);
  useEffect(() => {
    gradientColor1Ref.current = gradientColor1;
  }, [gradientColor1]);
  useEffect(() => {
    gradientColor2Ref.current = gradientColor2;
  }, [gradientColor2]);
  useEffect(() => {
    gradientOpacityRef.current = gradientOpacity;
  }, [gradientOpacity]);
  const gradientDraftRef = useRef<{ start: { x: number; y: number }; line: any } | null>(null);

  const [levels, setLevels] = useState<LevelsSettings>(DEFAULT_LEVELS);
  const [hueSat, setHueSat] = useState<HueSaturationSettings>(DEFAULT_HUE_SATURATION);

  // ---- Clone Stamp: Alt+click sets a real source point (image-local
  // pixel coords); painting samples from that point offset by the fixed
  // source->destination vector established when a stroke begins. Read
  // via refs for the same reason brushColorRef etc. are — this state is
  // consumed inside handlers bound once to the canvas's mouse events. ----
  const cloneSourceRef = useRef<{ x: number; y: number } | null>(null);
  const cloneOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const cloneLiveSourceRef = useRef<{ x: number; y: number } | null>(null);
  const [cloneAligned, setCloneAligned] = useState(true);
  const cloneAlignedRef = useRef(true);
  useEffect(() => {
    cloneAlignedRef.current = cloneAligned;
  }, [cloneAligned]);
  const [hasCloneSource, setHasCloneSource] = useState(false);

  const [selectionMask, setSelectionMask] = useState<PixelMask | null>(null);
  const selectionMaskRef = useRef<PixelMask | null>(null);
  useEffect(() => {
    selectionMaskRef.current = selectionMask;
    // Debug/test hook, same spirit as the Main Design editor's
    // window.__fabricCanvas — exposes the real live selection mask for
    // inspection without adding any UI.
    (window as any).__peSelectionMask = selectionMask;
  }, [selectionMask]);
  // Real marching-ants boundary of the committed selection, recomputed
  // only when the selection itself changes (not every animation frame —
  // see the rAF loop below, which just advances the dash offset and
  // requests a re-render; after:render reads this cached geometry).
  const selectionBoundaryRef = useRef<BoundarySegment[]>([]);
  useEffect(() => {
    selectionBoundaryRef.current = selectionMask && maskHasSelection(selectionMask) ? traceMaskBoundarySegments(selectionMask) : [];
  }, [selectionMask]);
  const antsOffsetRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      if (selectionBoundaryRef.current.length > 0) {
        antsOffsetRef.current = (antsOffsetRef.current + 0.4) % 8;
        fabricCanvasRef.current?.requestRenderAll();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // The transient in-progress paint-stroke preview (brush/eraser/dodge/
  // burn/mask-paint dabs before mouse-up bakes them) — kept SEPARATE from
  // selectionMask so painting a stroke can no longer visually replace or
  // (on mouse-up) silently delete a real, persistent Marquee/Lasso/Wand
  // selection that was active before the stroke started.
  const [paintPreviewMask, setPaintPreviewMask] = useState<PixelMask | null>(null);
  const paintPreviewMaskRef = useRef<PixelMask | null>(null);
  useEffect(() => {
    paintPreviewMaskRef.current = paintPreviewMask;
  }, [paintPreviewMask]);

  // Live drag-preview geometry for the pixel-selection hook (populated
  // once usePixelSelectionTool is called below) — declared up here so the
  // canvas-mount effect's after:render closure can read it; see that
  // hook's own draftRef/liveRect for what these mirror.
  const selDraftRefHolder = useRef<any>(null);
  const liveRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
  const [renderTick, setRenderTick] = useState(0);
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
  useImperativeHandle(ref, () => ({ undo: undoLocal, redo: redoLocal, applyNow: handleApply }));
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
      // Debug/test hook, matching the Main Design editor's own
      // window.__fabricCanvas -- the Photo Editor mounts a completely
      // separate Fabric canvas instance, so that hook doesn't reach here.
      (window as any).__peFabricCanvas = canvas;

      addLayerFromSource(sourceDataUrl, { name: 'Background', cropRect: initialCropRect, adjustments: initialAdjustments, makeActive: true });

      canvas.on('selection:created', () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.__layerId) setActiveLayer(obj);
      });
      canvas.on('selection:updated', () => {
        const obj = canvas.getActiveObject();
        if (obj && obj.__layerId) setActiveLayer(obj);
      });

      // Draws a two-pass black/white dashed stroke ("marching ants") along
      // whatever path `addPath` traces into ctx — shared by the committed
      // selection's real boundary trace and the live in-progress drag
      // preview below, so both read identically.
      const strokeAnts = (ctx: CanvasRenderingContext2D, addPath: () => void) => {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        addPath();
        ctx.lineDashOffset = -antsOffsetRef.current;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.lineDashOffset = -antsOffsetRef.current + 4;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.restore();
      };

      canvas.on('after:render', () => {
        const ctx = canvasElRef.current?.getContext('2d');
        const vt = canvas.viewportTransform;
        const layer = imageRef.current;
        if (!ctx || !vt || !layer) return;
        const ox = (layer.left || 0) * vt[0] + vt[4];
        const oy = (layer.top || 0) * vt[3] + vt[5];

        const mask = selectionMaskRef.current;
        if (mask && maskHasSelection(mask)) {
          const tint = maskToTintCanvas(mask, [56, 145, 255]);
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.drawImage(tint, ox, oy, tint.width * vt[0], tint.height * vt[3]);
          ctx.restore();
        }

        const paintPreview = paintPreviewMaskRef.current;
        if (paintPreview && maskHasSelection(paintPreview)) {
          const tint = maskToTintCanvas(paintPreview, [255, 159, 10], 0.55);
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.drawImage(tint, ox, oy, tint.width * vt[0], tint.height * vt[3]);
          ctx.restore();
        }

        const segs = selectionBoundaryRef.current;
        if (segs.length) {
          strokeAnts(ctx, () => {
            for (const s of segs) {
              ctx.moveTo(ox + s.x0 * vt[0], oy + s.y0 * vt[3]);
              ctx.lineTo(ox + s.x1 * vt[0], oy + s.y1 * vt[3]);
            }
          });
        }

        // Live drag preview for an in-progress Marquee/Ellipse/Lasso —
        // real geometry read directly from the selection hook's own draft
        // state, not a separate/duplicated tracking mechanism.
        const draft = selDraftRefHolder.current;
        if (draft && draft.tool && draft.imageObj === layer) {
          if ((draft.tool === 'marquee-rect' || draft.tool === 'marquee-ellipse') && liveRectRef.current) {
            const r = liveRectRef.current;
            strokeAnts(ctx, () => {
              if (draft.tool === 'marquee-rect') {
                ctx.rect(ox + r.x * vt[0], oy + r.y * vt[3], r.w * vt[0], r.h * vt[3]);
              } else {
                ctx.ellipse(
                  ox + (r.x + r.w / 2) * vt[0],
                  oy + (r.y + r.h / 2) * vt[3],
                  Math.max(0, Math.abs((r.w / 2) * vt[0])),
                  Math.max(0, Math.abs((r.h / 2) * vt[3])),
                  0,
                  0,
                  Math.PI * 2
                );
              }
            });
          } else if (draft.tool === 'lasso' && draft.points.length > 1) {
            strokeAnts(ctx, () => {
              ctx.moveTo(ox + draft.points[0].x * vt[0], oy + draft.points[0].y * vt[3]);
              for (let i = 1; i < draft.points.length; i++) {
                ctx.lineTo(ox + draft.points[i].x * vt[0], oy + draft.points[i].y * vt[3]);
              }
            });
          }
        }

        // Clone Stamp source-ring: shows exactly where the tool is
        // currently sampling from, moving in lockstep with the brush
        // while painting (cloneLiveSourceRef), or resting at the fixed
        // source point otherwise — a real indicator of the actual sample
        // location, not a fixed decorative crosshair.
        if (activeToolRef.current === 'clone') {
          const src = cloneLiveSourceRef.current || cloneSourceRef.current;
          if (src) {
            const r = Math.max(4, brushSizeRef.current / 2);
            ctx.save();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(ox + src.x * vt[0], oy + src.y * vt[3], r * vt[0], 0, Math.PI * 2);
            ctx.moveTo(ox + src.x * vt[0] - 4, oy + src.y * vt[3]);
            ctx.lineTo(ox + src.x * vt[0] + 4, oy + src.y * vt[3]);
            ctx.moveTo(ox + src.x * vt[0], oy + src.y * vt[3] - 4);
            ctx.lineTo(ox + src.x * vt[0], oy + src.y * vt[3] + 4);
            ctx.stroke();
            ctx.restore();
          }
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
  const setAdjustment = (key: keyof PhotoAdjustments, value: number | boolean | CurvePoint[]) => {
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
  const setCurvePoints = (points: CurvePoint[]) => setAdjustment('curvePoints', points);

  // The histogram reflects the layer's real SOURCE pixels (before the
  // live curve/exposure/etc filters below are applied to them) — the
  // same reference point a real Curves tool's histogram shows, recomputed
  // whenever the active layer or its underlying pixel data changes
  // (renderTick also bumps after every destructive bake).
  const [curveHistogram, setCurveHistogram] = useState<Histogram | null>(null);
  useEffect(() => {
    const layer = imageRef.current;
    if (!layer) {
      setCurveHistogram(null);
      return;
    }
    const pixelCanvas = getImagePixelCanvas(layer);
    const ctx = pixelCanvas.getContext('2d') as CanvasRenderingContext2D;
    setCurveHistogram(computeHistogram(ctx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height)));
    // renderTick alone is the right dependency: setActiveLayer bumps it on
    // every layer switch, and bakeAndPush bumps it after every destructive
    // pixel-data change -- both real reasons this histogram goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderTick]);

  // ---- Crop tool ----
  const cropObjRef = useRef<any>(null);
  // Exact-size crop input (spec ask: typing a target size, not only
  // freeform drag) — independent of the draggable crop rect's own
  // resize handles; "Set Size" below reads these and resizes the rect.
  const [cropSizeInput, setCropSizeInput] = useState<{ w: string; h: string }>({ w: '', h: '' });
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
    setCropSizeInput({ w: String(Math.round(w * 0.8)), h: String(Math.round(h * 0.8)) });
  };

  // Resizes the crop rect to an exact typed width/height (image pixels),
  // anchored at its current top-left and clamped so it never extends
  // past the image bounds — the same rect applyCrop() reads, so typing a
  // size and dragging to reposition can be mixed freely.
  const applyCropSizeInput = () => {
    const canvas = fabricCanvasRef.current;
    const img = imageRef.current;
    const rect = cropObjRef.current;
    if (!canvas || !img || !rect) return;
    const w = Math.round(parseFloat(cropSizeInput.w));
    const h = Math.round(parseFloat(cropSizeInput.h));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return;
    const clampedW = Math.min(w, img.width);
    const clampedH = Math.min(h, img.height);
    const minLeft = img.left || 0;
    const minTop = img.top || 0;
    const maxLeft = minLeft + img.width - clampedW;
    const maxTop = minTop + img.height - clampedH;
    const left = Math.min(Math.max(rect.left, minLeft), Math.max(minLeft, maxLeft));
    const top = Math.min(Math.max(rect.top, minTop), Math.max(minTop, maxTop));
    rect.set({ width: clampedW, height: clampedH, scaleX: 1, scaleY: 1, left, top });
    rect.setCoords();
    canvas.requestRenderAll();
    setCropSizeInput({ w: String(clampedW), h: String(clampedH) });
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
    // Was never updated after a crop, so the status bar's "document size"
    // kept showing the ORIGINAL uncropped dimensions, and addPathToMask's
    // fallback (img.__naturalSize?.w || img.width) would build a mask
    // canvas at the stale, larger size — misaligned against the actually-
    // cropped image.
    img.__naturalSize = { w: cropped.width, h: cropped.height };

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

  // ---- Resize Image (real resampling, distinct from Crop's trim-only
  // behavior) + DPI, matching Photoshop's own Image Size dialog: editing
  // width/height resamples the actual pixels, editing DPI alone just
  // changes the physical print size a fixed pixel count represents. DPI
  // is genuinely tied to pixel dimensions here (computed live below) —
  // it isn't wired into the PDF export pipeline yet, which is Main
  // Design's own separate per-artboard DPI setting. ----
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  // resizeInput.w/h always stay raw PIXEL strings -- the single source of
  // truth applyResizeImage and the lock-aspect math below already used
  // before real-world units existed. resizeUnit only controls what's
  // DISPLAYED and how a typed value is interpreted; switching it never
  // itself changes the document's actual pixel size.
  const [resizeInput, setResizeInput] = useState({ w: '', h: '', dpi: '300', lockAspect: true });
  const [resizeUnit, setResizeUnit] = useState<DocUnit>('px');

  const resizeDpiNum = () => Math.max(1, parseFloat(resizeInput.dpi) || 300);
  const displayResizeValue = (pxStr: string) => {
    const px = parseFloat(pxStr);
    if (!Number.isFinite(px)) return '';
    return resizeUnit === 'px' ? String(Math.round(px)) : pxToPhysicalUnit(px, resizeUnit, resizeDpiNum()).toFixed(2);
  };
  const parseResizeDisplayValue = (displayValue: string): string => {
    const v = parseFloat(displayValue);
    if (!Number.isFinite(v)) return displayValue;
    return resizeUnit === 'px' ? String(Math.round(v)) : String(Math.round(physicalUnitToPx(v, resizeUnit, resizeDpiNum())));
  };

  const openResizeDialog = () => {
    const img = imageRef.current;
    if (!img) return;
    const size = img.__naturalSize || { w: img.width, h: img.height };
    setResizeInput({ w: String(size.w), h: String(size.h), dpi: String(img.__dpi || 300), lockAspect: true });
    setResizeUnit('px');
    setShowResizeDialog(true);
  };

  // Both take the raw string straight out of the input -- in whatever
  // unit the dialog is currently displaying -- and convert it to px
  // before touching resizeInput.w/h, so every other read of that state
  // (applyResizeImage, the print-size hint) keeps working in px exactly
  // as it did before real-world units existed.
  const onResizeWidthChange = (displayValue: string) => {
    const value = parseResizeDisplayValue(displayValue);
    setResizeInput((s) => {
      if (!s.lockAspect) return { ...s, w: value };
      const img = imageRef.current;
      const size = img?.__naturalSize || { w: img?.width || 1, h: img?.height || 1 };
      const w = parseFloat(value);
      if (!Number.isFinite(w) || size.w <= 0) return { ...s, w: value };
      return { ...s, w: value, h: String(Math.round((w * size.h) / size.w)) };
    });
  };
  const onResizeHeightChange = (displayValue: string) => {
    const value = parseResizeDisplayValue(displayValue);
    setResizeInput((s) => {
      if (!s.lockAspect) return { ...s, h: value };
      const img = imageRef.current;
      const size = img?.__naturalSize || { w: img?.width || 1, h: img?.height || 1 };
      const h = parseFloat(value);
      if (!Number.isFinite(h) || size.h <= 0) return { ...s, h: value };
      return { ...s, h: value, w: String(Math.round((h * size.w) / size.h)) };
    });
  };

  const applyResizeImage = () => {
    const canvas = fabricCanvasRef.current;
    const F = fabricModRef.current;
    const img = imageRef.current;
    const pristine = img?.__pristineEl;
    if (!canvas || !F || !img || !pristine) return;
    const newW = Math.round(parseFloat(resizeInput.w));
    const newH = Math.round(parseFloat(resizeInput.h));
    const dpi = Math.max(1, Math.round(parseFloat(resizeInput.dpi)) || 300);
    if (!Number.isFinite(newW) || !Number.isFinite(newH) || newW < 1 || newH < 1) return;

    const currentSize = img.__naturalSize || { w: img.width, h: img.height };
    if (newW === currentSize.w && newH === currentSize.h) {
      // DPI-only change: no reason to touch pixels at all.
      img.__dpi = dpi;
      setShowResizeDialog(false);
      return;
    }

    // Resamples from the current cropped view (what's actually on
    // screen), not blindly the full original pristine, so Resize acts on
    // the image as the user currently sees it.
    const cur: CropRect = img.__cropRect;
    const cropped = cropToCanvas(pristine, pristine.naturalWidth, pristine.naturalHeight, cur);
    const resampled = resampleToCanvas(cropped, cropped.width, cropped.height, newW, newH);
    const dataUrl = resampled.toDataURL('image/png');

    // A deliberate resize becomes the new baseline pristine — later crops
    // build on this resolution rather than the old one, the same
    // "every step is permanent, never cumulative quality loss on top of
    // an already-lossy copy" principle Crop already follows.
    const newPristine = new Image();
    newPristine.onload = () => {
      img.__pristineEl = newPristine;
      img.__naturalSize = { w: newW, h: newH };
      img.__cropRect = { x: 0, y: 0, width: newW, height: newH };
      img.__dpi = dpi;
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
        pushLocalHistory(dataUrl, img.__cropRect);
        setShowResizeDialog(false);
      });
    };
    newPristine.src = dataUrl;
  };

  // ---- Pixel selection tools (marquee/lasso/magic-wand), reused as-is
  // from the main editor's own hook. ----
  const { handleMouseDown: selDown, handleMouseMove: selMove, handleMouseUp: selUp, liveRect: selLiveRect, draftRef: selDraftRef } = usePixelSelectionTool({
    fabricCanvasRef,
    activeToolRef: activeToolRef as any,
    toleranceRef,
    contiguousRef,
    modeRef: selectionModeRef,
    featherRef: selectionFeatherRef,
    getSelectionMask: () => selectionMaskRef.current,
    onSelectionChanged: (_uid: string, mask: PixelMask | null) => {
      setSelectionMask(mask);
      fabricCanvasRef.current?.requestRenderAll();
    },
    onNoImageSelected: () => {},
  });
  useEffect(() => {
    liveRectRef.current = selLiveRect;
  }, [selLiveRect]);
  selDraftRefHolder.current = selDraftRef;

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
        pathObj.set({ stroke: '#3891ff', strokeWidth: 1.5, fill: '' });
        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        lastPathRef.current = pathObj;
        setHasVectorPath(true);
        // The Pen tool stays active after finishing a path (matching the
        // same fix already applied to Main Design's Pen/shape tools) so
        // drawing several paths in a row doesn't require re-selecting the
        // tool each time — auto-switching to Direct Selection here (the
        // previous behavior) silently kicked the user out of Pen after
        // every single path, which is what was being reported as the
        // Pen tool "not working". Direct Selection (A) is still one
        // keypress away for anchor editing. Non-interactive for the same
        // reason a just-drawn shape is in Main Design: a click meant to
        // start the NEXT path shouldn't instead grab/drag this one.
        pathObj.set({ selectable: false, evented: false });
        canvas.requestRenderAll();
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
      bump(); // pixel data changed -- e.g. the Curves histogram needs a refresh
    });
  };

  const [removingObject, setRemovingObject] = useState(false);
  // Remove Object / Content-Aware Fill: reconstructs whatever is under
  // the current selection from its real surrounding pixels (see
  // lib/editor/inpaint.ts) instead of just deleting to transparent —
  // the diffusion solve is synchronous and CPU-bound, so the "Removing…"
  // state is set first and the actual work deferred a frame so it has a
  // chance to paint before the tab blocks.
  const removeSelectedObject = () => {
    const mask = selectionMaskRef.current;
    const img = imageRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    setRemovingObject(true);
    requestAnimationFrame(() => {
      try {
        bakeAndPush(contentAwareFill(getImagePixelCanvas(img), mask));
        setSelectionMask(null);
      } finally {
        setRemovingObject(false);
      }
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
    setSelectionMask(featherMask(selectionMaskRef.current, selectionFeather || 4));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const expandSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(expandMask(selectionMaskRef.current, selectionGrowAmount));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const contractSelection = () => {
    if (!selectionMaskRef.current) return;
    setSelectionMask(contractMask(selectionMaskRef.current, selectionGrowAmount));
    fabricCanvasRef.current?.requestRenderAll();
  };
  // Select > Grow: extends the selection into adjacent, color-similar
  // pixels using the same Magic Wand tolerance the tool panel already
  // exposes, rather than a fixed pixel radius (that's Expand, above).
  const growSelection = () => {
    const mask = selectionMaskRef.current;
    const img = imageRef.current;
    if (!mask || !img) return;
    const pixelCanvas = getImagePixelCanvas(img);
    const ctx = pixelCanvas.getContext('2d') as CanvasRenderingContext2D;
    const imageData = ctx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
    setSelectionMask(growMask(mask, imageData, tolerance));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const saveSelection = () => {
    const mask = selectionMaskRef.current;
    if (!mask || !maskHasSelection(mask)) return;
    const name = typeof window !== 'undefined' ? window.prompt('Name this selection:', `Selection ${savedSelections.length + 1}`) : null;
    if (!name) return;
    setSavedSelections((list) => [...list.filter((s) => s.name !== name), { name, mask: cloneMask(mask) }]);
  };
  const loadSelection = (name: string) => {
    const found = savedSelections.find((s) => s.name === name);
    if (!found) return;
    setSelectionMask(cloneMask(found.mask));
    fabricCanvasRef.current?.requestRenderAll();
  };
  const deleteSavedSelection = (name: string) => {
    setSavedSelections((list) => list.filter((s) => s.name !== name));
  };
  const deselect = () => {
    setSelectionMask(null);
    fabricCanvasRef.current?.requestRenderAll();
  };
  const fillSelectionWithColor = () => {
    const mask = selectionMaskRef.current;
    const img = imageRef.current;
    if (!mask || !maskHasSelection(mask) || !img) return;
    // Unlike Delete/Add-to-Mask/Remove-Object, Fill deliberately leaves
    // the selection active afterward — matching Photoshop's Edit > Fill,
    // which doesn't clear your marching ants just because you filled them.
    bakeAndPush(paintColorInMask(getImagePixelCanvas(img), mask, brushColor));
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
    let dab = softBrushMask(img.width, img.height, local.x, local.y, r, brushHardnessRef.current, brushOpacityRef.current);
    // A real active selection constrains every paint-like tool (brush,
    // eraser, dodge/burn, mask paint) to inside its boundary — clipping
    // the dab itself (not just the final bake) so the live preview
    // already shows paint stopping at the selection edge, same as
    // Photoshop.
    const selection = selectionMaskRef.current;
    if (selection && maskHasSelection(selection)) dab = combineMasks(selection, dab, 'intersect');
    paintDraftRef.current = paintDraftRef.current ? combineMasks(paintDraftRef.current, dab, 'add') : dab;
    setPaintPreviewMask(paintDraftRef.current);
    // Track where the Clone Stamp is CURRENTLY sampling from (moves in
    // lockstep with the brush, offset by the fixed source vector) so the
    // on-canvas source-ring indicator tracks the real sample point, not
    // just the originally-clicked source.
    if (activeToolRef.current === 'clone' && cloneOffsetRef.current) {
      cloneLiveSourceRef.current = { x: local.x - cloneOffsetRef.current.x, y: local.y - cloneOffsetRef.current.y };
    }
    fabricCanvasRef.current?.requestRenderAll();
  };

  // Starts a new stroke: seeds the stabilizer at the raw start point (no
  // lag on the very first dab) and stamps it immediately.
  const beginPaintStroke = (local: { x: number; y: number }) => {
    smoothedPaintPointRef.current = local;
    lastPaintPointRef.current = local;
    paintDab(local);
  };

  // Continues a stroke to a new raw pointer position: smooths it against
  // the running average, then stamps dabs at a fixed spacing along the
  // segment from the last stamped point to the smoothed point, so the
  // stroke reads as one continuous line — a fast mouse move still leaves
  // real, unbroken brush coverage instead of isolated dots.
  const continuePaintStroke = (raw: { x: number; y: number }) => {
    const prevSmoothed = smoothedPaintPointRef.current || raw;
    const smoothed = {
      x: prevSmoothed.x + (raw.x - prevSmoothed.x) * (1 - PAINT_SMOOTHING),
      y: prevSmoothed.y + (raw.y - prevSmoothed.y) * (1 - PAINT_SMOOTHING),
    };
    smoothedPaintPointRef.current = smoothed;

    const from = lastPaintPointRef.current || smoothed;
    const radius = Math.max(1, brushSizeRef.current / 2);
    const spacing = Math.max(1, radius * 0.2);
    const dist = Math.hypot(smoothed.x - from.x, smoothed.y - from.y);
    const steps = Math.max(1, Math.round(dist / spacing));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      paintDab({ x: from.x + (smoothed.x - from.x) * t, y: from.y + (smoothed.y - from.y) * t });
    }
    lastPaintPointRef.current = smoothed;
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
    else if (tool === 'brush') bakeAndPush(paintColorInMask(pixelCanvas, mask, brushColorRef.current));
    else if (tool === 'dodge') bakeAndPush(dodgeBurnInMask(pixelCanvas, mask, dodgeBurnStrengthRef.current));
    else if (tool === 'burn') bakeAndPush(dodgeBurnInMask(pixelCanvas, mask, -dodgeBurnStrengthRef.current));
    else if (tool === 'clone' && cloneOffsetRef.current) {
      bakeAndPush(cloneStampPaint(pixelCanvas, mask, cloneOffsetRef.current.x, cloneOffsetRef.current.y));
    }
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
    if (tool === 'clone') {
      const pointer = canvas.getPointer(opt.e);
      const local = canvasToImageLocal(pointer);
      if (opt.e.altKey) {
        // Alt+click sets a REAL source point — the exact pixel coords
        // every subsequent stroke samples from (offset by the vector to
        // wherever painting actually starts), matching Photoshop's own
        // Clone Stamp source-setting gesture.
        cloneSourceRef.current = local;
        cloneOffsetRef.current = null;
        cloneLiveSourceRef.current = local;
        setHasCloneSource(true);
        canvas.requestRenderAll();
        return;
      }
      if (!cloneSourceRef.current) return; // nothing to sample from yet
      // Aligned: the source->destination offset is fixed the FIRST time
      // you paint after setting a source, and every later stroke keeps
      // sampling relative to that same offset (so a second stroke picks
      // up where the source content would naturally continue).
      // Non-aligned: every new stroke resets to the original source
      // point, so each stroke starts stamping from the same spot again.
      if (!cloneAlignedRef.current || !cloneOffsetRef.current) {
        cloneOffsetRef.current = { x: local.x - cloneSourceRef.current.x, y: local.y - cloneSourceRef.current.y };
      }
      paintingRef.current = true;
      paintDraftRef.current = null;
      beginPaintStroke(local);
      return;
    }
    if (PAINT_TOOLS.includes(tool) || MASK_PAINT_TOOLS.includes(tool)) {
      paintingRef.current = true;
      paintDraftRef.current = null;
      const pointer = canvas.getPointer(opt.e);
      beginPaintStroke(canvasToImageLocal(pointer));
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
      continuePaintStroke(canvasToImageLocal(pointer));
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
      lastPaintPointRef.current = null;
      smoothedPaintPointRef.current = null;
      setPaintPreviewMask(null);
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
        bakeAndPush(applyGradientOverlay(getImagePixelCanvas(img), start.x, start.y, end.x, end.y, gradientColor1Ref.current, gradientColor2Ref.current, gradientOpacityRef.current));
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

  // Applies to the whole image, unless a real selection is active, in
  // which case only the selected pixels are adjusted (matching Levels'
  // own scope convention above and how every other real op here treats
  // an active selection as a real constraint, not just a visual).
  const applyHueSaturationNow = () => {
    const img = imageRef.current;
    if (!img) return;
    const selection = selectionMaskRef.current;
    const mask = selection && maskHasSelection(selection) ? selection : undefined;
    bakeAndPush(applyHueSaturation(getImagePixelCanvas(img), hueSat, mask));
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
      if (isMeta && e.key.toLowerCase() === 'u') { e.preventDefault(); selectTool('hue-sat'); return; }
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
        if (key === 's') { e.preventDefault(); selectTool('clone'); return; }
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
  const handleApply = (): boolean => {
    const F = fabricModRef.current;
    const canvas = fabricCanvasRef.current;
    const layers = getLayers();
    if (!layers.length || !F || !canvas) return false;
    layers.forEach((l: any) => applyAdjustments(l, F, l.__adjustments || DEFAULT_ADJUSTMENTS));

    if (layers.length === 1) {
      const only = layers[0];
      const dataUrl = imageObjectToDataURL(only);
      const nat = only.__naturalSize || { w: only.width, h: only.height };
      const cur: CropRect = only.__cropRect;
      const isFullImage = cur && cur.x === 0 && cur.y === 0 && Math.round(cur.width) === nat.w && Math.round(cur.height) === nat.h;
      onApply({ dataUrl, adjustments: only.__adjustments || DEFAULT_ADJUSTMENTS, cropRect: isFullImage ? null : cur });
      return true;
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
      return true;
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
        { id: 'clone', label: 'Clone Stamp' },
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
    { label: 'Adjust', tools: [{ id: 'levels', label: 'Levels' }, { id: 'hue-sat', label: 'Hue/Saturation' }] },
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full shadow px-3 py-1.5">
              <input
                type="number"
                min={1}
                value={cropSizeInput.w}
                onChange={(e) => setCropSizeInput((s) => ({ ...s, w: e.target.value }))}
                className="w-16 text-xs border rounded px-1.5 py-1"
                title="Crop width (px)"
              />
              <span className="text-xs text-gray-400">×</span>
              <input
                type="number"
                min={1}
                value={cropSizeInput.h}
                onChange={(e) => setCropSizeInput((s) => ({ ...s, h: e.target.value }))}
                className="w-16 text-xs border rounded px-1.5 py-1"
                title="Crop height (px)"
              />
              <button onClick={applyCropSizeInput} className="text-xs px-2.5 py-1 rounded-full border hover:bg-gray-50">Set Size</button>
              <div className="w-px h-4 bg-gray-200" />
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
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">Curves (drag points, click to add, double-click to remove)</span>
                  <button onClick={() => setCurvePoints(DEFAULT_CURVE_POINTS)} className="text-[11px] text-gray-400 hover:text-gray-700">Reset</button>
                </div>
                <CurveEditor points={adjustments.curvePoints} histogram={curveHistogram} onChange={setCurvePoints} />
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-2">
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
                {isSelectTool(activeTool) && (
                  <>
                    <div className="mb-2">
                      <div className="text-[11px] text-gray-500 mb-1">Mode (Shift=Add, Alt=Subtract, Shift+Alt=Intersect)</div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['new', 'add', 'subtract', 'intersect'] as CombineMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectionMode(m)}
                            title={MODE_TITLE[m]}
                            className={`text-[10px] px-1 py-1 border rounded ${selectionMode === m ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600'}`}
                          >
                            {MODE_LABEL[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                        <span>Feather (new selections)</span>
                        <span>{selectionFeather}px</span>
                      </div>
                      <input type="range" min={0} max={50} value={selectionFeather} onChange={(e) => setSelectionFeather(parseInt(e.target.value))} className="w-full" />
                    </div>
                  </>
                )}
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
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                    <span>Expand / Contract / Grow amount</span>
                    <span>{selectionGrowAmount}px</span>
                  </div>
                  <input type="range" min={1} max={100} value={selectionGrowAmount} onChange={(e) => setSelectionGrowAmount(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={invertSelection} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Invert</button>
                  <button onClick={deselect} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Deselect</button>
                  <button onClick={featherSelection} disabled={!hasSelection} title="Feather the CURRENT selection now (uses the amount above)" className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Feather Now</button>
                  <button onClick={applySelectionAsMask} disabled={!hasSelection} className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Add to Mask</button>
                  <button onClick={expandSelection} disabled={!hasSelection} title="Grow the selection outward by the amount above" className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Expand</button>
                  <button onClick={contractSelection} disabled={!hasSelection} title="Shrink the selection inward by the amount above" className="text-[11px] px-2 py-1 border rounded disabled:opacity-30">Contract</button>
                  <button onClick={growSelection} disabled={!hasSelection} title="Extend the selection into adjacent pixels similar in color (uses the Magic Wand Tolerance above)" className="col-span-2 text-[11px] px-2 py-1 border rounded disabled:opacity-30">Grow</button>
                  <button onClick={fillSelectionWithColor} disabled={!hasSelection} title="Fill the selection with the current Brush color" className="col-span-2 text-[11px] px-2 py-1 border rounded disabled:opacity-30 flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: brushColor }} />
                    Fill Selection
                  </button>
                  <button onClick={deleteSelectedPixels} disabled={!hasSelection} className="col-span-2 text-[11px] px-2 py-1 border rounded text-red-500 disabled:opacity-30">Delete Selected Pixels</button>
                  <button
                    onClick={removeSelectedObject}
                    disabled={!hasSelection || removingObject}
                    title="Reconstructs the selected area from its surrounding pixels — select the object to remove first"
                    className="col-span-2 text-[11px] px-2 py-1.5 border rounded bg-gray-800 text-white disabled:opacity-30"
                  >
                    {removingObject ? 'Removing…' : 'Remove Object (Content-Aware Fill)'}
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <button onClick={saveSelection} disabled={!hasSelection} className="w-full text-[11px] px-2 py-1 border rounded disabled:opacity-30">Save Selection…</button>
                  {savedSelections.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {savedSelections.map((s) => (
                        <div key={s.name} className="flex items-center gap-1 text-[11px]">
                          <button onClick={() => loadSelection(s.name)} title="Load this saved selection" className="flex-1 text-left px-2 py-1 border rounded hover:bg-gray-50 truncate">
                            {s.name}
                          </button>
                          <button onClick={() => deleteSavedSelection(s.name)} title="Delete this saved selection" className="px-1.5 py-1 border rounded text-red-400 hover:text-red-600">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(activeTool === 'eraser' || activeTool === 'brush' || activeTool === 'dodge' || activeTool === 'burn' || activeTool === 'clone' || MASK_PAINT_TOOLS.includes(activeTool)) && (
              <div className="border-t pt-3">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
                  {activeTool === 'eraser' ? 'Eraser' : activeTool === 'brush' ? 'Brush' : activeTool === 'dodge' ? 'Dodge (lighten)' : activeTool === 'burn' ? 'Burn (darken)' : activeTool === 'clone' ? 'Clone Stamp' : activeTool === 'mask-reveal' ? 'Mask: Paint Reveal' : 'Mask: Paint Hide'}
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
                    <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-11 h-11 border rounded cursor-pointer" />
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
                {activeTool === 'clone' && (
                  <>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-2">
                      <input type="checkbox" checked={cloneAligned} onChange={(e) => setCloneAligned(e.target.checked)} />
                      Aligned
                    </label>
                    <p className="text-[11px] text-gray-500 mb-1">
                      {hasCloneSource ? '✓ Source set' : 'Alt+Click on the image to set a source'}
                    </p>
                    {hasCloneSource && (
                      <button
                        onClick={() => {
                          cloneSourceRef.current = null;
                          cloneOffsetRef.current = null;
                          cloneLiveSourceRef.current = null;
                          setHasCloneSource(false);
                          fabricCanvasRef.current?.requestRenderAll();
                        }}
                        className="text-[11px] px-2 py-1 border rounded hover:bg-gray-50"
                      >
                        Clear Source
                      </button>
                    )}
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
                  <input type="color" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} className="w-11 h-11 border rounded cursor-pointer" />
                  <label className="text-[11px] text-gray-500">To</label>
                  <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-11 h-11 border rounded cursor-pointer" />
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

            {activeTool === 'hue-sat' && (
              <div className="border-t pt-3">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Hue / Saturation</p>
                {hasSelection && <p className="text-[11px] text-amber-600 mb-2">Applies only within the active selection.</p>}
                {([
                  ['hue', 'Hue', -180, 180],
                  ['saturation', 'Saturation', -100, 100],
                  ['lightness', 'Lightness', -100, 100],
                ] as [keyof HueSaturationSettings, string, number, number][]).map(([key, label, min, max]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                      <span>{label}</span>
                      <span>{hueSat[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={hueSat[key]}
                      onChange={(e) => setHueSat((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <button onClick={() => setHueSat(DEFAULT_HUE_SATURATION)} className="flex-1 text-[11px] px-2 py-1.5 border rounded hover:bg-gray-50">Reset</button>
                  <button onClick={applyHueSaturationNow} className="flex-1 text-[11px] px-2 py-1.5 border rounded bg-gray-800 text-white hover:bg-gray-700">Apply</button>
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
                {hasVectorPath && (
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
              <button onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-full border">{cancelLabel}</button>
              <button onClick={handleApply} className="flex-1 text-xs px-3 py-2 rounded-full bg-brand-gradient text-white font-semibold">{applyLabel}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-9 border-t bg-white flex items-center justify-between px-3 text-[11px] text-gray-500 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={openResizeDialog} className="hover:underline" title="Resize Image / DPI">
            {docSize.w} × {docSize.h} px
          </button>
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

      {showResizeDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setShowResizeDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-gray-800">Resize Image</p>
              <select
                value={resizeUnit}
                onChange={(e) => setResizeUnit(e.target.value as DocUnit)}
                className="text-[11px] border rounded px-1.5 py-1"
                title="Display unit — resizing still resamples the real pixel dimensions"
              >
                <option value="px">px</option>
                <option value="in">in</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="pt">pt</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <label className="text-[11px] text-gray-500">Width ({resizeUnit})</label>
                <input
                  type="number"
                  min={0}
                  step={resizeUnit === 'px' ? 1 : 0.01}
                  value={displayResizeValue(resizeInput.w)}
                  onChange={(e) => onResizeWidthChange(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1 mt-0.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-gray-500">Height ({resizeUnit})</label>
                <input
                  type="number"
                  min={0}
                  step={resizeUnit === 'px' ? 1 : 0.01}
                  value={displayResizeValue(resizeInput.h)}
                  onChange={(e) => onResizeHeightChange(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1 mt-0.5"
                />
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-3">
              <input
                type="checkbox"
                checked={resizeInput.lockAspect}
                onChange={(e) => setResizeInput((s) => ({ ...s, lockAspect: e.target.checked }))}
              />
              Lock aspect ratio
            </label>
            <div className="mb-3">
              <label className="text-[11px] text-gray-500">DPI</label>
              <input
                type="number"
                min={1}
                value={resizeInput.dpi}
                onChange={(e) => setResizeInput((s) => ({ ...s, dpi: e.target.value }))}
                className="w-full text-sm border rounded px-2 py-1 mt-0.5"
              />
            </div>
            {(() => {
              const w = parseFloat(resizeInput.w);
              const h = parseFloat(resizeInput.h);
              const dpi = parseFloat(resizeInput.dpi);
              const valid = Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(dpi) && dpi > 0;
              return (
                <p className="text-[11px] text-gray-400 mb-3">
                  {valid ? `Prints at ${(w / dpi).toFixed(2)} × ${(h / dpi).toFixed(2)} in at ${dpi} DPI` : ''}
                </p>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={() => setShowResizeDialog(false)} className="flex-1 text-xs px-3 py-2 rounded-full border">Cancel</button>
              <button onClick={applyResizeImage} className="flex-1 text-xs px-3 py-2 rounded-full bg-gray-800 text-white font-semibold">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
