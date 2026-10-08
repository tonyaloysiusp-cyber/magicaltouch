'use client';

import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
      {open && (
        <div className="absolute z-30 mt-1 w-64 max-h-72 overflow-hidden flex flex-col bg-mt-surface border rounded shadow-lg dark:bg-mt-surface dark:border-mt-border">
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
        </div>
      )}
    </div>
  );
}
