// Packaging Editor document: a box worked out from the product it must hold,
// plus free drawing (cut / crease / perforation / glue lines and artwork) on
// layers. Units are millimetres, y down. Pure functions only — the editor UI,
// the PDF writer and the tests all share them.

import { makeDieline, type BoxStyleId, type Dieline, type DieOptions } from './dieline.ts';
import { caliperFor, gradeById, type BoardFamily } from './board.ts';

export type LineType = 'cut' | 'crease' | 'perf' | 'glue' | 'art';
export type ObjKind = 'path' | 'rect' | 'ellipse' | 'text' | 'image';

export interface PkObj {
  id: string; name: string; layer: string; kind: ObjKind;
  /** path data in local mm (path kind) */
  d?: string;
  /** position (all kinds; path = translation of its local coordinates) */
  x: number; y: number;
  /** size (rect, ellipse, image, text box width) */
  w: number; h: number;
  rot?: number;
  line: LineType;                 // die line type, or 'art' for printed artwork
  stroke?: string; strokeW?: number; fill?: string; opacity?: number;
  text?: string; font?: string; size?: number; weight?: number; align?: 'left' | 'center' | 'right';
  href?: string;                  // image data URL
  hidden?: boolean; locked?: boolean;
  /** made by the box generator — replaced when the box is recalculated */
  gen?: boolean;
}
export interface PkLayer { id: string; name: string; hidden?: boolean; locked?: boolean }

export interface BoxSpec {
  style: BoxStyleId;
  /** the product (outside size of what goes in the box) */
  product: { L: number; W: number; H: number };
  /** gap added to each product dimension, total (not per side) */
  clearance: { L: number; W: number; H: number };
  grade: string; gsm: number; t: number;
  glue: number; tuck: number; lidDepth: number;
}

export interface PkDoc { v: 1; name: string; box: BoxSpec; layers: PkLayer[]; objects: PkObj[]; bleed: number }

export const LINE_COLOURS: Record<LineType, string> = { cut: '#EC008C', crease: '#00A0E3', perf: '#F7A600', glue: '#2BB673', art: '#111827' };
export const LINE_NAMES: Record<LineType, string> = { cut: 'Cut', crease: 'Crease (fold)', perf: 'Perforation', glue: 'Glue area', art: 'Artwork' };

/**
 * Default fitting gap, total per dimension. Folding boxes: 2 mm (packaging
 * makers advise 2–3 mm over the product). Corrugated and rigid walls need more.
 */
export function defaultClearance(family: BoardFamily): { L: number; W: number; H: number } {
  if (family === 'corrugated') return { L: 4, W: 4, H: 4 };
  if (family === 'rigid') return { L: 3, W: 3, H: 2 };
  return { L: 2, W: 2, H: 2 };
}

/** Inside size of the box = product + gap. The dieline engine then adds the board thickness at each fold. */
export function innerSize(b: BoxSpec): { L: number; W: number; D: number } {
  const r = (v: number) => Math.round(v * 100) / 100;
  return { L: r(b.product.L + b.clearance.L), W: r(b.product.W + b.clearance.W), D: r(b.product.H + b.clearance.H) };
}

export function dieOptions(b: BoxSpec): DieOptions {
  const i = innerSize(b);
  return { style: b.style, L: i.L, W: i.W, D: i.D, t: b.t, glue: b.glue, tuck: b.tuck, lidDepth: b.lidDepth };
}

export function boxDieline(b: BoxSpec): Dieline { return makeDieline(dieOptions(b)); }

/** Outside size of the closed box: inside + two board thicknesses. */
export function outerSize(b: BoxSpec): { L: number; W: number; D: number } {
  const i = innerSize(b), r = (v: number) => Math.round(v * 100) / 100;
  return { L: r(i.L + 2 * b.t), W: r(i.W + 2 * b.t), D: r(i.D + 2 * b.t) };
}

let seq = 0;
export const newId = (p = 'o') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export const DIE_LAYER = 'dieline', ART_LAYER = 'artwork', DRAW_LAYER = 'structure';

export function defaultBox(): BoxSpec {
  const g = gradeById('sbs');
  return { style: 'rte', product: { L: 50, W: 50, H: 50 }, clearance: defaultClearance(g.family), grade: g.id, gsm: 350, t: caliperFor(g, 350), glue: g.glue, tuck: 15, lidDepth: 30 };
}

export function newDoc(name = 'Untitled box'): PkDoc {
  const box = defaultBox();
  const doc: PkDoc = { v: 1, name, box, bleed: 3, layers: [{ id: ART_LAYER, name: 'Artwork' }, { id: DRAW_LAYER, name: 'My lines' }, { id: DIE_LAYER, name: 'Dieline (box)', locked: true }], objects: [] };
  return regenerate(doc);
}

/** Replace the generated dieline objects with ones for the current box; your own objects stay. */
export function regenerate(doc: PkDoc): PkDoc {
  const d = boxDieline(doc.box);
  const gen: PkObj[] = d.lines.map((l, i) => ({ id: `g${i}`, name: `${l.kind === 'cut' ? 'Cut' : l.kind === 'crease' ? 'Crease' : 'Perforation'} ${i + 1}`, layer: DIE_LAYER, kind: 'path', d: l.d, x: 0, y: 0, w: 0, h: 0, line: l.kind as LineType, gen: true }));
  return { ...doc, objects: [...doc.objects.filter((o) => !o.gen), ...gen] };
}

/** Change the board: thickness follows the mill table, glue flap and gaps follow the board family. */
export function withBoard(b: BoxSpec, grade: string, gsm: number): BoxSpec {
  const g = gradeById(grade), prev = gradeById(b.grade);
  const sameFamily = g.family === prev.family;
  return { ...b, grade: g.id, gsm, t: caliperFor(g, gsm), glue: sameFamily ? b.glue : g.glue, clearance: sameFamily ? b.clearance : defaultClearance(g.family) };
}

/** Points (absolute mm) a path passes through — M/L/C endpoints — for snapping and bounds. */
export function pathPoints(d: string, dx = 0, dy = 0): [number, number][] {
  const out: [number, number][] = [];
  const re = /([MLCQZ])([^MLCQZ]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
    const c = m[1].toUpperCase();
    if (c === 'M' || c === 'L') for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i] + dx, n[i + 1] + dy]);
    else if (c === 'C') for (let i = 0; i + 5 < n.length; i += 6) out.push([n[i + 4] + dx, n[i + 5] + dy]);
    else if (c === 'Q') for (let i = 0; i + 3 < n.length; i += 4) out.push([n[i + 2] + dx, n[i + 3] + dy]);
  }
  return out;
}

export interface Box4 { x: number; y: number; w: number; h: number }
export function objBounds(o: PkObj): Box4 {
  if (o.kind === 'path' && o.d) {
    const pts = pathPoints(o.d, o.x, o.y);
    // include control points of curves for a safe box
    const all = (o.d.match(/-?\d*\.?\d+/g) || []).map(Number);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    for (let i = 0; i + 1 < all.length; i += 2) { xs.push(all[i] + o.x); ys.push(all[i + 1] + o.y); }
    if (!xs.length) return { x: o.x, y: o.y, w: 0, h: 0 };
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
  }
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

export function unionBounds(bs: Box4[]): Box4 | null {
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Length of a path's straight and curved segments (mm), curves by sampling. */
export function pathLength(d: string): number {
  let len = 0, cx = 0, cy = 0, sx = 0, sy = 0;
  const re = /([MLCZ])([^MLCZ]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number), c = m[1].toUpperCase();
    if (c === 'M') { cx = sx = n[0]; cy = sy = n[1]; for (let i = 2; i + 1 < n.length; i += 2) { len += Math.hypot(n[i] - cx, n[i + 1] - cy); cx = n[i]; cy = n[i + 1]; } }
    else if (c === 'L') for (let i = 0; i + 1 < n.length; i += 2) { len += Math.hypot(n[i] - cx, n[i + 1] - cy); cx = n[i]; cy = n[i + 1]; }
    else if (c === 'C') for (let i = 0; i + 5 < n.length; i += 6) {
      let px = cx, py = cy;
      for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t; const x = u * u * u * cx + 3 * u * u * t * n[i] + 3 * u * t * t * n[i + 2] + t * t * t * n[i + 4]; const y = u * u * u * cy + 3 * u * u * t * n[i + 1] + 3 * u * t * t * n[i + 3] + t * t * t * n[i + 5]; len += Math.hypot(x - px, y - py); px = x; py = y; }
      cx = n[i + 4]; cy = n[i + 5];
    } else if (c === 'Z') { len += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; }
  }
  return len;
}

/** Total rule length per line type over visible objects (mm). */
export function ruleTotals(doc: PkDoc): Record<LineType, number> {
  const t: Record<LineType, number> = { cut: 0, crease: 0, perf: 0, glue: 0, art: 0 };
  for (const o of doc.objects) {
    if (o.hidden || o.line === 'art') continue;
    if (o.kind === 'path' && o.d) t[o.line] += pathLength(o.d);
    else if (o.kind === 'rect') t[o.line] += 2 * (o.w + o.h);
    else if (o.kind === 'ellipse') { const a = o.w / 2, b = o.h / 2; t[o.line] += Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); }
  }
  return t;
}

/** Artwork sheet = bounds of everything visible (dieline and your own objects). */
export function docBounds(doc: PkDoc): Box4 {
  const b = unionBounds(doc.objects.filter((o) => !o.hidden).map(objBounds));
  return b ?? { x: 0, y: 0, w: 100, h: 100 };
}

/** Objects in paint order (layer order bottom → top, then object order). Layers list is top first. */
export function paintOrder(doc: PkDoc): PkObj[] {
  const rank = new Map(doc.layers.map((l, i) => [l.id, doc.layers.length - i]));
  return [...doc.objects].sort((a, b) => (rank.get(a.layer) ?? 0) - (rank.get(b.layer) ?? 0));
}

/** Move objects up (toward the top of their layer) or down; returns new object list. */
export function reorder(objs: PkObj[], ids: string[], dir: 'up' | 'down' | 'top' | 'bottom'): PkObj[] {
  const set = new Set(ids), sel = objs.filter((o) => set.has(o.id)), rest = objs.filter((o) => !set.has(o.id));
  if (dir === 'top') return [...rest, ...sel];
  if (dir === 'bottom') return [...sel, ...rest];
  const a = [...objs];
  if (dir === 'up') for (let i = a.length - 2; i >= 0; i--) { if (set.has(a[i].id) && !set.has(a[i + 1].id)) [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
  else for (let i = 1; i < a.length; i++) { if (set.has(a[i].id) && !set.has(a[i - 1].id)) [a[i], a[i - 1]] = [a[i - 1], a[i]]; }
  return a;
}

/** Validate an opened project; returns a clean document or throws a readable error. */
export function readDoc(data: any): PkDoc {
  if (!data || data.v !== 1 || !data.box || !Array.isArray(data.objects) || !Array.isArray(data.layers)) throw new Error('This file is not a Packaging Editor project.');
  return data as PkDoc;
}
