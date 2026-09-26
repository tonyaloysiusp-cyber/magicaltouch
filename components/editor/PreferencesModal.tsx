'use client';

import { useEffect } from 'react';
import { Settings, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  returnToSelectAfterCreate: boolean;
  onToggleReturnToSelect: (value: boolean) => void;
  gridSize: number;
  onChangeGridSize: (value: number) => void;
}

// A small, honest Preferences panel — only settings that are actually
// wired up to real behavior live here (see PREFERENCES.md-style rule:
// don't ship a checkbox that does nothing). More can be added as the
// behaviors they control are built.
export function PreferencesModal({ open, onClose, returnToSelectAfterCreate, onToggleReturnToSelect, gridSize, onChangeGridSize }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-gray-500" />
            <p className="font-semibold text-sm text-gray-800">Preferences</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={returnToSelectAfterCreate}
              onChange={(e) => onToggleReturnToSelect(e.target.checked)}
            />
            <span>
              Return to Selection tool after creating an object
              <span className="block text-[11px] text-gray-400 mt-0.5">
                Off by default — Rectangle, Ellipse, Line, Polygon, Star and Pen stay active so you can draw several objects in a row, matching Illustrator's own behavior.
              </span>
            </span>
          </label>

          <label className="flex items-center justify-between gap-3 text-xs text-gray-700 pt-1 border-t">
            <span className="pt-2">
              Grid size (px)
              <span className="block text-[11px] text-gray-400 mt-0.5">Spacing between grid lines and the snap-to-grid step.</span>
            </span>
            <input
              type="number"
              min={2}
              step={1}
              value={gridSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v > 0) onChangeGridSize(v);
              }}
              className="mt-2 w-16 border rounded px-2 py-1 text-xs"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
