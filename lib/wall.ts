// Wall designs (pure functions, millimetres): wall posters in standard
// print sizes, and wallpaper / wall patterns of any size filled with a
// pattern and optional lettering, split into numbered print strips for the
// chosen roll width with overlap and alignment marks.

import { sheetPlacements, motifPath, layout, placedMotif } from './patterns.ts';
import type { PatternSettings } from './patterns.ts';
import { pathBox } from './pathFit.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SVG = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r2(w)}mm" height="${r2(h)}mm" viewBox="0 0 ${r2(w)} ${r2(h)}">${body}</svg>`;

/** Every motif of the pattern over a w × h mm area, as paths. */
export function patternArea(p: PatternSettings, w: number, h: number, repeatMm: number): string {
  const d = motifPath(p);
  if (!d && !(p.motif === 'image' && p.image)) return '';
  const s = repeatMm / layout(p).w;
  return sheetPlacements(p, w / s, h / s)
    .map((q) => placedMotif(p, d, q, `scale(${r2(s * 10000) / 10000}) `))
    .join('');
}

/** Lettering from a traced outline (-50…50 box), centred at cx, cy with cap height h, max width. */
export function lettering(d: string | null | undefined, text: string, cx: number, cy: number, h: number, maxW: number, color: string, font = 'sans-serif'): string {
  if (!text) return '';
  if (!d) return `<text x="${r2(cx)}" y="${r2(cy)}" font-family="${esc(font)}" font-size="${r2(h * 1.35)}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="${color}">${esc(text)}</text>`;
  const b = pathBox(d);
  let s = h / Math.max(1e-6, b.h);
  if (b.w * s > maxW) s = maxW / b.w;
  return `<path d="${d}" fill="${color}" fill-rule="evenodd" transform="translate(${r2(cx)} ${r2(cy)}) scale(${r2(s * 10000) / 10000}) translate(${r2(-(b.x + b.w / 2))} ${r2(-(b.y + b.h / 2))})"/>`;
}

// ---------------------------------------------------------------- walls

export const WALL_ROLLS = [{ mm: 530, label: '53 cm wallpaper' }, { mm: 680, label: '68 cm' }, { mm: 1000, label: '100 cm' }, { mm: 1370, label: '137 cm vinyl' }, { mm: 1520, label: '152 cm vinyl' }];

export interface WallJob { widthMm: number; heightMm: number; rollMm: number; overlapMm: number; repeatMm: number; background: string; text: string; textColor: string; textMm: number; textY: number; patternOpacity: number }
export const DEFAULT_WALL: WallJob = { widthMm: 3000, heightMm: 2400, rollMm: 1370, overlapMm: 10, repeatMm: 200, background: '#F7F3EA', text: '', textColor: '#1E3A5F', textMm: 250, textY: 0.5, patternOpacity: 1 };

function wallArt(job: WallJob, p: PatternSettings, glyph: string | null | undefined, font: string): string {
  return `<rect width="${job.widthMm}" height="${job.heightMm}" fill="${job.background}"/><g opacity="${job.patternOpacity}">${patternArea(p, job.widthMm, job.heightMm, job.repeatMm)}</g>${lettering(glyph, job.text, job.widthMm / 2, job.heightMm * job.textY, job.textMm, job.widthMm * 0.9, job.textColor, font)}`;
}

/** The whole wall (for the preview and the overview file). */
export function wallSvg(job: WallJob, p: PatternSettings, glyph?: string | null, font = 'sans-serif'): string {
  return SVG(job.widthMm, job.heightMm, wallArt(job, p, glyph, font));
}

/** Numbered strips the width of the roll, each with the overlap on its right edge. */
export function wallStrips(job: WallJob, p: PatternSettings, glyph?: string | null, font = 'sans-serif'): { svg: string; widthMm: number; heightMm: number; x: number }[] {
  const step = Math.max(50, job.rollMm - job.overlapMm);
  const n = Math.max(1, Math.ceil((job.widthMm - job.overlapMm) / step));
  const art = wallArt(job, p, glyph, font);
  const out: { svg: string; widthMm: number; heightMm: number; x: number }[] = [];
  const foot = 20; // label strip under the artwork
  for (let i = 0; i < n; i++) {
    const x = i * step, w = Math.min(job.rollMm, job.widthMm - x);
    const marks = `<g stroke="#EC008C" stroke-width="0.5" fill="none">${i > 0 ? `<path d="M${job.overlapMm} 0V${job.heightMm}" stroke-dasharray="4 3"/>` : ''}<path d="M0 ${job.heightMm}V${job.heightMm + 8}M${r2(w)} ${job.heightMm}V${job.heightMm + 8}"/></g>`;
    const label = `<text x="4" y="${job.heightMm + 15}" font-family="sans-serif" font-size="8" fill="#555">${esc(`Strip ${i + 1} of ${n} · ${Math.round(x)}–${Math.round(x + w)} mm from the left · ${Math.round(w)} × ${job.heightMm} mm${i > 0 ? ` · overlap ${job.overlapMm} mm on the left (dashed line)` : ''}`)}</text>`;
    const body = `<defs><clipPath id="s${i}"><rect width="${r2(w)}" height="${job.heightMm}"/></clipPath></defs><g clip-path="url(#s${i})"><g transform="translate(${r2(-x)} 0)">${art}</g></g>${marks}${label}`;
    out.push({ svg: SVG(w, job.heightMm + foot, body), widthMm: w, heightMm: job.heightMm + foot, x });
  }
  return out;
}

// ---------------------------------------------------------------- posters

export interface PosterSize { id: string; label: string; wMm: number; hMm: number }
export const POSTER_SIZES: PosterSize[] = [
  { id: 'a3', label: 'A3 · 297 × 420 mm', wMm: 297, hMm: 420 },
  { id: 'a2', label: 'A2 · 420 × 594 mm', wMm: 420, hMm: 594 },
  { id: 'a1', label: 'A1 · 594 × 841 mm', wMm: 594, hMm: 841 },
  { id: 'a0', label: 'A0 · 841 × 1189 mm', wMm: 841, hMm: 1189 },
  { id: '50x70', label: '50 × 70 cm', wMm: 500, hMm: 700 },
  { id: '70x100', label: '70 × 100 cm', wMm: 700, hMm: 1000 },
  { id: '18x24', label: '18 × 24 in', wMm: 457.2, hMm: 609.6 },
  { id: '24x36', label: '24 × 36 in', wMm: 609.6, hMm: 914.4 },
];

/** Editor link for a blank poster at its real size (px at 96 per inch), with bleed and safe area in mm. */
export function posterEditorUrl(wMm: number, hMm: number, o: { landscape?: boolean; bleedMm?: number; safeMm?: number; dpi?: number } = {}): string {
  const px = (mm: number) => String(Math.round((mm / 25.4) * 96 * 1000) / 1000);
  const [w, h] = o.landscape ? [hMm, wMm] : [wMm, hMm];
  const q = new URLSearchParams({ w: px(w), h: px(h), dpi: String(o.dpi || 150), bg: 'white' });
  const b = px(o.bleedMm ?? 3), sa = px(o.safeMm ?? 10);
  for (const k of ['T', 'R', 'B', 'L']) { q.set(`bleed${k}`, b); q.set(`safe${k}`, sa); }
  q.set('newTab', `poster-${Math.round(w)}x${Math.round(h)}-${Date.now().toString(36)}`);
  return `/editor?${q.toString()}`;
}

// ---------------------------------------------------------------- rolls

export interface Opening { kind: 'door' | 'window' | 'other'; widthMm: number; heightMm: number }
export interface RoomWall { name: string; widthMm: number; heightMm: number; openings: Opening[] }
export interface RollSpec { rollWidthMm: number; rollLengthMm: number; repeatMm: number; match: 'straight' | 'half-drop' | 'free'; trimMm: number; extraPct: number }
export interface WallCount { name: string; drops: number; dropMm: number; areaM2: number; netAreaM2: number }
export interface RollEstimate { walls: WallCount[]; drops: number; dropsPerRoll: number; rolls: number; rollsWithExtra: number; areaM2: number; netAreaM2: number; note: string | null }

/**
 * Rolls of wallpaper for a room. Each wall needs ceil(width ÷ roll width)
 * full-height drops; a door or window removes only the drops it fully
 * spans across its width (partial drops above/below are still needed).
 * A drop is the wall height + trim, rounded up to the pattern repeat
 * (half-drop patterns need an extra half repeat to match).
 */
export function rollEstimate(walls: RoomWall[], r: RollSpec): RollEstimate {
  const rep = Math.max(0, r.repeatMm);
  const out: WallCount[] = [];
  let maxDrop = 0;
  for (const w of walls) {
    const base = w.heightMm + r.trimMm;
    let drop = rep > 0 && r.match !== 'free' ? Math.ceil(base / rep) * rep : base;
    if (rep > 0 && r.match === 'half-drop') drop += rep / 2;
    maxDrop = Math.max(maxDrop, drop);
    const full = Math.ceil(Math.max(0, w.widthMm) / r.rollWidthMm);
    // Openings save the drops they cover completely (over 90 % of the height), counted across their width.
    const saved = w.openings.reduce((s, o) => s + (o.heightMm >= w.heightMm * 0.9 ? Math.floor(o.widthMm / r.rollWidthMm) : 0), 0);
    const openArea = w.openings.reduce((s, o) => s + o.widthMm * o.heightMm, 0) / 1e6;
    out.push({ name: w.name, drops: Math.max(0, full - saved), dropMm: drop, areaM2: (w.widthMm * w.heightMm) / 1e6, netAreaM2: Math.max(0, (w.widthMm * w.heightMm) / 1e6 - openArea) });
  }
  const drops = out.reduce((s, w) => s + w.drops, 0);
  const dropsPerRoll = maxDrop > 0 ? Math.floor(r.rollLengthMm / maxDrop) : 0;
  const rolls = dropsPerRoll > 0 ? Math.ceil(drops / dropsPerRoll) : 0;
  return {
    walls: out, drops, dropsPerRoll, rolls,
    rollsWithExtra: Math.ceil(rolls * (1 + Math.max(0, r.extraPct) / 100)),
    areaM2: out.reduce((s, w) => s + w.areaM2, 0), netAreaM2: out.reduce((s, w) => s + w.netAreaM2, 0),
    note: dropsPerRoll === 0 ? 'The wall is taller than one roll — choose longer rolls or print panels instead.' : null,
  };
}
