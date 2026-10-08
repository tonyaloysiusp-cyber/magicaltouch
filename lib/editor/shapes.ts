// Creates and edits library shapes on the canvas. Every shape is a real
// vector path (editable with Direct Selection, exportable to SVG/PDF) that
// remembers what it is in `__shape`, so its options (points, sides,
// corner radius) can be changed later without losing position or size.

import { ShapeKind, ShapeParams, shapeDef, shapePathD } from './shapePaths';

export interface ShapeStyle {
  fill?: any;
  stroke?: string;
  strokeWidth?: number;
}

export interface ShapeMeta {
  kind: ShapeKind;
  params: ShapeParams;
}

export const DEFAULT_SHAPE_FILL = '#8CCBFF';
export const DEFAULT_LINE_STROKE = '#09090B';

export function createShape(
  F: any,
  kind: ShapeKind,
  box: { left: number; top: number; width: number; height: number },
  style: ShapeStyle = {},
  params?: ShapeParams
) {
  const def = shapeDef(kind);
  const p: ShapeParams = { ...(def?.params || {}), ...(params || {}) };
  const stroked = !!def?.stroked;
  const d = shapePathD(kind, box.width, box.height, p);
  const obj: any = new F.Path(d, {
    fill: stroked ? '' : style.fill ?? DEFAULT_SHAPE_FILL,
    stroke: stroked ? style.stroke ?? DEFAULT_LINE_STROKE : style.stroke ?? '',
    strokeWidth: stroked ? style.strokeWidth ?? 6 : style.strokeWidth ?? 0,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    strokeUniform: true,
    objectCaching: false,
  });
  obj.set({ left: box.left, top: box.top });
  obj.setCoords();
  obj.isVectorPath = true;
  obj.name = def?.label || 'Shape';
  obj.__shape = { kind, params: p } as ShapeMeta;
  return obj;
}

// Rebuilds a library shape with new options at its current on-page size,
// keeping its centre, rotation, flips and style.
export function updateShapeParams(F: any, obj: any, patch: ShapeParams) {
  const meta: ShapeMeta | undefined = obj?.__shape;
  if (!meta) return null;
  const params = { ...meta.params, ...patch };
  const w = Math.max(1, (obj.width || 1) * Math.abs(obj.scaleX || 1));
  const h = Math.max(1, (obj.height || 1) * Math.abs(obj.scaleY || 1));
  const center = obj.getCenterPoint();
  const d = shapePathD(meta.kind, w, h, params);
  const fresh: any = new F.Path(d);
  obj.set({ path: fresh.path, width: fresh.width, height: fresh.height, pathOffset: fresh.pathOffset, scaleX: 1, scaleY: 1 });
  obj.setPositionByOrigin(center, 'center', 'center');
  obj.__shape = { kind: meta.kind, params };
  obj.dirty = true;
  obj.setCoords();
  return obj;
}

// Natural size for a shape dropped onto a page of the given size.
export function defaultShapeBox(kind: ShapeKind, page: { x: number; y: number; width: number; height: number }, at?: { x: number; y: number }) {
  const def = shapeDef(kind);
  const aspect = def?.aspect || 1;
  const base = Math.min(page.width, page.height) * (def?.stroked ? 0.5 : 0.3);
  const width = aspect >= 1 ? base : base * aspect;
  const height = def?.stroked ? Math.max(12, base / aspect) : aspect >= 1 ? base / aspect : base;
  const cx = at ? at.x : page.x + page.width / 2;
  const cy = at ? at.y : page.y + page.height / 2;
  return { left: cx - width / 2, top: cy - height / 2, width, height };
}
