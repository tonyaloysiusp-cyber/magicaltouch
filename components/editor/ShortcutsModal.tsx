'use client';

import { Keyboard, X } from 'lucide-react';

const MAIN_DESIGN_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'V', label: 'Selection tool' },
  { keys: 'A', label: 'Direct Selection tool' },
  { keys: 'P', label: 'Pen tool' },
  { keys: 'H', label: 'Hand / Pan tool' },
  { keys: 'T', label: 'Add Text' },
  { keys: 'M', label: 'Rectangle tool' },
  { keys: 'L', label: 'Ellipse tool' },
  { keys: '\\', label: 'Line tool' },
  { keys: 'Shift + T', label: 'Triangle tool' },
  { keys: 'Shift + G', label: 'Polygon tool' },
  { keys: 'Shift + S', label: 'Star tool' },
  { keys: 'Shift + O', label: 'Artboard tool' },
  { keys: 'Ctrl/Cmd + drag', label: 'Move without smart-guide snapping' },
  { keys: 'Alt/Option + drag handle (Pen tool)', label: 'Break a symmetric curve handle' },
  { keys: 'Alt/Option + click anchor (Direct Select)', label: 'Toggle corner ↔ smooth curve point' },
  { keys: 'Click segment marker (Direct Select)', label: 'Add an anchor point on that segment' },
  { keys: 'Delete (anchor selected, Direct Select)', label: 'Remove that anchor point' },
  { keys: 'Enter', label: 'Finish open path (Pen tool)' },
  { keys: 'Esc', label: 'Cancel current drawing / deselect' },
  { keys: 'Shift + drag', label: 'Constrain proportions (shape tools)' },
  { keys: 'Alt/Option + drag', label: 'Draw from center (shape tools)' },
  { keys: 'Shift + Enter', label: 'Apply path as mask to selected image' },
  { keys: 'Ctrl/Cmd + Z', label: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', label: 'Redo' },
  { keys: 'Ctrl/Cmd + Y', label: 'Redo (alt)' },
  { keys: 'Ctrl/Cmd + S', label: 'Save design' },
  { keys: 'Ctrl/Cmd + Shift + S', label: 'Save As' },
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
];

const PHOTO_EDITOR_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'V', label: 'Move / Select tool' },
  { keys: 'M', label: 'Marquee (rectangle) tool' },
  { keys: 'Shift + M', label: 'Marquee (ellipse) tool' },
  { keys: 'L', label: 'Lasso tool' },
  { keys: 'W', label: 'Magic Wand tool' },
  { keys: 'C', label: 'Crop tool' },
  { keys: 'P', label: 'Pen tool' },
  { keys: 'A', label: 'Direct Selection tool' },
  { keys: 'B', label: 'Brush tool' },
  { keys: 'E', label: 'Eraser tool' },
  { keys: 'O', label: 'Dodge tool (lighten)' },
  { keys: 'Shift + O', label: 'Burn tool (darken)' },
  { keys: 'I', label: 'Color Picker (eyedropper)' },
  { keys: 'G', label: 'Gradient tool' },
  { keys: 'H', label: 'Hand tool (pan)' },
  { keys: 'Space + drag', label: 'Temporarily pan (any tool)' },
  { keys: 'R', label: 'Mask: paint Reveal' },
  { keys: 'Shift + R', label: 'Mask: paint Hide' },
  { keys: 'Ctrl/Cmd + L', label: 'Levels tool' },
  { keys: 'Ctrl/Cmd + Z', label: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', label: 'Redo' },
  { keys: 'Ctrl/Cmd + Y', label: 'Redo (alt)' },
  { keys: 'Ctrl/Cmd + "+"', label: 'Zoom in' },
  { keys: 'Ctrl/Cmd + "-"', label: 'Zoom out' },
  { keys: 'Ctrl/Cmd + 0', label: 'Fit to screen' },
  { keys: 'Ctrl/Cmd + 1', label: 'Zoom to 100%' },
  { keys: 'Enter', label: 'Finish open path (Pen tool)' },
  { keys: 'Esc', label: 'Cancel path / crop' },
  { keys: 'Delete (anchor selected)', label: 'Remove anchor (Direct Select)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  workspace?: 'design' | 'photo';
}

export function ShortcutsModal({ open, onClose, workspace = 'design' }: Props) {
  if (!open) return null;

  const mainList = MAIN_DESIGN_SHORTCUTS;
  const photoList = PHOTO_EDITOR_SHORTCUTS;
  // The workspace the user is currently in is shown first/expanded — both
  // are always listed since switching workspaces mid-reference is common.
  const sections =
    workspace === 'photo'
      ? [
          { title: 'Photo Editing', items: photoList },
          { title: 'Main Design', items: mainList },
        ]
      : [
          { title: 'Main Design', items: mainList },
          { title: 'Photo Editing', items: photoList },
        ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
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
        <div className="p-4 flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">{section.title}</p>
              <div className="flex flex-col gap-1.5">
                {section.items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs py-1">
                    <span className="text-gray-600">{s.label}</span>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] text-gray-700 shrink-0 ml-3">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="text-[11px] text-gray-400 border-t pt-3">Press ? anytime to open this panel.</div>
        </div>
      </div>
    </div>
  );
}
