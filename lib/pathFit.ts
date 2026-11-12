// Path helpers for absolute M/L/Q/C/Z path data (as lib/trace.ts writes it).

/** Moves and scales every coordinate pair of an absolute M/L/Q/C/Z path. */
export function fitPath(d: string, box: { x: number; y: number; w: number; h: number }, size = 100): string {
  const k = size / Math.max(box.w, box.h, 1);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (n) => {
    const v = Number(n);
    const out = i++ % 2 === 0 ? (v - cx) * k : (v - cy) * k;
    return String(Math.round(out * 100) / 100);
  });
}

/** Bounding box of an absolute path's coordinate pairs. */
export function pathBox(d: string): { x: number; y: number; w: number; h: number } {
  const n = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
  return isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 1, h: 1 };
}
