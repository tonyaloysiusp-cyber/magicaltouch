// Colour separations and halftone films (deterministic image processing).
//  · Process: CMYK plates from the FOGRA39 conversion, total area coverage map.
//  · Spot (screen printing): the picture reduced to N inks by k-means with a
//    farthest-point start (same result every time), one plate per ink, and an
//    optional white underbase choked inside the design for dark garments.
//  · Halftone: AM screen dots per plate at a chosen LPI, angle and dot shape,
//    written as vectors (films for screens or plates) with registration marks.

export type Plane = Uint8Array; // 0 = no ink, 255 = full ink, one byte per pixel
export interface Plate { name: string; ink: string; plane: Plane; angle: number }

/** Interleaved CMYK bytes → four planes. */
export function cmykPlanes(cmyk: Uint8Array): [Plane, Plane, Plane, Plane] {
  const n = cmyk.length / 4, c = new Uint8Array(n), m = new Uint8Array(n), y = new Uint8Array(n), k = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { c[i] = cmyk[j]; m[i] = cmyk[j + 1]; y[i] = cmyk[j + 2]; k[i] = cmyk[j + 3]; }
  return [c, m, y, k];
}

/** Total area coverage: max %, share of pixels over the limit, and a mask of them. */
export function coverage(cmyk: Uint8Array, limitPct: number): { maxPct: number; overShare: number; over: Uint8Array; meanPct: number } {
  const n = cmyk.length / 4, over = new Uint8Array(n), lim = (limitPct / 100) * 255;
  let max = 0, cnt = 0, sum = 0;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const t = cmyk[j] + cmyk[j + 1] + cmyk[j + 2] + cmyk[j + 3];
    sum += t; if (t > max) max = t;
    if (t > lim) { over[i] = 1; cnt++; }
  }
  return { maxPct: Math.round((max / 255) * 100), overShare: n ? cnt / n : 0, over, meanPct: n ? Math.round((sum / n / 255) * 100) : 0 };
}

/**
 * Reduces RGBA pixels to `k` colours. Deterministic: starts from the most common
 * colour and adds the farthest colours, then refines with k-means on a sample.
 * Transparent pixels (alpha < 128) get index 255.
 */
export function quantize(rgba: Uint8ClampedArray | Uint8Array, k: number, iterations = 8): { palette: [number, number, number][]; index: Uint8Array } {
  const n = rgba.length / 4, index = new Uint8Array(n);
  const step = Math.max(1, Math.floor(n / 40000));
  const sample: number[] = [];
  for (let i = 0; i < n; i += step) if (rgba[i * 4 + 3] >= 128) sample.push(i);
  if (!sample.length) { index.fill(255); return { palette: [], index }; }
  // most common colour (5-bit bins) as the first centre
  const bins = new Map<number, number>();
  for (const i of sample) { const key = ((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3); bins.set(key, (bins.get(key) || 0) + 1); }
  let best = 0, bestN = -1; for (const [key, c] of bins) if (c > bestN) { best = key; bestN = c; }
  const cent: number[][] = [[((best >> 10) << 3) + 4, (((best >> 5) & 31) << 3) + 4, ((best & 31) << 3) + 4]];
  const d2 = (i: number, c: number[]) => { const r = rgba[i * 4] - c[0], g = rgba[i * 4 + 1] - c[1], b = rgba[i * 4 + 2] - c[2]; return 0.3 * r * r + 0.59 * g * g + 0.11 * b * b; };
  while (cent.length < k) {
    let far = -1, farI = sample[0];
    for (const i of sample) { let m = Infinity; for (const c of cent) m = Math.min(m, d2(i, c)); if (m > far) { far = m; farI = i; } }
    if (far <= 0) break;
    cent.push([rgba[farI * 4], rgba[farI * 4 + 1], rgba[farI * 4 + 2]]);
  }
  for (let it = 0; it < iterations; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const i of sample) { let bi = 0, bd = Infinity; for (let c = 0; c < cent.length; c++) { const d = d2(i, cent[c]); if (d < bd) { bd = d; bi = c; } } const a = acc[bi]; a[0] += rgba[i * 4]; a[1] += rgba[i * 4 + 1]; a[2] += rgba[i * 4 + 2]; a[3]++; }
    let moved = 0;
    acc.forEach((a, c) => { if (!a[3]) return; const nc = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; moved += Math.abs(nc[0] - cent[c][0]) + Math.abs(nc[1] - cent[c][1]) + Math.abs(nc[2] - cent[c][2]); cent[c] = nc; });
    if (moved < 1) break;
  }
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3] < 128) { index[i] = 255; continue; }
    let bi = 0, bd = Infinity; for (let c = 0; c < cent.length; c++) { const d = d2(i, cent[c]); if (d < bd) { bd = d; bi = c; } } index[i] = bi;
  }
  return { palette: cent.map((c) => c.map((v) => Math.round(v)) as [number, number, number]), index };
}

/** One solid plate per palette colour (skipping the garment colour, if given). */
export function spotPlates(q: { palette: [number, number, number][]; index: Uint8Array }, skip: number | null = null): Plate[] {
  const hex = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  return q.palette.map((c, p) => ({ p, c })).filter(({ p }) => p !== skip).map(({ p, c }) => {
    const plane = new Uint8Array(q.index.length);
    for (let i = 0; i < plane.length; i++) if (q.index[i] === p) plane[i] = 255;
    return { name: `Spot ${p + 1} ${hex(c)}`, ink: hex(c), plane, angle: 22.5 };
  });
}

/** White underbase: every printed pixel, choked (shrunk) by `choke` pixels so it hides under the colours. */
export function underbase(planes: Plane[], w: number, h: number, choke: number): Plane {
  let m = new Uint8Array(w * h);
  for (const p of planes) for (let i = 0; i < m.length; i++) if (p[i] > 20) m[i] = 255;
  for (let s = 0; s < choke; s++) {
    const o = new Uint8Array(m.length);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; o[i] = m[i] && m[i - 1] && m[i + 1] && m[i - w] && m[i + w] ? 255 : 0; }
    m = o;
  }
  return m;
}

export type DotShape = 'round' | 'ellipse' | 'square' | 'line';
export interface HalftoneOptions { widthMm: number; heightMm: number; lpi: number; angle: number; shape: DotShape; minDot: number; maxDot: number }
export interface Dot { x: number; y: number; r: number; rx?: number; a?: number }

/**
 * AM halftone dots (mm) for one plane of size w×h px printed at widthMm×heightMm.
 * Cells sit on a grid turned by `angle`; each cell samples the plane at its centre.
 * Dot area = ink coverage (round dots merge above ~78 %, squares are exact).
 */
export function halftone(plane: Plane, w: number, h: number, o: HalftoneOptions): { dots: Dot[]; cell: number } {
  const cell = 25.4 / o.lpi, a = (o.angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const W = o.widthMm, H = o.heightMm, R = Math.hypot(W, H) / 2 + cell, cx = W / 2, cy = H / 2;
  const sx = w / W, sy = h / H, dots: Dot[] = [];
  const sample = (x: number, y: number) => { const px = Math.min(w - 1, Math.max(0, x * sx)), py = Math.min(h - 1, Math.max(0, y * sy)); const x0 = px | 0, y0 = py | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = px - x0, fy = py - y0; return ((plane[y0 * w + x0] * (1 - fx) + plane[y0 * w + x1] * fx) * (1 - fy) + (plane[y1 * w + x0] * (1 - fx) + plane[y1 * w + x1] * fx) * fy) / 255; };
  const nC = Math.ceil(R / cell);
  for (let j = -nC; j <= nC; j++) for (let i = -nC; i <= nC; i++) {
    const u = i * cell, v = j * cell, x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
    if (x < -cell / 2 || y < -cell / 2 || x > W + cell / 2 || y > H + cell / 2) continue;
    let c = sample(x, y);
    if (c < o.minDot) continue;
    if (c > o.maxDot) c = 1;
    if (o.shape === 'square') dots.push({ x, y, r: (cell * Math.sqrt(c)) / 2, a: o.angle });
    else if (o.shape === 'line') dots.push({ x, y, r: (cell * c) / 2, rx: cell / 2 + 0.01, a: o.angle });
    else if (o.shape === 'ellipse') { const r = cell * Math.sqrt(c / Math.PI) / Math.sqrt(1.3); dots.push({ x, y, r: Math.min(r, cell * 0.62), rx: Math.min(r * 1.3, cell * 0.75), a: o.angle }); }
    else dots.push({ x, y, r: Math.min(cell * Math.sqrt(c / Math.PI), cell * 0.7072) });
  }
  return { dots, cell };
}

const f = (n: number) => String(Math.round(n * 1000) / 1000);
/** Dots → SVG path data (mm). Circles and ellipses as two arcs; squares/lines as turned rectangles. */
export function dotsPath(dots: Dot[], shape: DotShape): string {
  let d = '';
  for (const p of dots) {
    if (shape === 'round') d += `M${f(p.x - p.r)} ${f(p.y)}a${f(p.r)} ${f(p.r)} 0 1 0 ${f(2 * p.r)} 0a${f(p.r)} ${f(p.r)} 0 1 0 ${f(-2 * p.r)} 0`;
    else {
      const rx = p.rx ?? p.r, ry = p.r, a = ((p.a || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      if (shape === 'ellipse') { const ex = p.x - rx * c, ey = p.y - rx * s; d += `M${f(ex)} ${f(ey)}a${f(rx)} ${f(ry)} ${f(p.a || 0)} 1 0 ${f(2 * rx * c)} ${f(2 * rx * s)}a${f(rx)} ${f(ry)} ${f(p.a || 0)} 1 0 ${f(-2 * rx * c)} ${f(-2 * rx * s)}`; continue; }
      const pts = [[-rx, -ry], [rx, -ry], [rx, ry], [-rx, ry]].map(([u, v]) => [p.x + u * c - v * s, p.y + u * s + v * c]);
      d += `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
    }
  }
  return d;
}

/** Registration target (mm) centred at x, y. */
export const regMark = (x: number, y: number, r = 3.5) => `M${f(x - r - 2)} ${f(y)}H${f(x + r + 2)}M${f(x)} ${f(y - r - 2)}V${f(y + r + 2)}M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

/** One film page (SVG, mm): halftone or solid image area, registration marks, label; optional mirror (emulsion down). */
export function filmSvg(o: { widthMm: number; heightMm: number; label: string; body: string; mirror: boolean; margin?: number }): string {
  const m = o.margin ?? 15, W = o.widthMm + 2 * m, H = o.heightMm + 2 * m;
  const marks = [regMark(W / 2, m / 2), regMark(W / 2, H - m / 2), regMark(m / 2, H / 2), regMark(W - m / 2, H / 2)].join('');
  const flip = o.mirror ? ` transform="translate(${f(W)} 0) scale(-1 1)"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}mm" height="${f(H)}mm"><rect width="${f(W)}" height="${f(H)}" fill="#FFFFFF"/><g${flip}><g transform="translate(${m} ${m})">${o.body}</g><path d="${marks}" fill="none" stroke="#000" stroke-width="0.25"/><text x="${f(m)}" y="${f(m * 0.55)}" font-family="Arial, Helvetica, sans-serif" font-size="3" fill="#000">${o.label.replace(/[<&]/g, '')}</text></g></svg>`;
}
