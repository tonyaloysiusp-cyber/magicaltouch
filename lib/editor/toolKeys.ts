// Customisable single-key tool shortcuts (V, P, M …). Defaults follow
// Adobe Illustrator. The user's own keys are kept on this device only.
// Ctrl/Cmd shortcuts (undo, save, copy…) are fixed and not part of this map.

export type ToolKeyMap = Record<string, string>; // tool → 'v' | 'shift+o' | '\\'

export const TOOL_KEY_LABELS: { tool: string; label: string }[] = [
  { tool: 'select', label: 'Selection tool' },
  { tool: 'direct', label: 'Direct Selection tool' },
  { tool: 'pen', label: 'Pen tool' },
  { tool: 'pan', label: 'Hand / Pan tool' },
  { tool: 'text', label: 'Text' },
  { tool: 'brush', label: 'Brush' },
  { tool: 'eraser', label: 'Eraser' },
  { tool: 'pencil', label: 'Pencil' },
  { tool: 'rect', label: 'Rectangle tool' },
  { tool: 'ellipse', label: 'Ellipse tool' },
  { tool: 'line', label: 'Line tool' },
  { tool: 'artboard', label: 'Artboard tool' },
  { tool: 'triangle', label: 'Triangle tool' },
  { tool: 'star', label: 'Star tool' },
  { tool: 'polygon', label: 'Polygon tool' },
];

export const DEFAULT_TOOL_KEYS: ToolKeyMap = {
  select: 'v', direct: 'a', pen: 'p', pan: 'h', text: 't', brush: 'b', eraser: 'e', pencil: 'n',
  rect: 'm', ellipse: 'l', line: '\\', artboard: 'shift+o', triangle: 'shift+t', star: 'shift+s', polygon: 'shift+g',
};

const KEY = 'mt:toolKeys';
// Keys that already mean something else in the editor and can't be tool keys.
const RESERVED = new Set(['?', ' ', 'delete', 'backspace', 'escape', 'enter', 'tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

/** The combo string for a key event ('' when it can't be a tool key). */
export function comboOf(key: string, shift: boolean): string {
  if (!key || key.length !== 1) return '';
  const k = key.toLowerCase();
  if (RESERVED.has(k)) return '';
  // Shift changes the character for symbols; letters and digits keep a 'shift+' prefix.
  return shift && /[a-z0-9]/.test(k) ? `shift+${k}` : k;
}
export const showCombo = (c: string) => (c ? c.split('+').map((p) => (p === 'shift' ? 'Shift' : p.toUpperCase())).join(' + ') : '—');

export function loadToolKeys(): ToolKeyMap {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_TOOL_KEYS, ...v };
  } catch { /* ignore */ }
  return { ...DEFAULT_TOOL_KEYS };
}
export function saveToolKeys(m: ToolKeyMap) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event('mt:toolKeys')); } catch { /* ignore */ }
}

export function toolForKey(m: ToolKeyMap, key: string, shift: boolean): string | null {
  const c = comboOf(key, shift);
  if (!c) return null;
  for (const t of Object.keys(m)) if (m[t] === c) return t;
  return null;
}

/** Sets a tool's key; a tool that had the same key loses it (returned so the UI can say so). */
export function assignKey(m: ToolKeyMap, tool: string, combo: string): { map: ToolKeyMap; clashed: string | null } {
  const map = { ...m };
  let clashed: string | null = null;
  for (const t of Object.keys(map)) if (t !== tool && combo && map[t] === combo) { map[t] = ''; clashed = t; }
  map[tool] = combo;
  return { map, clashed };
}
