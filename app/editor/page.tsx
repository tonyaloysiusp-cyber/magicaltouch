'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

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

    const json = JSON.stringify(canvas.toJSON());
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
                historyRef.current.stack = [JSON.stringify(canvas.toJSON())];
                historyRef.current.index = 0;
                updateHistoryButtons();
              });
            }
            if (error) {
              console.error('Failed to load design:', error);
            }
          });
      } else {
        historyRef.current.stack = [JSON.stringify(canvas.toJSON())];
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      import('fabric').then((mod) => {
        mod.fabric.Image.fromURL(event.target ? (event.target.result as string) : '', function (img: any) {
          img.scaleToWidth(300);
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
      if (isMeta && e.key.toLowerCase() === 'c' && !isEditingText) {
        copySelected();
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'v' && !isEditingText) {
        pasteClipboard();
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

    const canvasJson = fabricCanvasRef.current.toJSON();

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
            className="w-full"
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
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Size ({selected.fontSize || 40})
              </label>
              <input
                type="range"
                min={8}
                max={200}
                value={selected.fontSize || 40}
                onChange={(e) => applyProp({ fontSize: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
                className="w-full"
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
                className={`flex-1 text-xs border rounded py-1 ${selected.fontWeight === 'bold' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
              >
                B
              </button>
              <button
                onClick={() => applyProp({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`flex-1 text-xs border rounded py-1 italic ${selected.fontStyle === 'italic' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
              >
                I
              </button>
              <button
                onClick={() => applyProp({ underline: !selected.underline })}
                className={`flex-1 text-xs border rounded py-1 underline ${selected.underline ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
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
                    className={`text-xs border rounded py-1 ${selected.textAlign === a ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
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
                className="w-full"
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
                className="w-full"
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
                className="w-full"
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
                  className="w-full"
                />
              </div>
            )}
          </>
        )}

        {isImage && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => applyProp({ flipX: !selected.flipX })} className="text-xs border rounded py-1 hover:bg-gray-50">
                Flip H
              </button>
              <button onClick={() => applyProp({ flipY: !selected.flipY })} className="text-xs border rounded py-1 hover:bg-gray-50">
                Flip V
              </button>
            </div>
            <p className="text-[10px] text-gray-400">Crop, filters, and masks are coming in a future update.</p>
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
          <button className="flex flex-col items-center gap-1 text-gray-700">
            <span>Select</span>
          </button>
          <button onClick={addText} className="flex flex-col items-center gap-1 text-gray-700">
            <span>Text</span>
          </button>
          <button onClick={addRect} className="flex flex-col items-center gap-1 text-gray-700">
            <span>Square</span>
          </button>
          <button onClick={addCircle} className="flex flex-col items-center gap-1 text-gray-700">
            <span>Circle</span>
          </button>
          <label className="flex flex-col items-center gap-1 text-gray-700 cursor-pointer">
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <div className="w-full h-px bg-gray-200 my-1" />

          <button onClick={duplicateSelected} title="Duplicate (Ctrl/Cmd+D)" className="flex flex-col items-center gap-1 text-gray-700">
            <span>Duplicate</span>
          </button>
          <button onClick={bringForward} title="Bring Forward (Ctrl/Cmd+])" className="flex flex-col items-center gap-1 text-gray-700">
            <span>Fwd</span>
          </button>
          <button onClick={sendBackward} title="Send Backward (Ctrl/Cmd+[)" className="flex flex-col items-center gap-1 text-gray-700">
            <span>Back</span>
          </button>
          <button onClick={bringToFront} title="Bring to Front (Ctrl/Cmd+Shift+])" className="flex flex-col items-center gap-1 text-gray-700">
            <span>Front</span>
          </button>
          <button onClick={sendToBack} title="Send to Back (Ctrl/Cmd+Shift+[)" className="flex flex-col items-center gap-1 text-gray-700">
            <span>Rear</span>
          </button>

          <button onClick={deleteSelected} className="flex flex-col items-center gap-1 text-red-400 mt-auto">
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
            <div className="flex flex-col gap-2">
              {layers.length === 0 && <p className="text-xs text-gray-400">No objects yet</p>}
              {layers.map((obj, i) => (
                <div
                  key={i}
                  onClick={() => {
                    fabricCanvasRef.current.setActiveObject(obj);
                    fabricCanvasRef.current.requestRenderAll();
                    setSelected(obj);
                  }}
                  className={`text-xs p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                    selected === obj ? 'bg-gray-100 border-gray-400' : ''
                  }`}
                >
                  {obj.type} {i + 1}
                </div>
              ))}
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
