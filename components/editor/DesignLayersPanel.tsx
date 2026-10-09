'use client';

// Layers for the design editor: every object on the page, top first.
// Click to select, Shift/Ctrl/Cmd-click to add to the selection, drag to
// change the order, double-click a name to rename it. Groups open up to
// show what's inside them (and can be nested).

import { useRef, useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, GripVertical, Copy, Trash2, ChevronRight, Type, Image as ImageIcon, Shapes, Folder, PenTool, Brush } from 'lucide-react';
import { cx } from './shell/ui';

const BLEND_MODES: { value: string; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color dodge' },
  { value: 'color-burn', label: 'Color burn' },
  { value: 'hard-light', label: 'Hard light' },
  { value: 'soft-light', label: 'Soft light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Colour' },
  { value: 'luminosity', label: 'Luminosity' },
];

const isText = (o: any) => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');

export function layerName(o: any): string {
  if (o.name) return o.name;
  if (isText(o)) return (o.text || 'Text').split('\n')[0].slice(0, 28) || 'Text';
  if (o.type === 'image') return o.__frame?.empty ? 'Photo frame' : 'Photo';
  if (o.type === 'group') return 'Group';
  if (o.__brush) return 'Drawing';
  if (o.isVectorPath) return 'Path';
  if (o.__shape?.kind) return o.__shape.kind.replace(/([A-Z])/g, ' $1').replace(/^./, (c: string) => c.toUpperCase());
  return o.type ? o.type.charAt(0).toUpperCase() + o.type.slice(1) : 'Object';
}

function KindIcon({ o }: { o: any }) {
  const size = 13;
  if (isText(o)) return <Type size={size} />;
  if (o.type === 'image') return <ImageIcon size={size} />;
  if (o.type === 'group') return <Folder size={size} />;
  if (o.__brush) return <Brush size={size} />;
  if (o.isVectorPath) return <PenTool size={size} />;
  return <Shapes size={size} />;
}

interface Props {
  layers: any[]; // top-most first
  selection: any[]; // the selected objects (members of a multi-selection)
  onSelect: (obj: any, additive: boolean) => void;
  onToggleVisible: (obj: any) => void;
  onToggleLock: (obj: any) => void;
  onRename: (obj: any, name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDuplicate: (obj: any) => void;
  onDelete: (obj: any) => void;
  onOpacityChange: (obj: any, opacity: number, commit: boolean) => void;
  onBlendModeChange: (obj: any, mode: string) => void;
  getThumbnail: (obj: any) => string | null;
}

export function DesignLayersPanel(p: Props) {
  const [renaming, setRenaming] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  const [open, setOpen] = useState<WeakSet<any>>(() => new WeakSet());
  const [, force] = useState(0);
  const dragFrom = useRef<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const focused = p.selection.length === 1 ? p.selection[0] : null;

  const commitRename = (obj: any) => {
    const v = renameValue.trim();
    if (v && v !== layerName(obj)) p.onRename(obj, v);
    setRenaming(null);
  };
  const toggleOpen = (obj: any) => {
    const next = new WeakSet(open as any);
    if (open.has(obj)) next.delete(obj);
    else next.add(obj);
    setOpen(next);
    force((n) => n + 1);
  };

  const row = (obj: any, depth: number, index: number | null) => {
    const isLocked = !!obj.locked;
    const isHidden = obj.visible === false;
    const isSelected = p.selection.includes(obj);
    const isGroup = obj.type === 'group' && obj.getObjects;
    const expanded = isGroup && open.has(obj);
    const thumb = depth === 0 ? p.getThumbnail(obj) : null;
    const topLevel = index !== null;
    return (
      <li key={obj.__uid || `${depth}-${index}-${layerName(obj)}`}>
        <div
          draggable={topLevel && renaming !== obj}
          onDragStart={() => topLevel && (dragFrom.current = index)}
          onDragOver={(e) => {
            if (!topLevel || dragFrom.current === null) return;
            e.preventDefault();
            setDropAt(index);
          }}
          onDragLeave={() => setDropAt(null)}
          onDrop={() => {
            if (topLevel && dragFrom.current !== null && dragFrom.current !== index) p.onReorder(dragFrom.current, index!);
            dragFrom.current = null;
            setDropAt(null);
          }}
          onDragEnd={() => {
            dragFrom.current = null;
            setDropAt(null);
          }}
          className={cx(
            'group flex items-center gap-1.5 h-10 pr-1 rounded-lg border text-[13px] transition-colors',
            isSelected ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-ink hover:bg-mt-surface2',
            isHidden && 'opacity-50',
            dropAt === index && dragFrom.current !== index && 'ring-2 ring-[#8CCBFF]'
          )}
          style={{ paddingLeft: 4 + depth * 16 }}
        >
          {topLevel ? (
            <span className="text-mt-faint cursor-grab shrink-0" title="Drag to change the order" aria-hidden>
              <GripVertical size={13} />
            </span>
          ) : (
            <span className="w-[13px] shrink-0" />
          )}
          {isGroup ? (
            <button type="button" onClick={() => toggleOpen(obj)} aria-label={expanded ? 'Hide what’s in the group' : 'Show what’s in the group'} aria-expanded={expanded} className="shrink-0 h-6 w-5 inline-flex items-center justify-center text-mt-muted hover:text-mt-ink">
              <ChevronRight size={13} className={cx('transition-transform', expanded && 'rotate-90')} />
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className="shrink-0 w-7 h-7 rounded-md border border-mt-border overflow-hidden inline-flex items-center justify-center text-mt-muted bg-[repeating-conic-gradient(#e5e7eb_0_25%,white_0_50%)] bg-[length:8px_8px]">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="bg-mt-surface w-full h-full inline-flex items-center justify-center">
                <KindIcon o={obj} />
              </span>
            )}
          </span>
          {renaming === obj ? (
            <input
              autoFocus
              value={renameValue}
              aria-label="Layer name"
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(obj)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(obj);
                if (e.key === 'Escape') setRenaming(null);
                e.stopPropagation();
              }}
              className="flex-1 min-w-0 h-7 rounded-md border border-mt-input-border bg-mt-surface px-1.5 text-[13px]"
            />
          ) : (
            <button
              type="button"
              onClick={(e) => topLevel && p.onSelect(obj, e.shiftKey || e.metaKey || e.ctrlKey)}
              onDoubleClick={() => {
                setRenaming(obj);
                setRenameValue(layerName(obj));
              }}
              title={topLevel ? 'Click to select · Shift-click to add · Double-click to rename' : 'Double-click to rename'}
              className="flex-1 min-w-0 h-full text-left truncate focus-visible:outline-none focus-visible:underline"
            >
              {layerName(obj)}
            </button>
          )}
          <button type="button" onClick={() => p.onToggleVisible(obj)} aria-label={isHidden ? 'Show' : 'Hide'} title={isHidden ? 'Show' : 'Hide'} className={cx('shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-mt-muted hover:text-mt-ink', !isHidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button type="button" onClick={() => p.onToggleLock(obj)} aria-label={isLocked ? 'Unlock' : 'Lock'} title={isLocked ? 'Unlock' : 'Lock'} className={cx('shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-mt-muted hover:text-mt-ink', !isLocked && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
        {expanded && (
          <ul>
            {obj
              .getObjects()
              .slice()
              .reverse()
              .map((child: any) => row(child, depth + 1, null))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-mt-ink text-sm">Layers</p>
        <span className="text-[11px] text-mt-faint">{p.layers.length} on this design</span>
      </div>
      {p.layers.length === 0 ? (
        <p className="text-xs text-mt-faint py-6 text-center">Nothing here yet. Add text, a photo or a shape and it appears here.</p>
      ) : (
        <ul className="flex flex-col gap-0.5" aria-label="Layers, top first">
          {p.layers.map((obj, i) => row(obj, 0, i))}
        </ul>
      )}

      {focused && p.layers.includes(focused) && (
        <div className="mt-3 border-t border-mt-border pt-3 flex flex-col gap-2.5">
          <p className="text-[12px] font-semibold text-mt-ink truncate">{layerName(focused)}</p>
          <label className="block text-xs text-mt-muted">
            <span className="flex justify-between">
              <span>Opacity</span>
              <span className="tabular-nums text-mt-ink">{Math.round((focused.opacity ?? 1) * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((focused.opacity ?? 1) * 100)}
              onChange={(e) => p.onOpacityChange(focused, Number(e.target.value) / 100, false)}
              onPointerUp={(e) => p.onOpacityChange(focused, Number((e.target as HTMLInputElement).value) / 100, true)}
              onKeyUp={(e) => p.onOpacityChange(focused, Number((e.target as HTMLInputElement).value) / 100, true)}
              className="w-full accent-[#3B82C4]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-mt-muted">
            Blend
            <select
              value={focused.globalCompositeOperation && focused.globalCompositeOperation !== 'source-over' ? focused.globalCompositeOperation : 'normal'}
              onChange={(e) => p.onBlendModeChange(focused, e.target.value)}
              className="h-8 flex-1 max-w-[150px] rounded-lg border border-mt-input-border bg-mt-surface px-1.5 text-xs text-mt-ink"
            >
              {BLEND_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => p.onDuplicate(focused)} className="flex-1 h-8 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5 hover:bg-mt-surface2">
              <Copy size={13} /> Duplicate
            </button>
            <button type="button" onClick={() => p.onDelete(focused)} disabled={!!focused.locked} className="flex-1 h-8 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5 hover:text-red-600 disabled:opacity-40">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
