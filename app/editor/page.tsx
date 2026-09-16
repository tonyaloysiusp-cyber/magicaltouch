'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Keyboard } from 'lucide-react';

import { ToolMode, DocUnit, isDrawTool } from '@/lib/editor/types';
import { getAbsolutePolygonPoints, multiPolygonToPathD } from '@/lib/editor/geometry';

import { useEditorHistory } from '@/hooks/useEditorHistory';
import { usePenTool } from '@/hooks/usePenTool';
import { useShapeTools } from '@/hooks/useShapeTools';
import { useDirectSelection } from '@/hooks/useDirectSelection';

import { Toolbar } from '@/components/editor/Toolbar';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { RoadmapModal } from '@/components/editor/RoadmapModal';

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
  const [roadmap, setRoadmap] = useState<{ open: boolean; id?: string }>({ open: false });

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);

  const [unit, setUnit] = useState<DocUnit>('px');
  const unitRef = useRef<DocUnit>(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  const [activeTool, setActiveToolState] = useState<ToolMode>('select');
  const activeToolRef = useRef<ToolMode>('select');
  const [maskTargetId, setMaskTargetId] = useState<string>('');

  const clipboardRef = useRef<any>(null);
  const gradAngleRef = useRef<number>(90);

  const width = parseInt(searchParams.get('w') || '1080');
  const height = parseInt(searchParams.get('h') || '1080');
  const urlDesignId = searchParams.get('designId');

  const refreshLayers = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setLayers(
      canvas
        .getObjects()
        .filter((o: any) => !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft)
        .slice()
        .reverse()
    );
  }, []);

  // ---------------------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------------------
  const { suppressHistoryRef, canUndo, canRedo, pushHistory, undo, redo, seedInitialSnapshot } =
    useEditorHistory(fabricCanvasRef, () => {
      refreshLayers();
      setSelected(fabricCanvasRef.current?.getActiveObject() || null);
    });

  // ---------------------------------------------------------------------
  // DIRECT SELECTION (anchor handles)
  // ---------------------------------------------------------------------
  const { clearHandles: clearAnchorHandles, renderHandles: renderAnchorHandles } = useDirectSelection({
    fabricCanvasRef,
    onAnchorMoved: pushHistory,
  });

  // ---------------------------------------------------------------------
  // PEN TOOL
  // ---------------------------------------------------------------------
  const { clearDraft: clearPenDraft, finishPath: finishPenPath, handleMouseDown: handlePenMouseDown, handleMouseMove: handlePenMouseMove, handleMouseUp: handlePenMouseUp } =
    usePenTool({
      fabricCanvasRef,
      onPathFinished: (pathObj) => {
        const canvas = fabricCanvasRef.current;
        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        canvas.requestRenderAll();
        setActiveToolState('select');
        activeToolRef.current = 'select';
      },
    });

  // ---------------------------------------------------------------------
  // SHAPE TOOLS (drag-to-create)
  // ---------------------------------------------------------------------
  const { liveDim, clearDraft: clearShapeDraft, handleMouseDown: handleShapeMouseDown, handleMouseMove: handleShapeMouseMove, handleMouseUp: handleShapeMouseUp } =
    useShapeTools({
      fabricCanvasRef,
      activeToolRef,
      unitRef,
      suppressHistoryRef,
      onShapeFinished: (obj) => {
        const canvas = fabricCanvasRef.current;
        canvas.setActiveObject(obj);
        refreshLayers();
        pushHistory();
        setActiveToolState('select');
        activeToolRef.current = 'select';
      },
    });

  // ---------------------------------------------------------------------
  // PATH -> MASK
  // ---------------------------------------------------------------------
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
    const targetImage = canvas.getObjects().find((o: any) => o.type === 'image' && o.__id === maskTargetId);
    if (!targetImage) {
      alert('Target image not found.');
      return;
    }

    import('fabric').then((mod) => {
      pathObj.clone((cloned: any) => {
        cloned.set({ absolutePositioned: true, fill: '#000000', stroke: '' });
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
  // GRADIENT FILL
  // ---------------------------------------------------------------------
  const applyGradientFill = useCallback(
    (type: 'linear' | 'radial', color1: string, color2: string, angleDeg: number) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
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
          coords = { x1: ow / 2, y1: oh / 2, x2: ow / 2, y2: oh / 2, r1: 0, r2: Math.max(ow, oh) / 2 };
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
  // EXACT TRANSFORM
  // ---------------------------------------------------------------------
  const applyExactSize = useCallback(
    (newWpx: number | null, newHpx: number | null) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      const curW = active.type === 'circle' ? (active.radius || 1) * 2 * (active.scaleX || 1) : (active.width || 0) * (active.scaleX || 1);
      const curH = active.type === 'circle' ? (active.radius || 1) * 2 * (active.scaleY || 1) : (active.height || 0) * (active.scaleY || 1);
      let w = newWpx;
      let h = newHpx;

      if (active.__lockRatio) {
        if (w != null && h == null && curW > 0) h = (w / curW) * curH;
        if (h != null && w == null && curH > 0) w = (h / curH) * curW;
      }

      const baseW = active.type === 'circle' ? (active.radius || 1) * 2 : active.width || 1;
      const baseH = active.type === 'circle' ? (active.radius || 1) * 2 : active.height || 1;

      if (w != null) active.set({ scaleX: w / baseW });
      if (h != null) active.set({ scaleY: h / baseH });

      active.setCoords();
      canvas.requestRenderAll();
      bumpSel();
      pushHistory();
    },
    [pushHistory]
  );

  const toggleLockRatio = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;
    active.__lockRatio = !active.__lockRatio;
    bumpSel();
  };

  // ---------------------------------------------------------------------
  // SHAPE BUILDER
  // ---------------------------------------------------------------------
  const runShapeBuilder = useCallback(
    (op: 'union' | 'subtract' | 'intersect' | 'exclude') => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.type !== 'activeSelection') {
        alert('Select two or more shapes first (drag a selection box, or Shift-click each one).');
        return;
      }
      const objs: any[] = active.getObjects ? active.getObjects() : [];
      if (objs.length < 2) {
        alert('Shape Builder needs at least two selected objects.');
        return;
      }
      const unsupported = objs.filter((o) => !['rect', 'triangle', 'circle', 'ellipse', 'polygon', 'path'].includes(o.type));
      if (unsupported.length > 0) {
        alert('Shape Builder only works on vector shapes and paths right now — remove images/text from the selection first.');
        return;
      }

      import('fabric')
        .then(async (mod) => {
          const F: any = mod.fabric;
          let polygonClipping: any;
          try {
            polygonClipping = (await import('polygon-clipping')).default;
          } catch (err) {
            console.error(err);
            alert("Shape Builder needs the 'polygon-clipping' package. Run: npm install polygon-clipping");
            return;
          }

          const canvasOrder = canvas.getObjects();
          const ordered = objs.slice().sort((a: any, b: any) => canvasOrder.indexOf(a) - canvasOrder.indexOf(b));

          const toGeom = (obj: any): number[][][] => {
            const ring = getAbsolutePolygonPoints(obj, F);
            if (ring.length < 3) return [];
            return [[...ring, ring[0]]];
          };

          const geoms = ordered.map(toGeom).filter((g) => g.length > 0);
          if (geoms.length < 2) {
            alert('Could not read enough valid shape geometry to run this operation.');
            return;
          }

          let result: number[][][][];
          if (op === 'union') result = polygonClipping.union(...geoms);
          else if (op === 'intersect') result = polygonClipping.intersection(...geoms);
          else if (op === 'exclude') result = polygonClipping.xor(...geoms);
          else result = polygonClipping.difference(geoms[0], ...geoms.slice(1));

          if (!result || result.length === 0) {
            alert('This operation produced an empty shape — the selected objects may not overlap the way this operation expects.');
            return;
          }

          const d = multiPolygonToPathD(result);
          const baseFill = typeof ordered[0].fill === 'string' ? ordered[0].fill : '#3FA9E8';
          const pathObj: any = new F.Path(d, { fill: baseFill, stroke: '#1A1A1A', strokeWidth: 2, fillRule: 'evenodd', objectCaching: false });
          pathObj.isVectorPath = true;
          pathObj.name = `Shape Builder (${op})`;

          canvas.discardActiveObject();
          objs.forEach((o: any) => canvas.remove(o));
          canvas.add(pathObj);
          canvas.setActiveObject(pathObj);
          canvas.requestRenderAll();
          refreshLayers();
          pushHistory();
        })
        .catch((err) => {
          console.error('Shape Builder failed:', err);
          alert('Shape Builder failed on this selection. Please try again.');
        });
    },
    [pushHistory, refreshLayers]
  );

  const openShapeBuilder = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'activeSelection') {
      alert('Select two or more shapes first (drag a selection box, or Shift-click each one), then use Shape Builder in the Properties panel.');
      return;
    }
  };

  // ---------------------------------------------------------------------
  // TOOL SWITCHING
  // ---------------------------------------------------------------------
  const setActiveTool = useCallback(
    (tool: ToolMode) => {
      const canvas = fabricCanvasRef.current;
      activeToolRef.current = tool;
      setActiveToolState(tool);

      if (tool !== 'pen') clearPenDraft();
      if (tool !== 'direct') clearAnchorHandles();
      clearShapeDraft();

      if (!canvas) return;

      if (tool === 'pen' || isDrawTool(tool)) {
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => (o.selectable = false));
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
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
    [clearPenDraft, clearAnchorHandles, clearShapeDraft]
  );

  // ---------------------------------------------------------------------
  // CANVAS LIFECYCLE
  // ---------------------------------------------------------------------
  useEffect(() => {
    import('fabric').then((mod) => {
      const canvas = new mod.fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      fabricCanvasRef.current = canvas;
      (window as any).fabric = mod.fabric;

      const onLayersChanged = () => refreshLayers();
      const onHistoryChanged = () => pushHistory();

      canvas.on('object:added', (e: any) => {
        const obj: any = e.target;
        if (obj && !obj.__isAnchorHandle && !obj.__isPenPreview && !obj.__isShapeDraft && !obj.__uid) {
          obj.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
      });

      canvas.on('object:added', onLayersChanged);
      canvas.on('object:removed', onLayersChanged);
      canvas.on('object:modified', onHistoryChanged);
      canvas.on('object:added', onHistoryChanged);
      canvas.on('object:removed', onHistoryChanged);

      canvas.on('selection:created', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) renderAnchorHandles(obj);
      });
      canvas.on('selection:updated', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) renderAnchorHandles(obj);
        else clearAnchorHandles();
      });
      canvas.on('selection:cleared', () => {
        setSelected(null);
        clearAnchorHandles();
      });
      canvas.on('object:scaling', () => bumpSel());
      canvas.on('object:moving', (e: any) => {
        bumpSel();
        renderAnchorHandles(e.target); // no-op unless this is the path currently being edited
      });

      canvas.on('mouse:down', (opt: any) => {
        if (activeToolRef.current === 'pen') handlePenMouseDown(opt);
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseDown(opt);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (activeToolRef.current === 'pen') handlePenMouseMove(opt);
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseMove(opt);
      });
      canvas.on('mouse:up', () => {
        if (activeToolRef.current === 'pen') handlePenMouseUp();
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseUp();
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
              canvas.loadFromJSON(data.canvas_json, function () {
                canvas.renderAll();
                refreshLayers();
                seedInitialSnapshot();
              });
            }
            if (error) console.error('Failed to load design:', error);
          });
      } else {
        seedInitialSnapshot();
      }
    });

    return function () {
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, urlDesignId]);
