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
  const activeIndex = pages.findIndex((p) => p.id === activeId);
  const btn = 'h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2 disabled:opacity-30 disabled:hover:bg-transparent';
  // The zoom slider works on a log scale, so 25%, 100% and 400% are
  // evenly spaced and the whole 5%–800% range fits.
  const toSlider = (z: number) => Math.round(Math.log2(Math.max(5, z) / 100) * 100);
  const fromSlider = (v: number) => 100 * Math.pow(2, v / 100);
  return (
    <div className={cx('shrink-0 border-t border-mt-border bg-mt-surface flex items-center gap-3 px-3', compact ? 'h-[64px]' : 'h-[76px]')}>
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
            </div>
          );
        })}
        <button type="button" onClick={onAdd} title="Add a page" aria-label="Add a page" className="shrink-0 h-[52px] w-10 rounded-md border-2 border-dashed border-mt-border text-mt-muted hover:text-mt-ink hover:border-[#8CCBFF] inline-flex items-center justify-center self-start mt-1">
          <Plus size={16} />
        </button>
      </div>
      {activeIndex >= 0 && (
        // Always visible (not hover-only), so they work with a finger too.
        <div className="shrink-0 flex items-center gap-0.5 rounded-xl border border-mt-border px-1 py-0.5" role="group" aria-label={`Page ${activeIndex + 1} actions`}>
          {!compact && <span className="text-[11px] text-mt-faint px-1.5 tabular-nums">Page {activeIndex + 1}</span>}
          <button type="button" title="Move page left" aria-label="Move page left" disabled={activeIndex === 0} onClick={() => onMove(activeIndex, -1)} className={btn}>
            <ChevronLeft size={15} />
          </button>
          <button type="button" title="Duplicate page" aria-label="Duplicate page" onClick={() => onDuplicate(pages[activeIndex].id)} className={btn}>
            <Copy size={14} />
          </button>
          <button type="button" title="Delete page" aria-label="Delete page" disabled={pages.length <= 1} onClick={() => onDelete(pages[activeIndex].id)} className={cx(btn, 'hover:text-red-600')}>
            <Trash2 size={14} />
          </button>
          <button type="button" title="Move page right" aria-label="Move page right" disabled={activeIndex === pages.length - 1} onClick={() => onMove(activeIndex, 1)} className={btn}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
      {!compact && (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Zoom out" onClick={() => onZoom(zoom / 1.25)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <Minus size={15} />
          </button>
          <input
            type="range"
            min={toSlider(5)}
            max={toSlider(800)}
            value={toSlider(zoom)}
            onChange={(e) => onZoom(fromSlider(Number(e.target.value)))}
            aria-label="Zoom"
            aria-valuetext={`${Math.round(zoom)}%`}
            className="w-28 accent-[#3B82C4]"
          />
          <button type="button" aria-label="Zoom in" onClick={() => onZoom(zoom * 1.25)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <Plus size={15} />
          </button>
          <button type="button" onClick={() => onZoom(100)} title="Actual size (Ctrl/Cmd+1)" aria-label={`Zoom ${Math.round(zoom)}%, set to 100%`} className="w-12 h-8 text-center text-xs tabular-nums text-mt-muted rounded-lg hover:bg-mt-surface2 hover:text-mt-ink">
            {Math.round(zoom)}%
          </button>
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
