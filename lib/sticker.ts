// Wall-sticker contour cutting (pure functions): the outline a cutter
// follows around a sticker — the artwork's shape grown by an offset, outer
// edge only (holes are not cut) — as a smooth vector path.
import { outlines, area, simplify, loopPath } from './trace.ts';

/** Grow a 0/1 mask by `r` pixels (chamfer distance transform, 3-4 metric). */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const INF = 1e9, d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - w] + 3); if (x > 0) v = Math.min(v, d[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 3); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4); if (x > 0) v = Math.min(v, d[i + w - 1] + 4); }
    d[i] = v;
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < d.length; i++) out[i] = d[i] <= r * 3 ? 1 : 0;
  return out;
}

/**
 * Cut contour for RGBA pixels: alpha > threshold is the sticker, grown by
 * `offsetPx`, padded so the contour fits. Returns the path in pixel units of
 * the padded canvas plus the padding, so callers can place it over the art.
 */
export function contourFromRgba(rgba: Uint8ClampedArray, w: number, h: number, offsetPx: number, opts: { threshold?: number; smooth?: number } = {}): { d: string; pad: number; w: number; h: number; loops: number } {
  const pad = Math.ceil(offsetPx) + 2, W = w + 2 * pad, H = h + 2 * pad;
  const thr = opts.threshold ?? 40;
  let m = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] > thr) m[(y + pad) * W + x + pad] = 1;
  m = dilate(m, W, H, offsetPx);
  const loops = outlines(m, W, H).filter((l) => area(l) > 0 && Math.abs(area(l)) > 4); // outer edges only (no holes)
  const tol = opts.smooth ?? 1.2;
  const d = loops.map((l) => loopPath(simplify(l, tol), 1, true, 50)).join(' ');
  return { d, pad, w: W, h: H, loops: loops.length };
}
