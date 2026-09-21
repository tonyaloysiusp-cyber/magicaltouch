'use client';

import { useEffect } from 'react';
import { Settings, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  returnToSelectAfterCreate: boolean;
  onToggleReturnToSelect: (value: boolean) => void;
}

// A small, honest Preferences panel — only settings that are actually
// wired up to real behavior live here (see PREFERENCES.md-style rule:
// don't ship a checkbox that does nothing). More can be added as the
// behaviors they control are built.
export function PreferencesModal({ open, onClose, returnToSelectAfterCreate, onToggleReturnToSelect }: Props) {
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
        </div>
      </div>
    </div>
  );
}
