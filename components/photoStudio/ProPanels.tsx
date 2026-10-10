'use client';

// Photo Studio Pro chrome: a desktop-style menu bar (File, Edit, Image,
// Layer, Select, Filter, View, Window), the Layers panel and the History
// panel. Kept plain and labelled so first-time users can find things.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Plus, Copy, Trash2, ChevronUp, ChevronDown, Layers as LayersIcon, History as HistoryIcon, Merge, Check } from 'lucide-react';
import { BLENDS, Blend, Layer, layerThumb } from '@/lib/photo/layers';

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export type MenuItem =
  | { sep: true }
  | { label: string; onClick: () => void; shortcut?: string; disabled?: boolean; checked?: boolean; hint?: string };

export interface Menu { label: string; items: MenuItem[] }

export function ProMenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} role="menubar" aria-label="Photo menu" className="h-9 shrink-0 flex items-center gap-0.5 px-2 border-b border-mt-border bg-mt-surface text-[12.5px] overflow-x-auto mt-scroll">
      {menus.map((m, i) => (
        <div key={m.label} className="relative">
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            onPointerEnter={() => open !== null && setOpen(i)}
            className={cx('h-7 px-2.5 rounded-md font-medium', open === i ? 'bg-mt-surface2 text-mt-ink' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2')}
          >
            {m.label}
          </button>
          {open === i && (
            <div role="menu" className="fixed z-[80] mt-1 min-w-[230px] rounded-xl border border-mt-border bg-mt-surface shadow-xl py-1.5" style={{ left: ref.current ? (ref.current.children[i] as HTMLElement).getBoundingClientRect().left : 0, top: ref.current ? ref.current.getBoundingClientRect().bottom : 0 }}>
              {m.items.map((it, k) =>
                'sep' in it ? (
                  <div key={k} className="my-1 h-px bg-mt-border" />
                ) : (
                  <button
                    key={k}
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.hint}
                    onClick={() => { setOpen(null); it.onClick(); }}
                    className="w-full flex items-center gap-2 px-3 h-8 text-left text-[12.5px] text-mt-ink hover:bg-mt-surface2 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <span className="w-4 shrink-0">{it.checked && <Check size={13} />}</span>
                    <span className="flex-1">{it.label}</span>
                    {it.shortcut && <span className="text-[11px] text-mt-faint tabular-nums">{it.shortcut}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Thumb({ canvas }: { canvas: HTMLCanvasElement }) {
  const url = useMemo(() => layerThumb(canvas, 44), [canvas]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-11 h-11 object-contain rounded border border-mt-border bg-mt-surface2 shrink-0" />;
}

export function LayersPanel({ layers, active, onSelect, onToggle, onRename, onOpacity, onBlend, onAdd, onPlace, onDuplicate, onDelete, onUp, onDown, onMerge, onFlatten }: {
  layers: Layer[];
  active: number;
  onSelect: (i: number) => void;
  onToggle: (i: number) => void;
  onRename: (i: number, name: string) => void;
  onOpacity: (i: number, v: number) => void;
  onBlend: (i: number, b: Blend) => void;
  onAdd: () => void;
  onPlace: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
  onMerge: () => void;
  onFlatten: () => void;
}) {
  const cur = layers[active];
  const [op, setOp] = useState(Math.round(cur.opacity * 100));
  useEffect(() => setOp(Math.round(cur.opacity * 100)), [cur.opacity, active]);
  const [editing, setEditing] = useState<number | null>(null);
  const ib = 'h-8 w-8 rounded-lg inline-flex items-center justify-center text-mt-ink hover:bg-mt-surface2 disabled:opacity-30';
  return (
    <section className="py-3 border-t border-mt-border" aria-label="Layers">
      <div className="flex items-center justify-between mb-2">
        <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint"><LayersIcon size={13} /> Layers</h3>
        <span className="text-[11px] text-mt-faint">{layers.length}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
        <select aria-label="Blend mode" value={cur.blend} onChange={(e) => onBlend(active, e.target.value as Blend)} className="h-8 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-[12px] text-mt-ink">
          {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-mt-muted">
          Opacity
          <input
            type="number" min={0} max={100} value={op} aria-label="Layer opacity"
            onChange={(e) => setOp(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            onBlur={() => op !== Math.round(cur.opacity * 100) && onOpacity(active, op / 100)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="h-8 w-14 rounded-lg border border-mt-input-border bg-mt-surface px-1.5 text-[12px] text-mt-ink tabular-nums"
          />
        </label>
      </div>
      <input type="range" min={0} max={100} value={op} aria-label="Layer opacity slider" onChange={(e) => setOp(Number(e.target.value))} onPointerUp={() => onOpacity(active, op / 100)} onKeyUp={() => onOpacity(active, op / 100)} className="mt-range w-full mb-2" />
      <ul className="flex flex-col gap-1 max-h-[260px] overflow-y-auto mt-scroll" role="listbox" aria-label="Layer list">
        {layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
          <li key={l.id} role="option" aria-selected={i === active}
            onClick={() => onSelect(i)}
            className={cx('flex items-center gap-2 rounded-lg px-1.5 py-1 cursor-pointer border', i === active ? 'border-[#3B82C4] bg-[#3B82C4]/10' : 'border-transparent hover:bg-mt-surface2')}
          >
            <button className={ib} aria-label={l.visible ? 'Hide layer' : 'Show layer'} onClick={(e) => { e.stopPropagation(); onToggle(i); }}>
              {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-mt-faint" />}
            </button>
            <Thumb canvas={l.canvas} />
            {editing === i ? (
              <input
                autoFocus defaultValue={l.name} aria-label="Layer name"
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => { setEditing(null); const v = e.target.value.trim(); if (v && v !== l.name) onRename(i, v); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
                className="flex-1 min-w-0 h-7 rounded border border-mt-input-border bg-mt-surface px-1.5 text-[12px]"
              />
            ) : (
              <span className="flex-1 min-w-0 truncate text-[12.5px]" onDoubleClick={(e) => { e.stopPropagation(); setEditing(i); }} title="Double-click to rename">
                {l.name}
                {(l.opacity < 1 || l.blend !== 'normal') && <span className="block text-[10.5px] text-mt-faint">{Math.round(l.opacity * 100)}% · {BLENDS.find((b) => b.id === l.blend)?.label}</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-0.5">
        <button className={ib} onClick={onAdd} title="New empty layer" aria-label="New layer"><Plus size={15} /></button>
        <button className={cx(ib, 'w-auto px-2 text-[11.5px] font-medium')} onClick={onPlace} title="Add a picture as a new layer">+ Image</button>
        <button className={ib} onClick={onDuplicate} title="Duplicate layer" aria-label="Duplicate layer"><Copy size={14} /></button>
        <button className={ib} onClick={onUp} disabled={active >= layers.length - 1} title="Move up" aria-label="Move layer up"><ChevronUp size={15} /></button>
        <button className={ib} onClick={onDown} disabled={active <= 0} title="Move down" aria-label="Move layer down"><ChevronDown size={15} /></button>
        <button className={ib} onClick={onMerge} disabled={active <= 0} title="Merge down" aria-label="Merge down"><Merge size={14} /></button>
        <span className="flex-1" />
        <button className={ib} onClick={onDelete} disabled={layers.length < 2} title="Delete layer" aria-label="Delete layer"><Trash2 size={14} /></button>
      </div>
      {layers.length > 1 && <button className="mt-1 text-[11.5px] text-mt-muted hover:text-mt-ink" onClick={onFlatten}>Flatten image</button>}
    </section>
  );
}

export function HistoryPanel({ labels, index, onJump }: { labels: string[]; index: number; onJump: (i: number) => void }) {
  const endRef = useRef<HTMLLIElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [index]);
  return (
    <section className="py-3 border-t border-mt-border" aria-label="History">
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint"><HistoryIcon size={13} /> History</h3>
      <ol className="flex flex-col max-h-[200px] overflow-y-auto mt-scroll">
        {labels.map((l, i) => (
          <li key={i} ref={i === index ? endRef : undefined}>
            <button onClick={() => onJump(i)} className={cx('w-full text-left px-2 h-7 rounded-md text-[12px]', i === index ? 'bg-[#3B82C4]/12 text-mt-ink font-medium' : i > index ? 'text-mt-faint hover:bg-mt-surface2' : 'text-mt-ink hover:bg-mt-surface2')}>
              {l}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-[11px] text-mt-faint">Click a step to go back to it.</p>
    </section>
  );
}
