// Factory pattern import: a factory's own pattern pieces from an SVG file
// (as exported from Gerber, Lectra, Optitex, CLO or Illustrator). Every
// closed path / rect / polygon becomes a piece at real size; its id or
// label names it. Front and back are required for the mockup.

import type { Piece } from '../garments.ts';
import { normalize, segsToD, transformSegs, bbox } from './vector.ts';

const UNIT: Record<string, number> = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, '': 25.4 / 96 };
const attr = (tag: string, name: string) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3] ?? '') : null; };
const len = (v: string | null) => { if (!v) return null; const m = v.trim().match(/^([\d.]+)\s*([a-z%]*)$/i); if (!m || m[2] === '%') return null; return Number(m[1]) * (UNIT[m[2].toLowerCase()] ?? UNIT.px); };

/** Known piece names → the ids the designer uses (front / back / sleeves / collar keep their roles). */
export function pieceIdFor(name: string, used: Set<string>): string {
  const n = name.toLowerCase();
  let id = /front/.test(n) ? 'front' : /back/.test(n) ? 'back'
    : /sleeve/.test(n) ? (/(right|\br\b|_r\b|-r\b)/.test(n) ? 'sleeve-r' : /(left|\bl\b|_l\b|-l\b)/.test(n) ? 'sleeve-l' : 'sleeve-l')
    : /collar|neck|rib/.test(n) ? 'collar' : n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
  if (id === 'sleeve-l' && used.has('sleeve-l') && !used.has('sleeve-r')) id = 'sleeve-r';
  let k = id, i = 2;
  while (used.has(k)) k = `${id}-${i++}`;
  used.add(k);
  return k;
}

export interface FactoryImport { pieces: Piece[]; warnings: string[]; mmPerUnit: number }

export function parseFactorySvg(svg: string): FactoryImport {
  const warnings: string[] = [];
  const root = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) throw new Error('This is not an SVG file.');
  const vb = (attr(root, 'viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const wmm = len(attr(root, 'width')), hmm = len(attr(root, 'height'));
  let k = UNIT.px;
  if (vb.length === 4 && vb[2] > 0 && wmm) k = wmm / vb[2];
  else if (vb.length === 4 && vb[3] > 0 && hmm) k = hmm / vb[3];
  else warnings.push('The file has no size in mm, cm or inches: read at 96 units per inch. Check the piece sizes.');
  const used = new Set<string>();
  const pieces: Piece[] = [];
  const shapes = svg.match(/<(path|rect|polygon)\b[^>]*>/gi) || [];
  let n = 0;
  for (const tag of shapes) {
    const kind = tag.match(/^<(\w+)/)![1].toLowerCase();
    let d = '';
    if (kind === 'path') d = attr(tag, 'd') || '';
    else if (kind === 'rect') { const x = Number(attr(tag, 'x') || 0), y = Number(attr(tag, 'y') || 0), w = Number(attr(tag, 'width') || 0), h = Number(attr(tag, 'height') || 0); if (w > 0 && h > 0) d = `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
    else { const p = (attr(tag, 'points') || '').trim().split(/[\s,]+/).map(Number); if (p.length >= 6) d = `M${p.slice(0, 2).join(' ')}L${p.slice(2).join(' ')}Z`; }
    if (!d || !/z\s*$/i.test(d.trim())) continue; // only closed outlines are pieces
    if (attr(tag, 'transform')) warnings.push(`“${attr(tag, 'id') || kind}” has a transform — flatten transforms in your CAD export for exact sizes.`);
    const segs = transformSegs(normalize(d), [k, 0, 0, k, 0, 0]);
    const b = bbox(segs);
    if (b.w < 20 || b.h < 10) continue; // notches, marks, text
    n++;
    const name = attr(tag, 'inkscape:label') || attr(tag, 'data-name') || attr(tag, 'id') || `Piece ${n}`;
    const id = pieceIdFor(name, used);
    const label = name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
    pieces.push({ id, label, w: Math.round(b.w * 10) / 10, h: Math.round(b.h * 10) / 10, qty: 1, d: segsToD(transformSegs(segs, [1, 0, 0, 1, -b.x, -b.y])) });
  }
  if (!pieces.length) throw new Error('No closed piece outlines were found in this SVG.');
  if (!pieces.some((p) => p.id === 'front') || !pieces.some((p) => p.id === 'back')) warnings.push('Name the pieces “front” and “back” (layer or object names) so the mockup can show them.');
  return { pieces, warnings, mmPerUnit: k };
}
