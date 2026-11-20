// SVG path data → PDF path operators. Handles absolute and relative M L H V C S Q T Z
// (quadratics become cubics), compact number syntax, and maps coordinates through
// a caller-supplied transform (mm, y down → PDF points, y up).

export function svgPathToPdf(d: string, map: (x: number, y: number) => [number, number]): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, out = '';
  const n = () => Number(tok[i++]);
  const p = (px: number, py: number) => { const [a, b] = map(px, py); return `${Math.round(a * 1000) / 1000} ${Math.round(b * 1000) / 1000}`; };
  const isNum = (t: string | undefined) => t !== undefined && !/^[a-zA-Z]$/.test(t);
  while (i < tok.length) {
    if (!isNum(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out += 'h\n'; x = sx; y = sy; cx = qx = x; cy = qy = y; continue; }
    if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; out += `${p(x, y)} m\n`; cmd = rel ? 'l' : 'L'; cx = qx = x; cy = qy = y; continue; }
    if (C === 'L') { x = ox + n(); y = oy + n(); out += `${p(x, y)} l\n`; }
    else if (C === 'H') { x = ox + n(); out += `${p(x, y)} l\n`; }
    else if (C === 'V') { y = (rel ? y : 0) + n(); out += `${p(x, y)} l\n`; }
    else if (C === 'C' || C === 'S') {
      let x1: number, y1: number;
      if (C === 'C') { x1 = ox + n(); y1 = oy + n(); } else { x1 = 2 * x - cx; y1 = 2 * y - cy; }
      const x2 = ox + n(), y2 = oy + n(), ex = ox + n(), ey = oy + n();
      out += `${p(x1, y1)} ${p(x2, y2)} ${p(ex, ey)} c\n`; cx = x2; cy = y2; x = ex; y = ey; qx = x; qy = y; continue;
    } else if (C === 'Q' || C === 'T') {
      let q1x: number, q1y: number;
      if (C === 'Q') { q1x = ox + n(); q1y = oy + n(); } else { q1x = 2 * x - qx; q1y = 2 * y - qy; }
      const ex = ox + n(), ey = oy + n();
      const c1x = x + (2 / 3) * (q1x - x), c1y = y + (2 / 3) * (q1y - y), c2x = ex + (2 / 3) * (q1x - ex), c2y = ey + (2 / 3) * (q1y - ey);
      out += `${p(c1x, c1y)} ${p(c2x, c2y)} ${p(ex, ey)} c\n`; qx = q1x; qy = q1y; x = ex; y = ey; cx = x; cy = y; continue;
    } else { i++; continue; } // unsupported (A): skip a token to avoid looping
    cx = qx = x; cy = qy = y;
  }
  return out;
}
