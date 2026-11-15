'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_TOOL_KEYS, TOOL_KEY_LABELS, ToolKeyMap, assignKey, comboOf, loadToolKeys, saveToolKeys, showCombo } from '@/lib/editor/toolKeys';
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
  { keys: '~ (Pen tool)', label: 'Switch Pen ↔ Curvature (smooth through clicked points)' },
  { keys: 'Alt/Option + click (Curvature)', label: 'Place a sharp corner' },
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
  { keys: 'Ctrl/Cmd + 0', label: 'Fit page to screen' },
  { keys: 'Ctrl/Cmd + 1', label: 'Zoom to 100%' },
  { keys: 'Space + drag', label: 'Pan (any tool)' },
  { keys: 'Two-finger pinch', label: 'Zoom (touch screens and trackpads)' },
  { keys: 'Shift while rotating', label: 'Rotate in 15° steps' },
  { keys: 'Alt/Option + drag an object', label: 'Drag out a copy (Selection tool)' },
];

const PHOTO_EDITOR_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'V', label: 'Move / Select tool' },
  { keys: 'M', label: 'Marquee (rectangle) tool' },
  { keys: 'Shift + M', label: 'Marquee (ellipse) tool' },
  { keys: 'L', label: 'Lasso tool' },
  { keys: 'W', label: 'Magic Wand tool' },
  { keys: 'C', label: 'Crop tool' },
  { keys: 'T', label: 'Skew tool' },
  { keys: 'Shift + T', label: 'Perspective tool' },
  { keys: 'P', label: 'Pen tool' },
  { keys: 'A', label: 'Direct Selection tool' },
  { keys: 'B', label: 'Brush tool' },
  { keys: 'E', label: 'Eraser tool' },
  { keys: 'O', label: 'Dodge tool (lighten)' },
  { keys: 'Shift + O', label: 'Burn tool (darken)' },
  { keys: 'S', label: 'Clone Stamp tool' },
  { keys: 'Shift + J', label: 'Healing Brush tool' },
  { keys: 'F', label: 'Blur tool' },
  { keys: 'J', label: 'Sharpen tool' },
  { keys: 'X', label: 'Sponge tool' },
  { keys: 'K', label: 'Paint Bucket tool' },
  { keys: 'I', label: 'Color Picker (eyedropper)' },
  { keys: 'G', label: 'Gradient tool' },
  { keys: 'H', label: 'Hand tool (pan)' },
  { keys: 'Space + drag', label: 'Temporarily pan (any tool)' },
  { keys: 'R', label: 'Mask: paint Reveal' },
  { keys: 'Shift + R', label: 'Mask: paint Hide' },
  { keys: 'Ctrl/Cmd + L', label: 'Levels tool' },
  { keys: 'Ctrl/Cmd + U', label: 'Hue/Saturation tool' },
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

// Tool rows of the list show the user's own key when they changed it.
const LABEL_TOOL: Record<string, string> = { ...Object.fromEntries(TOOL_KEY_LABELS.map((t) => [t.label, t.tool])), 'Add Text': 'text' };

function ToolKeyEditor({ keys, onChange }: { keys: ToolKeyMap; onChange: (m: ToolKeyMap) => void }) {
  const [note, setNote] = useState('');
  return (
    <div role="group" aria-label="Customise tool keys" className="rounded-lg border border-mt-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-mt-faint font-semibold">Customise tool keys</p>
      <p className="mt-1 text-[11px] text-mt-muted">Click a box and press the key you want (letters, numbers or symbols; Shift + letter works too). Kept on this device.</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {TOOL_KEY_LABELS.map(({ tool, label }) => (
          <label key={tool} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-mt-muted truncate">{label}</span>
            <input
              readOnly
              aria-label={`Key for ${label}`}
              value={showCombo(keys[tool] || '')}
              className="w-20 shrink-0 rounded border border-mt-border bg-mt-surface2 px-1.5 py-0.5 text-center font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#3B82C4]"
              onKeyDown={(e) => {
                if (e.key === 'Tab') return;
                e.preventDefault(); e.stopPropagation();
                if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); return; }
                if (e.key === 'Backspace' || e.key === 'Delete') { onChange({ ...keys, [tool]: '' }); setNote(`${label} has no key now.`); return; }
                if (e.ctrlKey || e.metaKey || e.altKey) { setNote('Ctrl, Cmd and Alt keys are kept for the fixed shortcuts.'); return; }
                const c = comboOf(e.key, e.shiftKey);
                if (!c) { setNote('That key is used by the editor itself — please pick another.'); return; }
                const { map, clashed } = assignKey(keys, tool, c);
                onChange(map);
                setNote(clashed ? `${showCombo(c)} moved from ${TOOL_KEY_LABELS.find((x) => x.tool === clashed)?.label} to ${label}.` : `${label}: ${showCombo(c)}`);
              }}
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span role="status" className="text-[11px] text-mt-muted">{note}</span>
        <button type="button" className="text-[11px] text-[#3B82C4] hover:underline shrink-0" onClick={() => { onChange({ ...DEFAULT_TOOL_KEYS }); setNote('Tool keys back to the defaults.'); }}>Reset to defaults</button>
      </div>
    </div>
  );
}

export function ShortcutsModal({ open, onClose, workspace = 'design' }: Props) {
  const [toolKeys, setToolKeys] = useState<ToolKeyMap>(DEFAULT_TOOL_KEYS);
  useEffect(() => { if (open) setToolKeys(loadToolKeys()); }, [open]);
  const changeKeys = (m: ToolKeyMap) => { setToolKeys(m); saveToolKeys(m); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
  const keyText = (section: string, sc: { keys: string; label: string }) => {
    const tool = section === 'Main Design' ? LABEL_TOOL[sc.label] : undefined;
    return tool ? showCombo(toolKeys[tool] || '') : sc.keys;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-mt-surface rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-mt-surface">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-mt-muted" />
            <p className="font-semibold text-sm text-mt-ink">Keyboard shortcuts</p>
          </div>
          <button onClick={onClose} className="text-mt-faint hover:text-mt-ink">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-5">
          {workspace === 'design' && <ToolKeyEditor keys={toolKeys} onChange={changeKeys} />}
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] uppercase tracking-wide text-mt-faint font-semibold mb-2">{section.title}</p>
              <div className="flex flex-col gap-1.5">
                {section.items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs py-1">
                    <span className="text-mt-muted">{s.label}</span>
                    <kbd className="bg-mt-surface2 border border-mt-border rounded px-2 py-0.5 font-mono text-[11px] text-mt-ink shrink-0 ml-3">
                      {keyText(section.title, s)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="text-[11px] text-mt-faint border-t pt-3">Press ? anytime to open this panel.</div>
        </div>
      </div>
    </div>
  );
}
