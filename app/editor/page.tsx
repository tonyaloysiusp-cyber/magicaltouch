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
import { MenuBar, MenuDef } from '@/components/editor/MenuBar';
import { useWindowPanels } from '@/components/editor/WindowPanels';
import { AlignPanel } from '@/components/editor/AlignPanel';
import { BackBar } from '@/components/BackBar';

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
  const { isOpen: isPanelOpen, toggle: togglePanel } = useWindowPanels(['properties', 'layers']);

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
  const cameFromTemplate = searchParams.get('templateId');

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

  const { suppressHistoryRef, canUndo, canRedo, pushHistory, undo, redo, seedInitialSnapshot } =
    useEditorHistory(fabricCanvasRef, () => {
      refreshLayers();
      setSelected(fabricCanvasRef.current?.getActiveObject() || null);
    });

  const { clearHandles: clearAnchorHandles, renderHandles: renderAnchorHandles } = useDirectSelection({
    fabricCanvasRef,
    onAnchorMoved: pushHistory,
  });

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
        renderAnchorHandles(e.target);
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
      delete cloned.__uid;
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
      delete cloned.__uid;
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
    if (nextLocked && canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  const toggleVisible = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    obj.set({ visible: obj.visible === false ? true : false });
    if (obj.visible === false && canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.requestRenderAll();
    refreshLayers();
    bumpSel();
    pushHistory();
  };

  const renameLayer = (obj: any, name: string) => {
    obj.set({ name });
    refreshLayers();
    pushHistory();
  };

  const layerLabel = (obj: any, index: number) => obj.name || `${obj.type} ${index + 1}`;

  const reorderLayers = (fromIndex: number, targetIndex: number) => {
    const canvas = fabricCanvasRef.current;
    const obj = layers[fromIndex];
    const objs = canvas.getObjects();
    const targetCanvasIdx = objs.length - 1 - targetIndex;
    canvas.moveTo(obj, targetCanvasIdx);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const alignObject = (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    const objW = active.getScaledWidth();
    const objH = active.getScaledHeight();

    switch (mode) {
      case 'left': active.set({ left: 0 }); break;
      case 'centerH': active.set({ left: width / 2 - objW / 2 }); break;
      case 'right': active.set({ left: width - objW }); break;
      case 'top': active.set({ top: 0 }); break;
      case 'centerV': active.set({ top: height / 2 - objH / 2 }); break;
      case 'bottom': active.set({ top: height - objH }); break;
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
      const isTypingInField = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      const canUseToolShortcuts = !isEditingText && !isTypingInField;

      if (e.key === '?' && canUseToolShortcuts) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      if (canUseToolShortcuts && !isMeta && !e.shiftKey) {
        if (e.key.toLowerCase() === 'v') { e.preventDefault(); setActiveTool('select'); return; }
        if (e.key.toLowerCase() === 'a') { e.preventDefault(); setActiveTool('direct'); return; }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); setActiveTool('pen'); return; }
      }

      if (canUseToolShortcuts && activeToolRef.current === 'pen') {
        if (e.key === 'Enter') { e.preventDefault(); finishPenPath(false); return; }
        if (e.key === 'Escape') { e.preventDefault(); clearPenDraft(); return; }
      }

      if (canUseToolShortcuts && isDrawTool(activeToolRef.current) && e.key === 'Escape') {
        e.preventDefault();
        clearShapeDraft();
        setActiveTool('select');
        return;
      }

      if (canUseToolShortcuts && e.shiftKey && e.key === 'Enter') { e.preventDefault(); applyPathAsMask(); return; }

      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) { e.preventDefault(); redo(); return; }
      if (isMeta && e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); return; }
      if (isMeta && e.key.toLowerCase() === 'a' && !isEditingText) {
        e.preventDefault();
        const objs = canvas.getObjects().filter((o: any) => !o.locked && !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft);
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
      if (isMeta && e.key.toLowerCase() === 'g' && e.shiftKey && !isEditingText) { e.preventDefault(); ungroupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'g' && !isEditingText) { e.preventDefault(); groupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'd' && !isEditingText) { e.preventDefault(); duplicateSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'c' && !isEditingText) { copySelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'v' && !isEditingText) { pasteClipboard(); return; }
      if (isMeta && e.key.toLowerCase() === 'l' && !isEditingText) { e.preventDefault(); active && toggleLock(active); return; }
      if (isMeta && e.key.toLowerCase() === 'h' && !isEditingText) { e.preventDefault(); active && toggleVisible(active); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current)) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (isMeta && e.key === ']' && !e.shiftKey) { e.preventDefault(); bringForward(); return; }
      if (isMeta && e.key === '[' && !e.shiftKey) { e.preventDefault(); sendBackward(); return; }
      if (isMeta && e.shiftKey && e.key === ']') { e.preventDefault(); bringToFront(); return; }
      if (isMeta && e.shiftKey && e.key === '[') { e.preventDefault(); sendToBack(); return; }
      if (isMeta && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom((z) => Math.min(200, z + 10)); return; }
      if (isMeta && e.key === '-') { e.preventDefault(); setZoom((z) => Math.max(10, z - 10)); return; }
      if (isMeta && e.key === '0') { e.preventDefault(); setZoom(100); return; }

      if (!isEditingText && active && !active.locked && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current) && e.key.startsWith('Arrow')) {
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
  }, [undo, redo, finishPenPath, clearPenDraft, applyPathAsMask, setActiveTool, clearAnchorHandles, clearShapeDraft]);

  const saveDesign = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to save a design.');
      setSaving(false);
      return;
    }

    const canvasJson = fabricCanvasRef.current.toJSON(['name', 'locked', 'visible', 'isVectorPath', 'clipPath', '__uid', '__lockRatio']);
    const payload: any = {
      user_id: user.id,
      name: designName,
      canvas_json: canvasJson,
      width,
      height,
      updated_at: new Date().toISOString(),
    };
    if (designId) payload.id = designId;

    const { data, error } = await supabase.from('designs').upsert(payload).select().single();
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

  const hasSelection = !!selected;

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New Design', planned: true },
        { label: 'Open', planned: true },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl/Cmd+S', onClick: saveDesign },
        { label: 'Export as PNG', onClick: exportAsPNG },
        { label: 'Export as JPG', onClick: exportAsJPG },
        { label: 'Export as PDF', onClick: exportAsPDF },
        { divider: true },
        { label: 'Document Setup', planned: true },
        { label: 'Print Setup', planned: true },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl/Cmd+Z', onClick: undo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl/Cmd+Shift+Z', onClick: redo, disabled: !canRedo },
        { divider: true },
        { label: 'Copy', shortcut: 'Ctrl/Cmd+C', onClick: copySelected, disabled: !hasSelection },
        { label: 'Paste', shortcut: 'Ctrl/Cmd+V', onClick: pasteClipboard },
        { label: 'Duplicate', shortcut: 'Ctrl/Cmd+D', onClick: duplicateSelected, disabled: !hasSelection },
        { label: 'Delete', shortcut: 'Delete', onClick: deleteSelected, disabled: !hasSelection },
        { divider: true },
        { label: 'Preferences', planned: true },
      ],
    },
    {
      label: 'Object',
      items: [
        { label: 'Group', shortcut: 'Ctrl/Cmd+G', onClick: groupSelected, disabled: !hasSelection },
        { label: 'Ungroup', shortcut: 'Ctrl/Cmd+Shift+G', onClick: ungroupSelected, disabled: !hasSelection },
        { divider: true },
        { label: 'Bring to Front', shortcut: 'Ctrl/Cmd+Shift+]', onClick: bringToFront, disabled: !hasSelection },
        { label: 'Bring Forward', shortcut: 'Ctrl/Cmd+]', onClick: bringForward, disabled: !hasSelection },
        { label: 'Send Backward', shortcut: 'Ctrl/Cmd+[', onClick: sendBackward, disabled: !hasSelection },
        { label: 'Send to Back', shortcut: 'Ctrl/Cmd+Shift+[', onClick: sendToBack, disabled: !hasSelection },
        { divider: true },
        { label: 'Lock', shortcut: 'Ctrl/Cmd+L', onClick: () => selected && toggleLock(selected), disabled: !hasSelection },
        { label: 'Hide', shortcut: 'Ctrl/Cmd+H', onClick: () => selected && toggleVisible(selected), disabled: !hasSelection },
        { divider: true },
        { label: 'Path Operations (Offset, Simplify...)', planned: true },
        { label: 'Artboards', planned: true },
      ],
    },
    {
      label: 'Type',
      items: [
        { label: 'Add Text', onClick: addText },
        { divider: true },
        { label: 'Area Type', planned: true },
        { label: 'Type on a Path', planned: true },
        { label: 'Vertical Type', planned: true },
      ],
    },
    {
      label: 'Select',
      items: [
        {
          label: 'Select All',
          shortcut: 'Ctrl/Cmd+A',
          onClick: () => {
            const canvas = fabricCanvasRef.current;
            const objs = canvas.getObjects().filter((o: any) => !o.locked && !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft);
            if (objs.length) {
              canvas.discardActiveObject();
              const sel = new (window as any).fabric.ActiveSelection(objs, { canvas });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            }
          },
        },
        {
          label: 'Deselect',
          shortcut: 'Esc',
          onClick: () => {
            fabricCanvasRef.current?.discardActiveObject();
            fabricCanvasRef.current?.requestRenderAll();
          },
        },
        { divider: true },
        { label: 'Same Fill Color', planned: true },
        { label: 'Same Stroke Color', planned: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl/Cmd+"+"', onClick: () => setZoom((z) => Math.min(200, z + 10)) },
        { label: 'Zoom Out', shortcut: 'Ctrl/Cmd+"-"', onClick: () => setZoom((z) => Math.max(10, z - 10)) },
        { label: 'Actual Size', shortcut: 'Ctrl/Cmd+0', onClick: () => setZoom(100) },
        { divider: true },
        { label: 'Show Rulers', planned: true },
        { label: 'Show Grid', planned: true },
        { label: 'Show Guides', planned: true },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Properties', onClick: () => togglePanel('properties') },
        { label: 'Layers', onClick: () => togglePanel('layers') },
        { label: 'Align', onClick: () => togglePanel('align') },
        { divider: true },
        { label: 'Swatches', planned: true },
        { label: 'Character', planned: true },
        { label: 'Pathfinder', planned: true },
        { label: 'History', planned: true },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => setShowShortcuts(true) },
        { label: 'Feature Roadmap', onClick: () => setRoadmap({ open: true }) },
      ],
    },
  ];

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <MenuBar menus={menus} />

      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <BackBar
            href={cameFromTemplate ? '/templates' : '/dashboard'}
            label={cameFromTemplate ? 'Templates' : 'Dashboard'}
          />
          <Image src="/logo.png" alt="Magical Touch" width={130} height={26} />
        </div>
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="text-sm border rounded px-2 py-1 w-48 text-center"
        />

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" className="px-2 py-1 border rounded disabled:opacity-30">↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" className="px-2 py-1 border rounded disabled:opacity-30">↷ Redo</button>
          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" className="p-1.5 border rounded text-gray-500 hover:bg-gray-50">
            <Keyboard size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Units</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as DocUnit)} className="text-xs border rounded px-1.5 py-1">
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="px-2 py-1 border rounded">-</button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="px-2 py-1 border rounded">+</button>
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={exporting} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg py-1 w-40 z-10">
              <button onClick={exportAsPNG} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PNG</button>
              <button onClick={exportAsJPG} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">JPG</button>
              <button onClick={exportAsPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF</button>
            </div>
          )}
          <button onClick={saveDesign} disabled={saving} className="bg-brand-gradient text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onAddText={addText}
          onImageUpload={handleImageUpload}
          onDuplicate={duplicateSelected}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onDelete={deleteSelected}
          onOpenShapeBuilder={openShapeBuilder}
          onOpenRoadmap={(id) => setRoadmap({ open: true, id })}
        />

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', boxShadow: '0 0 0 1px #e5e7eb' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="w-64 bg-white border-l flex flex-col overflow-y-auto">
          {isPanelOpen('properties') && (
            <div className="p-3 border-b">
              <p className="font-semibold text-gray-700 mb-3 text-sm">Properties</p>
              <PropertiesPanel
                activeTool={activeTool}
                selected={selected}
                unit={unit}
                layers={layers}
                maskTargetId={maskTargetId}
                setMaskTargetId={setMaskTargetId}
                applyProp={applyProp}
                applyExactSize={applyExactSize}
                toggleLockRatio={toggleLockRatio}
                alignObject={alignObject}
                groupSelected={groupSelected}
                ungroupSelected={ungroupSelected}
                runShapeBuilder={runShapeBuilder}
                applyPathAsMask={applyPathAsMask}
                removeMask={removeMask}
                applyGradientFill={applyGradientFill}
                gradAngleRef={gradAngleRef}
                pushHistory={pushHistory}
                layerLabel={layerLabel}
              />
            </div>
          )}

          {isPanelOpen('align') && (
            <div className="border-b">
              <AlignPanel alignObject={alignObject} hasSelection={hasSelection} />
            </div>
          )}

          {isPanelOpen('layers') && (
            <LayersPanel
              layers={layers}
              selected={selected}
              onSelect={(obj) => {
                fabricCanvasRef.current.setActiveObject(obj);
                fabricCanvasRef.current.requestRenderAll();
                setSelected(obj);
              }}
              onToggleVisible={toggleVisible}
              onToggleLock={toggleLock}
              onRename={renameLayer}
              onReorder={reorderLayers}
            />
          )}
        </div>
      </div>

      {liveDim && (
        <div style={{ position: 'fixed', left: liveDim.x + 16, top: liveDim.y + 16, pointerEvents: 'none' }} className="z-50 bg-black/80 text-white text-[11px] font-mono px-2 py-1 rounded shadow">
          W: {liveDim.w} {unit}
          {liveDim.h !== '—' && <> · H: {liveDim.h} {unit}</>}
        </div>
      )}

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <RoadmapModal open={roadmap.open} highlightId={roadmap.id} onClose={() => setRoadmap({ open: false })} />
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
