'use client';

import { ReactNode } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { cx } from './ui';

export interface RailItem {
  id: string;
  label: string;
  icon: ReactNode;
  title?: string;
  render: () => ReactNode;
  // Not shown in the rail (opened from a toolbar instead).
  hiddenInRail?: boolean;
  special?: boolean;
}

// Desktop/tablet: a slim icon rail with a sliding panel next to it.
// Phone: a bottom navigation bar whose panels open as bottom sheets.
export function LeftRail({
  items,
  active,
  onActivate,
  compact,
}: {
  items: RailItem[];
  active: string | null;
  onActivate: (id: string | null) => void;
  compact: boolean;
}) {
  const current = items.find((i) => i.id === active) || null;
  const railItems = items.filter((i) => !i.hiddenInRail);

  if (compact) {
    return (
      <>
        {current && (
          <div className="fixed inset-0 z-[90] flex flex-col justify-end" role="dialog" aria-label={current.title || current.label}>
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => onActivate(null)} />
            <div className="relative bg-mt-surface rounded-t-3xl max-h-[72vh] flex flex-col animate-[mt-sheet_180ms_ease-out] shadow-2xl">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-mt-border" />
                <h2 className="text-base font-semibold text-mt-ink mt-2">{current.title || current.label}</h2>
                <button type="button" onClick={() => onActivate(null)} aria-label="Close" className="h-9 w-9 mt-1 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-6 mt-scroll">{current.render()}</div>
            </div>
          </div>
        )}
        <nav aria-label="Editor panels" className="shrink-0 border-t border-mt-border bg-mt-surface flex overflow-x-auto mt-scroll pb-[env(safe-area-inset-bottom)]">
          {railItems.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onActivate(active === it.id ? null : it.id)}
              aria-pressed={active === it.id}
              className={cx('flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2 text-[10px] font-medium', active === it.id ? 'text-mt-ink' : 'text-mt-muted')}
            >
              <span className={cx('h-8 w-12 rounded-full flex items-center justify-center', active === it.id && 'mt-active-blue border')}>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </nav>
      </>
    );
  }

  return (
    <div className="flex h-full shrink-0">
      <nav aria-label="Editor panels" className="w-[76px] shrink-0 border-r border-mt-border bg-mt-surface flex flex-col items-center gap-1 py-3 overflow-y-auto mt-scroll">
        {railItems.map((it) => (
          <button
            key={it.id}
            type="button"
            title={it.title || it.label}
            onClick={() => onActivate(active === it.id ? null : it.id)}
            aria-pressed={active === it.id}
            className={cx(
              'w-[64px] flex flex-col items-center gap-1 py-2 rounded-xl text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]',
              active === it.id ? 'mt-active-blue border text-mt-ink' : 'border border-transparent text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
            )}
          >
            <span className={cx('h-6 flex items-center', it.special && active !== it.id && 'text-mt-accent')}>{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>
      {current && (
        <aside aria-label={current.title || current.label} className="w-[320px] shrink-0 border-r border-mt-border bg-mt-surface flex flex-col">
          <div className="h-12 shrink-0 flex items-center justify-between px-4">
            <h2 className="text-[15px] font-semibold text-mt-ink">{current.title || current.label}</h2>
            <button type="button" onClick={() => onActivate(null)} aria-label="Hide panel" title="Hide panel" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
              <ChevronLeft size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 mt-scroll">{current.render()}</div>
        </aside>
      )}
    </div>
  );
}
