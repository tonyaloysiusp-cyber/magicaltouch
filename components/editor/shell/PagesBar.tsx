'use client';

import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Minus, Maximize, HelpCircle } from 'lucide-react';
import { cx } from './ui';

export interface PageThumb {
  id: string;
  name: string;
  width: number;
  height: number;
  thumb: string | null;
}

// Bottom strip: page thumbnails (add / duplicate / delete / reorder) and
// zoom controls.
export function PagesBar({
  pages,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  zoom,
  onZoom,
  onFit,
  onHelp,
  compact,
}: {
  pages: PageThumb[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  zoom: number;
  onZoom: (z: number) => void;
  onFit: () => void;
  onHelp: () => void;
  compact: boolean;
}) {
  return (
    <div className="h-[76px] shrink-0 border-t border-mt-border bg-mt-surface flex items-center gap-3 px-3">
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto mt-scroll py-1">
        {pages.map((p, i) => {
          const h = 52;
          const w = Math.max(28, Math.min(92, (p.width / p.height) * h));
          const active = p.id === activeId;
          return (
            <div key={p.id} className="group relative shrink-0 flex flex-col items-center">
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                title={`${p.name} — ${Math.round(p.width)} × ${Math.round(p.height)} px`}
                aria-current={active ? 'page' : undefined}
                className={cx('rounded-md overflow-hidden bg-white ring-1 transition-shadow', active ? 'ring-2 ring-[#3B82C4]' : 'ring-mt-border hover:ring-[#8CCBFF]')}
                style={{ width: w, height: h }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.thumb ? <img src={p.thumb} alt="" className="w-full h-full object-cover" /> : null}
              </button>
              <span className={cx('text-[10px] mt-0.5', active ? 'text-mt-ink font-semibold' : 'text-mt-faint')}>{i + 1}</span>
              {active && !compact && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full hidden group-hover:flex items-center gap-0.5 rounded-lg border border-mt-border bg-mt-surface shadow px-0.5 py-0.5">
                  <button type="button" aria-label="Move page left" disabled={i === 0} onClick={() => onMove(i, -1)} className="h-6 w-6 inline-flex items-center justify-center rounded text-mt-muted hover:text-mt-ink disabled:opacity-30">
                    <ChevronLeft size={13} />
                  </button>
                  <button type="button" aria-label="Duplicate page" onClick={() => onDuplicate(p.id)} className="h-6 w-6 inline-flex items-center justify-center rounded text-mt-muted hover:text-mt-ink">
                    <Copy size={12} />
                  </button>
                  <button type="button" aria-label="Delete page" disabled={pages.length <= 1} onClick={() => onDelete(p.id)} className="h-6 w-6 inline-flex items-center justify-center rounded text-mt-muted hover:text-red-600 disabled:opacity-30">
                    <Trash2 size={12} />
                  </button>
                  <button type="button" aria-label="Move page right" disabled={i === pages.length - 1} onClick={() => onMove(i, 1)} className="h-6 w-6 inline-flex items-center justify-center rounded text-mt-muted hover:text-mt-ink disabled:opacity-30">
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button type="button" onClick={onAdd} title="Add a page" aria-label="Add a page" className="shrink-0 h-[52px] w-10 rounded-md border-2 border-dashed border-mt-border text-mt-muted hover:text-mt-ink hover:border-[#8CCBFF] inline-flex items-center justify-center self-start mt-1">
          <Plus size={16} />
        </button>
        {compact && activeId && (
          <div className="flex items-center gap-1 ml-1">
            <button type="button" aria-label="Duplicate page" onClick={() => onDuplicate(activeId)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted">
              <Copy size={14} />
            </button>
            <button type="button" aria-label="Delete page" disabled={pages.length <= 1} onClick={() => onDelete(activeId)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted disabled:opacity-30">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      {!compact && (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Zoom out" onClick={() => onZoom(zoom / 1.25)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <Minus size={15} />
          </button>
          <input
            type="range"
            min={5}
            max={400}
            value={Math.min(400, zoom)}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-28 accent-[#3B82C4]"
          />
          <button type="button" aria-label="Zoom in" onClick={() => onZoom(zoom * 1.25)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <Plus size={15} />
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-mt-muted">{Math.round(zoom)}%</span>
          <button type="button" onClick={onFit} title="Fit page to screen (Ctrl/Cmd+0)" aria-label="Fit page to screen" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <Maximize size={15} />
          </button>
          <button type="button" onClick={onHelp} title="Help" aria-label="Help" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <HelpCircle size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
