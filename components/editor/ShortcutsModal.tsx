'use client';

import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'V', label: 'Selection tool' },
  { keys: 'A', label: 'Direct Selection tool' },
  { keys: 'P', label: 'Pen tool' },
  { keys: 'H', label: 'Hand / Pan tool' },
  { keys: 'Shift + O', label: 'Artboard tool' },
  { keys: 'M', label: 'Rectangle Marquee tool' },
  { keys: 'L', label: 'Lasso tool' },
  { keys: 'W', label: 'Magic Wand tool' },
  { keys: 'Shift + click (pixel select)', label: 'Add to pixel selection' },
  { keys: 'Alt/Option + click (pixel select)', label: 'Subtract from pixel selection' },
  { keys: 'Ctrl/Cmd + drag', label: 'Move without smart-guide snapping' },
  { keys: 'Enter', label: 'Finish open path (Pen tool)' },
  { keys: 'Esc', label: 'Cancel current drawing / deselect' },
  { keys: 'Shift + drag', label: 'Constrain proportions (shape tools)' },
  { keys: 'Alt/Option + drag', label: 'Draw from center (shape tools)' },
  { keys: 'Shift + Enter', label: 'Apply path as mask to selected image' },
  { keys: 'Ctrl/Cmd + Z', label: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', label: 'Redo' },
  { keys: 'Ctrl/Cmd + Y', label: 'Redo (alt)' },
  { keys: 'Ctrl/Cmd + S', label: 'Save design' },
  { keys: 'Ctrl/Cmd + A', label: 'Select all' },
  { keys: 'Ctrl/Cmd + C', label: 'Copy' },
  { keys: 'Ctrl/Cmd + V', label: 'Paste' },
  { keys: 'Ctrl/Cmd + D', label: 'Duplicate' },
  { keys: 'Delete / Backspace', label: 'Delete selection' },
  { keys: 'Ctrl/Cmd + G', label: 'Group selection' },
  { keys: 'Ctrl/Cmd + Shift + G', label: 'Ungroup' },
  { keys: 'Ctrl/Cmd + ]', label: 'Bring forward' },
  { keys: 'Ctrl/Cmd + [', label: 'Send backward' },
  { keys: 'Ctrl/Cmd + Shift + ]', label: 'Bring to front' },
  { keys: 'Ctrl/Cmd + Shift + [', label: 'Send to back' },
  { keys: 'Ctrl/Cmd + L', label: 'Lock / unlock selection' },
  { keys: 'Ctrl/Cmd + H', label: 'Hide selection' },
  { keys: 'Arrow keys', label: 'Nudge 1px' },
  { keys: 'Shift + Arrow keys', label: 'Nudge 10px' },
  { keys: 'Ctrl/Cmd + "+"', label: 'Zoom in' },
  { keys: 'Ctrl/Cmd + "-"', label: 'Zoom out' },
  { keys: 'Ctrl/Cmd + 0', label: 'Reset zoom to 100%' },
  { keys: '?', label: 'Show this shortcuts panel' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-gray-500" />
            <p className="font-semibold text-sm text-gray-800">Keyboard shortcuts</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-600">{s.label}</span>
              <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] text-gray-700">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
