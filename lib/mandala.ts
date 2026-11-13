// Rangoli & Mandala Maker — the drawing model (pure functions).
// A design is a list of layers drawn around the centre with N-fold
// symmetry: freehand strokes (optionally mirrored) and rings of motifs
// from the Pattern Studio library. Output is a clean vector SVG.

import { PATTERN_MOTIFS } from './patternMotifs.ts';
import { rng } from './patterns.ts';

export type Pt = [number, number]; // relative to the centre, in a 1000 × 1000 canvas
// Every layer can be turned around the centre (`turn`, degrees), hidden,
// and rings/dots can use a two-colour gradient.
interface Base { turn?: number; hidden?: boolean; gradient?: [string, string] | null }
export interface Stroke extends Base { kind: 'stroke'; pts: Pt[]; color: string; width: number; sym: number; mirror: boolean }
export interface Ring extends Base { kind: 'ring'; motif: string; count: number; radius: number; size: number; rotate: number; color: string; outline: boolean }
export interface Dots extends Base { kind: 'dots'; count: number; radius: number; size: number; color: string }
/** Straight lines from the centre outwards (radial spokes). */
export interface Spokes extends Base { kind: 'spokes'; count: number; r1: number; r2: number; width: number; color: string }
/** A decorative circle: plain line, scalloped edge or a dotted line. */
export interface Border extends Base { kind: 'border'; radius: number; width: number; color: string; style: 'line' | 'scallop' | 'dots' | 'double'; count: number }
export type MLayer = Stroke | Ring | Dots | Spokes | Border;
export interface Mandala { layers: MLayer[]; background: string; size: number }

export const RANGOLI_COLOURS = ['#E11D48', '#F97316', '#FACC15', '#16A34A', '#0EA5E9', '#7C3AED', '#DB2777', '#FFFFFF', '#111827', '#B45309'];
export const BACKGROUNDS = ['#1F2937', '#7F1D1D', '#FFF7ED', '#FFFFFF', '#0B3B2E', '#1E1B4B'];

const r1 = (n: number) => Math.round(n * 10) / 10;
const motifD = (id: string) => (PATTERN_MOTIFS.find((m) => m.id === id) || PATTERN_MOTIFS[0]).d;

function strokePath(pts: Pt[]): string {
  if (pts.length < 2) return pts.length ? `M${r1(pts[0][0])} ${r1(pts[0][1])}h0.1` : '';
  // Smooth with quadratic curves through midpoints.
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${r1(pts[i][0])} ${r1(pts[i][1])} ${r1(m[0])} ${r1(m[1])}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${r1(l[0])} ${r1(l[1])}`;
}

let gradSeq = 0;
/** SVG markup for one layer (centred on 0,0). */
export function layerSvg(l: MLayer): string {
  if (l.hidden) return '';
  const body = layerBody(l);
  const turn = l.turn ? ` transform="rotate(${r1(l.turn)})"` : '';
  if (l.gradient && (l.kind === 'ring' || l.kind === 'dots' || l.kind === 'spokes' || l.kind === 'border')) {
    // A radial gradient across the layer's reach, from the centre outwards.
    const id = `mg${++gradSeq}`;
    const reach = l.kind === 'ring' ? l.radius + l.size : l.kind === 'spokes' ? l.r2 : l.radius + (l.kind === 'dots' ? l.size : l.width * 3);
    const def = `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${r1(Math.max(10, reach))}"><stop offset="0%" stop-color="${l.gradient[0]}"/><stop offset="100%" stop-color="${l.gradient[1]}"/></radialGradient></defs>`;
    return `<g${turn}>${def}${body.split(`"${l.color}"`).join(`"url(#${id})"`)}</g>`;
  }
  return turn ? `<g${turn}>${body}</g>` : body;
}

function layerBody(l: MLayer): string {
  if (l.kind === 'spokes') {
    const out: string[] = [];
    for (let k = 0; k < l.count; k++) {
      const a = (k / l.count) * Math.PI * 2 - Math.PI / 2;
      out.push(`M${r1(Math.cos(a) * l.r1)} ${r1(Math.sin(a) * l.r1)}L${r1(Math.cos(a) * l.r2)} ${r1(Math.sin(a) * l.r2)}`);
    }
    return `<path d="${out.join('')}" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-linecap="round"/>`;
  }
  if (l.kind === 'border') {
    const R = l.radius;
    if (l.style === 'line') return `<circle r="${r1(R)}" fill="none" stroke="${l.color}" stroke-width="${l.width}"/>`;
    if (l.style === 'double') return `<g fill="none" stroke="${l.color}" stroke-width="${l.width}"><circle r="${r1(R)}"/><circle r="${r1(R + l.width * 2.5)}"/></g>`;
    if (l.style === 'dots') {
      const out: string[] = [];
      for (let k = 0; k < l.count; k++) { const a = (k / l.count) * Math.PI * 2; out.push(`<circle cx="${r1(Math.cos(a) * R)}" cy="${r1(Math.sin(a) * R)}" r="${r1(l.width)}" fill="${l.color}"/>`); }
      return `<g>${out.join('')}</g>`;
    }
    // Scalloped: arcs bulging outwards between points on the circle.
    const n = Math.max(6, l.count), bulge = (Math.PI * R) / n;
    let d = '';
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R];
      d += `${k ? '' : `M${r1(p0[0])} ${r1(p0[1])}`}A${r1(bulge)} ${r1(bulge)} 0 0 1 ${r1(p1[0])} ${r1(p1[1])}`;
    }
    return `<path d="${d}Z" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-linejoin="round"/>`;
  }
  if (l.kind === 'stroke') {
    const d = strokePath(l.pts);
    const one = `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const copies: string[] = [];
    for (let k = 0; k < l.sym; k++) {
      const a = r1((360 * k) / l.sym);
      copies.push(`<g transform="rotate(${a})">${one}</g>`);
      if (l.mirror) copies.push(`<g transform="rotate(${a}) scale(-1 1)">${one}</g>`);
    }
    return `<g>${copies.join('')}</g>`;
  }
  if (l.kind === 'dots') {
    const out: string[] = [];
    for (let k = 0; k < l.count; k++) {
      const a = (k / l.count) * Math.PI * 2 - Math.PI / 2;
      out.push(`<circle cx="${r1(Math.cos(a) * l.radius)}" cy="${r1(Math.sin(a) * l.radius)}" r="${r1(l.size)}" fill="${l.color}"/>`);
    }
    return `<g>${out.join('')}</g>`;
  }
  const d = motifD(l.motif);
  const k = l.size / 100;
  const paint = l.outline ? `fill="none" stroke="${l.color}" stroke-width="${r1(2.5 / k)}"` : `fill="${l.color}"`;
  const out: string[] = [];
  for (let i = 0; i < l.count; i++) {
    const deg = (360 * i) / l.count;
    out.push(`<path d="${d}" fill-rule="evenodd" ${paint} transform="rotate(${r1(deg)}) translate(0 ${r1(-l.radius)}) rotate(${l.rotate}) scale(${r1(k * 100) / 100})"/>`);
  }
  return `<g>${out.join('')}</g>`;
}

export function mandalaSvg(m: Mandala, opts: { transparent?: boolean; size?: number } = {}): string {
  const S = opts.size || m.size;
  const bg = opts.transparent ? '' : `<rect width="1000" height="1000" fill="${m.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${S}" height="${S}" viewBox="0 0 1000 1000">${bg}<g transform="translate(500 500)">${m.layers.map(layerSvg).join('')}</g></svg>`;
}

const FLORAL = ['petal', 'flower6', 'flower8', 'blossom5', 'leaf', 'leaf-slim', 'drop', 'paisley', 'cherry-blossom', 'lotus', 'diamond', 'star5', 'heart', 'tulip', 'petal4', 'moroccan', 'ogee', 'arabesque'];

/** A random, balanced rangoli: rings from the centre out, colours from a palette. */
export function surprise(seed: number, palette = RANGOLI_COLOURS): Mandala {
  const R = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const cols = [...palette].sort(() => R() - 0.5).filter((c) => c !== '#111827');
  const layers: MLayer[] = [];
  const sym = pick([6, 8, 10, 12, 16]);
  layers.push({ kind: 'ring', motif: pick(['flower8', 'blossom6', 'flower12', 'mandala', 'rose']), count: 1, radius: 0, size: 150, rotate: 0, color: cols[0], outline: false });
  let r = 110;
  for (let ring = 0; ring < 5; ring++) {
    const size = 70 + R() * 50;
    const count = ring < 2 ? sym : sym * (R() > 0.5 ? 2 : 1);
    layers.push({ kind: 'ring', motif: pick(FLORAL), count, radius: r + size * 0.35, size, rotate: R() > 0.5 ? 180 : 0, color: cols[(ring + 1) % cols.length], outline: R() > 0.8 });
    layers.push({ kind: 'dots', count: count * 2, radius: r + size * 0.85, size: 5 + R() * 4, color: cols[(ring + 3) % cols.length] });
    r += size * 0.95;
    if (r > 440) break;
  }
  return { layers, background: pick(BACKGROUNDS), size: 1000 };
}


// ---------------------------------------------------------------- guided start

export type MKind = 'rangoli' | 'mandala' | 'diwali' | 'floral' | 'geometric' | 'custom';
export const KINDS: { id: MKind; label: string; hint: string }[] = [
  { id: 'rangoli', label: 'Rangoli', hint: 'Bright rings of petals and dots' },
  { id: 'diwali', label: 'Diwali rangoli', hint: 'Lamps, lotus and warm colours' },
  { id: 'floral', label: 'Floral rangoli', hint: 'Flowers and leaves' },
  { id: 'mandala', label: 'Mandala', hint: 'Fine, calm and balanced' },
  { id: 'geometric', label: 'Geometric mandala', hint: 'Lines, stars and shapes' },
  { id: 'custom', label: 'Custom symmetry', hint: 'Start blank and draw' },
];

export const MANDALA_PALETTES: { name: string; colors: string[]; background: string }[] = [
  { name: 'Festive', colors: ['#E11D48', '#F97316', '#FACC15', '#16A34A', '#0EA5E9', '#FFFFFF'], background: '#1F2937' },
  { name: 'Diwali gold', colors: ['#F59E0B', '#FDE68A', '#DC2626', '#7C2D12', '#FFFFFF', '#F97316'], background: '#2B0F3A' },
  { name: 'Lotus pink', colors: ['#DB2777', '#F9A8D4', '#FDF2F8', '#16A34A', '#FACC15', '#7C3AED'], background: '#1E1B4B' },
  { name: 'Peacock', colors: ['#0E7490', '#14B8A6', '#1D4ED8', '#FACC15', '#16A34A', '#F1F5F9'], background: '#0B3B2E' },
  { name: 'Chalk white', colors: ['#FFFFFF', '#F1F5F9', '#CBD5E1', '#FDE68A', '#FCA5A5', '#E2E8F0'], background: '#7F1D1D' },
  { name: 'Ink on paper', colors: ['#111827', '#374151', '#6B7280', '#1E3A5F', '#9CA3AF', '#111827'], background: '#FFF7ED' },
  { name: 'Marigold', colors: ['#EA580C', '#F59E0B', '#FDE047', '#B91C1C', '#FFF7ED', '#15803D'], background: '#FFF7ED' },
];

const KIND_MOTIFS: Record<MKind, string[]> = {
  rangoli: ['petal', 'flower6', 'flower8', 'drop', 'leaf', 'diamond', 'heart', 'petal4'],
  diwali: ['drop', 'lotus', 'petal', 'flower8', 'paisley', 'diamond', 'sun', 'star5'],
  floral: ['blossom5', 'flower6', 'cherry-blossom', 'tulip', 'leaf', 'leaf-slim', 'lotus', 'petal'],
  mandala: ['petal', 'leaf-slim', 'drop', 'arabesque', 'moroccan', 'ogee', 'petal4', 'diamond'],
  geometric: ['diamond', 'triangle', 'star5', 'snowflake', 'moroccan', 'dot', 'petal4', 'ogee'],
  custom: ['petal'],
};

/** Ready starting designs for a kind (deterministic: same kind + n = same design). */
export function preset(kind: MKind, n: number, sym = 8, palette = MANDALA_PALETTES[kind === 'diwali' ? 1 : kind === 'mandala' || kind === 'geometric' ? 5 : 0]): Mandala {
  if (kind === 'custom') return { layers: [{ kind: 'border', radius: 460, width: 4, color: palette.colors[0], style: 'line', count: 48 }], background: palette.background, size: 1000 };
  const R = rng(1000 * (KINDS.findIndex((k) => k.id === kind) + 1) + n * 7919);
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const cols = palette.colors;
  const motifs = KIND_MOTIFS[kind];
  const layers: MLayer[] = [];
  const centre = kind === 'geometric' ? 'snowflake' : kind === 'diwali' ? 'lotus' : pick(['flower8', 'blossom6', 'flower12', 'mandala', 'rose']);
  layers.push({ kind: 'ring', motif: PATTERN_MOTIFS.some((m) => m.id === centre) ? centre : 'flower8', count: 1, radius: 0, size: 140, rotate: 0, color: cols[0], outline: kind === 'mandala' });
  let r = 105;
  for (let ring = 0; ring < 5 && r < 430; ring++) {
    const size = (kind === 'mandala' ? 55 : 70) + R() * 45;
    const count = ring < 2 ? sym : sym * (R() > 0.5 ? 2 : 1);
    const motif = pick(motifs);
    layers.push({ kind: 'ring', motif: PATTERN_MOTIFS.some((m) => m.id === motif) ? motif : 'petal', count, radius: r + size * 0.35, size, rotate: R() > 0.5 ? 180 : 0, color: cols[(ring + 1) % cols.length], outline: kind === 'mandala' ? R() > 0.3 : R() > 0.85 });
    if (kind === 'geometric' && ring % 2 === 0) layers.push({ kind: 'spokes', count: sym * 2, r1: r - 10, r2: r + size * 0.8, width: 3, color: cols[(ring + 2) % cols.length] });
    else layers.push({ kind: 'dots', count: count * 2, radius: r + size * 0.85, size: 4 + R() * 4, color: cols[(ring + 3) % cols.length] });
    if (kind === 'mandala' && ring === 2) layers.push({ kind: 'border', radius: r + size * 0.95, width: 3, color: cols[1], style: 'double', count: 48 });
    r += size * 0.95;
  }
  layers.push({ kind: 'border', radius: Math.min(470, r + 10), width: kind === 'diwali' ? 5 : 4, color: cols[2 % cols.length], style: kind === 'mandala' || kind === 'geometric' ? 'line' : 'scallop', count: sym * 3 });
  return { layers, background: palette.background, size: 1000 };
}

/** Recolours every layer from a palette (cycling), keeping the design. */
export function recolour(m: Mandala, palette: { colors: string[]; background: string }): Mandala {
  return { ...m, background: palette.background, layers: m.layers.map((l, i) => ({ ...l, color: palette.colors[i % palette.colors.length], gradient: null })) };
}

/** Changes the symmetry of every ring, spoke and drawn stroke (counts become multiples of n). */
export function withSymmetry(m: Mandala, n: number): Mandala {
  return {
    ...m, layers: m.layers.map((l) => {
      if (l.kind === 'stroke') return { ...l, sym: n };
      if (l.kind === 'ring' && l.count > 1) return { ...l, count: l.count >= 2 * n - 1 && l.count > n ? n * 2 : n };
      if (l.kind === 'spokes') return { ...l, count: n * Math.max(1, Math.round(l.count / n)) };
      if (l.kind === 'dots') return { ...l, count: n * Math.max(1, Math.round(l.count / n)) };
      return l;
    }),
  };
}

export function layerLabel(l: MLayer): string {
  switch (l.kind) {
    case 'stroke': return `Drawing · ${l.sym}× ${l.mirror ? 'mirrored' : ''}`.trim();
    case 'ring': return l.count === 1 ? `Centre · ${l.motif}` : `Ring · ${l.count} ${l.motif}`;
    case 'dots': return `Dots · ${l.count}`;
    case 'spokes': return `Lines · ${l.count}`;
    case 'border': return `Border · ${l.style}`;
  }
}
