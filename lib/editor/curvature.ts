// Pure maths for the Curvature mode of the Pen tool.
/**
 * Curvature tool: a smooth curve that passes through every clicked point
 * (Catmull-Rom → cubic Bézier). Points marked `corner` stay sharp. The
 * result is an ordinary editable path with real handles.
 */
export function curvatureHandles<T extends { x: number; y: number; corner?: boolean }>(pts: T[], closed: boolean): (T & { handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } })[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const out: any = { ...p };
    delete out.handleIn; delete out.handleOut;
    if (p.corner) return out;
    const prev = i > 0 ? pts[i - 1] : closed ? pts[n - 1] : null;
    const next = i < n - 1 ? pts[i + 1] : closed ? pts[0] : null;
    if (!prev && !next) return out;
    const a = prev || p, b = next || p;
    const tx = (b.x - a.x) / 6, ty = (b.y - a.y) / 6;
    if (prev) out.handleIn = { x: p.x - tx, y: p.y - ty };
    if (next) out.handleOut = { x: p.x + tx, y: p.y + ty };
    return out;
  });
}
