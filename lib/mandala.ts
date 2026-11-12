// Rangoli & Mandala Maker — the drawing model (pure functions).
// A design is a list of layers drawn around the centre with N-fold
// symmetry: freehand strokes (optionally mirrored) and rings of motifs
// from the Pattern Studio library. Output is a clean vector SVG.

import { PATTERN_MOTIFS } from './patternMotifs.ts';
import { rng } from './patterns.ts';

export type Pt = [number, number]; // relative to the centre, in a 1000 × 1000 canvas
export interface Stroke { kind: 'stroke'; pts: Pt[]; color: string; width: number; sym: number; mirror: boolean }
export interface Ring { kind: 'ring'; motif: string; count: number; radius: number; size: number; rotate: number; color: string; outline: boolean }
export interface Dots { kind: 'dots'; count: number; radius: number; size: number; color: string }
export type MLayer = Stroke | Ring | Dots;
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

/** SVG markup for one layer (centred on 0,0). */
export function layerSvg(l: MLayer): string {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 1000 1000">${bg}<g transform="translate(500 500)">${m.layers.map(layerSvg).join('')}</g></svg>`;
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
