// Textile print-board artwork — the free design layer of the Textile
// Designer (pure functions, no browser APIs).
//
// The flat print pieces (front, back, sleeves, collar) are laid out side by
// side on a "board" in size-M millimetres. Every design element (shape,
// path, picture, text, pattern or gradient fill) lives on the board with an
// affine matrix, so one element can run across several pieces — a stripe
// continuing from the front onto the sleeve. Each piece's print artwork is
// the board clipped to that piece. Sizes are graded by scaling the piece
// (and its artwork) — the master design exists once.
//
// Text is never a picture: it is either exact outlines from the real font
// file ("outline") or live, retypeable SVG/PDF text ("live"). Text may hold
// {NAME}, {NUMBER}, {SIZE} and {TEAM}, filled per garment from the roster.

import type { Piece, Product } from '../garments.ts';
import type { PatternSettings } from '../patterns.ts';
import { sheetPlacements, motifPath, layout, placedMotif } from '../patterns.ts';

export type Mat = [number, number, number, number, number, number];
export type Fill =
  | string
  | { type: 'linear' | 'radial'; stops: [number, string][]; angle?: number }
  | { type: 'pattern'; pattern: PatternSettings; tileMm: number; assetId?: string | null; name?: string; bg?: string | null };

interface Base { id: string; name?: string; hidden?: boolean; locked?: boolean; opacity?: number; m: Mat }
export type ArtEl = Base & (
  | { kind: 'rect'; w: number; h: number; rx?: number; fill?: Fill | null; stroke?: string | null; strokeW?: number }
  | { kind: 'ellipse'; rx: number; ry: number; fill?: Fill | null; stroke?: string | null; strokeW?: number }
  | { kind: 'path'; d: string; w: number; h: number; fill?: Fill | null; stroke?: string | null; strokeW?: number; rule?: 'nonzero' | 'evenodd' }
  | { kind: 'image'; src: string; w: number; h: number }
  | { kind: 'text'; text: string; font: string; weight: number; italic?: boolean; size: number; fill?: Fill | null; stroke?: string | null; strokeW?: number; spacing?: number; align?: 'left' | 'center' | 'right'; lineHeight?: number; upper?: boolean; fitW?: number }
);

export interface TextShapeLike { d: string; width: number; ascender: number; descender: number; capHeight: number }
/** Sync text shaper (fonts are loaded before rendering in the browser). */
export type Shaper = (font: string, weight: number, italic: boolean, text: string, size: number, spacing: number) => TextShapeLike | null;
export interface Vars { name?: string; number?: string; size?: string; team?: string }
export interface RenderOpts { textMode?: 'outline' | 'live'; shaper?: Shaper | null; vars?: Vars; uid?: string }

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
export const mulM = (a: Mat, b: Mat): Mat => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
export const matStr = (m: Mat) => `matrix(${m.map(r3).join(' ')})`;
export const translateM = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];

// ------------------------------------------------------------------ board
export interface BoardPiece { piece: Piece; x: number; y: number }
export interface Board { w: number; h: number; pieces: BoardPiece[] }
/** Front and back on top, sleeves and collar below — size-M millimetres. */
export function boardLayout(product: Product, gap = 60): Board {
  const P = (id: string) => product.pieces.find((p) => p.id === id);
  const front = P('front'), back = P('back');
  const out: BoardPiece[] = [];
  let x = 0, rowH = 0;
  for (const p of [front, back].filter(Boolean) as Piece[]) { out.push({ piece: p, x, y: 0 }); x += p.w + gap; rowH = Math.max(rowH, p.h); }
  const W1 = x - gap;
  let y = rowH + gap; x = 0; let row2 = 0;
  for (const p of product.pieces.filter((q) => q.id !== 'front' && q.id !== 'back')) {
    out.push({ piece: p, x, y }); x += p.w + gap; row2 = Math.max(row2, p.h);
  }
  return { w: Math.max(W1, x - gap), h: y + row2, pieces: out };
}

/** Upper-cases and fills {NAME} {NUMBER} {SIZE} {TEAM}. */
export function fillVars(text: string, v: Vars = {}, upper = false): string {
  const t = text.replace(/\{NAME\}/gi, v.name ?? 'NAME').replace(/\{NUMBER\}/gi, v.number ?? '10').replace(/\{SIZE\}/gi, v.size ?? 'M').replace(/\{TEAM\}/gi, v.team ?? '');
  return upper ? t.toUpperCase() : t;
}

export interface TextLayout { lines: { text: string; x: number; baseline: number; width: number }[]; w: number; h: number; d: string; sx: number }
/** Lays out a text element centred on its origin. Outline path `d` is in local units (already squeezed by `sx` when it must fit `fitW`). */
export function layoutText(el: Extract<ArtEl, { kind: 'text' }>, o: RenderOpts): TextLayout {
  const raw = fillVars(el.text, o.vars, !!el.upper);
  const lines = raw.split('\n');
  const lh = el.size * (el.lineHeight || 1.15);
  const shapes = lines.map((t) => (o.shaper ? o.shaper(el.font, el.weight, !!el.italic, t, el.size, el.spacing || 0) : null));
  const widths = lines.map((t, i) => shapes[i]?.width ?? t.length * el.size * 0.55);
  const cap = shapes.find(Boolean)?.capHeight ?? el.size * 0.7;
  const w = Math.max(1, ...widths);
  const h = (lines.length - 1) * lh + cap;
  const sx = el.fitW && w > el.fitW ? el.fitW / w : 1;
  const out: TextLayout['lines'] = [];
  const parts: string[] = [];
  lines.forEach((t, i) => {
    const lw = widths[i];
    const x = el.align === 'left' ? -w / 2 : el.align === 'right' ? w / 2 - lw : -lw / 2;
    const baseline = -h / 2 + cap + i * lh;
    out.push({ text: t, x, baseline, width: lw });
    const s = shapes[i];
    if (s?.d) parts.push(`<path d="${s.d}" transform="translate(${r3(x)} ${r3(baseline)})"/>`);
  });
  return { lines: out, w: w * sx, h, d: parts.join(''), sx };
}

function gradDef(id: string, f: Extract<Fill, { type: 'linear' | 'radial' }>): string {
  const stops = f.stops.map(([o, c]) => `<stop offset="${r3(o)}" stop-color="${c}"/>`).join('');
  if (f.type === 'radial') return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">${stops}</radialGradient>`;
  const a = ((f.angle ?? 90) * Math.PI) / 180;
  const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
  return `<linearGradient id="${id}" x1="${r3(0.5 - dx)}" y1="${r3(0.5 - dy)}" x2="${r3(0.5 + dx)}" y2="${r3(0.5 + dy)}">${stops}</linearGradient>`;
}

/** Pattern tiles covering a local box, for a pattern fill. */
function patternTiles(f: Extract<Fill, { type: 'pattern' }>, box: { x: number; y: number; w: number; h: number }): string {
  const p = f.pattern;
  const d = motifPath(p);
  if (!d && !(p.motif === 'image' && p.image)) return '';
  const { w: tw } = layout(p);
  const s = f.tileMm / tw;
  const places = sheetPlacements(p, box.w / s, box.h / s);
  const bg = f.bg !== undefined ? f.bg : p.background;
  return `${bg ? `<rect x="${r3(box.x)}" y="${r3(box.y)}" width="${r3(box.w)}" height="${r3(box.h)}" fill="${bg}"/>` : ''}<g transform="translate(${r3(box.x)} ${r3(box.y)}) scale(${r3(s)})">${places.map((q) => placedMotif(p, d, q)).join('')}</g>`;
}

/** One element in local coordinates (no matrix) — shape with its fill. */
function elementBody(el: ArtEl, o: RenderOpts, id: string): string {
  if (el.kind === 'image') return `<image href="${el.src}" x="${r3(-el.w / 2)}" y="${r3(-el.h / 2)}" width="${r3(el.w)}" height="${r3(el.h)}" preserveAspectRatio="none"/>`;
  let shape = '', box = { x: 0, y: 0, w: 0, h: 0 }, rule = 'nonzero', textLive = '';
  if (el.kind === 'rect') { shape = `<rect x="${r3(-el.w / 2)}" y="${r3(-el.h / 2)}" width="${r3(el.w)}" height="${r3(el.h)}"${el.rx ? ` rx="${r3(el.rx)}"` : ''}/>`; box = { x: -el.w / 2, y: -el.h / 2, w: el.w, h: el.h }; }
  else if (el.kind === 'ellipse') { shape = `<ellipse cx="0" cy="0" rx="${r3(el.rx)}" ry="${r3(el.ry)}"/>`; box = { x: -el.rx, y: -el.ry, w: 2 * el.rx, h: 2 * el.ry }; }
  else if (el.kind === 'path') { shape = `<path d="${el.d}"/>`; box = { x: -el.w / 2, y: -el.h / 2, w: el.w, h: el.h }; rule = el.rule || 'nonzero'; }
  else if (el.kind === 'text') {
    const L = layoutText(el, o);
    const patterned = !!el.fill && typeof el.fill === 'object' && el.fill.type === 'pattern';
    const squeeze = L.sx !== 1 ? ` transform="scale(${r3(L.sx)} 1)"` : '';
    box = { x: -L.w / 2, y: -L.h / 2, w: L.w, h: L.h };
    // Live text can't carry a pattern fill — that text is always outlined.
    if ((o.textMode === 'live' && !patterned) || !L.d) {
      const fam = `'${el.font.replace(/'/g, '')}', sans-serif`;
      const ls = el.spacing ? ` letter-spacing="${r3(el.spacing * el.size)}"` : '';
      textLive = `<g${squeeze}>${L.lines.map((ln) => `<text x="${r3(ln.x)}" y="${r3(ln.baseline)}" font-family="${esc(fam)}" font-size="${r3(el.size)}" font-weight="${el.weight}"${el.italic ? ' font-style="italic"' : ''}${ls} xml:space="preserve">${esc(ln.text)}</text>`).join('')}</g>`;
    } else shape = `<g${squeeze}>${L.d}</g>`;
  }
  const f = (el as any).fill as Fill | null | undefined;
  const stroke = (el as any).stroke as string | null | undefined, sw = (el as any).strokeW as number | undefined;
  const strokeAttr = stroke && sw ? ` stroke="${stroke}" stroke-width="${r3(sw)}" stroke-linejoin="round" paint-order="stroke"` : '';
  const body = textLive || shape;
  if (!f) return `<g fill="none"${strokeAttr}>${body}</g>`;
  if (typeof f === 'string') return `<g fill="${f}" fill-rule="${rule}"${strokeAttr}>${body}</g>`;
  if (f.type === 'linear' || f.type === 'radial') {
    const gid = `${id}-g`;
    // Gradients are sized to the element's box (userSpace so text gets one gradient across all letters).
    const def = gradDef(gid, f).replace('<linearGradient ', `<linearGradient gradientUnits="userSpaceOnUse" `).replace('<radialGradient ', '<radialGradient gradientUnits="userSpaceOnUse" ');
    const toUser = (s: string) => s.replace(/(x1|x2|cx)="([\d.-]+)"/g, (_m, k, v) => `${k}="${r3(box.x + Number(v) * box.w)}"`).replace(/(y1|y2|cy)="([\d.-]+)"/g, (_m, k, v) => `${k}="${r3(box.y + Number(v) * box.h)}"`).replace(/ r="([\d.-]+)"/, (_m, v) => ` r="${r3(Number(v) * Math.max(box.w, box.h))}"`);
    return `<defs>${toUser(def)}</defs><g fill="url(#${gid})" fill-rule="${rule}"${strokeAttr}>${body}</g>`;
  }
  // Pattern fill: tiles clipped to the shape (vectors all the way).
  const cid = `${id}-c`;
  const clipBody = textLive ? '' : shape;
  const tiles = patternTiles(f, { x: box.x - 1, y: box.y - 1, w: box.w + 2, h: box.h + 2 });
  return `<defs><clipPath id="${cid}" clip-rule="${rule}">${clipBody}</clipPath></defs><g clip-path="url(#${cid})">${tiles}</g>${strokeAttr ? `<g fill="none"${strokeAttr}>${body}</g>` : ''}`;
}

let seq = 0;
// The browser registers a shaper once fonts are loaded; pure callers (tests) can pass their own.
let defaultShaper: Shaper | null = null;
export function setShaper(fn: Shaper | null) { defaultShaper = fn; }
export function getShaper(): Shaper | null { return defaultShaper; }

/** Elements in board coordinates, drawn into the space `pre` maps to (e.g. a piece's local space). */
export function renderArt(els: ArtEl[], pre: Mat, o: RenderOpts = {}): string {
  const uid = o.uid || `a${++seq}`;
  if (o.shaper === undefined) o = { ...o, shaper: defaultShaper };
  return els.filter((e) => !e.hidden).map((el, i) => {
    const m = mulM(pre, el.m);
    return `<g transform="${matStr(m)}"${el.opacity != null && el.opacity < 1 ? ` opacity="${r3(el.opacity)}"` : ''}>${elementBody(el, o, `${uid}-${i}`)}</g>`;
  }).join('');
}

/** A piece's artwork in its own local space (size-M mm) — mirrored pieces get their art pre-mirrored so it prints right-reading. */
export function pieceArt(els: ArtEl[], board: Board, pieceId: string, o: RenderOpts = {}): string {
  const bp = board.pieces.find((p) => p.piece.id === pieceId);
  if (!bp || !els.length) return '';
  const pre: Mat = bp.piece.mirror ? mulM([-1, 0, 0, 1, bp.piece.w, 0], translateM(-bp.x, -bp.y)) : translateM(-bp.x, -bp.y);
  return renderArt(els, pre, { ...o, uid: `${o.uid || 'p'}-${pieceId}` });
}

/** Every distinct font face the artwork uses (to load before rendering). */
export function artFonts(els: ArtEl[]): { font: string; weight: number; italic: boolean }[] {
  const seen = new Map<string, { font: string; weight: number; italic: boolean }>();
  for (const e of els) if (e.kind === 'text') seen.set(`${e.font}|${e.weight}|${e.italic ? 1 : 0}`, { font: e.font, weight: e.weight, italic: !!e.italic });
  return [...seen.values()];
}
/** Every text string the artwork produces for these garments (for outline caching). */
export function artUsesVars(els: ArtEl[]): boolean { return els.some((e) => e.kind === 'text' && /\{(NAME|NUMBER|SIZE|TEAM)\}/i.test(e.text)); }
