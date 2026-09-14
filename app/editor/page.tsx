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
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Pencil,
  Check,
  GripVertical,
  Keyboard,
  X,
  PenTool,
  Minus,
  Triangle as TriangleIcon,
  Hexagon,
  Hand,
  ZoomIn,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Palette,
} from 'lucide-react';

type ToolMode = 'select' | 'pen' | 'hand' | 'zoom';

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

// ---- Keyboard shortcuts reference (single source of truth) ----
const SHORTCUTS: { keys: string; label: string }[] = [
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
  { keys: 'Escape', label: 'Deselect / cancel pen' },
  { keys: 'V', label: 'Selection tool' },
  { keys: 'P', label: 'Pen tool (click to add points, Enter to finish)' },
  { keys: 'T', label: 'Add text' },
  { keys: 'H', label: 'Hand tool (drag to pan)' },
  { keys: 'Z', label: 'Zoom tool (click, Alt+click to zoom out)' },
  { keys: 'R', label: 'Rotate selection 90° clockwise' },
  { keys: 'Shift + R', label: 'Rotate selection 90° counter-clockwise' },
  { keys: 'O', label: 'Flip selection horizontal' },
  { keys: 'Shift + O', label: 'Flip selection vertical' },
  { keys: 'G', label: 'Apply gradient fill to selection' },
  { keys: '?', label: 'Show this shortcuts panel' },
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
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);

  // Layer rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dragLayerIndex = useRef<number | null>(null);

  // ---- Tool mode (select / pen / hand / zoom) ----
  const [tool, setTool] = useState<ToolMode>('select');
  const toolRef = useRef<ToolMode>('select');
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Pen tool working state
  const penPointsRef = useRef<{ x: number; y: number }[]>([]);
  const penPreviewRef = useRef<any>(null);
  const penDotsRef = useRef<any[]>([]);
  const finishPenPathRef = useRef<() => void>(() => {});
  const cancelPenPathRef = useRef<() => void>(() => {});

  // Hand tool panning state
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  // Gradient editor state
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [gradientStart, setGradientStart] = useState('#3FA9E8');
  const [gradientEnd, setGradientEnd] = useState('#7ED33E');
  const [gradientAngle, setGradientAngle] = useState(90);

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

    const json = JSON.stringify(canvas.toJSON(['name', 'locked', 'visible']));
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
      // expose fabric globally so Cmd+A ActiveSelection construction works
< truncated lines 221-1590 >
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

      {showGradientPicker && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={() => setShowGradientPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-xs"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-gray-500" />
                <p className="font-semibold text-sm text-gray-800">Gradient fill</p>
              </div>
              <button onClick={() => setShowGradientPicker(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Start color</label>
                <input
                  type="color"
                  value={gradientStart}
                  onChange={(e) => setGradientStart(e.target.value)}
                  className="w-full h-8 border rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">End color</label>
                <input
                  type="color"
                  value={gradientEnd}
                  onChange={(e) => setGradientEnd(e.target.value)}
                  className="w-full h-8 border rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Angle ({gradientAngle}°)
                </label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={applyGradientFill}
                className="bg-brand-gradient text-white text-sm font-semibold rounded-full py-2 mt-1"
              >
                Apply gradient
              </button>
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
