// Wall graphics and vehicle graphics (pure functions, millimetres).
//
// Walls: a wall of any size filled with the current pattern and optional
// lettering, split into numbered print strips for the chosen roll width
// with overlap and alignment marks.
//
// Vehicles: GENERIC body outlines (original drawings by category with
// typical dimensions) — not model-specific wrap templates. Every file says
// so and asks for the real vehicle to be measured before printing.

import { sheetPlacements, motifPath, layout } from './patterns.ts';
import type { PatternSettings } from './patterns.ts';
import { pathBox } from './pathFit.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SVG = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r2(w)}mm" height="${r2(h)}mm" viewBox="0 0 ${r2(w)} ${r2(h)}">${body}</svg>`;

/** Every motif of the pattern over a w × h mm area, as paths. */
export function patternArea(p: PatternSettings, w: number, h: number, repeatMm: number): string {
  const d = motifPath(p);
  if (!d) return '';
  const s = repeatMm / layout(p).w;
  return sheetPlacements(p, w / s, h / s)
    .map((q) => `<path d="${d}" fill="${q.color}" fill-rule="evenodd" transform="scale(${r2(s * 10000) / 10000}) translate(${q.x} ${q.y}) rotate(${q.angle}) scale(${q.sx} ${q.sy})"/>`)
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

// ---------------------------------------------------------------- vehicles

export interface VehicleTemplate { id: string; label: string; lengthMm: number; heightMm: number; widthMm: number; side: string; windows: string[]; wheels: [number, number][]; wheelR: number }
const V = (pts: string, L: number, H: number) => pts.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_m, x, y) => `${r2(Number(x) * L)} ${r2(Number(y) * H)}`);

function veh(id: string, label: string, L: number, H: number, W: number, side: string, windows: string[], wheels: [number, number][], r: number): VehicleTemplate {
  return { id, label, lengthMm: L, heightMm: H, widthMm: W, side: V(side, L, H), windows: windows.map((w) => V(w, L, H)), wheels: wheels.map(([x, y]) => [r2(x * L), r2(y * H)] as [number, number]), wheelR: r2(r * H) };
}

// Original simplified profiles (front of the vehicle on the left).
export const VEHICLES: VehicleTemplate[] = [
  veh('hatchback', 'Hatchback (generic)', 4050, 1480, 1750,
    'M0.02,0.60 L0.03,0.47 Q0.05,0.41 0.17,0.39 L0.30,0.36 Q0.38,0.10 0.50,0.07 L0.80,0.07 Q0.90,0.09 0.95,0.30 L0.98,0.45 L0.98,0.74 Q0.97,0.80 0.93,0.80 L0.07,0.80 Q0.02,0.80 0.02,0.72 Z',
    ['M0.33,0.36 Q0.40,0.15 0.50,0.12 L0.60,0.12 L0.60,0.36 Z', 'M0.62,0.12 L0.80,0.12 Q0.87,0.14 0.91,0.32 L0.62,0.36 Z'], [[0.19, 0.8], [0.8, 0.8]], 0.2),
  veh('sedan', 'Sedan (generic)', 4750, 1450, 1820,
    'M0.02,0.62 L0.03,0.46 Q0.05,0.40 0.18,0.38 L0.29,0.36 Q0.36,0.12 0.45,0.08 L0.66,0.08 Q0.74,0.10 0.80,0.33 L0.95,0.38 Q0.99,0.42 0.99,0.55 L0.99,0.72 Q0.98,0.78 0.94,0.78 L0.06,0.78 Q0.02,0.78 0.02,0.70 Z',
    ['M0.33,0.36 Q0.39,0.15 0.46,0.13 L0.55,0.13 L0.55,0.36 Z', 'M0.57,0.13 L0.65,0.13 Q0.71,0.16 0.76,0.35 L0.57,0.36 Z'], [[0.2, 0.78], [0.79, 0.78]], 0.21),
  veh('suv', 'SUV (generic)', 4650, 1750, 1900,
    'M0.02,0.58 L0.02,0.44 Q0.04,0.38 0.16,0.36 L0.27,0.33 Q0.33,0.08 0.42,0.06 L0.90,0.06 Q0.96,0.07 0.97,0.20 L0.99,0.42 L0.99,0.75 Q0.98,0.80 0.94,0.80 L0.06,0.80 Q0.02,0.80 0.02,0.72 Z',
    ['M0.30,0.33 Q0.35,0.12 0.43,0.11 L0.55,0.11 L0.55,0.33 Z', 'M0.57,0.11 L0.74,0.11 L0.74,0.33 L0.57,0.33 Z', 'M0.76,0.11 L0.92,0.11 Q0.95,0.12 0.95,0.20 L0.95,0.33 L0.76,0.33 Z'], [[0.19, 0.8], [0.8, 0.8]], 0.19),
  veh('van', 'Panel van (generic)', 5300, 2300, 2000,
    'M0.02,0.68 L0.02,0.50 Q0.03,0.40 0.10,0.36 L0.17,0.10 Q0.19,0.04 0.26,0.04 L0.97,0.04 Q0.99,0.04 0.99,0.08 L0.99,0.82 Q0.99,0.86 0.95,0.86 L0.05,0.86 Q0.02,0.86 0.02,0.80 Z',
    ['M0.13,0.36 L0.19,0.12 Q0.20,0.09 0.24,0.09 L0.30,0.09 L0.30,0.36 Z'], [[0.17, 0.86], [0.8, 0.86]], 0.14),
  veh('pickup', 'Pickup truck (generic)', 5350, 1850, 1900,
    'M0.02,0.60 L0.02,0.46 Q0.04,0.40 0.15,0.38 L0.24,0.34 Q0.29,0.08 0.37,0.06 L0.56,0.06 Q0.60,0.07 0.61,0.14 L0.62,0.42 L0.99,0.42 L0.99,0.76 Q0.98,0.80 0.94,0.80 L0.06,0.80 Q0.02,0.80 0.02,0.72 Z',
    ['M0.27,0.34 Q0.31,0.12 0.38,0.11 L0.46,0.11 L0.46,0.34 Z', 'M0.48,0.11 L0.56,0.11 Q0.58,0.12 0.58,0.17 L0.58,0.34 L0.48,0.34 Z'], [[0.18, 0.8], [0.81, 0.8]], 0.2),
  veh('minibus', 'Minibus / coach (generic)', 7000, 2700, 2200,
    'M0.01,0.80 L0.01,0.15 Q0.01,0.04 0.06,0.04 L0.97,0.04 Q0.99,0.04 0.99,0.10 L0.99,0.84 Q0.99,0.88 0.96,0.88 L0.04,0.88 Q0.01,0.88 0.01,0.84 Z',
    ['M0.02,0.12 L0.08,0.10 L0.08,0.45 L0.02,0.45 Z', 'M0.12,0.12 L0.95,0.12 L0.95,0.40 L0.12,0.40 Z'], [[0.15, 0.88], [0.82, 0.88]], 0.12),
];

export interface VehicleJob { vehicle: string; maker: string; model: string; year: string; body: string; windowTint: string; stripe: 'none' | 'racing' | 'side' | 'swoosh'; stripeColor: string; patternLower: boolean; repeatMm: number; text: string; textColor: string; logo?: string | null }
export const DEFAULT_VEHICLE: VehicleJob = { vehicle: 'van', maker: '', model: '', year: '', body: '#FFFFFF', windowTint: '#2F3A46', stripe: 'swoosh', stripeColor: '#3B82C4', patternLower: false, repeatMm: 300, text: 'Your Company', textColor: '#1E3A5F', logo: null };

let vseq = 0;
function sideArt(v: VehicleTemplate, job: VehicleJob, p: PatternSettings, glyph: string | null | undefined, mirror: boolean): string {
  const L = v.lengthMm, H = v.heightMm, id = `vb${++vseq}`;
  const parts: string[] = [`<defs><clipPath id="${id}"><path d="${v.side}"/></clipPath></defs>`];
  parts.push(`<path d="${v.side}" fill="${job.body}"/>`);
  parts.push(`<g clip-path="url(#${id})">`);
  if (job.patternLower) parts.push(`<g transform="translate(0 ${r2(H * 0.55)})">${patternArea(p, L, H * 0.45, job.repeatMm)}</g>`);
  if (job.stripe === 'racing') parts.push(`<rect x="0" y="${r2(H * 0.48)}" width="${L}" height="${r2(H * 0.06)}" fill="${job.stripeColor}"/><rect x="0" y="${r2(H * 0.56)}" width="${L}" height="${r2(H * 0.025)}" fill="${job.stripeColor}"/>`);
  if (job.stripe === 'side') parts.push(`<rect x="0" y="${r2(H * 0.62)}" width="${L}" height="${r2(H * 0.1)}" fill="${job.stripeColor}"/>`);
  if (job.stripe === 'swoosh') parts.push(`<path d="M0 ${r2(H * 0.78)}C${r2(L * 0.35)} ${r2(H * 0.7)} ${r2(L * 0.55)} ${r2(H * 0.45)} ${L} ${r2(H * 0.3)}L${L} ${r2(H * 0.45)}C${r2(L * 0.6)} ${r2(H * 0.6)} ${r2(L * 0.35)} ${r2(H * 0.82)} 0 ${r2(H * 0.9)}Z" fill="${job.stripeColor}"/>`);
  parts.push('</g>');
  for (const w of v.windows) parts.push(`<path d="${w}" fill="${job.windowTint}"/>`);
  parts.push(`<path d="${v.side}" fill="none" stroke="#222" stroke-width="6"/>`);
  for (const [x, y] of v.wheels) parts.push(`<circle cx="${x}" cy="${y}" r="${v.wheelR}" fill="#1B1B1B"/><circle cx="${x}" cy="${y}" r="${r2(v.wheelR * 0.55)}" fill="#9AA3AD"/>`);
  // Lettering and logo on the side panel; counter-mirrored on the right side so they read correctly.
  const tx = L * 0.55, ty = H * 0.5;
  const unflip = mirror ? `transform="translate(${r2(2 * tx)} 0) scale(-1 1)"` : '';
  const letters = lettering(glyph, job.text, tx, ty, H * 0.1, L * 0.42, job.textColor);
  const logo = job.logo ? `<image href="${job.logo}" x="${r2(tx - H * 0.12)}" y="${r2(ty - H * 0.3)}" width="${r2(H * 0.24)}" height="${r2(H * 0.16)}" preserveAspectRatio="xMidYMid meet"/>` : '';
  parts.push(`<g ${unflip}>${letters}${logo}</g>`);
  return mirror ? `<g transform="translate(${L} 0) scale(-1 1)">${parts.join('')}</g>` : parts.join('');
}

function endView(v: VehicleTemplate, job: VehicleJob, rear: boolean): string {
  const W = v.widthMm, H = v.heightMm;
  const tall = v.id === 'van' || v.id === 'minibus';
  const body = `M${r2(W * 0.04)} ${r2(H * 0.82)}L${r2(W * 0.02)} ${r2(H * 0.45)}Q${r2(W * 0.03)} ${r2(H * 0.38)} ${r2(W * 0.12)} ${r2(H * 0.36)}L${r2(W * (tall ? 0.08 : 0.2))} ${r2(H * 0.06)}L${r2(W * (tall ? 0.92 : 0.8))} ${r2(H * 0.06)}L${r2(W * 0.88)} ${r2(H * 0.36)}Q${r2(W * 0.97)} ${r2(H * 0.38)} ${r2(W * 0.98)} ${r2(H * 0.45)}L${r2(W * 0.96)} ${r2(H * 0.82)}Z`;
  const glass = `M${r2(W * (tall ? 0.12 : 0.24))} ${r2(H * 0.11)}L${r2(W * (tall ? 0.88 : 0.76))} ${r2(H * 0.11)}L${r2(W * 0.84)} ${r2(H * 0.34)}L${r2(W * 0.16)} ${r2(H * 0.34)}Z`;
  const lights = rear ? `<rect x="${r2(W * 0.06)}" y="${r2(H * 0.48)}" width="${r2(W * 0.14)}" height="${r2(H * 0.08)}" fill="#C0392B"/><rect x="${r2(W * 0.8)}" y="${r2(H * 0.48)}" width="${r2(W * 0.14)}" height="${r2(H * 0.08)}" fill="#C0392B"/>` : `<rect x="${r2(W * 0.06)}" y="${r2(H * 0.48)}" width="${r2(W * 0.16)}" height="${r2(H * 0.07)}" fill="#F4F1DE" stroke="#222" stroke-width="4"/><rect x="${r2(W * 0.78)}" y="${r2(H * 0.48)}" width="${r2(W * 0.16)}" height="${r2(H * 0.07)}" fill="#F4F1DE" stroke="#222" stroke-width="4"/><rect x="${r2(W * 0.3)}" y="${r2(H * 0.5)}" width="${r2(W * 0.4)}" height="${r2(H * 0.1)}" fill="#2B2B2B"/>`;
  return `<path d="${body}" fill="${job.body}" stroke="#222" stroke-width="6"/><path d="${glass}" fill="${job.windowTint}"/>${lights}<rect x="${r2(W * 0.08)}" y="${r2(H * 0.82)}" width="${r2(W * 0.16)}" height="${r2(H * 0.12)}" rx="20" fill="#1B1B1B"/><rect x="${r2(W * 0.76)}" y="${r2(H * 0.82)}" width="${r2(W * 0.16)}" height="${r2(H * 0.12)}" rx="20" fill="#1B1B1B"/>`;
}

export const GENERIC_NOTE = 'Generic template — not an exact model-specific wrap template. Measure the vehicle and check panels, handles and trims before printing.';

/** Layout sheet: left side, right side, front and rear, with dimensions and the generic-template note. */
export function vehicleSheetSvg(job: VehicleJob, p: PatternSettings, glyph?: string | null): { svg: string; widthMm: number; heightMm: number; template: VehicleTemplate } {
  const v = VEHICLES.find((x) => x.id === job.vehicle) || VEHICLES[0];
  const gap = 400, L = v.lengthMm, H = v.heightMm, W = v.widthMm;
  const width = L + gap + W * 2 + gap * 2, height = H * 2 + gap * 3 + 300;
  const lab = (x: number, y: number, t: string, size = 90) => `<text x="${r2(x)}" y="${r2(y)}" font-family="sans-serif" font-size="${size}" fill="#555">${esc(t)}</text>`;
  const ref = [job.maker, job.model, job.year].filter(Boolean).join(' ');
  const body = [
    `<rect width="${r2(width)}" height="${r2(height)}" fill="#FFFFFF"/>`,
    lab(gap, gap - 120, `LEFT SIDE · ${L} × ${H} mm (typical)`),
    `<g transform="translate(${gap} ${gap})">${sideArt(v, job, p, glyph, false)}</g>`,
    lab(gap, gap * 2 + H - 120, `RIGHT SIDE · mirrored`),
    `<g transform="translate(${gap} ${gap * 2 + H})">${sideArt(v, job, p, glyph, true)}</g>`,
    lab(gap * 2 + L, gap - 120, `FRONT · ${W} mm wide`),
    `<g transform="translate(${gap * 2 + L} ${gap})">${endView(v, job, false)}</g>`,
    lab(gap * 2 + L, gap * 2 + H - 120, 'REAR'),
    `<g transform="translate(${gap * 2 + L} ${gap * 2 + H})">${endView(v, job, true)}</g>`,
    lab(gap, height - 200, `${v.label}${ref ? ` · for: ${ref}` : ''}`, 110),
    `<text x="${gap}" y="${r2(height - 70)}" font-family="sans-serif" font-size="80" font-weight="700" fill="#B45309">${esc(GENERIC_NOTE)}</text>`,
  ].join('');
  return { svg: SVG(width, height, body), widthMm: width, heightMm: height, template: v };
}
