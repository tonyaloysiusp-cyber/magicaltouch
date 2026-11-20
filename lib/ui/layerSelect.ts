// One selection rule for every layers panel (Design editor, Photo Studio,
// textile Print studio): the same as desktop design software.
//  · click            → only that layer (it becomes the anchor)
//  · Ctrl / Cmd-click → add or remove that one layer (it becomes the anchor)
//  · Shift-click      → every layer from the anchor to the clicked one, in panel order
//  · Shift + Ctrl     → add that range to what is already selected

export type ClickMods = { shift?: boolean; toggle?: boolean };

export function nextLayerSelection<T>(order: T[], current: T[], anchor: T | null, clicked: T, mods: ClickMods): { selection: T[]; anchor: T } {
  if (mods.shift) {
    const a = anchor != null && order.includes(anchor) ? order.indexOf(anchor) : order.indexOf(clicked);
    const b = order.indexOf(clicked);
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    const range = order.slice(lo, hi + 1);
    const selection = mods.toggle ? order.filter((o) => current.includes(o) || range.includes(o)) : range;
    return { selection, anchor: anchor != null && order.includes(anchor) ? anchor : clicked };
  }
  if (mods.toggle) {
    const selection = current.includes(clicked) ? current.filter((o) => o !== clicked) : order.filter((o) => current.includes(o) || o === clicked);
    return { selection, anchor: clicked };
  }
  return { selection: [clicked], anchor: clicked };
}

export const clickMods = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): ClickMods => ({ shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey });
