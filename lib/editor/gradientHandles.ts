// Geometry for dragging a gradient directly on the canvas. Fabric draws a
// 'percentage' gradient in the object's own box: local point =
// (x·width − width/2, y·height − height/2), then the object's transform,
// then the viewport (pan / zoom). These helpers go both ways.

export type M = number[]; // [a, b, c, d, e, f]
export type P = { x: number; y: number };

export const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
export const inv = (m: M): M => {
  const d = m[0] * m[3] - m[1] * m[2] || 1e-9;
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
};
export const apply = (m: M, p: P): P => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });

export interface GradientBox { width: number; height: number; matrix: M }

/** Screen position of a gradient point given in fractions of the object's box. */
export function toScreen(o: GradientBox, vpt: M, fx: number, fy: number): P {
  return apply(mul(vpt, o.matrix), { x: fx * o.width - o.width / 2, y: fy * o.height - o.height / 2 });
}
/** Fractions of the object's box for a screen position. */
export function fromScreen(o: GradientBox, vpt: M, p: P): P {
  const l = apply(inv(mul(vpt, o.matrix)), p);
  return { x: (l.x + o.width / 2) / (o.width || 1), y: (l.y + o.height / 2) / (o.height || 1) };
}

/** Snaps the end point so the gradient runs at a multiple of 15° (Shift). */
export function snapAngle(a: P, b: P): P {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
}
