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
}

export const DEFAULT_BRUSH: BrushSettings = { kind: 'brush', color: '#09090B', size: 12, opacity: 1, smoothing: 0.5 };

export const BRUSH_KINDS: { id: BrushKind; label: string; hint: string }[] = [
  { id: 'brush', label: 'Brush', hint: 'Pressure-sensitive strokes that taper at the ends' },
  { id: 'marker', label: 'Marker', hint: 'Even, bold strokes' },
  { id: 'highlighter', label: 'Highlighter', hint: 'See-through strokes that don’t hide what’s under them' },
  { id: 'pencil', label: 'Pencil', hint: 'Thin, crisp lines' },
  { id: 'eraser', label: 'Eraser', hint: 'Erases drawn strokes (not photos or text)' },
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
    default:
      return {
        size: s.size,
        thinning: 0.6,
        smoothing: s.smoothing,
        streamline: 0.5,
        simulatePressure: !hasPressure,
        start: { taper: s.size * 2, cap: true },
        end: { taper: s.size * 2, cap: true },
      };
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

export function strokePathD(points: StrokePoint[], s: BrushSettings, hasPressure: boolean, last = false): string {
  if (!points.length) return '';
  const pts = points.length === 1 ? [points[0], [points[0][0] + 0.1, points[0][1] + 0.1, points[0][2]] as StrokePoint] : points;
  const outline = getStroke(pts, { ...strokeOptions(s, hasPressure), last });
  return outlineToPathD(outline);
}

// Turns a finished stroke into a canvas object.
export function createStrokeObject(F: any, points: StrokePoint[], s: BrushSettings, hasPressure: boolean) {
  const d = strokePathD(points, s, hasPressure, true);
  if (!d) return null;
  const obj: any = new F.Path(d, {
    fill: s.kind === 'eraser' ? '#000000' : s.color,
    stroke: '',
    strokeWidth: 0,
    opacity: s.kind === 'highlighter' ? Math.min(s.opacity, 0.45) : s.opacity,
    objectCaching: true,
  });
  if (s.kind === 'highlighter') obj.set({ globalCompositeOperation: 'multiply' });
  obj.__brush = { kind: s.kind };
  obj.name = BRUSH_KINDS.find((b) => b.id === s.kind)?.label || 'Drawing';
  return obj;
}

const rectsOverlap = (a: any, b: any) => a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

// Cuts the eraser stroke out of every drawn stroke it touches. The cut is
// a live mask kept inside each stroke (so it moves with it and can be
// undone); the stroke's own shape is never destroyed.
export function eraseWithStroke(F: any, canvas: any, eraser: any): number {
  const box = eraser.getBoundingRect(true, true);
  const targets = canvas
    .getObjects()
    .filter((o: any) => o.__brush && o.__brush.kind !== 'eraser' && !o.locked && o.visible !== false && rectsOverlap(box, o.getBoundingRect(true, true)));
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
