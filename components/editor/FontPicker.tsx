'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { useAvailableGoogleFonts } from '@/lib/editor/googleFonts';

interface Props {
  // undefined/empty when the current selection spans multiple different
  // fonts (mixed=true handles the display for that case).
  value: string | undefined;
  mixed?: boolean;
  disabled?: boolean;
  onChange: (family: string) => void;
}

// A searchable, live-previewed replacement for a plain <select> — native
// <option> elements can't reliably render each entry in its own font
// across browsers, and a flat 90+-item dropdown with no search is slow
// to use. Only ever lists fonts useAvailableGoogleFonts() currently
// considers real (see lib/editor/fontAvailability.ts): a family that
// fails to load drops out of this list on its own, nothing extra needed
// here.
export function FontPicker({ value, mixed, disabled, onChange }: Props) {
  const fonts = useAvailableGoogleFonts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The list floats above everything (toolbars scroll sideways and would
  // otherwise cut it off), placed under the button — or above it when
  // there isn't room below.
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; maxH: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = rootRef.current?.getBoundingClientRect();
      if (!b) return;
      const vw = window.innerWidth, vh = window.innerHeight, w = 272;
      const left = Math.max(8, Math.min(b.left, vw - w - 8));
      const below = vh - b.bottom - 12, above = b.top - 12;
      if (below >= 260 || below >= above) setPos({ left, top: b.bottom + 4, maxH: Math.min(420, below) });
      else setPos({ left, bottom: vh - b.top + 4, maxH: Math.min(420, above) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? fonts.filter((f) => f.family.toLowerCase().includes(q)) : fonts;

  return (
    <div className="relative" ref={rootRef} data-testid="font-picker">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs border rounded px-2 py-1 disabled:opacity-40 bg-mt-surface text-left dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
      >
        <span className="truncate" style={mixed ? undefined : { fontFamily: value }}>
          {mixed ? 'Mixed' : value || 'Select font'}
        </span>
        <ChevronDown size={12} className="shrink-0 ml-1 text-mt-faint" />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] w-[272px] overflow-hidden flex flex-col bg-mt-surface text-mt-ink border border-mt-border rounded-xl shadow-2xl"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b dark:border-mt-border">
            <Search size={12} className="text-mt-faint shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="w-full text-xs outline-none bg-transparent dark:text-mt-ink"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-mt-faint px-3 py-3">No fonts match &quot;{query}&quot;</p>
            )}
            {filtered.map((f) => (
              <button
                key={f.family}
                type="button"
                onClick={() => {
                  onChange(f.family);
                  setOpen(false);
                }}
                className={`w-full text-left text-sm px-3 py-1.5 hover:bg-mt-surface2 dark:hover:bg-mt-surface2 dark:text-mt-ink ${
                  f.family === value ? 'bg-mt-surface2 dark:bg-mt-surface2' : ''
                }`}
                style={{ fontFamily: f.family }}
              >
                {f.family}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
