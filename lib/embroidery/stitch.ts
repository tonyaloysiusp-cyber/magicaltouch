// Embroidery stitch engine (pure; runs in tests). Turns vector shapes (mm)
// into machine stitches:
//   fill    — tatami rows at an angle, staggered so no lines show, with a
//             sparse underlay across the rows first;
//   satin   — zig-zag column of a set width along each outline (borders,
//             lettering outlines, thin lines), centre-run underlay;
//   running — single or triple (bean) stitch along each outline.
// Between objects the needle jumps (with a trim when the jump is long) and
// the colour changes when the thread does. Machine files: Tajima DST and
// Melco EXP (units 0.1 mm).

import { flatten, normalize, type Ring } from '../textile/vector.ts';

export type StitchType = 'fill' | 'satin' | 'running' | 'zigzag' | 'motif' | 'applique' | 'decorative';
export const STITCH_LABEL: Record<StitchType, string> = { fill: 'Tatami / fill', satin: 'Satin', running: 'Running / bean', zigzag: 'Zigzag', motif: 'Motif', applique: 'Appliqué', decorative: 'Decorative (blanket)' };
export interface EmbObject {
  id: string;
  name: string;
  d: string;            // SVG path in mm (design space, y down)
  type: StitchType;
  colour: string;       // #rrggbb
  thread?: string;      // the customer's own thread name / code
  angle?: number;       // fill direction (°)
  spacing?: number;     // mm between fill rows / satin zigzags (density)
  stitchLen?: number;   // mm, fill and running
  width?: number;       // mm, satin column width
  underlay?: boolean;
  triple?: boolean;     // running: bean stitch
  hidden?: boolean;
  /** Pull compensation (mm): satin / fill widened across the stitch direction to make up for thread pull. */
  pull?: number;
  /** Push compensation (mm): fill rows shortened at their ends (thread pushes the fabric out along the stitch). */
  push?: number;
  /** Tie-in / tie-off: small lock stitches at the start and end of the object. */
  tie?: boolean;
  /** Where the object starts: nearest point to this corner of its box. */
  start?: 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'centre';
  /** Motif stitch: the shape repeated along the line. */
  motif?: 'diamond' | 'cross' | 'wave' | 'triangle';
}
/** 'stop' pauses the machine without a new colour (appliqué: lay the fabric, trim it). In DST it is written like a colour change. */
export type Cmd = 'stitch' | 'jump' | 'trim' | 'color' | 'stop' | 'end';
export interface Stitch { x: number; y: number; cmd: Cmd }

export const DEFAULTS = { fillSpacing: 0.4, fillLen: 3.5, satinSpacing: 0.4, satinWidth: 3, runLen: 2.5, maxStitch: 7, trimOver: 3 };

type Pt = [number, number];
const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function rings(d: string, tol = 0.1): { pts: Ring; closed: boolean }[] {
  return flatten(normalize(d), tol).filter((r) => r.pts.length >= 2);
}

/** Points every `len` mm along a polyline (the first and last point included). */
export function resample(pts: Pt[], len: number, closed = false): Pt[] {
  const src = closed && pts.length > 2 ? [...pts, pts[0]] : pts;
  const out: Pt[] = [src[0]];
  let need = len; // distance still to go before the next sample
  for (let i = 1; i < src.length; i++) {
    let a = src[i - 1];
    const b = src[i];
    let L = dist(a, b);
    while (L >= need) {
      const t = need / L;
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      out.push(a); L -= need; need = len;
    }
    need -= L;
  }
  const last = src[src.length - 1];
  if (dist(out[out.length - 1], last) > len * 0.2) out.push(last);
  return out;
}

/** Tatami fill of a shape (even-odd rings), rows `spacing` apart at `angle`, stitches up to `len`. */
export function fillStitches(rs: Ring[], angle: number, spacing: number, len: number, stagger = true): Pt[][] {
  const a = (angle * Math.PI) / 180;
  const R = rs.map((r) => r.map((p) => rot(p as Pt, -a)));
  let y0 = Infinity, y1 = -Infinity;
  for (const r of R) for (const p of r) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  if (!Number.isFinite(y0)) return [];
  type SegR = { row: number; x0: number; x1: number; y: number };
  const segs: SegR[] = [];
  let row = 0;
  for (let y = y0 + spacing / 2; y < y1; y += spacing, row++) {
    const xs: number[] = [];
    for (const r of R) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[j], [bx, by] = r[i];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > 0.3) segs.push({ row, x0: xs[k], x1: xs[k + 1], y });
  }
  // Walk the rows back and forth; when the next row has no overlapping piece, start a new block (a jump).
  const used = new Array(segs.length).fill(false);
  const byRow = new Map<number, number[]>();
  segs.forEach((s, i) => { if (!byRow.has(s.row)) byRow.set(s.row, []); byRow.get(s.row)!.push(i); });
  const blocks: Pt[][] = [];
  const rowPts = (s: SegR, dir: number, n: number): Pt[] => {
    const off = stagger ? ((n % 3) / 3) * len : 0;
    const a0 = dir > 0 ? s.x0 : s.x1, a1 = dir > 0 ? s.x1 : s.x0;
    const pts: Pt[] = [[a0, s.y]];
    const L = s.x1 - s.x0;
    for (let t = len - off; t < L - 0.2; t += len) if (t > 0.2) pts.push([a0 + dir * t, s.y]);
    pts.push([a1, s.y]);
    return pts;
  };
  let remaining = segs.length;
  while (remaining > 0) {
    let i = used.findIndex((u) => !u);
    const block: Pt[] = [];
    let dir = 1, n = 0;
    while (i >= 0) {
      used[i] = true; remaining--;
      const s = segs[i];
      block.push(...rowPts(s, dir, n));
      dir = -dir; n++;
      const next = (byRow.get(s.row + 1) || []).filter((j) => !used[j] && segs[j].x0 < s.x1 && segs[j].x1 > s.x0);
      // Prefer the piece nearest to where the needle is.
      const at = block[block.length - 1][0];
      next.sort((p, q) => Math.min(Math.abs(segs[p].x0 - at), Math.abs(segs[p].x1 - at)) - Math.min(Math.abs(segs[q].x0 - at), Math.abs(segs[q].x1 - at)));
      i = next.length ? next[0] : -1;
    }
    blocks.push(block.map((p) => rot(p, a)));
  }
  return blocks;
}

/** Satin column of `width` along a centre line, zig-zag every `spacing` mm. */
export function satinStitches(line: Pt[], width: number, spacing: number, closed: boolean): Pt[] {
  const c = resample(line, Math.max(0.15, spacing), closed);
  const out: Pt[] = [];
  for (let i = 0; i < c.length; i++) {
    const p = c[i], q = c[Math.min(c.length - 1, i + 1)], o = c[Math.max(0, i - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1];
    const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const side = i % 2 ? 1 : -1;
    out.push([p[0] - ty * (width / 2) * side, p[1] + tx * (width / 2) * side]);
  }
  return out;
}

export function runningStitches(line: Pt[], len: number, closed: boolean, triple = false): Pt[] {
  const r = resample(line, len, closed);
  if (!triple) return r;
  const out: Pt[] = [r[0]];
  for (let i = 1; i < r.length; i++) out.push(r[i], r[i - 1], r[i]);
  return out;
}

/** Long stitches split so none is longer than `max` mm (machines can't make them). */
function split(a: Pt, b: Pt, max: number): Pt[] {
  const L = dist(a, b);
  if (L <= max) return [b];
  const n = Math.ceil(L / max), out: Pt[] = [];
  for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  return out;
}

/** Stitch paths of one object (each path is sewn continuously; the needle jumps between them). */
export function objectPaths(o: EmbObject): Pt[][] {
  const rs = rings(o.d);
  if (!rs.length) return [];
  const pull = Math.max(0, o.pull ?? 0), push = Math.max(0, o.push ?? 0);
  let paths: Pt[][];
  if (o.type === 'fill') {
    const closed = rs.map((r) => (pull ? grow(pull / 2)(r.pts) : r.pts));
    const sp = o.spacing || DEFAULTS.fillSpacing, len = o.stitchLen || DEFAULTS.fillLen, ang = o.angle ?? 45;
    const top = fillStitches(closed, ang, sp, len).map((b) => (push ? pushIn(b, push, ang) : b));
    const under = o.underlay === false ? [] : fillStitches(closed.map(shrink(0.6)), ang + 90, Math.max(1.5, sp * 5), 3, false);
    paths = [...under, ...top];
  } else if (o.type === 'satin' || o.type === 'zigzag') {
    const w = (o.width || DEFAULTS.satinWidth) + pull, sp = o.type === 'zigzag' ? Math.max(1.2, o.spacing || 2) : o.spacing || DEFAULTS.satinSpacing;
    paths = rs.flatMap((r) => {
      const under = o.underlay === false || o.type === 'zigzag' ? [] : [runningStitches(r.pts as Pt[], 2, r.closed)];
      return [...under, satinStitches(r.pts as Pt[], w, sp, r.closed)];
    });
  } else if (o.type === 'motif') {
    paths = rs.map((r) => motifStitches(r.pts as Pt[], o.motif || 'diamond', o.width || 3, o.stitchLen || 4, r.closed));
  } else if (o.type === 'decorative') {
    paths = rs.map((r) => blanketStitches(r.pts as Pt[], o.width || 3, o.stitchLen || 3, r.closed));
  } else if (o.type === 'applique') {
    // 1 placement line (machine stops: lay the fabric) → 2 tack-down → 3 satin cover over the cut edge.
    paths = rs.flatMap((r) => [runningStitches(r.pts as Pt[], 2.5, r.closed), runningStitches(shrink(0.8)(r.pts) as Pt[], 2.5, r.closed), satinStitches(r.pts as Pt[], (o.width || 3) + pull, o.spacing || DEFAULTS.satinSpacing, r.closed)]);
  } else {
    paths = rs.map((r) => runningStitches(r.pts as Pt[], o.stitchLen || DEFAULTS.runLen, r.closed, !!o.triple));
  }
  paths = paths.filter((p) => p.length);
  if (o.start && o.start !== 'auto' && paths.length) paths = startAt(paths, o.d, o.start);
  if (o.tie !== false && paths.length) {
    paths[0] = tieIn(paths[0]);
    paths[paths.length - 1] = tieOff(paths[paths.length - 1]);
  }
  return paths;
}

/** Lock stitches: tiny back-and-forth at the start / end (0.6 mm) so the thread does not pull out. */
function tieIn(p: Pt[]): Pt[] {
  if (p.length < 2) return p;
  const [a, b] = p, L = dist(a, b) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, k = Math.min(0.6, L / 2);
  return [a, [a[0] + ux * k, a[1] + uy * k], a, [a[0] + ux * k, a[1] + uy * k], ...p.slice(1)];
}
function tieOff(p: Pt[]): Pt[] {
  if (p.length < 2) return p;
  const b = p[p.length - 1], a = p[p.length - 2], L = dist(a, b) || 1, ux = (a[0] - b[0]) / L, uy = (a[1] - b[1]) / L, k = Math.min(0.6, L / 2);
  return [...p, [b[0] + ux * k, b[1] + uy * k], b, [b[0] + ux * k, b[1] + uy * k], b];
}
/** Starts the object at the path end nearest to the chosen corner (paths are reordered; a closed path is rotated). */
function startAt(paths: Pt[][], d: string, where: NonNullable<EmbObject['start']>): Pt[][] {
  const pts = rings(d).flatMap((r) => r.pts as Pt[]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const target: Pt = where === 'centre' ? [(x0 + x1) / 2, (y0 + y1) / 2] : [where.endsWith('left') ? x0 : x1, where.startsWith('top') ? y0 : y1];
  let best = 0, bd = Infinity, rev = false;
  paths.forEach((p, i) => { const a = dist(p[0], target), b = dist(p[p.length - 1], target); if (a < bd) { bd = a; best = i; rev = false; } if (b < bd) { bd = b; best = i; rev = true; } });
  const first = rev ? paths[best].slice().reverse() : paths[best];
  return [first, ...paths.filter((_, i) => i !== best)];
}
/** Pushes a ring outward by `mm` (pull compensation). */
const grow = (mm: number) => (r: Ring): Ring => {
  let cx = 0, cy = 0; for (const p of r) { cx += p[0]; cy += p[1]; } cx /= r.length; cy /= r.length;
  return r.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; const k = (d + mm) / d; return [cx + (x - cx) * k, cy + (y - cy) * k]; });
};
/** Push compensation: each row end pulled back along the stitch direction. */
function pushIn(block: Pt[], mm: number, angle: number): Pt[] {
  const a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
  return block.map((p, i) => {
    const prev = block[i - 1], next = block[i + 1];
    const turnA = !prev || Math.abs((p[0] - prev[0]) * uy - (p[1] - prev[1]) * ux) > 0.05;
    const turnB = !next || Math.abs((next[0] - p[0]) * uy - (next[1] - p[1]) * ux) > 0.05;
    if (!turnA && !turnB) return p;
    // A row end: move it back towards the row it belongs to.
    const other = turnA ? next : prev;
    if (!other) return p;
    const dir = Math.sign((other[0] - p[0]) * ux + (other[1] - p[1]) * uy) || 0;
    return [p[0] + ux * dir * mm / 2, p[1] + uy * dir * mm / 2] as Pt;
  });
}
/** Motif stitch: a small shape repeated along the line. */
function motifStitches(line: Pt[], m: NonNullable<EmbObject['motif']>, size: number, step: number, closed: boolean): Pt[] {
  const c = resample(line, Math.max(1, step), closed), out: Pt[] = [];
  for (let i = 0; i < c.length; i++) {
    const p = c[i], q = c[Math.min(c.length - 1, i + 1)], o = c[Math.max(0, i - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const nx = -ty, ny = tx, h = size / 2, s = step / 2;
    const at = (u: number, v: number): Pt => [p[0] + tx * u + nx * v, p[1] + ty * u + ny * v];
    if (m === 'diamond') out.push(at(0, 0), at(s / 2, h), at(s, 0), at(s / 2, -h), at(0, 0));
    else if (m === 'cross') out.push(at(0, 0), at(s / 2, h), at(s / 2, -h), at(s, 0));
    else if (m === 'triangle') out.push(at(0, 0), at(s / 2, h), at(s, 0));
    else out.push(at(0, 0), at(s / 3, h), at((2 * s) / 3, -h), at(s, 0));
  }
  return out;
}
/** Blanket (E) stitch along an outline: a spoke inward every `step` mm. */
function blanketStitches(line: Pt[], depth: number, step: number, closed: boolean): Pt[] {
  const c = resample(line, Math.max(1, step), closed), out: Pt[] = [];
  for (let i = 0; i < c.length; i++) {
    const p = c[i], q = c[Math.min(c.length - 1, i + 1)], o = c[Math.max(0, i - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    out.push(p, [p[0] - ty * depth, p[1] + tx * depth], p);
  }
  return out;
}

/** Pulls a ring a little towards its centre (underlay stays inside the top stitches). */
const shrink = (mm: number) => (r: Ring): Ring => {
  let cx = 0, cy = 0; for (const p of r) { cx += p[0]; cy += p[1]; } cx /= r.length; cy /= r.length;
  return r.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; const k = Math.max(0, d - mm) / d; return [cx + (x - cx) * k, cy + (y - cy) * k]; });
};

/** The whole design as one stitch list (objects in order; colour change when the thread changes). */
export function stitchDesign(objects: EmbObject[], o: { maxStitch?: number; trimOver?: number } = {}): Stitch[] {
  const max = o.maxStitch ?? DEFAULTS.maxStitch, trimOver = o.trimOver ?? DEFAULTS.trimOver;
  const out: Stitch[] = [];
  let cur: Pt | null = null, colour: string | null = null;
  for (const ob of objects.filter((x) => !x.hidden)) {
    const paths = objectPaths(ob).filter((p) => p.length);
    if (!paths.length) continue;
    if (colour !== null && ob.colour.toLowerCase() !== colour) { out.push({ x: cur![0], y: cur![1], cmd: 'trim' }, { x: cur![0], y: cur![1], cmd: 'color' }); }
    colour = ob.colour.toLowerCase();
    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi];
      // Appliqué: stop after the placement line (lay the fabric) and after the tack-down (trim it).
      if (ob.type === 'applique' && cur && pi > 0 && pi % 3 !== 0) out.push({ x: cur[0], y: cur[1], cmd: 'trim' }, { x: cur[0], y: cur[1], cmd: 'stop' });
      const start = path[0];
      if (!cur) { out.push({ x: start[0], y: start[1], cmd: 'jump' }); }
      else if (dist(cur, start) > 0.05) {
        const far = dist(cur, start) > trimOver;
        if (far) out.push({ x: cur[0], y: cur[1], cmd: 'trim' });
        if (far) for (const q of split(cur, start, max)) out.push({ x: q[0], y: q[1], cmd: 'jump' });
        else out.push({ x: start[0], y: start[1], cmd: 'stitch' });
      }
      cur = start;
      for (let i = 1; i < path.length; i++) {
        for (const q of split(cur, path[i], max)) out.push({ x: q[0], y: q[1], cmd: 'stitch' });
        cur = path[i];
      }
    }
  }
  if (cur) out.push({ x: cur[0], y: cur[1], cmd: 'end' });
  return out;
}

export interface Summary { stitches: number; colours: { name: string; hex: string; stitches: number }[]; sizeMm: [number, number]; jumps: number; trims: number; stops?: number; minutes: number }
export function summarise(objects: EmbObject[], st: Stitch[], spm = 700): Summary {
  const vis = objects.filter((o) => !o.hidden);
  const colours: Summary['colours'] = [];
  let ci = -1, n = 0, jumps = 0, trims = 0, stops = 0, prevColour = '';
  for (const o of vis) if (o.colour.toLowerCase() !== prevColour) { colours.push({ name: o.thread || o.colour.toUpperCase(), hex: o.colour, stitches: 0 }); prevColour = o.colour.toLowerCase(); }
  ci = colours.length ? 0 : -1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of st) {
    if (s.cmd === 'stitch') { n++; if (ci >= 0) colours[ci].stitches++; x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
    else if (s.cmd === 'jump') jumps++;
    else if (s.cmd === 'trim') trims++;
    else if (s.cmd === 'stop') stops++;
    else if (s.cmd === 'color') ci = Math.min(colours.length - 1, ci + 1);
  }
  return { stitches: n, colours, sizeMm: n ? [x1 - x0, y1 - y0] : [0, 0], jumps, trims, stops, minutes: Math.ceil(n / spm + (colours.length + stops) * 0.5) };
}

// ── Machine files ──────────────────────────────────────────────────────────
function dstRecord(dx: number, dy: number, kind: 'stitch' | 'jump' | 'color'): number[] {
  let b0 = 0, b1 = 0, b2 = 0, x = dx, y = dy;
  if (x > 40) { b2 |= 0x04; x -= 81; } if (x < -40) { b2 |= 0x08; x += 81; }
  if (x > 13) { b1 |= 0x04; x -= 27; } if (x < -13) { b1 |= 0x08; x += 27; }
  if (x > 4) { b0 |= 0x04; x -= 9; } if (x < -4) { b0 |= 0x08; x += 9; }
  if (x > 1) { b1 |= 0x01; x -= 3; } if (x < -1) { b1 |= 0x02; x += 3; }
  if (x > 0) { b0 |= 0x01; x -= 1; } if (x < 0) { b0 |= 0x02; x += 1; }
  if (y > 40) { b2 |= 0x20; y -= 81; } if (y < -40) { b2 |= 0x10; y += 81; }
  if (y > 13) { b1 |= 0x20; y -= 27; } if (y < -13) { b1 |= 0x10; y += 27; }
  if (y > 4) { b0 |= 0x20; y -= 9; } if (y < -4) { b0 |= 0x10; y += 9; }
  if (y > 1) { b1 |= 0x80; y -= 3; } if (y < -1) { b1 |= 0x40; y += 3; }
  if (y > 0) { b0 |= 0x80; y -= 1; } if (y < 0) { b0 |= 0x40; y += 1; }
  b2 |= 0x03;
  if (kind === 'jump') b2 |= 0x80;
  if (kind === 'color') b2 |= 0xC0;
  return [b0, b1, b2];
}

/** Tajima DST (0.1 mm units, y up; moves over 12.1 mm are split; a trim = three small jumps). */
export function toDst(st: Stitch[], label = 'MAGICAL'): Uint8Array {
  const recs: number[] = [];
  let px = 0, py = 0, count = 0, colours = 0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  const first = st.find((s) => s.cmd !== 'end');
  const ox = first ? Math.round(first.x * 10) : 0, oy = first ? Math.round(first.y * 10) : 0;
  const move = (tx: number, ty: number, kind: 'stitch' | 'jump') => {
    while (tx !== px || ty !== py) {
      const dx = Math.max(-121, Math.min(121, tx - px)), dy = Math.max(-121, Math.min(121, ty - py));
      const k = tx - px === dx && ty - py === dy ? kind : 'jump';
      recs.push(...dstRecord(dx, -dy, k)); px += dx; py += dy; count++;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  };
  for (const s of st) {
    const tx = Math.round(s.x * 10) - ox, ty = Math.round(s.y * 10) - oy;
    if (s.cmd === 'stitch') { if (tx === px && ty === py) { recs.push(...dstRecord(0, 0, 'stitch')); count++; } else move(tx, ty, 'stitch'); }
    else if (s.cmd === 'jump') move(tx, ty, 'jump');
    else if (s.cmd === 'trim') { for (const [dx, dy] of [[2, 2], [-4, -4], [2, 2]]) { recs.push(...dstRecord(dx, dy, 'jump')); count++; } }
    else if (s.cmd === 'color' || s.cmd === 'stop') { recs.push(...dstRecord(0, 0, 'color')); count++; colours++; }
  }
  recs.push(0x00, 0x00, 0xF3);
  const pad = (v: string, n: number) => v.slice(0, n).padEnd(n, ' ');
  const num = (v: number, n: number) => String(Math.max(0, Math.round(v))).padStart(n, ' ');
  const header = `LA:${pad(label.replace(/[^\x20-\x7E]/g, ''), 16)}\rST:${num(count, 7)}\rCO:${num(colours, 3)}\r+X:${num(maxX, 5)}\r-X:${num(-minX, 5)}\r+Y:${num(-minY, 5)}\r-Y:${num(maxY, 5)}\rAX:+    0\rAY:+    0\rMX:+    0\rMY:+    0\rPD:******\r\x1a`;
  const out = new Uint8Array(512 + recs.length);
  out.fill(0x20, 0, 512);
  for (let i = 0; i < header.length; i++) out[i] = header.charCodeAt(i);
  out.set(recs, 512);
  return out;
}

/** Reads a DST back (for checks): absolute positions in mm (y down) with commands. */
export function readDst(bytes: Uint8Array): { stitches: Stitch[]; header: string } {
  const header = new TextDecoder('latin1').decode(bytes.subarray(0, 512));
  const out: Stitch[] = [];
  let x = 0, y = 0;
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    if (b2 === 0xF3 && b0 === 0 && b1 === 0) { out.push({ x: x / 10, y: -y / 10, cmd: 'end' }); break; }
    let dx = 0, dy = 0;
    if (b0 & 0x01) dx += 1; if (b0 & 0x02) dx -= 1; if (b0 & 0x04) dx += 9; if (b0 & 0x08) dx -= 9;
    if (b1 & 0x01) dx += 3; if (b1 & 0x02) dx -= 3; if (b1 & 0x04) dx += 27; if (b1 & 0x08) dx -= 27;
    if (b2 & 0x04) dx += 81; if (b2 & 0x08) dx -= 81;
    if (b0 & 0x80) dy += 1; if (b0 & 0x40) dy -= 1; if (b0 & 0x20) dy += 9; if (b0 & 0x10) dy -= 9;
    if (b1 & 0x80) dy += 3; if (b1 & 0x40) dy -= 3; if (b1 & 0x20) dy += 27; if (b1 & 0x10) dy -= 27;
    if (b2 & 0x20) dy += 81; if (b2 & 0x10) dy -= 81;
    x += dx; y += dy;
    const cmd: Cmd = (b2 & 0xC0) === 0xC0 ? 'color' : b2 & 0x80 ? 'jump' : 'stitch';
    out.push({ x: x / 10, y: -y / 10, cmd });
  }
  return { stitches: out, header };
}

/** Melco EXP (0.1 mm, 2 bytes per stitch; 0x80 escapes for jump / colour change). */
export function toExp(st: Stitch[]): Uint8Array {
  const b: number[] = [];
  let px = 0, py = 0;
  const first = st.find((s) => s.cmd !== 'end');
  const ox = first ? Math.round(first.x * 10) : 0, oy = first ? Math.round(first.y * 10) : 0;
  const s8 = (v: number) => (v < 0 ? v + 256 : v);
  const move = (tx: number, ty: number, jump: boolean) => {
    while (tx !== px || ty !== py) {
      const dx = Math.max(-127, Math.min(127, tx - px)), dy = Math.max(-127, Math.min(127, ty - py));
      if (jump || tx - px !== dx || ty - py !== dy) b.push(0x80, 0x04);
      b.push(s8(dx), s8(-dy)); px += dx; py += dy;
    }
  };
  for (const s of st) {
    const tx = Math.round(s.x * 10) - ox, ty = Math.round(s.y * 10) - oy;
    if (s.cmd === 'stitch') move(tx, ty, false);
    else if (s.cmd === 'jump') move(tx, ty, true);
    else if (s.cmd === 'color' || s.cmd === 'stop') b.push(0x80, 0x01, 0x00, 0x00);
    else if (s.cmd === 'trim') b.push(0x80, 0x80, 0x07, 0x00);
  }
  return new Uint8Array(b);
}

/** Thread preview as SVG (mm): every stitch drawn as thread with a light sheen. */
export function previewSvg(objects: EmbObject[], st: Stitch[], o: { background?: string; pad?: number } = {}): { svg: string; w: number; h: number; x: number; y: number } {
  const vis = objects.filter((x) => !x.hidden);
  const colours: string[] = []; let prev = '';
  for (const ob of vis) if (ob.colour.toLowerCase() !== prev) { colours.push(ob.colour); prev = ob.colour.toLowerCase(); }
  let ci = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const runs: { c: string; d: string[] }[] = [];
  let curRun: string[] = [], last: Stitch | null = null;
  const flush = () => { if (curRun.length) runs.push({ c: colours[ci] || '#333', d: curRun }); curRun = []; };
  for (const s of st) {
    if (s.cmd === 'stitch' && last) {
      curRun.push(`M${last.x.toFixed(2)} ${last.y.toFixed(2)}L${s.x.toFixed(2)} ${s.y.toFixed(2)}`);
      x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
    }
    if (s.cmd === 'color') { flush(); ci++; }
    if (s.cmd !== 'trim' && s.cmd !== 'color' && s.cmd !== 'stop') last = s;
  }
  flush();
  if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 10; y1 = 10; }
  const pad = o.pad ?? 3;
  const body = runs.map((r) => `<path d="${r.d.join('')}" stroke="${r.c}" stroke-width="0.38" stroke-linecap="round" fill="none"/><path d="${r.d.join('')}" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="0.12" stroke-linecap="round" fill="none" transform="translate(-0.06 -0.06)"/>`).join('');
  const x = x0 - pad, y = y0 - pad, w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const bg = o.background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.background}"/>` : '';
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(1)}mm" height="${h.toFixed(1)}mm">${bg}${body}</svg>`, w, h, x, y };
}


export interface DstCheck { ok: boolean; issues: string[]; stitches: number; colourChanges: number; sizeMm: [number, number] }
/** Reads a generated DST back and checks it before it is offered: header, end marker, every stitch at its place (0.1 mm), moves within the machine limit, colour changes / stops, size within the hoop. */
export function validateDst(bytes: Uint8Array, st: Stitch[], hoop?: [number, number]): DstCheck {
  const issues: string[] = [];
  if (bytes.length < 515 || (bytes.length - 512) % 3) issues.push('File length is not a whole number of DST records.');
  const { stitches: back, header } = readDst(bytes);
  const hdr = (k: string) => { const m = header.match(new RegExp(`${k}:\\s*([-+\\d ]+)`)); return m ? parseInt(m[1].replace(/\s/g, ''), 10) : NaN; };
  const records = (bytes.length - 512) / 3 - 1;
  if (!/^LA:/.test(header)) issues.push('Header label (LA:) missing.');
  if (hdr('ST') !== records) issues.push(`Header says ${hdr('ST')} records, the file has ${records}.`);
  if (back[back.length - 1]?.cmd !== 'end') issues.push('End-of-design marker missing.');
  const wantChanges = st.filter((s) => s.cmd === 'color' || s.cmd === 'stop').length;
  const gotChanges = back.filter((s) => s.cmd === 'color').length;
  if (hdr('CO') !== gotChanges || gotChanges !== wantChanges) issues.push(`Colour changes / stops: expected ${wantChanges}, header ${hdr('CO')}, file ${gotChanges}.`);
  for (let i = 1; i < back.length; i++) if (Math.hypot(back[i].x - back[i - 1].x, back[i].y - back[i - 1].y) > 12.15) { issues.push('A move longer than 12.1 mm (machine limit).'); break; }
  const first = st.find((s) => s.cmd !== 'end');
  const want = st.filter((s) => s.cmd === 'stitch');
  if (first) {
    let j = 0, missingN = 0;
    for (const w of want) {
      const tx = Math.round(w.x * 10) - Math.round(first.x * 10), ty = Math.round(w.y * 10) - Math.round(first.y * 10);
      let k = j; while (k < back.length && !(back[k].cmd === 'stitch' && Math.round(back[k].x * 10) === tx && Math.round(back[k].y * 10) === ty)) k++;
      if (k >= back.length) missingN++; else j = k;
    }
    if (missingN) issues.push(`${missingN} stitch${missingN === 1 ? '' : 'es'} not found at the right place.`);
  }
  const xs = back.map((s) => s.x), ys = back.map((s) => s.y);
  const sizeMm: [number, number] = back.length ? [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] : [0, 0];
  if (hoop && (sizeMm[0] > hoop[0] + 0.5 || sizeMm[1] > hoop[1] + 0.5)) issues.push(`Design ${Math.round(sizeMm[0])} × ${Math.round(sizeMm[1])} mm is bigger than the ${hoop[0]} × ${hoop[1]} mm hoop.`);
  return { ok: !issues.length, issues, stitches: back.filter((s) => s.cmd === 'stitch').length, colourChanges: gotChanges, sizeMm };
}
