// DXF (R12 ASCII — read by every CAD, laser, CNC and die-making program).
// Polylines in millimetres on named layers. Curves are flattened to short
// segments within a chord tolerance. Y is flipped (DXF is y-up).

export type Pt = [number, number];
export interface DxfLayer { name: string; color: number; polylines: { pts: Pt[]; closed: boolean }[] }

/** SVG path data (absolute or relative M L H V C S Q T Z) → polylines, curves flattened. */
export function pathToPolylines(d: string, tol = 0.05): { pts: Pt[]; closed: boolean }[] {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const out: { pts: Pt[]; closed: boolean }[] = [];
  let i = 0, cmd = '', x = 0, y = 0, cx = 0, cy = 0, qx = 0, qy = 0, cur: Pt[] = [];
  const n = () => Number(tok[i++]);
  const isNum = (t?: string) => t !== undefined && !/^[a-zA-Z]$/.test(t);
  const flush = (closed: boolean) => { if (cur.length > 1) out.push({ pts: cur, closed }); cur = []; };
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(ex - x2, ey - y2);
    const steps = Math.max(2, Math.min(200, Math.ceil(Math.sqrt(len / tol) * 0.6)));
    for (let s = 1; s <= steps; s++) { const t = s / steps, u = 1 - t; cur.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]); }
  };
  while (i < tok.length) {
    if (!isNum(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { if (cur.length) { flush(true); } continue; }
    if (C === 'M') { flush(false); x = ox + n(); y = oy + n(); cur = [[x, y]]; cmd = rel ? 'l' : 'L'; cx = qx = x; cy = qy = y; continue; }
    if (!cur.length) cur = [[x, y]];
    if (C === 'L') { x = ox + n(); y = oy + n(); cur.push([x, y]); }
    else if (C === 'H') { x = ox + n(); cur.push([x, y]); }
    else if (C === 'V') { y = (rel ? y : 0) + n(); cur.push([x, y]); }
    else if (C === 'C' || C === 'S') { let x1, y1; if (C === 'C') { x1 = ox + n(); y1 = oy + n(); } else { x1 = 2 * x - cx; y1 = 2 * y - cy; } const x2 = ox + n(), y2 = oy + n(), ex = ox + n(), ey = oy + n(); cubic(x1, y1, x2, y2, ex, ey); cx = x2; cy = y2; x = ex; y = ey; qx = x; qy = y; continue; }
    else if (C === 'Q' || C === 'T') { let q1x, q1y; if (C === 'Q') { q1x = ox + n(); q1y = oy + n(); } else { q1x = 2 * x - qx; q1y = 2 * y - qy; } const ex = ox + n(), ey = oy + n(); cubic(x + (2 / 3) * (q1x - x), y + (2 / 3) * (q1y - y), ex + (2 / 3) * (q1x - ex), ey + (2 / 3) * (q1y - ey), ex, ey); qx = q1x; qy = q1y; x = ex; y = ey; cx = x; cy = y; continue; }
    else if (C === 'A') {
      // SVG arc → centre form (SVG spec F.6.5), sampled within the tolerance.
      let rx = Math.abs(n()), ry = Math.abs(n()); const phi = (n() * Math.PI) / 180, fa = n(), fs = n(), ex = ox + n(), ey = oy + n();
      if (!rx || !ry) { x = ex; y = ey; cur.push([x, y]); cx = qx = x; cy = qy = y; continue; }
      const cp = Math.cos(phi), sp = Math.sin(phi), dx = (x - ex) / 2, dy = (y - ey) / 2;
      const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
      const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sign = fa === fs ? -1 : 1, num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
      const co = sign * Math.sqrt(Math.max(0, num / den)), cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
      const ccx = cp * cxp - sp * cyp + (x + ex) / 2, ccy = sp * cxp + cp * cyp + (y + ey) / 2;
      const ang = (ux: number, uy: number, vx: number, vy: number) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
      const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
      const steps = Math.max(4, Math.min(360, Math.ceil(Math.abs(dt) * Math.sqrt(Math.max(rx, ry) / tol) * 0.5)));
      for (let k = 1; k <= steps; k++) { const t = t1 + (dt * k) / steps; cur.push([ccx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, ccy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]); }
      x = ex; y = ey;
    }
    else { i++; continue; }
    cx = qx = x; cy = qy = y;
  }
  flush(false);
  return out;
}

const r = (v: number) => (Math.round(v * 10000) / 10000).toString();
/** Writes a DXF R12 file. `height` flips y so the drawing is the right way up. */
export function writeDxf(layers: DxfLayer[], height: number): string {
  const L: string[] = [];
  const g = (code: number, v: string | number) => { L.push(String(code)); L.push(String(v)); };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of layers) for (const p of l.polylines) for (const [x, y] of p.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, height - y); maxY = Math.max(maxY, height - y); }
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 1; }
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 4); // 4 = millimetres
  g(9, '$EXTMIN'); g(10, r(minX)); g(20, r(minY)); g(9, '$EXTMAX'); g(10, r(maxX)); g(20, r(maxY)); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'LAYER'); g(70, layers.length);
  for (const l of layers) { g(0, 'LAYER'); g(2, l.name); g(70, 0); g(62, l.color); g(6, 'CONTINUOUS'); }
  g(0, 'ENDTAB'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  for (const l of layers) for (const p of l.polylines) {
    if (p.pts.length === 2 && !p.closed) { g(0, 'LINE'); g(8, l.name); g(10, r(p.pts[0][0])); g(20, r(height - p.pts[0][1])); g(30, 0); g(11, r(p.pts[1][0])); g(21, r(height - p.pts[1][1])); g(31, 0); continue; }
    g(0, 'POLYLINE'); g(8, l.name); g(66, 1); g(70, p.closed ? 1 : 0);
    for (const [x, y] of p.pts) { g(0, 'VERTEX'); g(8, l.name); g(10, r(x)); g(20, r(height - y)); g(30, 0); }
    g(0, 'SEQEND'); g(8, l.name);
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return L.join('\n') + '\n';
}

/** Total length (mm) of a set of polylines — for cut time and rule length. */
export function polyLength(polys: { pts: Pt[]; closed: boolean }[]): number {
  let s = 0;
  for (const p of polys) { for (let i = 1; i < p.pts.length; i++) s += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]); if (p.closed && p.pts.length > 2) s += Math.hypot(p.pts[0][0] - p.pts[p.pts.length - 1][0], p.pts[0][1] - p.pts[p.pts.length - 1][1]); }
  return s;
}
