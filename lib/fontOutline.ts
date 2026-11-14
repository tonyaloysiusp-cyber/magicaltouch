// Exact letter outlines from the real font file.
//
// The font (the same Google fonts the Design editor uses) is fetched as TTF
// through the site's own /api/font-file proxy and read with opentype.js, so
// every letter is the font designer's own curve — with the font's kerning —
// instead of a traced picture of the text. Used for names, numbers and text
// on garments, pattern letters and the print files ("outlined text").

import type { Font } from 'opentype.js';
import { googleFontByName } from './editor/googleFonts.ts';

const fonts = new Map<string, Promise<Font>>();

/** The real face actually fetched for a family / weight (the nearest weight the family has). */
export function resolveFace(family: string, weight: number): { src: string; weight: number } {
  const def = googleFontByName(family);
  const src = def?.googleFamily || family;
  let w = weight;
  if (def && !def.weights.includes(weight)) w = def.weights.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a), def.weights[0]);
  return { src, weight: w };
}

export function loadFont(family: string, weight = 400, italic = false): Promise<Font> {
  const f = resolveFace(family, weight);
  const key = `${f.src}|${f.weight}|${italic ? 1 : 0}`;
  if (!fonts.has(key)) {
    fonts.set(key, (async () => {
      const get = async (it: boolean) => {
        const res = await fetch(`/api/font-file?family=${encodeURIComponent(f.src)}&weight=${f.weight}${it ? '&italic=1' : ''}`);
        if (!res.ok) throw new Error(`Font ${family} ${f.weight} could not be loaded`);
        return res.arrayBuffer();
      };
      let buf: ArrayBuffer;
      try { buf = await get(italic); } catch (e) { if (!italic) throw e; buf = await get(false); }
      const opentype: any = await import('opentype.js');
      return (opentype.parse || opentype.default?.parse)(buf) as Font;
    })().catch((e) => { fonts.delete(key); throw e; }));
  }
  return fonts.get(key)!;
}

/** The TTF bytes (for embedding live text in PDFs). */
export async function fontBytes(family: string, weight = 400, italic = false): Promise<ArrayBuffer> {
  const f = resolveFace(family, weight);
  const res = await fetch(`/api/font-file?family=${encodeURIComponent(f.src)}&weight=${f.weight}${italic ? '&italic=1' : ''}`);
  if (!res.ok) throw new Error(`Font ${family} could not be loaded`);
  return res.arrayBuffer();
}

export interface TextShape { d: string; width: number; ascender: number; descender: number; capHeight: number }

/**
 * One line of text as path data, at `size` units per em, baseline at y = 0
 * (y down, SVG style), starting at x = 0. `spacing` is extra letter spacing
 * in em. Kerning from the font is applied.
 */
export function textShape(font: Font, text: string, size: number, spacing = 0): TextShape {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let x = 0;
  const parts: string[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const p = g.getPath(x, 0, size);
    const d = p.toPathData(2);
    if (d) parts.push(d);
    x += (g.advanceWidth || 0) * scale;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale + spacing * size;
  }
  const os2: any = (font.tables as any).os2;
  const cap = os2?.sCapHeight ? os2.sCapHeight * scale : size * 0.7;
  return { d: parts.join(''), width: x, ascender: font.ascender * scale, descender: font.descender * scale, capHeight: cap };
}

/** Convenience: the outline of `text` in a family / weight (null when the font can't be loaded). */
export async function exactTextOutline(text: string, o: { family: string; weight: number; italic?: boolean; spacing?: number; size?: number }): Promise<string | null> {
  try {
    const font = await loadFont(o.family, o.weight, !!o.italic);
    const s = textShape(font, text, o.size || 100, o.spacing || 0);
    return s.d || null;
  } catch {
    return null;
  }
}
