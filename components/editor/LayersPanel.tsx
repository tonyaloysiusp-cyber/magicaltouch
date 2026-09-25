'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Pencil, Check, GripVertical, Copy, Trash2 } from 'lucide-react';

interface Props {
  layers: any[];
  selected: any;
  onSelect: (obj: any) => void;
  onToggleVisible: (obj: any) => void;
  onToggleLock: (obj: any) => void;
  onRename: (obj: any, name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  // Optional, additive extras used by the Photo Editor's layer stack
  // (real raster layers with opacity/duplicate/delete/a live thumbnail) —
  // all opt-in so Main Design's existing vector/text/shape layers list
  // keeps behaving exactly as before when these are omitted.
  onOpacityChange?: (obj: any, opacity: number) => void;
  onDuplicate?: (obj: any) => void;
  onDelete?: (obj: any) => void;
  getThumbnail?: (obj: any) => string | null;
}

export function LayersPanel({
  layers,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRename,
  onReorder,
  onOpacityChange,
  onDuplicate,
  onDelete,
  getThumbnail,
}: Props) {
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
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Layers</p>
      <div className="flex flex-col gap-1">
        {layers.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">No objects yet</p>}
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
              className={`flex flex-col gap-1 text-xs p-1.5 border dark:border-[#3A3A3A] rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333333] text-gray-800 dark:text-gray-200 ${
                isSelectedLayer ? 'bg-gray-100 dark:bg-[#3A3A3A] border-gray-400 dark:border-gray-500' : ''
              } ${isHidden ? 'opacity-40' : ''}`}
            >
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0">
                <GripVertical size={12} />
              </span>

              {getThumbnail && (
                <span className="shrink-0 w-6 h-6 rounded border bg-[repeating-conic-gradient(#e5e7eb_0_25%,white_0_50%)] bg-[length:8px_8px] overflow-hidden">
                  {getThumbnail(obj) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getThumbnail(obj) as string} alt="" className="w-full h-full object-cover" />
                  )}
                </span>
              )}

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
                  className="flex-1 min-w-0 border rounded px-1 py-0.5 text-xs dark:bg-[#2B2B2B] dark:border-[#3A3A3A] dark:text-gray-100"
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
                  className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
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
                  className="shrink-0 text-gray-300 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
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
                className="shrink-0 text-gray-300 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                title={isHidden ? 'Show layer' : 'Hide layer'}
              >
                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(obj);
                }}
                className="shrink-0 text-gray-300 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                title={isLocked ? 'Unlock layer' : 'Lock layer'}
              >
                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>

              {onDuplicate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(obj);
                  }}
                  className="shrink-0 text-gray-300 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Duplicate layer"
                >
                  <Copy size={12} />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(obj);
                  }}
                  className="shrink-0 text-red-300 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400"
                  title="Delete layer"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {onOpacityChange && (
              <div className="flex items-center gap-1.5 pl-[26px]" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 shrink-0">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((obj.opacity ?? 1) * 100)}
                  onChange={(e) => onOpacityChange(obj, Number(e.target.value) / 100)}
                  className="flex-1"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 w-7 text-right shrink-0">{Math.round((obj.opacity ?? 1) * 100)}%</span>
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
