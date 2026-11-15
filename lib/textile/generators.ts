// Sublimation art generators — the "pro creator" kit of the print studio.
//
// Each generator draws a family of sportswear graphics (brush strokes,
// shattered shards, halftone fades, camouflage, flames, topographic lines,
// speed lines, geometric cuts, scales, waves, lightning…) as plain vector
// paths: one path per colour, seeded so a design can be regenerated exactly,
// varied with "new variation", or broken up and edited point by point. No
// raster, no stock artwork — everything is drawn here.

import type { ArtEl, Mat } from './art.ts';

export type GenKind = 'brush' | 'shards' | 'halftone' | 'camo' | 'flames' | 'topo' | 'speed' | 'cuts' | 'scales' | 'waves' | 'lightning' | 'pixels';
export interface GenParams {
  /** Colours drawn, in order (the garment colour shows through between). */
  colors: string[];
  seed: number;
  /** Overall amount / density 0–1. */
  density: number;
  /** Size of the marks, mm. */
  scale: number;
  /** Direction, degrees (0 = left → right, 90 = top → bottom). */
  angle: number;
  /** Where the graphic sits: whole piece, top, bottom, left, right, centre band, diagonal. */
  zone: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'band' | 'diagonal';
  /** Roughness / irregularity 0–1. */
  rough: number;
}
export interface GenSpec { kind: GenKind; params: GenParams; /** Board pieces it covers. */ pieces: string[] }

export const GENERATORS: { kind: GenKind; label: string; hint: string; defaults: Partial<GenParams> }[] = [
  { kind: 'brush', label: 'Brush strokes', hint: 'Grunge strokes with dry, torn edges', defaults: { density: 0.55, scale: 60, angle: -35, rough: 0.6, zone: 'diagonal' } },
  { kind: 'shards', label: 'Shattered shards', hint: 'Sharp splinters and glass cuts', defaults: { density: 0.5, scale: 120, angle: 30, rough: 0.5, zone: 'all' } },
  { kind: 'halftone', label: 'Halftone fade', hint: 'Dots that grow from one side', defaults: { density: 0.6, scale: 9, angle: 90, rough: 0, zone: 'bottom' } },
  { kind: 'camo', label: 'Camouflage', hint: 'Woodland blobs in 2–4 colours', defaults: { density: 0.65, scale: 70, angle: 0, rough: 0.5, zone: 'all' } },
  { kind: 'flames', label: 'Flames', hint: 'Fire tongues rising from the hem', defaults: { density: 0.6, scale: 90, angle: -90, rough: 0.5, zone: 'bottom' } },
  { kind: 'topo', label: 'Topographic lines', hint: 'Contour lines like a map', defaults: { density: 0.5, scale: 14, angle: 0, rough: 0.5, zone: 'all' } },
  { kind: 'speed', label: 'Speed lines', hint: 'Tapered streaks with motion', defaults: { density: 0.55, scale: 12, angle: -20, rough: 0.4, zone: 'all' } },
  { kind: 'cuts', label: 'Geometric cuts', hint: 'Bold angled panels and chevrons', defaults: { density: 0.5, scale: 200, angle: 35, rough: 0.3, zone: 'all' } },
  { kind: 'scales', label: 'Dragon scales', hint: 'Overlapping scale rows', defaults: { density: 0.7, scale: 34, angle: 0, rough: 0.2, zone: 'all' } },
  { kind: 'waves', label: 'Waves', hint: 'Flowing parallel waves', defaults: { density: 0.5, scale: 30, angle: 0, rough: 0.5, zone: 'all' } },
  { kind: 'lightning', label: 'Lightning', hint: 'Forked bolts', defaults: { density: 0.45, scale: 80, angle: 90, rough: 0.7, zone: 'all' } },
  { kind: 'pixels', label: 'Pixel fade', hint: 'Squares breaking up into the colour', defaults: { density: 0.6, scale: 16, angle: 90, rough: 0.5, zone: 'bottom' } },
];

export function genDefaults(kind: GenKind, colors: string[], seed = 1): GenParams {
  const d = GENERATORS.find((g) => g.kind === kind)!.defaults;
  return { colors, seed, density: 0.5, scale: 60, angle: 0, zone: 'all', rough: 0.5, ...d };
}

// ------------------------------------------------------------------ helpers
/** Seeded random (mulberry32). */
export function rng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth 2-D value noise in [0, 1]. */
function noise2(seed: number) {
  const h = (x: number, y: number) => { let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
const fbm = (n: (x: number, y: number) => number) => (x: number, y: number) => (n(x, y) * 0.6 + n(x * 2.1, y * 2.1) * 0.28 + n(x * 4.3, y * 4.3) * 0.12);
const f1 = (n: number) => Math.round(n * 10) / 10;
type P = [number, number];
const poly = (pts: P[]) => (pts.length > 2 ? `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z` : '');
/** Closed smooth curve through points (Catmull-Rom → cubic Bézier). */
function smoothClosed(pts: P[]): string {
  const n = pts.length; if (n < 3) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + 'Z';
}
function smoothOpen(pts: P[]): string {
  const n = pts.length; if (n < 2) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
/** A tapered ribbon along a centre line (stroke as a filled outline). */
function ribbon(line: P[], width: (t: number) => number, jag = 0, r?: () => number): string {
  if (line.length < 2) return '';
  const L: P[] = [], R: P[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, t = i / (line.length - 1);
    const w = width(t) / 2;
    const jl = jag && r ? 1 + (r() - 0.5) * jag : 1, jr = jag && r ? 1 + (r() - 0.5) * jag : 1;
    L.push([line[i][0] + nx * w * jl, line[i][1] + ny * w * jl]);
    R.push([line[i][0] - nx * w * jr, line[i][1] - ny * w * jr]);
  }
  return poly([...L, ...R.reverse()]);
}
const rot = (x: number, y: number, a: number, cx: number, cy: number): P => { const c = Math.cos(a), s = Math.sin(a); const dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };

/** 0–1 weight of the zone at (u, v) in [0, 1]² of the box: where the graphic is strongest. */
function zoneW(zone: GenParams['zone'], u: number, v: number): number {
  const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  switch (zone) {
    case 'top': return 1 - ss(0.25, 0.65, v);
    case 'bottom': return ss(0.35, 0.8, v);
    case 'left': return 1 - ss(0.25, 0.6, u);
    case 'right': return ss(0.4, 0.75, u);
    case 'band': return 1 - ss(0.12, 0.3, Math.abs(v - 0.45));
    case 'diagonal': return 1 - ss(0.12, 0.34, Math.abs(u - v) / 1.414);
    default: return 1;
  }
}

export interface Box { x: number; y: number; w: number; h: number }

// ------------------------------------------------------------------ generators (paths per colour, in board mm)
type Out = string[][]; // per colour: subpaths

function gen(kind: GenKind, b: Box, p: GenParams): Out {
  const r = rng(p.seed * 7919 + Math.round(b.x * 13 + b.y * 7));
  const nc = Math.max(1, p.colors.length);
  const out: Out = p.colors.map(() => []);
  const A = (p.angle * Math.PI) / 180;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const diag = Math.hypot(b.w, b.h);
  const inZone = (x: number, y: number) => zoneW(p.zone, (x - b.x) / b.w, (y - b.y) / b.h);
  const pick = () => Math.floor(r() * nc);
  const D = Math.max(0.05, Math.min(1, p.density));

  if (kind === 'brush') {
    // Dry-brush strokes: each stroke is a bundle of bristle streaks, parallel across its width,
    // each starting and stopping a little differently (the torn, dry ends of a real brush).
    const n = Math.round(8 + D * 34);
    for (let i = 0; i < n; i++) {
      const x0 = b.x + (r() * 1.2 - 0.1) * b.w, y0 = b.y + (r() * 1.2 - 0.1) * b.h;
      if (r() > inZone(x0, y0)) continue;
      const len = p.scale * (4 + r() * 8), wid = p.scale * (0.35 + r() * 0.9);
      const a = A + (r() - 0.5) * 0.25;
      const ca = Math.cos(a), sa = Math.sin(a);
      const bristles = Math.round(7 + wid / 4);
      const col = pick();
      const curve = (r() - 0.5) * p.scale * 0.8;
      for (let k = 0; k < bristles; k++) {
        const off = ((k + 0.5) / bristles - 0.5) * wid;
        const edge = Math.abs(off) / (wid / 2); // 0 centre → 1 edge: edges are drier (shorter, thinner)
        const t0 = r() * (0.05 + edge * 0.35 * (0.5 + p.rough)), t1 = 1 - r() * (0.05 + edge * 0.45 * (0.5 + p.rough));
        if (t1 - t0 < 0.12) continue;
        const bw = (wid / bristles) * (1.1 + r() * 0.9) * (1 - edge * 0.35);
        const line: P[] = [];
        for (let q = 0; q <= 10; q++) {
          const t = t0 + ((t1 - t0) * q) / 10, along = (t - 0.5) * len, bend = Math.sin(t * Math.PI) * curve + off + (r() - 0.5) * p.rough * 1.5;
          line.push([x0 + ca * along - sa * bend, y0 + sa * along + ca * bend]);
        }
        out[col].push(ribbon(line, (t) => bw * Math.min(1, t * 6, (1 - t) * 3) * (0.75 + 0.25 * Math.sin(t * 7 + k)), p.rough * 0.5, r));
      }
    }
  }

  if (kind === 'shards') {
    const n = Math.round(10 + D * 60);
    for (let i = 0; i < n; i++) {
      const x0 = b.x + r() * b.w, y0 = b.y + r() * b.h;
      if (r() > inZone(x0, y0)) continue;
      const a = A + (r() - 0.5) * (0.4 + p.rough * 1.2);
      const len = p.scale * (0.4 + r() * 1.6), wid = len * (0.08 + r() * 0.22);
      const tip: P = [x0 + Math.cos(a) * len, y0 + Math.sin(a) * len];
      const back: P = [x0 - Math.cos(a) * len * 0.25, y0 - Math.sin(a) * len * 0.25];
      const s1: P = [x0 - Math.sin(a) * wid, y0 + Math.cos(a) * wid], s2: P = [x0 + Math.sin(a) * wid * (0.3 + r()), y0 - Math.cos(a) * wid * (0.3 + r())];
      out[pick()].push(poly([tip, s1, back, s2]));
    }
  }

  if (kind === 'halftone') {
    const cell = Math.max(4, p.scale);
    const dir: P = [Math.cos(A), Math.sin(A)];
    const proj = (x: number, y: number) => ((x - cx) * dir[0] + (y - cy) * dir[1]) / (Math.abs(b.w * dir[0]) + Math.abs(b.h * dir[1])) + 0.5; // 0 → 1 along the direction
    const subs: string[] = [];
    for (let y = b.y; y <= b.y + b.h; y += cell) for (let x = b.x + ((Math.round((y - b.y) / cell) % 2) * cell) / 2; x <= b.x + b.w; x += cell) {
      const t = Math.max(0, Math.min(1, proj(x, y)));
      const w = p.zone === 'all' ? t : Math.max(t, 0) * inZone(x, y) + t * 0.0;
      const rad = (cell / 2) * 1.05 * Math.pow(Math.min(1, w * (0.4 + D)), 1.2);
      if (rad < 0.35) continue;
      subs.push(`M${f1(x - rad)} ${f1(y)}a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(2 * rad)} 0a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(-2 * rad)} 0Z`);
    }
    out[0].push(...subs);
  }

  if (kind === 'camo') {
    const n = noise2(p.seed);
    const layers = Math.max(1, nc);
    for (let li = 0; li < layers; li++) {
      const count = Math.round((b.w * b.h) / (p.scale * p.scale) * (0.25 + D * 0.5) / layers * 2.2);
      for (let i = 0; i < count; i++) {
        const x0 = b.x + r() * b.w, y0 = b.y + r() * b.h;
        if (r() > inZone(x0, y0)) continue;
        const R0 = p.scale * (0.35 + r() * 0.7), k = 9 + Math.floor(r() * 5), pts: P[] = [], ph = r() * 10;
        const stretch = 1 + p.rough * 0.8;
        for (let j = 0; j < k; j++) {
          const t = (j / k) * Math.PI * 2;
          const rr = R0 * (0.55 + 0.9 * n(Math.cos(t) * 1.3 + ph, Math.sin(t) * 1.3 + li * 3.7));
          const [xx, yy] = rot(x0 + Math.cos(t) * rr * stretch, y0 + Math.sin(t) * rr, A, x0, y0);
          pts.push([xx, yy]);
        }
        out[li % nc].push(smoothClosed(pts));
      }
    }
  }

  if (kind === 'flames') {
    const n = Math.round(5 + D * 18);
    const up = A; // direction flames rise
    const ux = Math.cos(up), uy = Math.sin(up);
    // Base line perpendicular to the rise direction, at the far edge.
    const baseC: P = [cx - ux * (b.w * Math.abs(ux) + b.h * Math.abs(uy)) / 2, cy - uy * (b.w * Math.abs(ux) + b.h * Math.abs(uy)) / 2];
    const span = b.w * Math.abs(uy) + b.h * Math.abs(ux);
    for (let li = 0; li < nc; li++) for (let i = 0; i < n; i++) {
      const off = (r() - 0.5) * span * 1.1;
      const bx = baseC[0] - uy * off, by = baseC[1] + ux * off;
      const height = p.scale * (2 + r() * 4) * (1 - li * 0.22) * (0.6 + D);
      const wid = p.scale * (0.5 + r() * 0.8) * (1 - li * 0.15);
      const steps = 12, line: P[] = [];
      const ph = r() * 6, amp = p.scale * 0.35 * (0.4 + p.rough);
      for (let k = 0; k <= steps; k++) { const t = k / steps; const sway = Math.sin(t * 3.2 + ph) * amp * t; line.push([bx + ux * t * height - uy * sway, by + uy * t * height + ux * sway]); }
      out[li].push(ribbon(line, (t) => wid * Math.pow(1 - t, 1.3) * (1 + 0.25 * Math.sin(t * 9 + ph)), 0));
    }
  }

  if (kind === 'topo') {
    const n = fbm(noise2(p.seed));
    const levels = Math.round(5 + D * 10);
    const step = Math.max(3, p.scale / 2);
    const fs = 1 / (p.scale * 28); // one hill every ~10 line gaps
    const W = Math.ceil(b.w / step) + 1, H = Math.ceil(b.h / step) + 1;
    const val = (i: number, j: number) => n((b.x + i * step) * fs * 3 + p.seed, (b.y + j * step) * fs * 3);
    const grid: number[][] = []; for (let j = 0; j < H; j++) { grid.push([]); for (let i = 0; i < W; i++) grid[j].push(val(i, j)); }
    const lw = Math.max(0.5, p.scale * 0.09);
    for (let L = 1; L <= levels; L++) {
      const th = 0.15 + (0.75 * L) / (levels + 1);
      const segs = marching(grid, th, b.x, b.y, step);
      for (const line of chain(segs)) {
        const mid = line[Math.floor(line.length / 2)];
        if (inZone(mid[0], mid[1]) < 0.5 && r() > inZone(mid[0], mid[1])) continue;
        if (line.length < 3) continue;
        const thin = line.filter((_, k) => k % 2 === 0 || k === line.length - 1); // lighter files, same look
        out[L % nc].push(ribbon(thin, () => lw, 0));
      }
    }
  }

  if (kind === 'speed') {
    const n = Math.round(15 + D * 90);
    for (let i = 0; i < n; i++) {
      const x0 = b.x + (r() * 1.4 - 0.2) * b.w, y0 = b.y + (r() * 1.4 - 0.2) * b.h;
      if (r() > inZone(x0, y0)) continue;
      const len = diag * (0.15 + r() * 0.5), wid = p.scale * (0.15 + r() * 0.9);
      const a = A + (r() - 0.5) * 0.06 * (1 + p.rough);
      const line: P[] = []; for (let q = 0; q <= 12; q++) { const t = q / 12; line.push([x0 + Math.cos(a) * len * t, y0 + Math.sin(a) * len * t]); }
      out[pick()].push(ribbon(line, (t) => wid * Math.min(1, t * 8) * Math.pow(1 - t, 0.8), 0));
    }
  }

  if (kind === 'cuts') {
    const n = Math.max(2, Math.round(2 + D * 6));
    const ux = Math.cos(A), uy = Math.sin(A);
    for (let i = 0; i < n; i++) {
      const off = (r() - 0.5) * diag * 0.9;
      const w = p.scale * (0.15 + r() * 0.6);
      const ox = cx - uy * off, oy = cy + ux * off;
      const L = diag * 0.8;
      const skew = (r() - 0.5) * w * p.rough * 2;
      const pts: P[] = [[ox - ux * L - uy * 0, oy - uy * L + ux * 0], [ox + ux * L, oy + uy * L], [ox + ux * L - uy * (w + skew), oy + uy * L + ux * (w + skew)], [ox - ux * L - uy * w, oy - uy * L + ux * w]];
      out[i % nc].push(poly(pts));
      if (r() < 0.5) { // chevron arm
        const ax = Math.cos(A + Math.PI / 2.4), ay = Math.sin(A + Math.PI / 2.4);
        out[(i + 1) % nc].push(poly([[ox, oy], [ox + ax * L * 0.6, oy + ay * L * 0.6], [ox + ax * L * 0.6 - ay * w * 0.4, oy + ay * L * 0.6 + ax * w * 0.4], [ox - ay * w * 0.4, oy + ax * w * 0.4]]));
      }
    }
  }

  if (kind === 'scales') {
    const s = Math.max(8, p.scale), rowH = s * 0.55;
    for (let row = 0, y = b.y - s; y < b.y + b.h + s; row++, y += rowH) for (let x = b.x - s + ((row % 2) * s) / 2; x < b.x + b.w + s; x += s) {
      if (r() > Math.max(0.05, inZone(x, y)) * (0.4 + D)) continue;
      const rr = s / 2, inner = rr * (0.55 + p.rough * 0.25);
      // A scale: a crescent (outer arc minus an inner arc), pointing down.
      out[(((row + Math.floor(x / s)) % nc) + nc) % nc].push(`M${f1(x - rr)} ${f1(y)}A${f1(rr)} ${f1(rr)} 0 0 0 ${f1(x + rr)} ${f1(y)}L${f1(x + inner)} ${f1(y)}A${f1(inner)} ${f1(inner * 0.8)} 0 0 1 ${f1(x - inner)} ${f1(y)}Z`);
    }
  }

  if (kind === 'waves') {
    const n = Math.round(6 + D * 30);
    const ux = Math.cos(A), uy = Math.sin(A);
    const gap = (diag * 1.2) / n;
    for (let i = 0; i < n; i++) {
      const off = (i - n / 2) * gap;
      const line: P[] = [];
      const ph = r() * 6, amp = p.scale * (0.5 + p.rough * r());
      for (let k = 0; k <= 40; k++) { const t = (k / 40 - 0.5) * diag * 1.2; const wv = Math.sin((t / (p.scale * 4)) + ph) * amp; line.push([cx + ux * t - uy * (off + wv), cy + uy * t + ux * (off + wv)]); }
      const mid = line[20];
      if (r() > inZone(mid[0], mid[1])) continue;
      out[i % nc].push(ribbon(line, () => gap * (0.25 + D * 0.4), 0));
    }
  }

  if (kind === 'lightning') {
    const n = Math.round(1 + D * 6);
    for (let i = 0; i < n; i++) {
      const x0 = b.x + r() * b.w, y0 = b.y - 20 + r() * b.h * 0.3;
      bolt(out[pick()], [x0, y0], A, diag * (0.4 + r() * 0.5), p.scale * 0.12, p.rough, r, 2);
    }
  }

  if (kind === 'pixels') {
    const s = Math.max(4, p.scale);
    const dir: P = [Math.cos(A), Math.sin(A)];
    const proj = (x: number, y: number) => ((x - cx) * dir[0] + (y - cy) * dir[1]) / (Math.abs(b.w * dir[0]) + Math.abs(b.h * dir[1])) + 0.5;
    for (let y = b.y; y < b.y + b.h; y += s) for (let x = b.x; x < b.x + b.w; x += s) {
      const t = proj(x + s / 2, y + s / 2);
      if (r() > Math.pow(Math.max(0, t), 1.5) * (0.3 + D) * (p.zone === 'all' ? 1 : Math.max(0.2, inZone(x, y)))) continue;
      const g = s * (0.06 + 0.1 * p.rough);
      out[pick()].push(poly([[x + g, y + g], [x + s - g, y + g], [x + s - g, y + s - g], [x + g, y + s - g]]));
    }
  }
  return out;
}

function bolt(sink: string[], start: P, a: number, len: number, w: number, rough: number, r: () => number, depth: number) {
  const pts: P[] = [start];
  const steps = 7 + Math.floor(r() * 4);
  let [x, y] = start;
  for (let i = 1; i <= steps; i++) {
    const seg = len / steps, da = (r() - 0.5) * (0.6 + rough * 1.4);
    x += Math.cos(a + da) * seg; y += Math.sin(a + da) * seg; pts.push([x, y]);
    if (depth > 0 && r() < 0.18 * (1 + rough)) bolt(sink, [x, y], a + (r() < 0.5 ? -0.7 : 0.7), len * 0.4, w * 0.6, rough, r, depth - 1);
  }
  sink.push(ribbon(pts, (t) => Math.max(0.6, w * (1 - t * 0.8)), 0));
}

/** Marching squares: segments of the iso-line at `th`. */
function marching(g: number[][], th: number, ox: number, oy: number, s: number): [P, P][] {
  const out: [P, P][] = [];
  const H = g.length, W = g[0].length;
  const lerp = (a: number, b: number) => (th - a) / (b - a || 1e-9);
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i];
    const idx = (a > th ? 8 : 0) | (b > th ? 4 : 0) | (c > th ? 2 : 0) | (d > th ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const x = ox + i * s, y = oy + j * s;
    const T: P = [x + lerp(a, b) * s, y], R: P = [x + s, y + lerp(b, c) * s], B: P = [x + lerp(d, c) * s, y + s], L: P = [x, y + lerp(a, d) * s];
    const map: Record<number, [P, P][]> = { 1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[T, L], [B, R]], 6: [[T, B]], 7: [[T, L]], 8: [[T, L]], 9: [[T, B]], 10: [[T, R], [L, B]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]] };
    out.push(...(map[idx] || []));
  }
  return out;
}
/** Joins segments that share end points into polylines. */
function chain(segs: [P, P][]): P[][] {
  const key = (p: P) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, i) => { for (const p of s) { const k = key(p); const l = ends.get(k); if (l) l.push(i); else ends.set(k, [i]); } });
  const used = new Uint8Array(segs.length);
  const lines: P[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line: P[] = [segs[i][0], segs[i][1]];
    for (const dir of [1, -1]) {
      for (;;) {
        const tip = dir === 1 ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find((j) => !used[j]);
        if (next == null) break;
        used[next] = 1;
        const s = segs[next];
        const other = key(s[0]) === key(tip) ? s[1] : s[0];
        if (dir === 1) line.push(other); else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * The generator's artwork over the given boxes (board mm), as a group of one
 * path per colour — ready to drop into the print studio and edit.
 */
export function generate(spec: GenSpec, boxes: Box[], m: Mat = [1, 0, 0, 1, 0, 0], idBase = 'g'): ArtEl {
  const per: string[][] = spec.params.colors.map(() => []);
  for (const b of boxes) {
    const o = gen(spec.kind, b, spec.params);
    o.forEach((subs, i) => per[i].push(...subs));
  }
  const label = GENERATORS.find((g) => g.kind === spec.kind)?.label || spec.kind;
  const els: ArtEl[] = per.map((subs, i) => ({ id: `${idBase}-${i}`, kind: 'path', d: subs.join('') || 'M0 0Z', w: 0, h: 0, fill: spec.params.colors[i], rule: 'nonzero', m: [1, 0, 0, 1, 0, 0], name: `${label} · colour ${i + 1}` } as ArtEl)).filter((e: any) => e.d !== 'M0 0Z');
  return { id: idBase, kind: 'group', els, m, name: label, gen: spec } as any;
}

/** Sizes of a generated element's path data (for the UI: keep files light). */
export const pathBytes = (el: ArtEl): number => (el.kind === 'group' ? el.els.reduce((s, e) => s + pathBytes(e), 0) : el.kind === 'path' ? el.d.length : 0);

// ------------------------------------------------------------------ ready designs (original, built from the generators)
export type ColourRole = 'accent' | 'accent2' | 'white' | 'black' | 'dark' | 'light' | 'mid';
export interface DesignLayer { kind: GenKind; colors: ColourRole[]; params?: Partial<GenParams>; pieces: 'body' | 'all' | 'sleeves' | 'front' }
export const DESIGNS: { id: string; label: string; layers: DesignLayer[] }[] = [
  { id: 'grunge-strike', label: 'Grunge strike', layers: [{ kind: 'brush', colors: ['accent', 'accent2'], pieces: 'body' }, { kind: 'halftone', colors: ['accent'], params: { zone: 'bottom', angle: 90 }, pieces: 'body' }] },
  { id: 'shattered', label: 'Shattered', layers: [{ kind: 'shards', colors: ['accent', 'accent2', 'light'], params: { density: 0.65 }, pieces: 'all' }] },
  { id: 'inferno', label: 'Inferno', layers: [{ kind: 'flames', colors: ['accent2', 'accent'], pieces: 'body' }, { kind: 'flames', colors: ['accent2'], params: { scale: 40, density: 0.4 }, pieces: 'sleeves' }] },
  { id: 'topo', label: 'Topo map', layers: [{ kind: 'topo', colors: ['accent', 'mid'], params: { density: 0.6 }, pieces: 'all' }] },
  { id: 'velocity', label: 'Velocity', layers: [{ kind: 'speed', colors: ['accent', 'white'], params: { density: 0.65 }, pieces: 'all' }, { kind: 'halftone', colors: ['accent'], params: { zone: 'top', angle: -90, density: 0.5 }, pieces: 'body' }] },
  { id: 'forest-camo', label: 'Forest camo', layers: [{ kind: 'camo', colors: ['dark', 'mid', 'light'], pieces: 'all' }] },
  { id: 'storm', label: 'Storm', layers: [{ kind: 'halftone', colors: ['mid'], params: { zone: 'top', angle: -90, scale: 7 }, pieces: 'body' }, { kind: 'lightning', colors: ['accent', 'white'], pieces: 'body' }] },
  { id: 'dragon', label: 'Dragon scales', layers: [{ kind: 'scales', colors: ['mid', 'accent'], params: { zone: 'top', density: 0.75 }, pieces: 'all' }] },
  { id: 'retro-waves', label: 'Retro waves', layers: [{ kind: 'waves', colors: ['accent', 'accent2'], params: { density: 0.45 }, pieces: 'all' }] },
  { id: 'pixel-burst', label: 'Pixel burst', layers: [{ kind: 'pixels', colors: ['accent', 'accent2'], pieces: 'body' }] },
  { id: 'chevron-cut', label: 'Chevron cut', layers: [{ kind: 'cuts', colors: ['accent', 'accent2'], params: { angle: 35, density: 0.55 }, pieces: 'body' }] },
  { id: 'brush-shards', label: 'Brush & shards', layers: [{ kind: 'shards', colors: ['mid'], params: { density: 0.35 }, pieces: 'all' }, { kind: 'brush', colors: ['accent'], params: { angle: -30 }, pieces: 'body' }] },
];

/** Colour roles from the garment's colours. */
export function roleColour(role: ColourRole, c: { body: string; accent: string; accent2: string }): string {
  const mix = (a: string, b: string, t: number) => { const pa = parseInt(a.slice(1, 7), 16), pb = parseInt(b.slice(1, 7), 16); const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`.toUpperCase(); };
  const body = /^#[0-9a-f]{6}/i.test(c.body) ? c.body : '#1E2A44';
  switch (role) {
    case 'accent': return c.accent; case 'accent2': return c.accent2; case 'white': return '#FFFFFF'; case 'black': return '#111111';
    case 'dark': return mix(body, '#000000', 0.35); case 'light': return mix(body, '#FFFFFF', 0.3); default: return mix(body, c.accent, 0.35);
  }
}
