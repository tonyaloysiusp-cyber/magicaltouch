// Pattern Studio / garment letters → vector outlines.
// Any Google font from the editor's list is read from its real font file
// (lib/fontOutline.ts, opentype.js) so every letter is the font's own curve
// with its kerning. Only if the font file can't be read is the word drawn on
// a canvas and traced as a fallback.
// The result is real path data, so SVG, PDF, the editor and the garment
// print files all get vectors — no font needed on the printer's computer.

import { GOOGLE_FONTS, googleFontByName } from './editor/googleFonts.ts';
import { trace } from './trace.ts';
import { fitPath, pathBox } from './pathFit.ts';
import { exactTextOutline } from './fontOutline.ts';

export { fitPath, pathBox };

export const PATTERN_FONTS = GOOGLE_FONTS.filter((f) => f.category !== 'World');

const loaded = new Map<string, Promise<string>>();

/** Loads one face and returns a private family name to draw with. */
export function loadFace(family: string, weight: number, italic: boolean): Promise<string> {
  const def = googleFontByName(family);
  const src = def?.googleFamily || family;
  const w = def && !def.weights.includes(weight) ? def.weights[def.weights.length - 1] : weight;
  const key = `${src}|${w}|${italic ? 1 : 0}`;
  if (!loaded.has(key)) {
    const alias = `mtp-${key.replace(/[^a-z0-9]+/gi, '-')}`;
    loaded.set(key, (async () => {
      const face = new FontFace(alias, `url(/api/font-file?family=${encodeURIComponent(src)}&weight=${w}${italic ? '&italic=1' : ''})`, { weight: String(w), style: italic ? 'italic' : 'normal' });
      try { await face.load(); } catch {
        if (!italic) throw new Error('font');
        // No italic cut: the browser slants the regular one.
        const reg = new FontFace(alias, `url(/api/font-file?family=${encodeURIComponent(src)}&weight=${w})`, { weight: String(w), style: 'italic' });
        await reg.load();
        (document.fonts as any).add(reg);
        return alias;
      }
      (document.fonts as any).add(face);
      return alias;
    })().catch((e) => { loaded.delete(key); throw e; }));
  }
  return loaded.get(key)!;
}

/** The word as one vector path fitted to the -50…50 motif box. */
export async function textOutline(text: string, opts: { family: string; weight: number; italic: boolean; spacing?: number }): Promise<string | null> {
  const t = text.trim().slice(0, 12);
  if (!t) return null;
  const exact = await exactTextOutline(t, { family: opts.family, weight: opts.weight, italic: opts.italic, spacing: opts.spacing, size: 320 });
  if (exact) return fitPath(exact, pathBox(exact));
  const alias = await loadFace(opts.family, opts.weight, opts.italic);
  const fs = 320;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const font = `${opts.italic ? 'italic ' : ''}${opts.weight} ${fs}px "${alias}"`;
  ctx.font = font;
  (ctx as any).letterSpacing = `${Math.round((opts.spacing || 0) * fs)}px`;
  const m = ctx.measureText(t);
  const pad = Math.round(fs * 0.3);
  c.width = Math.min(4000, Math.ceil(m.width + pad * 2 + fs * 0.4));
  c.height = Math.ceil(fs * 1.7);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = font;
  (ctx as any).letterSpacing = `${Math.round((opts.spacing || 0) * fs)}px`;
  ctx.fillStyle = '#000'; ctx.textBaseline = 'middle';
  ctx.fillText(t, pad, c.height / 2);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const r = trace({ data: img.data, width: img.width, height: img.height }, { mode: 'bw', threshold: 128, detail: Math.max(img.width, img.height), smooth: 1.4, noise: 8, curves: true, corner: 50, despeckle: 0 });
  const d = r.layers[0]?.d;
  if (!d) return null;
  return fitPath(d, pathBox(d));
}
