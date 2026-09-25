'use client';

import { useEffect, useRef, useState } from 'react';

// A curated, reasonably broad palette — neutrals, then a spread of hues
// at a couple of tints each — rather than an arbitrary handful of
// brand colors, so it's actually useful as a general-purpose swatch set.
export const PRESET_COLORS: string[] = [
  '#000000', '#404040', '#737373', '#A6A6A6', '#D9D9D9', '#FFFFFF',
  '#EC1E79', '#F472B6', '#8B6FC4', '#C4B5FD', '#3FA9E8', '#93C5FD',
  '#4FC8C0', '#5EEAD4', '#7ED33E', '#BEF264', '#C4DA3B', '#FDE047',
  '#F59E0B', '#FB923C', '#EF4444', '#B91C1C', '#64748B', '#1E293B',
];

interface ColorSwatchPickerProps {
  // null represents "None" (no fill/stroke) — distinct from any real color.
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
  label?: string;
}

// A compact swatch button that opens a popover: a "None" tile (checkered,
// when allowed), a preset color grid, and a native color input for any
// exact custom value — used for every fill/stroke/text-color control so
// there's one consistent, richer picker instead of a bare
// <input type="color"> with no palette or transparency option.
export function ColorSwatchPicker({ value, onChange, disabled, allowNone, label }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const isNone = value === null;

  return (
    <div className="relative" ref={rootRef}>
      {label && <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        title={isNone ? 'None' : value || undefined}
        className="w-full h-8 border rounded cursor-pointer disabled:opacity-40 dark:border-[#3A3A3A] overflow-hidden relative"
        style={
          isNone
            ? { background: 'repeating-conic-gradient(#d1d5db 0 25%, white 0 50%) 0 0/10px 10px' }
            : { background: value || '#000000' }
        }
      >
        {isNone && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-full h-px bg-red-500 rotate-45" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-white dark:bg-[#2B2B2B] border dark:border-[#3A3A3A] rounded-md shadow-lg p-2.5 flex flex-col gap-2">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-[#333333] dark:text-gray-200 ${
                isNone ? 'bg-gray-100 dark:bg-[#3A3A3A]' : ''
              }`}
            >
              <span
                className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600 shrink-0 relative overflow-hidden"
                style={{ background: 'repeating-conic-gradient(#d1d5db 0 25%, white 0 50%) 0 0/6px 6px' }}
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-full h-px bg-red-500 rotate-45" />
                </span>
              </span>
              None
            </button>
          )}

          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`w-full aspect-square rounded-sm border ${
                  value === c ? 'border-2 border-blue-500' : 'border-gray-200 dark:border-[#3A3A3A]'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t dark:border-[#3A3A3A] cursor-pointer">
            Custom
            <input
              type="color"
              value={isNone ? '#000000' : value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 h-7 border rounded cursor-pointer dark:border-[#3A3A3A]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
