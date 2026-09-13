'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  MousePointer2,
  Type,
  Square,
  Circle as CircleIcon,
  ImagePlus,
  Copy,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Trash2,
  Undo2,
  Redo2,
  Minus,
  Plus,
  Maximize,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  FlipHorizontal2,
  FlipVertical2,
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

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModRef = useRef<any>(null); // cached `fabric` module, loaded once
  const [zoom, setZoom] = useState(50);
  const [layers, setLayers] = useState<any[]>([]);
  const [designName, setDesignName] = useState('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);

  const historyRef = useRef<{ stack: string[]; index: number; suspend: boolean }>({
    stack: [],
    index: -1,
    suspend: false,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const clipboardRef = useRef<any>(null);
  const dragIndexRef = useRef<number | null>(null);

  const width = parseInt(searchParams.get('w') || '1080');
  const height = parseInt(searchParams.get('h') || '1080');
  const urlDesignId = searchParams.get('designId');

  const refreshLayers = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setLayers(canvas.getObjects().slice().reverse());
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

    const json = JSON.stringify(canvas.toJSON(['selectable', 'evented', 'visible']));
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

  useEffect(() => {
    import('fabric').then((mod) => {
      fabricModRef.current = mod;
      const canvas = new mod.fabric.Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: '#ffffff',
      });
      fabricCanvasRef.current = canvas;

      const onLayersChanged = () => refreshLayers();
      const onHistoryChanged = () => pushHistory();

      canvas.on('object:added', onLayersChanged);
      canvas.on('object:removed', onLayersChanged);
      canvas.on('object:modified', onHistoryChanged);
      canvas.on('object:added', onHistoryChanged);
      canvas.on('object:removed', onHistoryChanged);

      canvas.on('selection:created', (e: any) => setSelected(e.selected ? canvas.getActiveObject() : null));
      canvas.on('selection:updated', (e: any) => setSelected(e.selected ? canvas.getActiveObject() : null));
      canvas.on('selection:cleared', () => setSelected(null));
      canvas.on('object:scaling', () => bumpSel());
      canvas.on('object:moving', () => bumpSel());

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
                historyRef.current.stack = [JSON.stringify(canvas.toJSON(['selectable', 'evented', 'visible']))];
                historyRef.current.index = 0;
                updateHistoryButtons();
              });
            }
            if (error) {
              console.error('Failed to load design:', error);
            }
          });
      } else {
        historyRef.current.stack = [JSON.stringify(canvas.toJSON(['selectable', 'evented', 'visible']))];
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

  // ---- Fit-to-screen zoom (approximate, based on the visible canvas area) ----
  const fitToScreen = () => {
    const containerW = window.innerWidth - 80 - 256 - 64; // toolbar + panel + padding, approx
    const containerH = window.innerHeight - 56 - 64; // topbar + padding, approx
    const fitScale = Math.min(containerW / width, containerH / height, 2);
    setZoom(Math.max(10, Math.round(fitScale * 100)));
  };

  const addText = () => {
    const fabric = fabricModRef.current.fabric;
    const text = new fabric.IText('Double-click to edit', {
      left: width / 2 - 100,
      top: height / 2 - 20,
      fontSize: 40,
      fill: '#1A1A1A',
      fontFamily: 'Arial',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const addRect = () => {
    const fabric = fabricModRef.current.fabric;
    const rect = new fabric.Rect({
      left: width / 2 - 75,
      top: height / 2 - 75,
      width: 150,
      height: 150,
      fill: '#3FA9E8',
    });
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
  };

  const addCircle = () => {
    const fabric = fabricModRef.current.fabric;
    const circle = new fabric.Circle({
      left: width / 2 - 75,
      top: height / 2 - 75,
      radius: 75,
      fill: '#7ED33E',
    });
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const fabric = fabricModRef.current.fabric;
      fabric.Image.fromURL(event.target ? (event.target.result as string) : '', function (img: any) {
        img.scaleToWidth(300);
        // Pre-attach four adjustment filter slots (brightness, contrast, saturation, hue)
        img.filters = [
          new fabric.Image.filters.Brightness({ brightness: 0 }),
          new fabric.Image.filters.Contrast({ contrast: 0 }),
          new fabric.Image.filters.Saturation({ saturation: 0 }),
          new fabric.Image.filters.HueRotation({ rotation: 0 }),
        ];
        img.applyFilters();
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
      active.forEachObject((obj: any) => canvas.remove(obj));
      canvas.discardActiveObject();
    } else {
      canvas.remove(active);
    }
    canvas.requestRenderAll();
  };

  const duplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone((cloned: any) => {
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

  // ---- Layer ordering ----
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

  // ---- Group / Ungroup ----
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

  // ---- Alignment (relative to canvas) ----
  const alignObject = (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
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

  // ---- Generic property setter used by the Properties Panel ----
  const applyProp = (props: Record<string, any>, record = true) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.set(props);
    active.setCoords();
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();
  };

  // ---- Image adjustment (brightness / contrast / saturation / hue) ----
  // Filter slots are fixed: 0=Brightness, 1=Contrast, 2=Saturation, 3=HueRotation
  const applyImageFilter = (slot: number, value: number, record = false) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    const fabric = fabricModRef.current.fabric;
    if (!active || active.type !== 'image') return;

    if (!active.filters || active.filters.length < 4) {
      active.filters = [
        new fabric.Image.filters.Brightness({ brightness: 0 }),
        new fabric.Image.filters.Contrast({ contrast: 0 }),
        new fabric.Image.filters.Saturation({ saturation: 0 }),
        new fabric.Image.filters.HueRotation({ rotation: 0 }),
      ];
    }

    if (slot === 0) active.filters[0] = new fabric.Image.filters.Brightness({ brightness: value });
    if (slot === 1) active.filters[1] = new fabric.Image.filters.Contrast({ contrast: value });
    if (slot === 2) active.filters[2] = new fabric.Image.filters.Saturation({ saturation: value });
    if (slot === 3) active.filters[3] = new fabric.Image.filters.HueRotation({ rotation: value });

    active.applyFilters();
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();
  };

  const getFilterValue = (slot: number): number => {
    if (!selected || !selected.filters || !selected.filters[slot]) return 0;
    const f = selected.filters[slot];
    if (slot === 0) return f.brightness || 0;
    if (slot === 1) return f.contrast || 0;
    if (slot === 2) return f.saturation || 0;
    if (slot === 3) return f.rotation || 0;
    return 0;
  };

  const resetImageAdjustments = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    const fabric = fabricModRef.current.fabric;
    if (!active || active.type !== 'image') return;
    active.filters = [
      new fabric.Image.filters.Brightness({ brightness: 0 }),
      new fabric.Image.filters.Contrast({ contrast: 0 }),
      new fabric.Image.filters.Saturation({ saturation: 0 }),
      new fabric.Image.filters.HueRotation({ rotation: 0 }),
    ];
    active.applyFilters();
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  // ---- Layer visibility / lock ----
  const toggleLayerVisibility = (obj: any) => {
    obj.set({ visible: !obj.visible });
    fabricCanvasRef.current.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  const toggleLayerLock = (obj: any) => {
    const locked = obj.selectable === false;
    obj.set({ selectable: locked, evented: locked, hasControls: locked });
    if (!locked && fabricCanvasRef.current.getActiveObject() === obj) {
      fabricCanvasRef.current.discardActiveObject();
      setSelected(null);
    }
    fabricCanvasRef.current.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  // ---- Layer reordering via drag and drop in the panel ----
  const handleLayerDrop = (dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const canvas = fabricCanvasRef.current;
    const newLayers = [...layers];
    const [moved] = newLayers.splice(dragIndex, 1);
    newLayers.splice(dropIndex, 0, moved);

    // `layers` is displayed top-first; fabric's internal stack is bottom-first.
    const newStackOrder = newLayers.slice().reverse();
    canvas._objects = newStackOrder;
    canvas.requestRenderAll();
    setLayers(newLayers);
    pushHistory();
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const isMeta = e.ctrlKey || e.metaKey;
      const active = canvas.getActiveObject();
      const isEditingText = active && active.isEditing;

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
        const objs = canvas.getObjects();
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
        canvas.requestRenderAll();
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
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

      if (!isEditingText && active && e.key.startsWith('Arrow')) {
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
  }, [undo, redo]);

  const saveDesign = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to save a design.');
      setSaving(false);
      return;
    }

    const canvasJson = fabricCanvasRef.current.toJSON(['selectable', 'evented', 'visible']);

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

  // ---- Properties Panel renderer ----
  const renderPropertiesPanel = () => {
    if (!selected) {
      return <p className="text-xs text-gray-400">Select an object to edit its properties.</p>;
    }

    const isMultiple = selected.type === 'activeSelection';
    const isText = selected.type === 'i-text' || selected.type === 'text' || selected.type === 'textbox';
    const isImage = selected.type === 'image';
    const isGroup = selected.type === 'group';
    const hasFillStroke = !isImage;

    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Align to Canvas</p>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => alignObject('left')} className="text-xs border rounded py-1 hover:bg-purple-50">⟸</button>
            <button onClick={() => alignObject('centerH')} className="text-xs border rounded py-1 hover:bg-purple-50">↔</button>
            <button onClick={() => alignObject('right')} className="text-xs border rounded py-1 hover:bg-purple-50">⟹</button>
            <button onClick={() => alignObject('top')} className="text-xs border rounded py-1 hover:bg-purple-50">⟰</button>
            <button onClick={() => alignObject('centerV')} className="text-xs border rounded py-1 hover:bg-purple-50">↕</button>
            <button onClick={() => alignObject('bottom')} className="text-xs border rounded py-1 hover:bg-purple-50">⟱</button>
          </div>
        </div>

        {isMultiple && (
          <button onClick={groupSelected} className="flex items-center justify-center gap-2 text-xs border rounded py-2 hover:bg-purple-50">
            <GroupIcon size={14} /> Group Selection
          </button>
        )}
        {isGroup && (
          <button onClick={ungroupSelected} className="flex items-center justify-center gap-2 text-xs border rounded py-2 hover:bg-purple-50">
            <UngroupIcon size={14} /> Ungroup
          </button>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            Opacity ({Math.round((selected.opacity ?? 1) * 100)}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((selected.opacity ?? 1) * 100)}
            onChange={(e) => applyProp({ opacity: Number(e.target.value) / 100 }, false)}
            onMouseUp={() => pushHistory()}
            className="w-full accent-purple-500"
          />
        </div>

        {isText && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Font</label>
              <select
                value={selected.fontFamily || 'Arial'}
                onChange={(e) => applyProp({ fontFamily: e.target.value })}
                className="w-full text-xs border rounded px-2 py-1"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Size ({selected.fontSize || 40})</label>
              <input
                type="range"
                min={8}
                max={200}
                value={selected.fontSize || 40}
                onChange={(e) => applyProp({ fontSize: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Color</label>
              <input
                type="color"
                value={selected.fill || '#000000'}
                onChange={(e) => applyProp({ fill: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer"
              />
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => applyProp({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`flex-1 text-xs border rounded py-1 ${selected.fontWeight === 'bold' ? 'bg-purple-100 border-purple-400' : 'hover:bg-purple-50'}`}
              >
                B
              </button>
              <button
                onClick={() => applyProp({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`flex-1 text-xs border rounded py-1 italic ${selected.fontStyle === 'italic' ? 'bg-purple-100 border-purple-400' : 'hover:bg-purple-50'}`}
              >
                I
              </button>
              <button
                onClick={() => applyProp({ underline: !selected.underline })}
                className={`flex-1 text-xs border rounded py-1 underline ${selected.underline ? 'bg-purple-100 border-purple-400' : 'hover:bg-purple-50'}`}
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
                    onClick={() => applyProp({ textAlign: a })}
                    className={`text-xs border rounded py-1 ${selected.textAlign === a ? 'bg-purple-100 border-purple-400' : 'hover:bg-purple-50'}`}
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
                value={selected.charSpacing || 0}
                onChange={(e) => applyProp({ charSpacing: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full accent-purple-500"
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
                value={selected.lineHeight || 1.16}
                onChange={(e) => applyProp({ lineHeight: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full accent-purple-500"
              />
            </div>
          </>
        )}

        {!isText && !isImage && hasFillStroke && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Fill Color</label>
              <input
                type="color"
                value={typeof selected.fill === 'string' ? selected.fill : '#000000'}
                onChange={(e) => applyProp({ fill: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Stroke Color</label>
              <input
                type="color"
                value={selected.stroke || '#000000'}
                onChange={(e) => applyProp({ stroke: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer"
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
                value={selected.strokeWidth || 0}
                onChange={(e) => applyProp({ strokeWidth: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full accent-purple-500"
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
                  value={selected.rx || 0}
                  onChange={(e) => applyProp({ rx: Number(e.target.value), ry: Number(e.target.value) }, false)}
                  onMouseUp={() => pushHistory()}
                  className="w-full accent-purple-500"
                />
              </div>
            )}
          </>
        )}

        {isImage && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => applyProp({ flipX: !selected.flipX })}
                className="flex items-center justify-center gap-1 text-xs border rounded py-1 hover:bg-purple-50"
              >
                <FlipHorizontal2 size={14} /> Flip H
              </button>
              <button
                onClick={() => applyProp({ flipY: !selected.flipY })}
                className="flex items-center justify-center gap-1 text-xs border rounded py-1 hover:bg-purple-50"
              >
                <FlipVertical2 size={14} /> Flip V
              </button>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500">Adjust</p>
                <button onClick={resetImageAdjustments} className="text-[10px] text-purple-600 hover:underline">
                  Reset
                </button>
              </div>

              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Brightness ({getFilterValue(0).toFixed(2)})
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={getFilterValue(0)}
                onChange={(e) => applyImageFilter(0, Number(e.target.value), false)}
                onMouseUp={() => applyImageFilter(0, getFilterValue(0), true)}
                className="w-full accent-purple-500 mb-3"
              />

              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Contrast ({getFilterValue(1).toFixed(2)})
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={getFilterValue(1)}
                onChange={(e) => applyImageFilter(1, Number(e.target.value), false)}
                onMouseUp={() => applyImageFilter(1, getFilterValue(1), true)}
                className="w-full accent-purple-500 mb-3"
              />

              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Saturation ({getFilterValue(2).toFixed(2)})
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={getFilterValue(2)}
                onChange={(e) => applyImageFilter(2, Number(e.target.value), false)}
                onMouseUp={() => applyImageFilter(2, getFilterValue(2), true)}
                className="w-full accent-purple-500 mb-3"
              />

              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Hue ({getFilterValue(3).toFixed(2)})
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={getFilterValue(3)}
                onChange={(e) => applyImageFilter(3, Number(e.target.value), false)}
                onMouseUp={() => applyImageFilter(3, getFilterValue(3), true)}
                className="w-full accent-purple-500"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  // ---- Icon-based toolbox ----
  const ToolButton = ({
    icon,
    label,
    onClick,
    disabled,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {icon}
    </button>
  );

  const layerIcon = (type: string) => {
    if (type === 'i-text' || type === 'text' || type === 'textbox') return <Type size={14} />;
    if (type === 'rect') return <Square size={14} />;
    if (type === 'circle') return <CircleIcon size={14} />;
    if (type === 'image') return <ImagePlus size={14} />;
    if (type === 'group' || type === 'activeSelection') return <GroupIcon size={14} />;
    return <Square size={14} />;
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

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl/Cmd+Z)"
            className="w-9 h-9 flex items-center justify-center rounded-lg border disabled:opacity-30 hover:bg-purple-50"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            className="w-9 h-9 flex items-center justify-center rounded-lg border disabled:opacity-30 hover:bg-purple-50"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="w-9 h-9 flex items-center justify-center border rounded-lg hover:bg-purple-50">
            <Minus size={14} />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="w-9 h-9 flex items-center justify-center border rounded-lg hover:bg-purple-50">
            <Plus size={14} />
          </button>
          <button onClick={() => setZoom(100)} title="Actual Size (100%)" className="text-xs border rounded-lg px-2 h-9 hover:bg-purple-50">
            100%
          </button>
          <button onClick={fitToScreen} title="Fit to Screen" className="w-9 h-9 flex items-center justify-center border rounded-lg hover:bg-purple-50">
            <Maximize size={14} />
          </button>
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
        {/* Icon toolbox */}
        <div className="w-16 bg-white border-r flex flex-col items-center py-3 gap-1 overflow-y-auto">
          <ToolButton icon={<MousePointer2 size={18} />} label="Select" onClick={() => fabricCanvasRef.current?.discardActiveObject()} />
          <ToolButton icon={<Type size={18} />} label="Add Text" onClick={addText} />
          <ToolButton icon={<Square size={18} />} label="Add Square" onClick={addRect} />
          <ToolButton icon={<CircleIcon size={18} />} label="Add Circle" onClick={addCircle} />

          <label
            title="Upload Image"
            className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-600 cursor-pointer transition-colors"
          >
            <ImagePlus size={18} />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <div className="w-8 h-px bg-gray-200 my-2" />

          <ToolButton icon={<Copy size={18} />} label="Duplicate (Cmd+D)" onClick={duplicateSelected} />
          <ToolButton icon={<ArrowUpToLine size={18} />} label="Bring to Front" onClick={bringToFront} />
          <ToolButton icon={<ArrowUp size={18} />} label="Bring Forward" onClick={bringForward} />
          <ToolButton icon={<ArrowDown size={18} />} label="Send Backward" onClick={sendBackward} />
          <ToolButton icon={<ArrowDownToLine size={18} />} label="Send to Back" onClick={sendToBack} />

          <div className="mt-auto" />
          <ToolButton icon={<Trash2 size={18} className="text-red-400" />} label="Delete" onClick={deleteSelected} />
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

        {/* Right panel: Properties + Layers */}
        <div className="w-72 bg-white border-l flex flex-col overflow-y-auto">
          <div className="p-3 border-b">
            <p className="font-semibold text-gray-700 mb-3 text-sm">Properties</p>
            {renderPropertiesPanel()}
          </div>

          <div className="p-3">
            <p className="font-semibold text-gray-700 mb-3 text-sm">Layers</p>
            <div className="flex flex-col gap-1">
              {layers.length === 0 && <p className="text-xs text-gray-400">No objects yet</p>}
              {layers.map((obj, i) => {
                const isLocked = obj.selectable === false;
                const isHidden = obj.visible === false;
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => (dragIndexRef.current = i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleLayerDrop(i)}
                    onClick={() => {
                      if (isLocked) return;
                      fabricCanvasRef.current.setActiveObject(obj);
                      fabricCanvasRef.current.requestRenderAll();
                      setSelected(obj);
                    }}
                    className={`flex items-center gap-2 text-xs p-2 border rounded cursor-pointer hover:bg-purple-50 ${
                      selected === obj ? 'bg-purple-50 border-purple-400' : ''
                    }`}
                  >
                    <GripVertical size={12} className="text-gray-300 shrink-0 cursor-grab" />
                    <span className="text-gray-500 shrink-0">{layerIcon(obj.type)}</span>
                    <span className="flex-1 truncate">
                      {obj.type} {layers.length - i}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(obj);
                      }}
                      className="text-gray-400 hover:text-purple-600 shrink-0"
                      title={isHidden ? 'Show' : 'Hide'}
                    >
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerLock(obj);
                      }}
                      className="text-gray-400 hover:text-purple-600 shrink-0"
                      title={isLocked ? 'Unlock' : 'Lock'}
                    >
                      {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
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
