'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  MousePointer2,
  Pointer,
  PenTool as PenToolIcon,
  Type,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Minus as LineIcon,
  Hexagon as PolygonIcon,
  Star as StarIcon,
  ImagePlus,
  Copy,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Pencil,
  Check,
  GripVertical,
  Keyboard,
  X,
  Scissors,
} from 'lucide-react';

const MAX_HISTORY = 100;

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
];

type ToolMode = 'select' | 'pen' | 'direct';

// Anchor point for an in-progress or already-created vector path.
// handleOut is the outgoing Bezier control point for the segment leaving
// this anchor; handleIn is the incoming control point for the segment
// arriving at this anchor. When absent, the segment behaves as a
// straight corner rather than a curve.
interface PenAnchor {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

const ANCHOR_HIT_RADIUS = 8; // px, in canvas-native coordinates
const ANCHOR_HANDLE_SIZE = 8;

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'V', label: 'Selection tool' },
  { keys: 'A', label: 'Direct Selection tool' },
  { keys: 'P', label: 'Pen tool' },
  { keys: 'Enter', label: 'Finish open path (Pen tool)' },
  { keys: 'Esc', label: 'Cancel path in progress / deselect' },
  { keys: 'Shift + Enter', label: 'Apply path as mask to selected image' },
  { keys: 'Ctrl/Cmd + Z', label: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', label: 'Redo' },
  { keys: 'Ctrl/Cmd + Y', label: 'Redo (alt)' },
  { keys: 'Ctrl/Cmd + S', label: 'Save design' },
  { keys: 'Ctrl/Cmd + A', label: 'Select all' },
  { keys: 'Ctrl/Cmd + C', label: 'Copy' },
  { keys: 'Ctrl/Cmd + V', label: 'Paste' },
  { keys: 'Ctrl/Cmd + D', label: 'Duplicate' },
  { keys: 'Delete / Backspace', label: 'Delete selection' },
  { keys: 'Ctrl/Cmd + G', label: 'Group selection' },
  { keys: 'Ctrl/Cmd + Shift + G', label: 'Ungroup' },
  { keys: 'Ctrl/Cmd + ]', label: 'Bring forward' },
  { keys: 'Ctrl/Cmd + [', label: 'Send backward' },
  { keys: 'Ctrl/Cmd + Shift + ]', label: 'Bring to front' },
  { keys: 'Ctrl/Cmd + Shift + [', label: 'Send to back' },
  { keys: 'Ctrl/Cmd + L', label: 'Lock / unlock selection' },
  { keys: 'Ctrl/Cmd + H', label: 'Hide selection' },
  { keys: 'Arrow keys', label: 'Nudge 1px' },
  { keys: 'Shift + Arrow keys', label: 'Nudge 10px' },
  { keys: 'Ctrl/Cmd + "+"', label: 'Zoom in' },
  { keys: 'Ctrl/Cmd + "-"', label: 'Zoom out' },
  { keys: 'Ctrl/Cmd + 0', label: 'Reset zoom to 100%' },
  { keys: '?', label: 'Show this shortcuts panel' },
];

// ---------------------------------------------------------------------
// Geometry helpers for the new shape tools (Polygon / Star). Pure
// functions, no fabric dependency, so they're trivially testable.
// ---------------------------------------------------------------------

function regularPolygonPoints(sides: number, radius: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push({ x: Math.cos(angle) * radius + radius, y: Math.sin(angle) * radius + radius });
  }
  return pts;
}

function starPoints(spikes: number, outerRadius: number, innerRadius: number) {
  const pts: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: Math.cos(rot) * outerRadius + outerRadius, y: Math.sin(rot) * outerRadius + outerRadius });
    rot += step;
    pts.push({
      x: Math.cos(rot) * innerRadius + outerRadius,
      y: Math.sin(rot) * innerRadius + outerRadius,
    });
    rot += step;
  }
  return pts;
}

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [zoom, setZoom] = useState(50);
  const [layers, setLayers] = useState<any[]>([]);
  const [designName, setDesignName] = useState('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dragLayerIndex = useRef<number | null>(null);

  const historyRef = useRef<{ stack: string[]; index: number; suspend: boolean }>({
    stack: [],
    index: -1,
    suspend: false,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const clipboardRef = useRef<any>(null);

  // Remembers the last gradient angle dragged on the current selection so
  // repeated color-stop edits don't reset the angle back to a default.
  const gradAngleRef = useRef<number>(90);

  // ---------------------------------------------------------------------
  // VECTOR PEN TOOL + DIRECT SELECTION state
  // ---------------------------------------------------------------------
  const [activeTool, setActiveToolState] = useState<ToolMode>('select');
  const activeToolRef = useRef<ToolMode>('select');
  const [maskTargetId, setMaskTargetId] = useState<string>('');

  // Buffer of anchors for the path currently being drawn with the Pen tool.
  const penDraftRef = useRef<{
    anchors: PenAnchor[];
    previewObj: any | null;
    draggingHandleForIndex: number | null;
    mouseDownPoint: { x: number; y: number } | null;
  }>({ anchors: [], previewObj: null, draggingHandleForIndex: null, mouseDownPoint: null });

  // Handle circles currently overlaid on a path being edited with the
  // Direct Selection tool, plus which path they belong to.
  const anchorHandlesRef = useRef<{
    pathObj: any | null;
    circles: any[];
    draggingIndex: number | null;
  }>({ pathObj: null, circles: [], draggingIndex: null });

  const width = parseInt(searchParams.get('w') || '1080');
  const height = parseInt(searchParams.get('h') || '1080');
  const urlDesignId = searchParams.get('designId');

  const refreshLayers = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    // Anchor-handle circles and the live pen preview are UI overlays, not
    // real document objects, so they never show up as layers.
    setLayers(
      canvas
        .getObjects()
        .filter((o: any) => !o.__isAnchorHandle && !o.__isPenPreview)
        .slice()
        .reverse()
    );
  }, []);

  const updateHistoryButtons = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas || h.suspend) return;

    const json = JSON.stringify(
      canvas.toJSON(['name', 'locked', 'visible', 'isVectorPath', 'clipPath'])
    );
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);

    if (h.stack.length > MAX_HISTORY) {
      h.stack.shift();
    }
    h.index = h.stack.length - 1;
    updateHistoryButtons();
  }, [updateHistoryButtons]);

  const loadHistoryState = useCallback(
    (index: number) => {
      const canvas = fabricCanvasRef.current;
      const h = historyRef.current;
      if (!canvas || index < 0 || index >= h.stack.length) return;

      h.suspend = true;
      canvas.loadFromJSON(h.stack[index], () => {
        canvas.renderAll();
        refreshLayers();
        setSelected(canvas.getActiveObject() || null);
        h.suspend = false;
        h.index = index;
        updateHistoryButtons();
      });
    },
    [refreshLayers, updateHistoryButtons]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.index > 0) loadHistoryState(h.index - 1);
  }, [loadHistoryState]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) loadHistoryState(h.index + 1);
  }, [loadHistoryState]);

  // ---------------------------------------------------------------------
  // PEN TOOL — drawing an editable Bezier path
  // ---------------------------------------------------------------------

  // Builds an SVG path "d" string from committed anchors, optionally
  // followed by a rubber-band segment to the current pointer, and
  // optionally closed back to the first anchor.
  const buildPathD = (
    anchors: PenAnchor[],
    rubberBandTo: { x: number; y: number } | null,
    closed: boolean
  ) => {
    if (anchors.length === 0) return '';
    let d = `M ${anchors[0].x} ${anchors[0].y}`;
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];
      const c1 = prev.handleOut || prev;
      const c2 = curr.handleIn || curr;
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${curr.x} ${curr.y}`;
    }
    if (rubberBandTo) {
      const last = anchors[anchors.length - 1];
      const c1 = last.handleOut || last;
      d += ` C ${c1.x} ${c1.y}, ${rubberBandTo.x} ${rubberBandTo.y}, ${rubberBandTo.x} ${rubberBandTo.y}`;
    }
    if (closed) {
      const last = anchors[anchors.length - 1];
      const first = anchors[0];
      const c1 = last.handleOut || last;
      const c2 = first.handleIn || first;
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${first.x} ${first.y} Z`;
    }
    return d;
  };

  const updatePenPreview = useCallback(
    (rubberBandTo: { x: number; y: number } | null) => {
      const canvas = fabricCanvasRef.current;
      const draft = penDraftRef.current;
      if (!canvas || draft.anchors.length === 0) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const d = buildPathD(draft.anchors, rubberBandTo, false);
        if (draft.previewObj) {
          canvas.remove(draft.previewObj);
        }
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
    []
  );

  const clearPenDraft = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const draft = penDraftRef.current;
    if (canvas && draft.previewObj) {
      canvas.remove(draft.previewObj);
    }
    draft.anchors = [];
    draft.previewObj = null;
    draft.draggingHandleForIndex = null;
    draft.mouseDownPoint = null;
    canvas?.requestRenderAll();
  }, []);

  const finishPenPath = useCallback(
    (closed: boolean) => {
      const canvas = fabricCanvasRef.current;
      const draft = penDraftRef.current;
      if (!canvas || draft.anchors.length < 2) {
        clearPenDraft();
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
        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        canvas.requestRenderAll();

        draft.anchors = [];
        draft.previewObj = null;
        draft.draggingHandleForIndex = null;
        draft.mouseDownPoint = null;

        setActiveToolState('select');
      });
    },
    [clearPenDraft]
  );

  const handlePenMouseDown = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = penDraftRef.current;

      // Closing the path: click landed near the first anchor.
      if (draft.anchors.length >= 3) {
        const first = draft.anchors[0];
        const dist = Math.hypot(pointer.x - first.x, pointer.y - first.y);
        if (dist <= ANCHOR_HIT_RADIUS) {
          finishPenPath(true);
          return;
        }
      }

      draft.anchors.push({ x: pointer.x, y: pointer.y });
      draft.mouseDownPoint = { x: pointer.x, y: pointer.y };
      updatePenPreview(null);
    },
    [finishPenPath, updatePenPreview]
  );

  const handlePenMouseMove = useCallback(
    (opt: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const pointer = canvas.getPointer(opt.e);
      const draft = penDraftRef.current;
      if (draft.anchors.length === 0) return;

      const isMouseDown = opt.e.buttons === 1 || opt.e.which === 1;
      const lastIndex = draft.anchors.length - 1;

      if (isMouseDown && draft.mouseDownPoint) {
        // Dragging out of the most recently placed anchor creates a
        // symmetric smooth Bezier handle pair for that anchor.
        const anchor = draft.anchors[lastIndex];
        anchor.handleOut = { x: pointer.x, y: pointer.y };
        anchor.handleIn = {
          x: anchor.x - (pointer.x - anchor.x),
          y: anchor.y - (pointer.y - anchor.y),
        };
        updatePenPreview(null);
      } else {
        // Rubber-band preview toward the current pointer position.
        updatePenPreview({ x: pointer.x, y: pointer.y });
      }
    },
    [updatePenPreview]
  );

  const handlePenMouseUp = useCallback(() => {
    const draft = penDraftRef.current;
    draft.mouseDownPoint = null;
  }, []);

  // ---------------------------------------------------------------------
  // DIRECT SELECTION — editable anchor handles on an existing path
  // ---------------------------------------------------------------------

  const clearAnchorHandles = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const state = anchorHandlesRef.current;
    if (canvas && state.circles.length) {
      state.circles.forEach((c) => canvas.remove(c));
      canvas.requestRenderAll();
    }
    state.pathObj = null;
    state.circles = [];
    state.draggingIndex = null;
  }, []);

  // Extracts anchor (on-curve) points from a fabric.Path's internal path
  // command array, in that path object's *canvas* coordinate space
  // (accounting for its current position/scale/rotation/skew).
  //
  // Everything here is cast through `any`. fabric.Path's internal `path`
  // array and `pathOffset` field, plus `fabric.util.transformPoint`, are
  // not part of fabric's stable public typings across versions, so we
  // deliberately avoid letting TypeScript infer strict types for any of
  // this and rely on the runtime shape instead.
  const getPathAnchorsInCanvasSpace = (pathObj: any, fabricMod: any) => {
    const F: any = fabricMod.fabric;
    const target: any = pathObj;
    const commands: any[] = target.path || [];
    const matrix: any = target.calcTransformMatrix();
    const offset: any = target.pathOffset || { x: 0, y: 0 };
    const pts: { x: number; y: number; commandIndex: number }[] = [];

    commands.forEach((cmd: any[], idx: number) => {
      const type = cmd[0];
      let localX: number | null = null;
      let localY: number | null = null;
      if (type === 'M' || type === 'L') {
        localX = cmd[1];
        localY = cmd[2];
      } else if (type === 'C') {
        localX = cmd[5];
        localY = cmd[6];
      } else if (type === 'Q') {
        localX = cmd[3];
        localY = cmd[4];
      }
      if (localX === null || localY === null) return;
      const localPoint: any = new F.Point(localX - offset.x, localY - offset.y);
      const canvasPoint: any = F.util.transformPoint(localPoint, matrix);
      pts.push({ x: canvasPoint.x, y: canvasPoint.y, commandIndex: idx });
    });

    return pts;
  };

  const renderAnchorHandles = useCallback((pathObj: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    import('fabric').then((mod) => {
      const F: any = mod.fabric;
      clearAnchorHandles();
      const anchors = getPathAnchorsInCanvasSpace(pathObj, mod);
      const state = anchorHandlesRef.current;
      state.pathObj = pathObj;

      anchors.forEach((pt) => {
        const circle: any = new F.Circle({
          left: pt.x,
          top: pt.y,
          radius: ANCHOR_HANDLE_SIZE / 2,
          fill: '#ffffff',
          stroke: '#3FA9E8',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasControls: false,
          hasBorders: false,
          selectable: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
        });
        circle.__isAnchorHandle = true;
        circle.__commandIndex = pt.commandIndex;
        circle.__anchorPathObj = pathObj;

        circle.on('moving', () => {
          const canvasNow = fabricCanvasRef.current;
          if (!canvasNow) return;
          const targetPath: any = circle.__anchorPathObj;
          const cmdIdx: number = circle.__commandIndex;
          const invMatrix: any = F.util.invertTransform(targetPath.calcTransformMatrix());
          const localPoint: any = F.util.transformPoint(
            new F.Point(circle.left, circle.top),
            invMatrix
          );
          const offset: any = targetPath.pathOffset || { x: 0, y: 0 };
          const newLocalX = localPoint.x + offset.x;
          const newLocalY = localPoint.y + offset.y;

          const cmd: any[] = targetPath.path[cmdIdx];
          if (cmd[0] === 'M' || cmd[0] === 'L') {
            cmd[1] = newLocalX;
            cmd[2] = newLocalY;
          } else if (cmd[0] === 'C') {
            cmd[5] = newLocalX;
            cmd[6] = newLocalY;
          } else if (cmd[0] === 'Q') {
            cmd[3] = newLocalX;
            cmd[4] = newLocalY;
          }
          targetPath.dirty = true;
          targetPath.setCoords();
          canvasNow.requestRenderAll();
        });

        circle.on('mouseup', () => {
          pushHistory();
        });

        canvas.add(circle);
        state.circles.push(circle);
      });

      canvas.requestRenderAll();
    });
  }, [clearAnchorHandles, pushHistory]);

  // ---------------------------------------------------------------------
  // PATH -> MASK (non-destructive clip path applied to an image)
  // ---------------------------------------------------------------------

  // Applies the currently selected closed vector path as a clipPath on
  // the image chosen in the Properties panel. This is real, working
  // masking: the image's pixels are never altered, and the mask can be
  // removed at any time via "Remove Mask" to fully restore the image.
  //
  // LIMITATION (documented, not hidden): this replaces the whole clip
  // region in one step. It does not yet implement the spec's full
  // "Make Selection" dialog (feather / anti-alias / add / subtract /
  // intersect modes) — that requires a general Selection Engine that
  // doesn't exist in this codebase yet.
  const applyPathAsMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const pathObj = canvas.getActiveObject();
    if (!pathObj || !pathObj.isVectorPath) {
      alert('Select a closed vector path first, then choose a target image below.');
      return;
    }
    if (!maskTargetId) {
      alert('Choose a target image to mask in the Properties panel.');
      return;
    }
    const targetImage = canvas
      .getObjects()
      .find((o: any) => o.type === 'image' && o.__id === maskTargetId);
    if (!targetImage) {
      alert('Target image not found.');
      return;
    }

    import('fabric').then((mod) => {
      pathObj.clone((cloned: any) => {
        cloned.set({
          absolutePositioned: true, // clip coordinates stay in canvas space
          fill: '#000000',
          stroke: '',
        });
        // Preserve the original path so the mask can be edited/restored later.
        targetImage.__maskSourcePath = JSON.stringify(pathObj.toObject(['isVectorPath']));
        targetImage.clipPath = cloned;
        targetImage.dirty = true;

        canvas.remove(pathObj);
        clearAnchorHandles();
        canvas.setActiveObject(targetImage);
        canvas.requestRenderAll();
        setSelected(targetImage);
        pushHistory();
      });
    });
  }, [maskTargetId, clearAnchorHandles, pushHistory]);

  const removeMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !active.clipPath) return;
    active.clipPath = null;
    active.dirty = true;
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  }, [pushHistory]);

  // ---------------------------------------------------------------------
  // GRADIENT FILL — real fabric.Gradient, not a fake color swap.
  // Serializes/deserializes automatically through canvas.toJSON /
  // loadFromJSON since "fill" is already a default fabric property, so
  // no changes to the history/save property lists were needed.
  // ---------------------------------------------------------------------

  const applyGradientFill = useCallback(
    (type: 'linear' | 'radial', color1: string, color2: string, angleDeg: number) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        // Gradient coords are defined in the *unscaled* object's own
        // coordinate space (0,0 to width,height) — fabric applies the
        // object's transform on top automatically.
        const ow: number = active.width || 1;
        const oh: number = active.height || 1;
        let coords: any;

        if (type === 'linear') {
          const rad = (angleDeg * Math.PI) / 180;
          const cx = ow / 2;
          const cy = oh / 2;
          const len = Math.sqrt(ow * ow + oh * oh) / 2;
          coords = {
            x1: cx - Math.cos(rad) * len,
            y1: cy - Math.sin(rad) * len,
            x2: cx + Math.cos(rad) * len,
            y2: cy + Math.sin(rad) * len,
          };
        } else {
          coords = {
            x1: ow / 2,
            y1: oh / 2,
            x2: ow / 2,
            y2: oh / 2,
            r1: 0,
            r2: Math.max(ow, oh) / 2,
          };
        }

        const gradient = new F.Gradient({
          type,
          coords,
          colorStops: [
            { offset: 0, color: color1 },
            { offset: 1, color: color2 },
          ],
        });

        active.set({ fill: gradient });
        active.dirty = true;
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
      });
    },
    [pushHistory]
  );

  // ---------------------------------------------------------------------
  // TOOL SWITCHING
  // ---------------------------------------------------------------------

  const setActiveTool = useCallback(
    (tool: ToolMode) => {
      const canvas = fabricCanvasRef.current;
      activeToolRef.current = tool;
      setActiveToolState(tool);

      // Leaving pen mid-draw cancels the in-progress path.
      if (tool !== 'pen') clearPenDraft();
      if (tool !== 'direct') clearAnchorHandles();

      if (!canvas) return;

      if (tool === 'pen') {
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => (o.selectable = false));
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (tool === 'direct') {
        canvas.selection = true;
        canvas.forEachObject((o: any) => {
          if (!o.locked && !o.__isAnchorHandle && !o.__isPenPreview) o.selectable = true;
        });
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      } else {
        canvas.selection = true;
        canvas.forEachObject((o: any) => {
          if (!o.locked && !o.__isAnchorHandle && !o.__isPenPreview) o.selectable = true;
        });
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
      canvas.requestRenderAll();
    },
    [clearPenDraft, clearAnchorHandles]
  );

  useEffect(() => {
    import('fabric').then((mod) => {
      const canvas = new mod.fabric.Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: '#ffffff',
      });
      fabricCanvasRef.current = canvas;
      (window as any).fabric = mod.fabric;

      const onLayersChanged = () => refreshLayers();
      const onHistoryChanged = () => pushHistory();

      canvas.on('object:added', onLayersChanged);
      canvas.on('object:removed', onLayersChanged);
      canvas.on('object:modified', onHistoryChanged);
      canvas.on('object:added', onHistoryChanged);
      canvas.on('object:removed', onHistoryChanged);

      canvas.on('selection:created', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) {
          renderAnchorHandles(obj);
        }
      });
      canvas.on('selection:updated', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) {
          renderAnchorHandles(obj);
        } else {
          clearAnchorHandles();
        }
      });
      canvas.on('selection:cleared', () => {
        setSelected(null);
        clearAnchorHandles();
      });
      canvas.on('object:scaling', () => bumpSel());
      canvas.on('object:moving', (e: any) => {
        bumpSel();
        // Keep anchor handles glued to the path while it (or the canvas)
        // moves it via the Selection tool.
        if (anchorHandlesRef.current.pathObj === e.target) {
          renderAnchorHandles(e.target);
        }
      });

      canvas.on('mouse:down', (opt: any) => {
        if (activeToolRef.current === 'pen') handlePenMouseDown(opt);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (activeToolRef.current === 'pen') handlePenMouseMove(opt);
      });
      canvas.on('mouse:up', () => {
        if (activeToolRef.current === 'pen') handlePenMouseUp();
      });

      if (urlDesignId) {
        setDesignId(urlDesignId);
        supabase
          .from('designs')
          .select('*')
          .eq('id', urlDesignId)
          .single()
          .then(({ data, error }) => {
            if (data) {
              setDesignName(data.name);
              historyRef.current.suspend = true;
              canvas.loadFromJSON(data.canvas_json, function () {
                canvas.renderAll();
                refreshLayers();
                historyRef.current.suspend = false;
                historyRef.current.stack = [
                  JSON.stringify(
                    canvas.toJSON(['name', 'locked', 'visible', 'isVectorPath', 'clipPath'])
                  ),
                ];
                historyRef.current.index = 0;
                updateHistoryButtons();
              });
            }
            if (error) {
              console.error('Failed to load design:', error);
            }
          });
      } else {
        historyRef.current.stack = [
          JSON.stringify(
            canvas.toJSON(['name', 'locked', 'visible', 'isVectorPath', 'clipPath'])
          ),
        ];
        historyRef.current.index = 0;
        updateHistoryButtons();
      }
    });

    return function () {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, urlDesignId]);

  const scale = zoom / 100;

  const addText = () => {
    import('fabric').then((mod) => {
      const text = new mod.fabric.IText('Double-click to edit', {
        left: width / 2 - 100,
        top: height / 2 - 20,
        fontSize: 40,
        fill: '#1A1A1A',
        fontFamily: 'Arial',
      });
      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
    });
  };

  const addRect = () => {
    import('fabric').then((mod) => {
      const rect = new mod.fabric.Rect({
        left: width / 2 - 75,
        top: height / 2 - 75,
        width: 150,
        height: 150,
        fill: '#3FA9E8',
      });
      fabricCanvasRef.current.add(rect);
      fabricCanvasRef.current.setActiveObject(rect);
    });
  };

  const addCircle = () => {
    import('fabric').then((mod) => {
      const circle = new mod.fabric.Circle({
        left: width / 2 - 75,
        top: height / 2 - 75,
        radius: 75,
        fill: '#7ED33E',
      });
      fabricCanvasRef.current.add(circle);
      fabricCanvasRef.current.setActiveObject(circle);
    });
  };

  // --- NEW: Triangle, Line, Polygon, Star — all real, editable Fabric
  // objects that participate in history/layers/export exactly like the
  // existing shapes above. ---

  const addTriangle = () => {
    import('fabric').then((mod) => {
      const tri = new mod.fabric.Triangle({
        left: width / 2 - 75,
        top: height / 2 - 75,
        width: 150,
        height: 150,
        fill: '#E85D75',
      });
      fabricCanvasRef.current.add(tri);
      fabricCanvasRef.current.setActiveObject(tri);
    });
  };

  const addLine = () => {
    import('fabric').then((mod) => {
      const line = new mod.fabric.Line(
        [width / 2 - 100, height / 2, width / 2 + 100, height / 2],
        {
          stroke: '#1A1A1A',
          strokeWidth: 4,
        }
      );
      fabricCanvasRef.current.add(line);
      fabricCanvasRef.current.setActiveObject(line);
    });
  };

  const addPolygon = () => {
    import('fabric').then((mod) => {
      const points = regularPolygonPoints(6, 75); // hexagon
      const poly = new mod.fabric.Polygon(points, {
        left: width / 2 - 75,
        top: height / 2 - 75,
        fill: '#9B6BD6',
      });
      fabricCanvasRef.current.add(poly);
      fabricCanvasRef.current.setActiveObject(poly);
    });
  };

  const addStar = () => {
    import('fabric').then((mod) => {
      const points = starPoints(5, 75, 30);
      const star = new mod.fabric.Polygon(points, {
        left: width / 2 - 75,
        top: height / 2 - 75,
        fill: '#F5A623',
      });
      fabricCanvasRef.current.add(star);
      fabricCanvasRef.current.setActiveObject(star);
    });
  };

  const nextImageIdRef = useRef(0);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      import('fabric').then((mod) => {
        mod.fabric.Image.fromURL(event.target ? (event.target.result as string) : '', function (img: any) {
          img.scaleToWidth(300);
          img.__id = `img_${Date.now()}_${nextImageIdRef.current++}`;
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
        });
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    if (active.type === 'activeSelection') {
      active.forEachObject((obj: any) => {
        if (!obj.locked) canvas.remove(obj);
      });
      canvas.discardActiveObject();
    } else {
      canvas.remove(active);
    }
    clearAnchorHandles();
    canvas.requestRenderAll();
  };

  const duplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone((cloned: any) => {
      canvas.discardActiveObject();
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20, evented: true, locked: false });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        cloned.forEachObject((obj: any) => canvas.add(obj));
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    });
  };

  const copySelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone((cloned: any) => {
      clipboardRef.current = cloned;
    });
  };

  const pasteClipboard = () => {
    const canvas = fabricCanvasRef.current;
    if (!clipboardRef.current) return;
    clipboardRef.current.clone((cloned: any) => {
      canvas.discardActiveObject();
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20, evented: true });
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        cloned.forEachObject((obj: any) => canvas.add(obj));
        cloned.setCoords();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    });
  };

  const bringForward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.bringForward(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const sendBackward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.sendBackwards(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const bringToFront = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.bringToFront(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const sendToBack = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.sendToBack(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const groupSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'activeSelection') return;
    const group = active.toGroup();
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
    setSelected(group);
  };

  const ungroupSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'group') return;
    const items = active.toActiveSelection();
    canvas.setActiveObject(items);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
    setSelected(items);
  };

  const toggleLock = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    const nextLocked = !obj.locked;
    obj.set({
      locked: nextLocked,
      selectable: !nextLocked,
      evented: !nextLocked,
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      lockRotation: nextLocked,
    });
    if (nextLocked && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  const toggleVisible = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    obj.set({ visible: obj.visible === false ? true : false });
    if (obj.visible === false && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    refreshLayers();
    bumpSel();
    pushHistory();
  };

  const toggleLockSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    toggleLock(active);
  };

  const toggleHideSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    toggleVisible(active);
  };

  const startRename = (obj: any, index: number) => {
    setRenamingId(index);
    setRenameValue(obj.name || `${obj.type} ${index + 1}`);
  };

  const commitRename = (obj: any) => {
    obj.set({ name: renameValue.trim() || obj.type });
    setRenamingId(null);
    refreshLayers();
    pushHistory();
  };

  const layerLabel = (obj: any, index: number) => obj.name || `${obj.type} ${index + 1}`;

  const handleLayerDragStart = (index: number) => {
    dragLayerIndex.current = index;
  };

  const handleLayerDrop = (targetIndex: number) => {
    const canvas = fabricCanvasRef.current;
    const from = dragLayerIndex.current;
    dragLayerIndex.current = null;
    if (from === null || from === targetIndex) return;

    const obj = layers[from];
    const objs = canvas.getObjects();
    const currentIdx = objs.indexOf(obj);
    const targetCanvasIdx = objs.length - 1 - targetIndex;

    canvas.moveTo(obj, targetCanvasIdx);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
    void currentIdx;
  };

  const alignObject = (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    const objW = active.getScaledWidth();
    const objH = active.getScaledHeight();

    switch (mode) {
      case 'left':
        active.set({ left: 0 });
        break;
      case 'centerH':
        active.set({ left: width / 2 - objW / 2 });
        break;
      case 'right':
        active.set({ left: width - objW });
        break;
      case 'top':
        active.set({ top: 0 });
        break;
      case 'centerV':
        active.set({ top: height / 2 - objH / 2 });
        break;
      case 'bottom':
        active.set({ top: height - objH });
        break;
    }
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
    bumpSel();
  };

  const applyProp = (props: Record<string, any>, record = true) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    active.set(props);
    active.setCoords();
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const isMeta = e.ctrlKey || e.metaKey;
      const active = canvas.getActiveObject();
      const isEditingText = active && active.isEditing;
      const isTypingInField =
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      const canUseToolShortcuts = !isEditingText && !isTypingInField;

      if (e.key === '?' && canUseToolShortcuts) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      // --- Vector tool shortcuts ---
      if (canUseToolShortcuts && !isMeta && !e.shiftKey) {
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          setActiveTool('select');
          return;
        }
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setActiveTool('direct');
          return;
        }
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setActiveTool('pen');
          return;
        }
      }

      if (canUseToolShortcuts && activeToolRef.current === 'pen') {
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

      if (canUseToolShortcuts && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        applyPathAsMask();
        return;
      }

      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDesign();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'a' && !isEditingText) {
        e.preventDefault();
        const objs = canvas
          .getObjects()
          .filter((o: any) => !o.locked && !o.__isAnchorHandle && !o.__isPenPreview);
        if (objs.length) {
          canvas.discardActiveObject();
          const sel = new (window as any).fabric.ActiveSelection(objs, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
        return;
      }
      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        clearAnchorHandles();
        canvas.requestRenderAll();
        setShowShortcuts(false);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'g' && e.shiftKey && !isEditingText) {
        e.preventDefault();
        ungroupSelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'g' && !isEditingText) {
        e.preventDefault();
        groupSelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'd' && !isEditingText) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'c' && !isEditingText) {
        copySelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'v' && !isEditingText) {
        pasteClipboard();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'l' && !isEditingText) {
        e.preventDefault();
        toggleLockSelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'h' && !isEditingText) {
        e.preventDefault();
        toggleHideSelected();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText && activeToolRef.current !== 'pen') {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (isMeta && e.key === ']' && !e.shiftKey) {
        e.preventDefault();
        bringForward();
        return;
      }
      if (isMeta && e.key === '[' && !e.shiftKey) {
        e.preventDefault();
        sendBackward();
        return;
      }
      if (isMeta && e.shiftKey && e.key === ']') {
        e.preventDefault();
        bringToFront();
        return;
      }
      if (isMeta && e.shiftKey && e.key === '[') {
        e.preventDefault();
        sendToBack();
        return;
      }
      if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => Math.min(200, z + 10));
        return;
      }
      if (isMeta && e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(10, z - 10));
        return;
      }
      if (isMeta && e.key === '0') {
        e.preventDefault();
        setZoom(100);
        return;
      }

      if (
        !isEditingText &&
        active &&
        !active.locked &&
        activeToolRef.current !== 'pen' &&
        e.key.startsWith('Arrow')
      ) {
        const step = e.shiftKey ? 10 : 1;
        e.preventDefault();
        if (e.key === 'ArrowUp') active.top -= step;
        if (e.key === 'ArrowDown') active.top += step;
        if (e.key === 'ArrowLeft') active.left -= step;
        if (e.key === 'ArrowRight') active.left += step;
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, finishPenPath, clearPenDraft, applyPathAsMask, setActiveTool, clearAnchorHandles]);

  const saveDesign = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to save a design.');
      setSaving(false);
      return;
    }

    const canvasJson = fabricCanvasRef.current.toJSON([
      'name',
      'locked',
      'visible',
      'isVectorPath',
      'clipPath',
    ]);

    const payload: any = {
      user_id: user.id,
      name: designName,
      canvas_json: canvasJson,
      width: width,
      height: height,
      updated_at: new Date().toISOString(),
    };

    if (designId) {
      payload.id = designId;
    }

    const { data, error } = await supabase
      .from('designs')
      .upsert(payload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error('Save failed:', error);
      alert('Failed to save design. Please try again.');
      return;
    }

    if (data) {
      setDesignId(data.id);
      router.replace(`/editor?designId=${data.id}&w=${width}&h=${height}`);
    }
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsPNG = () => {
    setExporting(true);
    const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    downloadFile(dataUrl, `${designName || 'design'}.png`);
    setExporting(false);
    setShowExportMenu(false);
  };

  const exportAsJPG = () => {
    setExporting(true);
    const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 2 });
    downloadFile(dataUrl, `${designName || 'design'}.jpg`);
    setExporting(false);
    setShowExportMenu(false);
  };

  const exportAsPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const dataUrl = fabricCanvasRef.current.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
      const orientation = width > height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`${designName || 'design'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
    setExporting(false);
    setShowExportMenu(false);
  };

  const imageLayerOptions = layers.filter((o) => o.type === 'image');

  const renderPropertiesPanel = () => {
    if (activeTool === 'pen') {
      return (
        <p className="text-xs text-gray-500">
          Pen tool active. Click to place anchors, click + drag for curved handles.
          Press <kbd className="bg-gray-100 border rounded px-1">Enter</kbd> to finish an open
          path, or click the first anchor to close it.{' '}
          <kbd className="bg-gray-100 border rounded px-1">Esc</kbd> cancels the current path.
        </p>
      );
    }

    if (!selected) {
      return <p className="text-xs text-gray-400">Select an object to edit its properties.</p>;
    }

    const isMultiple = selected.type === 'activeSelection';
    const isText = selected.type === 'i-text' || selected.type === 'text' || selected.type === 'textbox';
    const isImage = selected.type === 'image';
    const isGroup = selected.type === 'group';
    const isPath = !!selected.isVectorPath;
    const hasFillStroke = !isImage;
    const isLocked = !!selected.locked;

    // Gradient fill state, derived straight from the live fabric object.
    const currentFill = selected.fill;
    const isGradientFill = !!(currentFill && typeof currentFill === 'object' && (currentFill as any).type);
    const gradType: 'linear' | 'radial' = isGradientFill ? (currentFill as any).type : 'linear';
    const gradStops = isGradientFill && (currentFill as any).colorStops
      ? (currentFill as any).colorStops
      : [{ offset: 0, color: '#3FA9E8' }, { offset: 1, color: '#7ED33E' }];

    return (
      <div className="flex flex-col gap-4">
        {isLocked && (
          <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1.5">
            <Lock size={12} />
            Locked — unlock to edit (Ctrl/Cmd+L)
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Align to Canvas</p>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => alignObject('left')} className="text-xs border rounded py-1 hover:bg-gray-50">⟸</button>
            <button onClick={() => alignObject('centerH')} className="text-xs border rounded py-1 hover:bg-gray-50">↔</button>
            <button onClick={() => alignObject('right')} className="text-xs border rounded py-1 hover:bg-gray-50">⟹</button>
            <button onClick={() => alignObject('top')} className="text-xs border rounded py-1 hover:bg-gray-50">⟰</button>
            <button onClick={() => alignObject('centerV')} className="text-xs border rounded py-1 hover:bg-gray-50">↕</button>
            <button onClick={() => alignObject('bottom')} className="text-xs border rounded py-1 hover:bg-gray-50">⟱</button>
          </div>
        </div>

        {isMultiple && (
          <button onClick={groupSelected} className="text-xs border rounded py-2 hover:bg-gray-50">
            Group Selection (Cmd+G)
          </button>
        )}
        {isGroup && (
          <button onClick={ungroupSelected} className="text-xs border rounded py-2 hover:bg-gray-50">
            Ungroup (Cmd+Shift+G)
          </button>
        )}

        {isPath && (
          <div className="border rounded-lg p-2.5 bg-blue-50/50 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Scissors size={12} /> Path → Mask
            </p>
            <p className="text-[10px] text-gray-500">
              Press <kbd className="bg-white border rounded px-1">A</kbd> to switch to Direct
              Selection and drag anchors to reshape this path.
            </p>
            {imageLayerOptions.length === 0 ? (
              <p className="text-[10px] text-gray-400">Upload an image to mask it with this path.</p>
            ) : (
              <>
                <select
                  value={maskTargetId}
                  onChange={(e) => setMaskTargetId(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1"
                >
                  <option value="">Choose target image…</option>
                  {imageLayerOptions.map((img, i) => (
                    <option key={img.__id || i} value={img.__id}>
                      {layerLabel(img, layers.indexOf(img))}
                    </option>
                  ))}
                </select>
                <button
                  onClick={applyPathAsMask}
                  disabled={!maskTargetId}
                  className="text-xs bg-brand-gradient text-white rounded py-1.5 font-semibold disabled:opacity-40"
                >
                  Apply as Mask (Shift+Enter)
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            Opacity ({Math.round((selected.opacity ?? 1) * 100)}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            disabled={isLocked}
            value={Math.round((selected.opacity ?? 1) * 100)}
            onChange={(e) => applyProp({ opacity: Number(e.target.value) / 100 }, false)}
            onMouseUp={() => pushHistory()}
            className="w-full disabled:opacity-40"
          />
        </div>

        {isText && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Font</label>
              <select
                value={selected.fontFamily || 'Arial'}
                disabled={isLocked}
                onChange={(e) => applyProp({ fontFamily: e.target.value })}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Size ({selected.fontSize || 40})
              </label>
              <input
                type="range"
                min={8}
                max={200}
                disabled={isLocked}
                value={selected.fontSize || 40}
                onChange={(e) => applyProp({ fontSize: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Color</label>
              <input
                type="color"
                disabled={isLocked}
                value={selected.fill || '#000000'}
                onChange={(e) => applyProp({ fill: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
              />
            </div>

            <div className="flex gap-1">
              <button
                disabled={isLocked}
                onClick={() => applyProp({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`flex-1 text-xs border rounded py-1 disabled:opacity-40 ${selected.fontWeight === 'bold' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
              >
                B
              </button>
              <button
                disabled={isLocked}
                onClick={() => applyProp({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`flex-1 text-xs border rounded py-1 italic disabled:opacity-40 ${selected.fontStyle === 'italic' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
              >
                I
              </button>
              <button
                disabled={isLocked}
                onClick={() => applyProp({ underline: !selected.underline })}
                className={`flex-1 text-xs border rounded py-1 underline disabled:opacity-40 ${selected.underline ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
              >
                U
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Alignment</label>
              <div className="grid grid-cols-4 gap-1">
                {['left', 'center', 'right', 'justify'].map((a) => (
                  <button
                    key={a}
                    disabled={isLocked}
                    onClick={() => applyProp({ textAlign: a })}
                    className={`text-xs border rounded py-1 disabled:opacity-40 ${selected.textAlign === a ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
                  >
                    {a[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Letter Spacing ({selected.charSpacing || 0})
              </label>
              <input
                type="range"
                min={-100}
                max={800}
                disabled={isLocked}
                value={selected.charSpacing || 0}
                onChange={(e) => applyProp({ charSpacing: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Line Height ({(selected.lineHeight || 1.16).toFixed(2)})
              </label>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                disabled={isLocked}
                value={selected.lineHeight || 1.16}
                onChange={(e) => applyProp({ lineHeight: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full disabled:opacity-40"
              />
            </div>
          </>
        )}

        {!isText && !isImage && hasFillStroke && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Fill Type</label>
              <select
                value={isGradientFill ? gradType : 'solid'}
                disabled={isLocked}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'solid') {
                    applyProp({ fill: typeof selected.fill === 'string' ? selected.fill : '#3FA9E8' });
                  } else {
                    applyGradientFill(
                      v as 'linear' | 'radial',
                      gradStops[0]?.color || '#3FA9E8',
                      gradStops[1]?.color || '#7ED33E',
                      gradAngleRef.current
                    );
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              >
                <option value="solid">Solid</option>
                <option value="linear">Linear Gradient</option>
                <option value="radial">Radial Gradient</option>
              </select>
            </div>

            {isGradientFill ? (
              <div className="border rounded-lg p-2.5 bg-gray-50 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Color 1</label>
                    <input
                      type="color"
                      disabled={isLocked}
                      value={gradStops[0]?.color || '#3FA9E8'}
                      onChange={(e) =>
                        applyGradientFill(
                          gradType,
                          e.target.value,
                          gradStops[1]?.color || '#7ED33E',
                          gradAngleRef.current
                        )
                      }
                      className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Color 2</label>
                    <input
                      type="color"
                      disabled={isLocked}
                      value={gradStops[1]?.color || '#7ED33E'}
                      onChange={(e) =>
                        applyGradientFill(
                          gradType,
                          gradStops[0]?.color || '#3FA9E8',
                          e.target.value,
                          gradAngleRef.current
                        )
                      }
                      className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
                    />
                  </div>
                </div>
                {gradType === 'linear' && (
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Angle</label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      disabled={isLocked}
                      defaultValue={gradAngleRef.current}
                      onChange={(e) => {
                        gradAngleRef.current = Number(e.target.value);
                        applyGradientFill(
                          'linear',
                          gradStops[0]?.color || '#3FA9E8',
                          gradStops[1]?.color || '#7ED33E',
                          gradAngleRef.current
                        );
                      }}
                      className="w-full disabled:opacity-40"
                    />
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  Gradient stops are fixed at 2 colors (start/end) in this version. On-canvas
                  draggable gradient handles are not implemented yet.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Fill Color</label>
                <input
                  type="color"
                  disabled={isLocked}
                  value={typeof selected.fill === 'string' ? selected.fill : '#000000'}
                  onChange={(e) => applyProp({ fill: e.target.value }, false)}
                  onBlur={() => pushHistory()}
                  className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Stroke Color</label>
              <input
                type="color"
                disabled={isLocked}
                value={selected.stroke || '#000000'}
                onChange={(e) => applyProp({ stroke: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Stroke Width ({selected.strokeWidth || 0})
              </label>
              <input
                type="range"
                min={0}
                max={40}
                disabled={isLocked}
                value={selected.strokeWidth || 0}
                onChange={(e) => applyProp({ strokeWidth: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full disabled:opacity-40"
              />
            </div>

            {selected.type === 'rect' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Corner Radius ({selected.rx || 0})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  disabled={isLocked}
                  value={selected.rx || 0}
                  onChange={(e) => applyProp({ rx: Number(e.target.value), ry: Number(e.target.value) }, false)}
                  onMouseUp={() => pushHistory()}
                  className="w-full disabled:opacity-40"
                />
              </div>
            )}
          </>
        )}

        {isImage && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button disabled={isLocked} onClick={() => applyProp({ flipX: !selected.flipX })} className="text-xs border rounded py-1 hover:bg-gray-50 disabled:opacity-40">
                Flip H
              </button>
              <button disabled={isLocked} onClick={() => applyProp({ flipY: !selected.flipY })} className="text-xs border rounded py-1 hover:bg-gray-50 disabled:opacity-40">
                Flip V
              </button>
            </div>
            {selected.clipPath ? (
              <button
                onClick={removeMask}
                className="text-xs border border-red-200 text-red-600 rounded py-1.5 hover:bg-red-50"
              >
                Remove Mask
              </button>
            ) : (
              <p className="text-[10px] text-gray-400">
                Draw a closed path with the Pen tool, then apply it as a mask from the path's
                properties.
              </p>
            )}
            <p className="text-[10px] text-gray-400">Crop and filters are coming in a future update.</p>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <Image src="/logo.png" alt="Magical Touch" width={130} height={26} />
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="text-sm border rounded px-2 py-1 w-48 text-center"
        />

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" className="px-2 py-1 border rounded disabled:opacity-30">
            ↶ Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" className="px-2 py-1 border rounded disabled:opacity-30">
            ↷ Redo
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="p-1.5 border rounded text-gray-500 hover:bg-gray-50"
          >
            <Keyboard size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="px-2 py-1 border rounded">-</button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="px-2 py-1 border rounded">+</button>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>

          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg py-1 w-40 z-10">
              <button onClick={exportAsPNG} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PNG</button>
              <button onClick={exportAsJPG} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">JPG</button>
              <button onClick={exportAsPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF</button>
            </div>
          )}

          <button
            onClick={saveDesign}
            disabled={saving}
            className="bg-brand-gradient text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-4 text-xs overflow-y-auto">
          <button
            onClick={() => setActiveTool('select')}
            title="Selection (V)"
            className={`flex flex-col items-center gap-1 ${activeTool === 'select' ? 'text-blue-600' : 'text-gray-700'}`}
          >
            <MousePointer2 size={18} />
            <span>Select</span>
          </button>
          <button
            onClick={() => setActiveTool('direct')}
            title="Direct Selection (A)"
            className={`flex flex-col items-center gap-1 ${activeTool === 'direct' ? 'text-blue-600' : 'text-gray-700'}`}
          >
            <Pointer size={18} />
            <span>Direct</span>
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            title="Pen Tool (P)"
            className={`flex flex-col items-center gap-1 ${activeTool === 'pen' ? 'text-blue-600' : 'text-gray-700'}`}
          >
            <PenToolIcon size={18} />
            <span>Pen</span>
          </button>
          <button onClick={addText} className="flex flex-col items-center gap-1 text-gray-700">
            <Type size={18} />
            <span>Text</span>
          </button>
          <button onClick={addRect} className="flex flex-col items-center gap-1 text-gray-700">
            <Square size={18} />
            <span>Square</span>
          </button>
          <button onClick={addCircle} className="flex flex-col items-center gap-1 text-gray-700">
            <CircleIcon size={18} />
            <span>Circle</span>
          </button>
          <button onClick={addTriangle} title="Triangle" className="flex flex-col items-center gap-1 text-gray-700">
            <TriangleIcon size={18} />
            <span>Triangle</span>
          </button>
          <button onClick={addLine} title="Line" className="flex flex-col items-center gap-1 text-gray-700">
            <LineIcon size={18} />
            <span>Line</span>
          </button>
          <button onClick={addPolygon} title="Polygon" className="flex flex-col items-center gap-1 text-gray-700">
            <PolygonIcon size={18} />
            <span>Polygon</span>
          </button>
          <button onClick={addStar} title="Star" className="flex flex-col items-center gap-1 text-gray-700">
            <StarIcon size={18} />
            <span>Star</span>
          </button>
          <label className="flex flex-col items-center gap-1 text-gray-700 cursor-pointer">
            <ImagePlus size={18} />
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <div className="w-full h-px bg-gray-200 my-1" />

          <button onClick={duplicateSelected} title="Duplicate (Ctrl/Cmd+D)" className="flex flex-col items-center gap-1 text-gray-700">
            <Copy size={18} />
            <span>Duplicate</span>
          </button>
          <button onClick={bringForward} title="Bring Forward (Ctrl/Cmd+])" className="flex flex-col items-center gap-1 text-gray-700">
            <ArrowUp size={18} />
            <span>Fwd</span>
          </button>
          <button onClick={sendBackward} title="Send Backward (Ctrl/Cmd+[)" className="flex flex-col items-center gap-1 text-gray-700">
            <ArrowDown size={18} />
            <span>Back</span>
          </button>
          <button onClick={bringToFront} title="Bring to Front (Ctrl/Cmd+Shift+])" className="flex flex-col items-center gap-1 text-gray-700">
            <ArrowUpToLine size={18} />
            <span>Front</span>
          </button>
          <button onClick={sendToBack} title="Send to Back (Ctrl/Cmd+Shift+[)" className="flex flex-col items-center gap-1 text-gray-700">
            <ArrowDownToLine size={18} />
            <span>Rear</span>
          </button>

          <button onClick={deleteSelected} className="flex flex-col items-center gap-1 text-red-400 mt-auto">
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div
            style={{
              transform: 'scale(' + scale + ')',
              transformOrigin: 'center',
              boxShadow: '0 0 0 1px #e5e7eb',
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="w-64 bg-white border-l flex flex-col overflow-y-auto">
          <div className="p-3 border-b">
            <p className="font-semibold text-gray-700 mb-3 text-sm">Properties</p>
            {renderPropertiesPanel()}
          </div>

          <div className="p-3">
            <p className="font-semibold text-gray-700 mb-3 text-sm">Layers</p>
            <div className="flex flex-col gap-1">
              {layers.length === 0 && <p className="text-xs text-gray-400">No objects yet</p>}
              {layers.map((obj, i) => {
                const isLocked = !!obj.locked;
                const isHidden = obj.visible === false;
                const isRenaming = renamingId === i;
                const isSelectedLayer = selected === obj;

                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleLayerDragStart(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleLayerDrop(i)}
                    onClick={() => {
                      if (isLocked) return;
                      fabricCanvasRef.current.setActiveObject(obj);
                      fabricCanvasRef.current.requestRenderAll();
                      setSelected(obj);
                    }}
                    className={`flex items-center gap-1.5 text-xs p-1.5 border rounded cursor-pointer hover:bg-gray-50 ${
                      isSelectedLayer ? 'bg-gray-100 border-gray-400' : ''
                    } ${isHidden ? 'opacity-40' : ''}`}
                  >
                    <span className="text-gray-300 cursor-grab shrink-0">
                      <GripVertical size={12} />
                    </span>

                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(obj);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="flex-1 min-w-0 border rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate">{layerLabel(obj, i)}</span>
                    )}

                    {isRenaming ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          commitRename(obj);
                        }}
                        className="shrink-0 text-gray-400 hover:text-gray-700"
                        title="Confirm rename"
                      >
                        <Check size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(obj, i);
                        }}
                        className="shrink-0 text-gray-300 hover:text-gray-700"
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisible(obj);
                      }}
                      className="shrink-0 text-gray-300 hover:text-gray-700"
                      title={isHidden ? 'Show layer' : 'Hide layer'}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(obj);
                      }}
                      className="shrink-0 text-gray-300 hover:text-gray-700"
                      title={isLocked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-gray-500" />
                <p className="font-semibold text-sm text-gray-800">Keyboard shortcuts</p>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-600">{s.label}</span>
                  <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] text-gray-700">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
