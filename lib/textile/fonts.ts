// Browser side of textile text: loads the real font files used by the
// artwork and registers a synchronous shaper, so the (pure) renderers in
// art.ts / teamKit.ts draw exact outlines from the font's own curves.

import type { Font } from 'opentype.js';
import { loadFont, resolveFace, textShape } from '../fontOutline.ts';
import { setShaper, type Shaper } from './art.ts';

const ready = new Map<string, Font>();
const key = (font: string, weight: number, italic: boolean) => { const f = resolveFace(font, weight); return `${f.src}|${f.weight}|${italic ? 1 : 0}`; };

export const shaper: Shaper = (font, weight, italic, text, size, spacing) => {
  const f = ready.get(key(font, weight, italic));
  if (!f) return null;
  return textShape(f, text, size, spacing);
};
setShaper(shaper);

/** Loads every face (once). Resolves to the faces that could not be loaded. */
export async function ensureFonts(list: { font: string; weight: number; italic?: boolean }[]): Promise<string[]> {
  const failed: string[] = [];
  await Promise.all(list.map(async (x) => {
    const k = key(x.font, x.weight, !!x.italic);
    if (ready.has(k)) return;
    try { ready.set(k, await loadFont(x.font, x.weight, !!x.italic)); } catch { failed.push(`${x.font} ${x.weight}`); }
  }));
  setShaper(shaper);
  return failed;
}
export const fontReady = (font: string, weight: number, italic = false) => ready.has(key(font, weight, italic));

/** Moves every coordinate pair of an absolute path (M/L/Q/C/Z from opentype) and squeezes x. */
export function shiftPath(d: string, dx: number, dy: number, sx = 1): string {
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (n) => {
    const v = Number(n);
    const out = i++ % 2 === 0 ? v * sx + dx : v + dy;
    return String(Math.round(out * 100) / 100);
  });
}
