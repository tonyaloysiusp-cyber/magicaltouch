'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Pencil, Check, GripVertical } from 'lucide-react';

interface Props {
  layers: any[];
  selected: any;
  onSelect: (obj: any) => void;
  onToggleVisible: (obj: any) => void;
  onToggleLock: (obj: any) => void;
  onRename: (obj: any, name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function LayersPanel({ layers, selected, onSelect, onToggleVisible, onToggleLock, onRename, onReorder }: Props) {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dragLayerIndex = useRef<number | null>(null);

  const layerLabel = (obj: any, index: number) => obj.name || `${obj.type} ${index + 1}`;

  const startRename = (obj: any, index: number) => {
    setRenamingId(index);
    setRenameValue(layerLabel(obj, index));
  };

  const commitRename = (obj: any) => {
    onRename(obj, renameValue.trim() || obj.type);
    setRenamingId(null);
  };

  return (
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
              key={obj.__uid || i}
              draggable
              onDragStart={() => (dragLayerIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragLayerIndex.current !== null && dragLayerIndex.current !== i) {
                  onReorder(dragLayerIndex.current, i);
                }
                dragLayerIndex.current = null;
              }}
              onClick={() => !isLocked && onSelect(obj)}
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
                  onToggleVisible(obj);
                }}
                className="shrink-0 text-gray-300 hover:text-gray-700"
                title={isHidden ? 'Show layer' : 'Hide layer'}
              >
                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(obj);
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
  );
}
