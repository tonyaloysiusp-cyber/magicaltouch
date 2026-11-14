// Vector geometry for the textile print studio (pure; runs in tests).
//
// Paths are normalised to absolute M / L / C / Z segments (arcs and quadratic
// curves become cubics), which the node editor, the boolean operations and
// the PDF writer all share. Booleans flatten curves to fine polylines
// (default 0.15 mm) and use polygon-clipping; the result is an editable
// path again.

import { parsePath, type Seg } from '../svgToPdf.ts';
import type { Mat } from './art.ts';

export type { Seg };
export type Ring = [number, number][];
export type Poly = Ring[];          // outer ring + holes
export type MultiPoly = Poly[];

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const ap = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function normalize(d: string): Seg[] { return parsePath(d || ''); }
export function segsToD(segs: Seg[]): string {
  return segs.map((s) => (s[0] === 'Z' ? 'Z' : s[0] + (s.slice(1) as number[]).map(r3).join(' '))).join('');
}
export function transformSegs(segs: Seg[], m: Mat): Seg[] {
  return segs.map((s) => {
    if (s[0] === 'Z') return s;
    const out: number[] = [];
    for (let i = 1; i < s.length; i += 2) { const p = ap(m, s[i] as number, s[i + 1] as number); out.push(p[0], p[1]); }
    return [s[0], ...out] as Seg;
  });
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number) { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; }

/** Polylines of every subpath (closed or not), curves sampled so no chord strays more than `tol`. */
export function flatten(segs: Seg[], tol = 0.15): { pts: Ring; closed: boolean }[] {
  const out: { pts: Ring; closed: boolean }[] = [];
  let cur: Ring = [], x = 0, y = 0, sx = 0, sy = 0;
  const push = (closed: boolean) => { if (cur.length > 1) out.push({ pts: cur, closed }); cur = []; };
  for (const s of segs) {
    if (s[0] === 'M') { push(false); x = sx = s[1]; y = sy = s[2]; cur.push([x, y]); }
    else if (s[0] === 'L') { x = s[1]; y = s[2]; cur.push([x, y]); }
    else if (s[0] === 'C') {
      const [, x1, y1, x2, y2, x3, y3] = s;
      const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
      const n = Math.max(2, Math.min(256, Math.ceil(Math.sqrt(len / Math.max(1e-6, tol)) * 1.4)));
      for (let i = 1; i <= n; i++) { const t = i / n; cur.push([cubicAt(x, x1, x2, x3, t), cubicAt(y, y1, y2, y3, t)]); }
      x = x3; y = y3;
    } else { if (cur.length) { x = sx; y = sy; } push(true); }
  }
  push(false);
  return out;
}

export function bbox(segs: Seg[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of flatten(segs, 0.5)) for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
const area = (r: Ring) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; };

/** A path's filled region as polygons, honouring its fill rule. */
export async function regionOf(segs: Seg[], rule: 'nonzero' | 'evenodd' = 'nonzero', tol = 0.15): Promise<MultiPoly> {
  const pc: any = await loadClipper();
  const rings = flatten(segs, tol).map((r) => r.pts).filter((r) => r.length >= 3 && Math.abs(area(r)) > 1e-6).map((r) => { const c = r.slice(); const a = c[0], b = c[c.length - 1]; if (a[0] !== b[0] || a[1] !== b[1]) c.push([a[0], a[1]]); return c; });
  if (!rings.length) return [];
  if (rule === 'evenodd') return rings.slice(1).reduce((acc: MultiPoly, r) => pc.xor(acc, [[r]]), [[rings[0]]]);
  // Non-zero: rings turning the same way as the largest add; the others cut holes (letters like O, A, B).
  const big = rings.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
  const sign = Math.sign(area(big));
  const plus = rings.filter((r) => Math.sign(area(r)) === sign), minus = rings.filter((r) => Math.sign(area(r)) !== sign);
  let res: MultiPoly = plus.slice(1).reduce((acc: MultiPoly, r) => pc.union(acc, [[r]]), [[plus[0]]]);
  for (const r of minus) res = pc.difference(res, [[r]]);
  return res;
}
export function polysToD(mp: MultiPoly): string {
  return mp.map((poly) => poly.map((ring) => {
    const r = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
    return `M${r.map(([x, y]) => `${r3(x)} ${r3(y)}`).join('L')}Z`;
  }).join('')).join('');
}
export type BoolOp = 'union' | 'subtract' | 'intersect' | 'exclude';
/** Combines regions (first one is the base for subtract). */
export async function booleanOp(op: BoolOp, regions: MultiPoly[]): Promise<MultiPoly> {
  const pc: any = await loadClipper();
  const [a, ...rest] = regions;
  if (!a || !rest.length) return a || [];
  if (op === 'union') return pc.union(a, ...rest);
  if (op === 'intersect') return pc.intersection(a, ...rest);
  if (op === 'exclude') return pc.xor(a, ...rest);
  return pc.difference(a, ...rest);
}
let clipper: Promise<any> | null = null;
function loadClipper(): Promise<any> {
  if (!clipper) clipper = import('polygon-clipping').then((m: any) => m.default || m);
  return clipper;
}

// ---------------------------------------------------------------- shapes (100 × 100 box centred on 0)
export function polygonPath(sides: number): string {
  const n = Math.max(3, Math.min(64, Math.round(sides)));
  const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [50 * Math.cos(a), 50 * Math.sin(a)]; });
  return `M${pts.map(([x, y]) => `${r3(x)} ${r3(y)}`).join('L')}Z`;
}
export function starPath(points: number, inner = 0.45): string {
  const n = Math.max(3, Math.min(64, Math.round(points)));
  const pts: number[][] = [];
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 ? 50 * inner : 50; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
  return `M${pts.map(([x, y]) => `${r3(x)} ${r3(y)}`).join('L')}Z`;
}
/** Re-centres a path on 0,0; returns the path and the centre it had. */
export function centred(d: string): { d: string; cx: number; cy: number; w: number; h: number } {
  const segs = normalize(d);
  const b = bbox(segs);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return { d: segsToD(transformSegs(segs, [1, 0, 0, 1, -cx, -cy])), cx, cy, w: b.w, h: b.h };
}

// ---------------------------------------------------------------- node editing
export interface NodeRef { seg: number; kind: 'anchor' | 'in' | 'out'; x: number; y: number }
/** Anchors and Bézier handles of a normalised path. `in` = the handle arriving at an anchor, `out` = leaving it. */
export function nodes(segs: Seg[]): NodeRef[] {
  const out: NodeRef[] = [];
  segs.forEach((s, i) => {
    if (s[0] === 'M' || s[0] === 'L') out.push({ seg: i, kind: 'anchor', x: s[1], y: s[2] });
    else if (s[0] === 'C') { out.push({ seg: i, kind: 'out', x: s[1], y: s[2] }); out.push({ seg: i, kind: 'in', x: s[3], y: s[4] }); out.push({ seg: i, kind: 'anchor', x: s[5], y: s[6] }); }
  });
  return out;
}
/** Moves one node. Moving an anchor carries its handles with it. */
export function moveNode(segs: Seg[], ref: { seg: number; kind: NodeRef['kind'] }, x: number, y: number): Seg[] {
  const out = segs.map((s) => s.slice() as Seg);
  const s = out[ref.seg];
  if (!s || s[0] === 'Z') return out;
  if (ref.kind === 'anchor') {
    const ax = s[0] === 'C' ? s[5] : s[1], ay = s[0] === 'C' ? s[6] : s[2];
    const dx = x - (ax as number), dy = y - (ay as number);
    if (s[0] === 'C') { s[5] = x; s[6] = y; s[3] = (s[3] as number) + dx; s[4] = (s[4] as number) + dy; } else { s[1] = x; s[2] = y; }
    const nx = out[ref.seg + 1];
    if (nx && nx[0] === 'C') { nx[1] = (nx[1] as number) + dx; nx[2] = (nx[2] as number) + dy; }
  } else if (s[0] === 'C') {
    if (ref.kind === 'out') { s[1] = x; s[2] = y; } else { s[3] = x; s[4] = y; }
  }
  return out;
}
/** Adds an anchor in the middle of segment `i` (a line is split at its midpoint, a curve at t = 0.5). */
export function insertNode(segs: Seg[], i: number, t = 0.5): Seg[] {
  const out = segs.map((s) => s.slice() as Seg);
  const s = out[i];
  if (!s || s[0] === 'M' || s[0] === 'Z') return out;
  let px = 0, py = 0;
  for (let k = i - 1; k >= 0; k--) { const q = out[k]; if (q[0] === 'Z') continue; px = q[0] === 'C' ? q[5] : q[1]; py = q[0] === 'C' ? q[6] : q[2]; break; }
  if (s[0] === 'L') { out.splice(i, 0, ['L', px + (s[1] - px) * t, py + (s[2] - py) * t]); return out; }
  const [, x1, y1, x2, y2, x3, y3] = s;
  const L = (a: number, b: number) => a + (b - a) * t;
  const ax = L(px, x1), ay = L(py, y1), bx = L(x1, x2), by = L(y1, y2), cx = L(x2, x3), cy = L(y2, y3);
  const dx = L(ax, bx), dy = L(ay, by), ex = L(bx, cx), ey = L(by, cy), fx = L(dx, ex), fy = L(dy, ey);
  out.splice(i, 1, ['C', ax, ay, dx, dy, fx, fy], ['C', ex, ey, cx, cy, x3, y3]);
  return out;
}
/** Removes the anchor that ends segment `i` (its neighbours join). */
export function deleteNode(segs: Seg[], i: number): Seg[] {
  const s = segs[i];
  if (!s || s[0] === 'Z') return segs;
  if (s[0] === 'M') {
    // Removing a start point: the next segment's end becomes the start.
    const nx = segs[i + 1];
    if (!nx || nx[0] === 'Z' || nx[0] === 'M') return segs.filter((_, k) => k !== i);
    const e = nx[0] === 'C' ? [nx[5], nx[6]] : [nx[1], nx[2]];
    return [...segs.slice(0, i), ['M', e[0] as number, e[1] as number] as Seg, ...segs.slice(i + 2)];
  }
  const nx = segs[i + 1];
  if (nx && nx[0] === 'C' && s[0] === 'C') return [...segs.slice(0, i), ['C', s[1], s[2], nx[3], nx[4], nx[5], nx[6]] as Seg, ...segs.slice(i + 2)];
  return segs.filter((_, k) => k !== i);
}
/** Makes an anchor smooth (handles in line, equal length) or a corner (handles on the anchor). */
export function setNodeType(segs: Seg[], i: number, type: 'smooth' | 'corner'): Seg[] {
  const out = segs.map((s) => s.slice() as Seg);
  const s = out[i], nx = out[i + 1];
  if (!s || s[0] === 'Z') return out;
  const ax = s[0] === 'C' ? s[5] : s[1], ay = s[0] === 'C' ? s[6] : s[2];
  let prev: [number, number] | null = null;
  for (let k = i - 1; k >= 0; k--) { const q = out[k]; if (q[0] === 'Z') continue; prev = q[0] === 'C' ? [q[5], q[6]] : [q[1], q[2]]; break; }
  const next: [number, number] | null = nx && nx[0] !== 'Z' && nx[0] !== 'M' ? (nx[0] === 'C' ? [nx[5], nx[6]] : [nx[1], nx[2]]) : null;
  if (type === 'corner') {
    if (s[0] === 'C') { s[3] = ax; s[4] = ay; }
    if (nx && nx[0] === 'C') { nx[1] = ax; nx[2] = ay; }
    return out;
  }
  if (!prev || !next) return out;
  // Tangent along prev → next, handles a third of the way to each neighbour.
  const tx = next[0] - prev[0], ty = next[1] - prev[1], tl = Math.hypot(tx, ty) || 1;
  const lIn = Math.hypot(ax - prev[0], ay - prev[1]) / 3, lOut = Math.hypot(next[0] - ax, next[1] - ay) / 3;
  const ux = tx / tl, uy = ty / tl;
  if (s[0] === 'C') { s[3] = ax - ux * lIn; s[4] = ay - uy * lIn; } else if (s[0] === 'L' && prev) out[i] = ['C', prev[0], prev[1], ax - ux * lIn, ay - uy * lIn, ax, ay];
  if (nx && nx[0] === 'C') { nx[1] = ax + ux * lOut; nx[2] = ay + uy * lOut; } else if (nx && nx[0] === 'L') out[i + 1] = ['C', ax + ux * lOut, ay + uy * lOut, nx[1], nx[2], nx[1], nx[2]];
  return out;
}

/** Pen tool points → path. Each point has an optional outgoing handle (the incoming one mirrors it). */
export function penPath(pts: { x: number; y: number; hx?: number; hy?: number }[], closed: boolean): string {
  if (!pts.length) return '';
  const segs: Seg[] = [['M', pts[0].x, pts[0].y]];
  const seg = (a: typeof pts[0], b: typeof pts[0]) => {
    const ao = a.hx != null ? [a.hx, a.hy!] : [a.x, a.y];
    const bi = b.hx != null ? [2 * b.x - b.hx, 2 * b.y - b.hy!] : [b.x, b.y];
    if (ao[0] === a.x && ao[1] === a.y && bi[0] === b.x && bi[1] === b.y) segs.push(['L', b.x, b.y]);
    else segs.push(['C', ao[0], ao[1], bi[0], bi[1], b.x, b.y]);
  };
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]);
  if (closed && pts.length > 2) { seg(pts[pts.length - 1], pts[0]); segs.push(['Z']); }
  return segsToD(segs);
}
