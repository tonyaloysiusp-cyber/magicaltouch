'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { Editor } from '../core/Editor';
import { EditorSnapshot } from '../core/EditorState';

const SEED_COLORS = ['#e5e7eb', '#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd'];

interface Props {
  editor: Editor;
  snapshot: EditorSnapshot;
}

// Real layer CRUD — every action here calls a LayerManager method that
// goes through CommandManager, so each one is a genuine, undoable,
// correctly-labeled operation (see docs/editor-architecture.md and
// core/LayerManager.ts). No layer type beyond raster exists yet — see
// tool-capability-matrix.md for what's scheduled for later phases.
export function LayersPanel({ editor, snapshot }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const layers = editor.layerManager.layers.slice().reverse(); // top of stack shown first, matching every layer-based editor's convention

  const addLayer = () => {
    const color = SEED_COLORS[snapshot.document.layers.length % SEED_COLORS.length];
    editor.layerManager.addLayer({ fill: color });
  };

  return (
    <div className="border-b">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Layers</p>
        <button onClick={addLayer} title="Add raster layer" className="p-1 rounded hover:bg-gray-100 text-gray-600">
          <Plus size={14} />
        </button>
      </div>
      {layers.length === 0 && <p className="text-xs text-gray-400 px-3 py-4 text-center">No layers yet.</p>}
      <div className="flex flex-col">
        {layers.map((layer, i) => {
          const selected = snapshot.selectedLayerId === layer.id;
          return (
            <div
              key={layer.id}
              onClick={() => editor.selectionManager.select(layer.id)}
              className={`flex items-center gap-2 px-2 py-1.5 border-b cursor-pointer ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.layerManager.setVisible(layer.id, !layer.visible);
                }}
                className="text-gray-500 shrink-0"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-300" />}
              </button>
              <div className="w-6 h-6 rounded border shrink-0" style={{ backgroundColor: layer.fill }} title="Layer thumbnail" />
              {renamingId === layer.id ? (
                <input
                  autoFocus
                  defaultValue={layer.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    editor.layerManager.renameLayer(layer.id, e.target.value);
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="flex-1 min-w-0 text-xs border rounded px-1 py-0.5"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(layer.id);
                  }}
                  className="flex-1 min-w-0 truncate text-xs text-gray-700"
                  title="Double-click to rename"
                >
                  {layer.name}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.layerManager.setLocked(layer.id, !layer.locked);
                }}
                className="text-gray-400 shrink-0"
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
              >
                {layer.locked ? <Lock size={13} /> : <Unlock size={13} className="opacity-30" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.layerManager.reorderLayer(layer.id, 'up');
                }}
                disabled={i === 0}
                className="text-gray-400 shrink-0 disabled:opacity-20"
                title="Move up"
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.layerManager.reorderLayer(layer.id, 'down');
                }}
                disabled={i === layers.length - 1}
                className="text-gray-400 shrink-0 disabled:opacity-20"
                title="Move down"
              >
                <ChevronDown size={13} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.layerManager.deleteLayer(layer.id);
                }}
                className="text-gray-400 hover:text-red-500 shrink-0"
                title="Delete layer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
      {snapshot.selectedLayerId && (
        <div className="px-3 py-2 border-t">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>Opacity</span>
            <span>{Math.round((layers.find((l) => l.id === snapshot.selectedLayerId)?.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layers.find((l) => l.id === snapshot.selectedLayerId)?.opacity ?? 1}
            onChange={(e) => editor.layerManager.setOpacity(snapshot.selectedLayerId!, parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
