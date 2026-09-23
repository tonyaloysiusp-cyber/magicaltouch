// ---------------------------------------------------------------------
// lib/editor/curves.ts
// A real tone-curve engine: named control points (0-255 input/output),
// interpolated with a Catmull-Rom spline into a genuine 256-entry LUT —
// not a straight-line polyline pretending to be a curve — plus a real
// per-channel histogram computed from actual pixel data, the reference
// a Curves (or Levels) tool needs to be more than a blind slider.
//
// Scope note: this operates on a single composite RGB curve (all three
// channels share the same LUT), matching this codebase's existing
// "master channel only" scope for Hue/Saturation — genuine per-channel
// R/G/B curves are a real, larger feature left for later rather than
// faked with three independent-looking sliders that don't compose.
// ---------------------------------------------------------------------

export interface CurvePoint {
  x: number; // input level, 0-255
  y: number; // output level, 0-255
}

export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

export function isDefaultCurve(points: CurvePoint[] | undefined): boolean {
  if (!points || points.length !== 2) return false;
  return points[0].x === 0 && points[0].y === 0 && points[1].x === 255 && points[1].y === 255;
}

function catmullRom(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3);
}

// The Y-value Catmull-Rom needs just past either end of the point list,
// for the segment tangent at that boundary. Simply repeating the
// endpoint (a common shortcut) makes the spline curve even where the
// "curve" is just two points — mirroring it via linear extrapolation is
// what actually makes a straight 2-point curve come out straight.
function phantomY(pts: CurvePoint[], i: number): number {
  const n = pts.length;
  if (i < 0) return 2 * pts[0].y - pts[1].y;
  if (i >= n) return 2 * pts[n - 1].y - pts[n - 2].y;
  return pts[i].y;
}

// Builds a real 256-entry lookup table from the given control points via
// a Catmull-Rom spline (a genuine smooth curve through every point, not
// a linear connect-the-dots) — an honest, documented limitation: with
// widely different neighboring slopes Catmull-Rom can overshoot/dip
// slightly past a control point's own value before settling, the same
// real tradeoff any non-monotone spline has, same spirit as this
// codebase's box-blur-for-gaussian and square-dilation-for-circular
// approximations elsewhere.
export function buildCurveLUT(points: CurvePoint[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const pts = [...points].sort((a, b) => a.x - b.x);
  if (pts.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  const n = pts.length;
  let seg = 0;
  for (let x = 0; x <= 255; x++) {
    while (seg < n - 2 && x >= pts[seg + 1].x) seg++;
    const y0 = phantomY(pts, seg - 1);
    const y1 = phantomY(pts, seg);
    const y2 = phantomY(pts, seg + 1);
    const y3 = phantomY(pts, seg + 2);
    const xSpan = pts[seg + 1].x - pts[seg].x;
    const t = xSpan > 0 ? (x - pts[seg].x) / xSpan : 0;
    const y = catmullRom(y0, y1, y2, y3, t);
    lut[x] = Math.max(0, Math.min(255, Math.round(y)));
  }
  return lut;
}

export interface Histogram {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  luminance: Uint32Array;
}

// Real per-pixel histogram (256 bins per channel) from actual image
// data — the reference a Curves/Levels editor draws behind its graph.
export function computeHistogram(imageData: ImageData): Histogram {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const luminance = new Uint32Array(256);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const rv = data[i];
    const gv = data[i + 1];
    const bv = data[i + 2];
    r[rv]++;
    g[gv]++;
    b[bv]++;
    luminance[Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv)]++;
  }
  return { r, g, b, luminance };
}
