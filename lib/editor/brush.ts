// Freehand drawing: brush, marker, highlighter and pencil strokes, plus an
// eraser for strokes. Every stroke becomes a normal vector shape (it can
// be moved, recoloured, undone, exported), shaped from the pointer's
// path and — with a stylus such as Apple Pencil — its pressure.

import { getStroke } from 'perfect-freehand';

export type BrushKind = 'brush' | 'marker' | 'highlighter' | 'pencil' | 'eraser';

export interface BrushSettings {
  kind: BrushKind;
  color: string;
  size: number; // px on the page
  opacity: number; // 0..1
  smoothing: number; // 0..1
  /** Brush library preset (look of the stroke); the controls below fine-tune it. */
  preset?: BrushPreset;
  thinning?: number;   // how much speed / pressure thins the line, -1..1
  taper?: number;      // taper at both ends, × size
  stabilize?: number;  // 0..1, how much the line lags behind the pointer to smooth wobbles
  angle?: number;      // calligraphy nib angle, degrees
  roundness?: number;  // nib roundness 0.05..1
  spacing?: number;    // dashes / stamps spacing, × size
  hardness?: number;   // 0..1 — soft brushes get a feathered halo
  caps?: 'round' | 'flat';
}

export type BrushPreset = 'basic' | 'hard' | 'soft' | 'calligraphy' | 'artistic' | 'ink' | 'dry' | 'texture' | 'watercolor' | 'pencil' | 'marker' | 'highlighter' | 'dashed' | 'pattern';
export const BRUSH_PRESETS: { id: BrushPreset; label: string; hint: string; kind: BrushKind; s: Partial<BrushSettings> }[] = [
  { id: 'basic', label: 'Basic round', hint: 'Round brush that follows pressure', kind: 'brush', s: { thinning: 0.5, taper: 1, hardness: 1 } },
  { id: 'hard', label: 'Hard round', hint: 'Even width, crisp edge', kind: 'brush', s: { thinning: 0, taper: 0, hardness: 1 } },
  { id: 'soft', label: 'Soft round', hint: 'Feathered edge (layered halo)', kind: 'brush', s: { thinning: 0.3, taper: 0.5, hardness: 0.3 } },
  { id: 'calligraphy', label: 'Calligraphy', hint: 'Flat nib: thick and thin by direction', kind: 'brush', s: { angle: 40, roundness: 0.18, thinning: 0 } },
  { id: 'artistic', label: 'Artistic', hint: 'Strong taper, expressive line', kind: 'brush', s: { thinning: 0.75, taper: 3, hardness: 1 } },
  { id: 'ink', label: 'Ink', hint: 'Pointed ink line, thin at speed', kind: 'brush', s: { thinning: 0.85, taper: 2, stabilize: 0.6 } },
  { id: 'dry', label: 'Dry brush', hint: 'Bristle streaks with broken edges', kind: 'brush', s: { thinning: 0.2, taper: 0.5 } },
  { id: 'texture', label: 'Texture', hint: 'Stippled grain along the stroke', kind: 'brush', s: { spacing: 0.35 } },
  { id: 'watercolor', label: 'Watercolour style', hint: 'Translucent layered wash', kind: 'brush', s: { thinning: 0.4, taper: 1.5 } },
  { id: 'pencil', label: 'Pencil', hint: 'Thin, crisp line', kind: 'pencil', s: {} },
  { id: 'marker', label: 'Marker', hint: 'Even, bold strokes', kind: 'marker', s: {} },
  { id: 'highlighter', label: 'Highlighter', hint: 'See-through, does not hide what is under it', kind: 'highlighter', s: {} },
  { id: 'dashed', label: 'Dashed', hint: 'Dashes along the line', kind: 'brush', s: { spacing: 2, thinning: 0, caps: 'round' } },
  { id: 'pattern', label: 'Pattern', hint: 'Stars stamped along the line', kind: 'brush', s: { spacing: 1.4 } },
];

export const DEFAULT_BRUSH: BrushSettings = { kind: 'brush', color: '#09090B', size: 12, opacity: 1, smoothing: 0.5 };

export const BRUSH_KINDS: { id: BrushKind; label: string; hint: string }[] = [
  { id: 'brush', label: 'Brush', hint: 'Pressure-sensitive strokes that taper at the ends' },
  { id: 'marker', label: 'Marker', hint: 'Even, bold strokes' },
  { id: 'highlighter', label: 'Highlighter', hint: 'See-through strokes that don’t hide what’s under them' },
  { id: 'pencil', label: 'Pencil', hint: 'Thin, crisp lines' },
  { id: 'eraser', label: 'Eraser', hint: 'Erases drawings, paths and shapes (not photos or text)' },
];

export type StrokePoint = [number, number, number]; // x, y, pressure

function strokeOptions(s: BrushSettings, hasPressure: boolean) {
  switch (s.kind) {
    case 'marker':
      return { size: s.size, thinning: 0, smoothing: s.smoothing, streamline: 0.45, simulatePressure: false };
    case 'highlighter':
      return { size: s.size * 1.6, thinning: 0, smoothing: s.smoothing, streamline: 0.5, simulatePressure: false, start: { cap: false }, end: { cap: false } };
    case 'pencil':
      return { size: Math.max(1, s.size * 0.35), thinning: 0.25, smoothing: s.smoothing * 0.6, streamline: 0.3, simulatePressure: !hasPressure };
    case 'eraser':
      return { size: s.size * 1.4, thinning: 0, smoothing: s.smoothing, streamline: 0.4, simulatePressure: false };
    default: {
      const taper = (s.taper ?? 2) * s.size;
      return {
        size: s.size,
        thinning: s.thinning ?? 0.6,
        smoothing: s.smoothing,
        streamline: s.stabilize ?? 0.5,
        simulatePressure: !hasPressure,
        start: { taper, cap: s.caps !== 'flat' },
        end: { taper, cap: s.caps !== 'flat' },
      };
    }
  }
}

// Outline polygon → smooth closed SVG path.
export function outlineToPathD(outline: number[][]): string {
  if (outline.length < 2) return '';
  const r = (n: number) => Math.round(n * 100) / 100;
  const [first, ...rest] = outline;
  let d = `M ${r(first[0])} ${r(first[1])} Q`;
  for (let i = 0; i < rest.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[i + 1];
    d += ` ${r(x0)} ${r(y0)} ${r((x0 + x1) / 2)} ${r((y0 + y1) / 2)}`;
  }
  d += ' Z';
  return d;
}

function basicD(points: StrokePoint[], s: BrushSettings, hasPressure: boolean, last: boolean): string {
  if (!points.length) return '';
  const pts = points.length === 1 ? [points[0], [points[0][0] + 0.1, points[0][1] + 0.1, points[0][2]] as StrokePoint] : points;
  const outline = getStroke(pts, { ...strokeOptions(s, hasPressure), last });
  return outlineToPathD(outline);
}

// Seeded random from the stroke itself, so a stroke redraws identically.
function strokeRng(points: StrokePoint[]) {
  let a = Math.round((points[0]?.[0] || 1) * 131 + (points[0]?.[1] || 1) * 71 + points.length * 7) >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Points every `step` px along the line, with unit normals. */
function resampleLine(points: StrokePoint[], step: number): { x: number; y: number; nx: number; ny: number; p: number; at: number }[] {
  const out: { x: number; y: number; nx: number; ny: number; p: number; at: number }[] = [];
  if (points.length < 2) return points.map(([x, y, p]) => ({ x, y, nx: 0, ny: -1, p, at: 0 }));
  let acc = 0, need = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0, p0] = points[i - 1], [x1, y1, p1] = points[i];
    const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1e-6) continue;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    while (need <= acc + L) { const t = (need - acc) / L; out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, nx, ny, p: p0 + (p1 - p0) * t, at: need }); need += step; }
    acc += L;
  }
  return out;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const circleD = (x: number, y: number, r: number) => `M ${r2(x - r)} ${r2(y)} a ${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0 a ${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0 Z`;
const starD = (x: number, y: number, r: number, rot: number) => { let d = ''; for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'} ${r2(x + Math.cos(a) * rr)} ${r2(y + Math.sin(a) * rr)} `; } return d + 'Z'; };

/**
 * The stroke as vector layers (path data + opacity). Most brushes are one
 * filled outline; soft, dry, watercolour, texture, dashed and pattern
 * brushes are several shapes — still plain vectors that export as such.
 */
export function brushLayers(points: StrokePoint[], s: BrushSettings, hasPressure: boolean, last = false): { d: string; opacity: number }[] {
  if (!points.length) return [];
  const preset = s.preset || 'basic';
  if (s.kind !== 'brush') return [{ d: basicD(points, s, hasPressure, last), opacity: 1 }];
  const rnd = strokeRng(points);
  switch (preset) {
    case 'calligraphy': {
      // Flat nib: every point offset by the same nib vector, so the width depends on the stroke direction.
      const a = ((s.angle ?? 40) * Math.PI) / 180, half = s.size / 2, rnd2 = Math.max(0.05, s.roundness ?? 0.18);
      const line = resampleLine(points, Math.max(1, s.size / 6));
      if (line.length < 2) return [{ d: circleD(points[0][0], points[0][1], half * rnd2 + 0.5), opacity: 1 }];
      const nx = Math.cos(a) * half, ny = Math.sin(a) * half;
      const L = line.map((q) => [q.x + nx + q.nx * half * rnd2, q.y + ny + q.ny * half * rnd2]), R = line.map((q) => [q.x - nx - q.nx * half * rnd2, q.y - ny - q.ny * half * rnd2]);
      return [{ d: `M ${L.map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L ')} L ${R.reverse().map((p) => `${r2(p[0])} ${r2(p[1])}`).join(' L ')} Z`, opacity: 1 }];
    }
    case 'soft': {
      const h = Math.max(0, Math.min(1, s.hardness ?? 0.3));
      return [{ d: basicD(points, { ...s, size: s.size * (1.9 - h * 0.8) }, hasPressure, last), opacity: 0.18 }, { d: basicD(points, { ...s, size: s.size * (1.4 - h * 0.3) }, hasPressure, last), opacity: 0.35 }, { d: basicD(points, s, hasPressure, last), opacity: 1 }];
    }
    case 'watercolor': {
      const out: { d: string; opacity: number }[] = [];
      for (let k = 0; k < 4; k++) {
        const j = s.size * 0.18, dx = (rnd() - 0.5) * j, dy = (rnd() - 0.5) * j;
        out.push({ d: basicD(points.map(([x, y, p]) => [x + dx, y + dy, p] as StrokePoint), { ...s, size: s.size * (0.8 + rnd() * 0.6) }, hasPressure, last), opacity: 0.28 });
      }
      return out;
    }
    case 'dry': {
      const n = Math.max(5, Math.round(s.size / 3)), line = resampleLine(points, Math.max(1, s.size / 5)), ds: string[] = [];
      for (let k = 0; k < n; k++) {
        const off = ((k + 0.5) / n - 0.5) * s.size, edge = Math.abs(off) / (s.size / 2);
        const t0 = Math.floor(rnd() * edge * 0.35 * line.length), t1 = line.length - Math.floor(rnd() * edge * 0.45 * line.length);
        const part = line.slice(t0, Math.max(t0 + 2, t1)).map((q) => [q.x + q.nx * off, q.y + q.ny * off, q.p] as StrokePoint);
        if (part.length > 1) ds.push(basicD(part, { ...s, size: Math.max(0.8, (s.size / n) * (1.2 + rnd() * 0.8) * (1 - edge * 0.4)), thinning: 0.3, taper: 1 }, hasPressure, last));
      }
      return [{ d: ds.join(' '), opacity: 1 }];
    }
    case 'texture': {
      const line = resampleLine(points, Math.max(0.8, s.size * (s.spacing ?? 0.35) * 0.4)), ds: string[] = [];
      for (const q of line) for (let k = 0; k < 3; k++) { const rr = (rnd() - 0.5) * s.size, ss = (rnd() - 0.5) * s.size * 0.3; ds.push(circleD(q.x + q.nx * rr + ss, q.y + q.ny * rr + ss, Math.max(0.4, s.size * (0.04 + rnd() * 0.08)))); }
      return [{ d: ds.join(' '), opacity: 1 }];
    }
    case 'dashed': {
      const dash = Math.max(2, s.size * (s.spacing ?? 2)), line = resampleLine(points, Math.max(1, s.size / 4)), ds: string[] = [];
      let seg: StrokePoint[] = [];
      for (const q of line) {
        const on = Math.floor(q.at / dash) % 2 === 0;
        if (on) seg.push([q.x, q.y, q.p]); else if (seg.length) { ds.push(basicD(seg.length > 1 ? seg : [seg[0], [seg[0][0] + 0.1, seg[0][1], seg[0][2]]], { ...s, thinning: 0, taper: 0 }, hasPressure, true)); seg = []; }
      }
      if (seg.length) ds.push(basicD(seg, { ...s, thinning: 0, taper: 0 }, hasPressure, true));
      return [{ d: ds.join(' '), opacity: 1 }];
    }
    case 'pattern': {
      const line = resampleLine(points, Math.max(2, s.size * (s.spacing ?? 1.4)));
      return [{ d: line.map((q, i) => starD(q.x, q.y, s.size / 2, i * 0.4)).join(' '), opacity: 1 }];
    }
    default:
      return [{ d: basicD(points, s, hasPressure, last), opacity: 1 }];
  }
}

export function strokePathD(points: StrokePoint[], s: BrushSettings, hasPressure: boolean, last = false): string {
  return brushLayers(points, s, hasPressure, last).map((l) => l.d).join(' ');
}

// Turns a finished stroke into a canvas object.
export function createStrokeObject(F: any, points: StrokePoint[], s: BrushSettings, hasPressure: boolean) {
  const layers = s.kind === 'eraser' ? [{ d: basicD(points, s, hasPressure, true), opacity: 1 }] : brushLayers(points, s, hasPressure, true).filter((l) => l.d);
  if (!layers.length) return null;
  if (layers.length > 1) {
    // Layered brushes (soft, watercolour): one group of vector shapes, each with its own opacity.
    const kids = layers.map((l) => new F.Path(l.d, { fill: s.color, stroke: '', strokeWidth: 0, opacity: l.opacity, objectCaching: false }));
    const g: any = new F.Group(kids, { opacity: s.opacity, objectCaching: true });
    g.__brush = { kind: s.kind, preset: s.preset };
    g.name = BRUSH_PRESETS.find((b) => b.id === s.preset)?.label || 'Drawing';
    return g;
  }
  const d = layers[0].d;
  const obj: any = new F.Path(d, {
    fill: s.kind === 'eraser' ? '#000000' : s.color,
    stroke: '',
    strokeWidth: 0,
    opacity: s.kind === 'highlighter' ? Math.min(s.opacity, 0.45) : s.opacity,
    objectCaching: true,
  });
  if (s.kind === 'highlighter') obj.set({ globalCompositeOperation: 'multiply' });
  obj.__brush = { kind: s.kind, preset: s.preset };
  obj.name = (s.kind === 'brush' && BRUSH_PRESETS.find((b) => b.id === s.preset)?.label) || BRUSH_KINDS.find((b) => b.id === s.kind)?.label || 'Drawing';
  return obj;
}

const rectsOverlap = (a: any, b: any) => a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

const ERASABLE_TYPES = ['path', 'rect', 'ellipse', 'circle', 'triangle', 'polygon', 'polyline', 'line'];

// What the eraser can cut: drawings, pen/pencil paths and shapes — never
// photos (their mask is their frame), text, pages or guides, and nothing
// that already has a different kind of mask.
export function isErasable(o: any): boolean {
  if (!o || o.locked || o.visible === false || o.__isArtboard || o.__isGuide || o.__isAnchorHandle || o.__isHelper) return false;
  if (o.__brush?.kind === 'eraser') return false;
  if (!(o.__brush || o.isVectorPath || o.__shape || ERASABLE_TYPES.includes(o.type))) return false;
  const clip = o.clipPath;
  return !clip || (clip.type === 'group' && clip.inverted);
}

// Cuts the eraser stroke out of everything erasable it touches. The cut
// is a live mask kept inside each object (so it moves with it and can be
// undone); the object's own shape is never destroyed.
export function eraseWithStroke(F: any, canvas: any, eraser: any): number {
  const box = eraser.getBoundingRect(true, true);
  const targets = canvas.getObjects().filter((o: any) => isErasable(o) && rectsOverlap(box, o.getBoundingRect(true, true)));
  const E = eraser.calcTransformMatrix();
  targets.forEach((o: any) => {
    // The eraser stroke expressed in this stroke's own coordinates.
    const L = F.util.multiplyTransformMatrices(F.util.invertTransform(o.calcTransformMatrix()), E);
    const d = F.util.qrDecompose(L);
    const piece = new F.Path(eraser.path, {
      left: d.translateX,
      top: d.translateY,
      angle: d.angle,
      scaleX: d.scaleX,
      scaleY: d.scaleY,
      originX: 'center',
      originY: 'center',
      fill: '#000000',
      stroke: '',
      objectCaching: false,
    });
    const existing = o.clipPath && o.clipPath.type === 'group' && o.clipPath.inverted ? o.clipPath : null;
    if (existing) {
      existing.addWithUpdate(piece);
    } else {
      o.clipPath = new F.Group([piece], { inverted: true, objectCaching: false });
    }
    o.dirty = true;
  });
  return targets.length;
}
