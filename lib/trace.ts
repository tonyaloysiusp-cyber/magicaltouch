// ---------------------------------------------------------------------
// lib/trace.ts — Image Trace: turns a photo or drawing into vector shapes.
// Modes: colour (k-means palette of 2–32 colours), black & white (Otsu
// threshold) and line drawing (edge detection). Each colour layer is traced
// along pixel edges, simplified (Ramer–Douglas–Peucker) and smoothed into
// quadratic curves. Pure functions on RGBA pixel data — runs in the browser
// and in unit tests.
// ---------------------------------------------------------------------

export type TraceMode = 'colour' | 'bw' | 'line';

export interface TraceOptions {
  mode: TraceMode;
  colors: number;        // colour mode: 2–32
  detail: number;        // max side in px the image is traced at (200–1600)
  smooth: number;        // simplify tolerance in px (0.3–4)
  noise: number;         // drop shapes smaller than this many px²
  ignoreWhite: boolean;  // leave the lightest colour out (transparent background)
  threshold?: number;    // bw/line: 0–255, empty = automatic
  curves: boolean;       // smooth corners into curves
}

export const DEFAULT_TRACE: TraceOptions = { mode: 'colour', colors: 6, detail: 700, smooth: 1.2, noise: 12, ignoreWhite: false, curves: true };

export const PRESETS: { id: string; label: string; o: Partial<TraceOptions> }[] = [
  { id: 'bw', label: 'Black & white', o: { mode: 'bw', colors: 2, ignoreWhite: true } },
  { id: 'line', label: 'Line drawing', o: { mode: 'line', colors: 2, ignoreWhite: true, smooth: 0.9 } },
  { id: 'c3', label: '3 colours', o: { mode: 'colour', colors: 3 } },
  { id: 'c4', label: '4 colours', o: { mode: 'colour', colors: 4 } },
  { id: 'c6', label: '6 colours', o: { mode: 'colour', colors: 6 } },
  { id: 'c8', label: '8 colours', o: { mode: 'colour', colors: 8 } },
  { id: 'c16', label: '16 colours', o: { mode: 'colour', colors: 16, smooth: 0.9 } },
  { id: 'logo', label: 'Logo (sharp)', o: { mode: 'colour', colors: 4, curves: false, smooth: 0.6, noise: 20 } },
];

export interface Px { data: Uint8ClampedArray | number[]; width: number; height: number }
export interface Layer { color: string; d: string; area: number }
export interface TraceResult { width: number; height: number; scale: number; layers: Layer[] }

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Nearest-neighbour resample to fit `max` px (keeps small images as they are). */
export function resample(img: Px, max: number): Px & { scale: number } {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  if (k >= 1) return { ...img, scale: 1 };
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // box average for quality
    const x0 = Math.floor(x / k), x1 = Math.min(img.width, Math.floor((x + 1) / k)), y0 = Math.floor(y / k), y1 = Math.min(img.height, Math.floor((y + 1) / k));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++) for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) {
      const i = (yy * img.width + xx) * 4;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]; n++;
    }
    const o = (y * w + x) * 4;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
  }
  return { data: out, width: w, height: h, scale: 1 / k };
}

/** k-means colour palette (deterministic k-means++ seeding). */
export function palette(img: Px, k: number): [number, number, number][] {
  const n = img.width * img.height;
  const step = Math.max(1, Math.floor(n / 6000));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i += step) {
    const a = img.data[i * 4 + 3];
    if (a < 128) continue;
    pts.push([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]]);
  }
  if (!pts.length) return [[0, 0, 0]];
  k = Math.max(1, Math.min(k, pts.length));
  const d2 = (p: number[], q: number[]) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  // seed: darkest point, then farthest-point (k-means++ without randomness)
  let c: number[][] = [pts.reduce((m, p) => (lum(p[0], p[1], p[2]) < lum(m[0], m[1], m[2]) ? p : m))];
  const dist = pts.map((p) => d2(p, c[0]));
  while (c.length < k) {
    let bi = 0;
    for (let i = 1; i < pts.length; i++) if (dist[i] > dist[bi]) bi = i;
    c.push(pts[bi]);
    for (let i = 0; i < pts.length; i++) dist[i] = Math.min(dist[i], d2(pts[i], pts[bi]));
  }
  for (let it = 0; it < 12; it++) {
    const sum = c.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      for (let j = 0; j < c.length; j++) { const dd = d2(p, c[j]); if (dd < bd) { bd = dd; bi = j; } }
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    c = c.map((old, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : old));
  }
  return c.map((v) => [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])] as [number, number, number]);
}

export function otsu(hist: number[]): number {
  const total = hist.reduce((a, b) => a + b, 0);
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; t = i; }
  }
  return t;
}

/** Label each pixel with a layer index; returns labels and the layer colours. */
export function classify(img: Px, o: TraceOptions): { labels: Int16Array; colors: string[] } {
  const { width: w, height: h, data } = img;
  const labels = new Int16Array(w * h).fill(-1);
  if (o.mode === 'colour') {
    const pal = palette(img, Math.max(2, Math.min(32, Math.round(o.colors))));
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] < 128) continue;
      let bi = 0, bd = Infinity;
      for (let j = 0; j < pal.length; j++) {
        const dd = (data[i * 4] - pal[j][0]) ** 2 + (data[i * 4 + 1] - pal[j][1]) ** 2 + (data[i * 4 + 2] - pal[j][2]) ** 2;
        if (dd < bd) { bd = dd; bi = j; }
      }
      labels[i] = bi;
    }
    return { labels, colors: pal.map((p) => hex(p[0], p[1], p[2])) };
  }
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = data[i * 4 + 3] < 128 ? 255 : lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  let v = g;
  if (o.mode === 'line') {
    // Sobel edge strength, inverted so edges are dark.
    v = new Float32Array(w * h).fill(255);
    let max = 1;
    const e = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = (dx: number, dy: number) => g[(y + dy) * w + x + dx];
      const gx = -p(-1, -1) - 2 * p(-1, 0) - p(-1, 1) + p(1, -1) + 2 * p(1, 0) + p(1, 1);
      const gy = -p(-1, -1) - 2 * p(0, -1) - p(1, -1) + p(-1, 1) + 2 * p(0, 1) + p(1, 1);
      const m = Math.hypot(gx, gy); e[y * w + x] = m; if (m > max) max = m;
    }
    for (let i = 0; i < w * h; i++) v[i] = 255 - Math.min(255, (e[i] / max) * 255 * 2.2);
  }
  const hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) hist[Math.max(0, Math.min(255, Math.round(v[i])))]++;
  const t = o.threshold ?? (o.mode === 'line' ? Math.min(otsu(hist), 200) : otsu(hist));
  for (let i = 0; i < w * h; i++) labels[i] = v[i] <= t ? 0 : 1;
  return { labels, colors: ['#111111', '#FFFFFF'] };
}

type Pt = [number, number];

/** Outlines of every region where mask is true, following pixel edges (outer CW, holes CCW). */
export function outlines(mask: Uint8Array, w: number, h: number): Pt[][] {
  // Directed boundary edges keyed by start vertex; vertex id = y*(w+1)+x.
  const W1 = w + 1;
  const out = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const a = y0 * W1 + x0, b = y1 * W1 + x1;
    const l = out.get(a); if (l) l.push(b); else out.set(a, [b]);
  };
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);         // top, left→right
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); // right, top→bottom
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); // bottom, right→left
    if (!at(x - 1, y)) add(x, y + 1, x, y);         // left, bottom→top
  }
  const loops: Pt[][] = [];
  const xy = (v: number): Pt => [v % W1, Math.floor(v / W1)];
  for (const [start, list] of out) {
    while (list.length) {
      const loop: Pt[] = [xy(start)];
      let prev = start, cur = list.pop()!;
      let guard = 0;
      while (cur !== start && guard++ < 4e6) {
        loop.push(xy(cur));
        const nx = out.get(cur);
        if (!nx || !nx.length) break;
        let pick = 0;
        if (nx.length > 1) {
          // At a pinch point keep the region on the right: prefer a right turn.
          const [px, py] = xy(prev), [cx, cy] = xy(cur);
          const dx = cx - px, dy = cy - py;
          let best = -9;
          nx.forEach((v, i) => { const [ex, ey] = xy(v); const cross = dx * (ey - cy) - dy * (ex - cx); if (cross > best) { best = cross; pick = i; } });
        }
        prev = cur;
        cur = nx.splice(pick, 1)[0];
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

export function area(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}

/** Ramer–Douglas–Peucker on a closed loop. */
export function simplify(p: Pt[], tol: number): Pt[] {
  if (p.length < 5 || tol <= 0) return p;
  // split the loop at its two farthest-apart points
  let far = 0, fd = 0;
  for (let i = 1; i < p.length; i++) { const d = (p[i][0] - p[0][0]) ** 2 + (p[i][1] - p[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const rdp = (pts: Pt[]): Pt[] => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
    let idx = 0, md = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L;
      if (d > md) { md = d; idx = i; }
    }
    if (md <= tol) return [a, b];
    const l = rdp(pts.slice(0, idx + 1)), r = rdp(pts.slice(idx));
    return [...l.slice(0, -1), ...r];
  };
  const one = rdp(p.slice(0, far + 1)), two = rdp([...p.slice(far), p[0]]);
  return [...one.slice(0, -1), ...two.slice(0, -1)];
}

const n2 = (v: number) => Math.round(v * 100) / 100;

function loopPath(p: Pt[], s: number, curves: boolean): string {
  if (!curves || p.length < 4) return 'M' + p.map(([x, y]) => `${n2(x * s)} ${n2(y * s)}`).join('L') + 'Z';
  // Quadratic curves through edge midpoints, corners as control points.
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(p[p.length - 1], p[0]);
  let d = `M${n2(m0[0] * s)} ${n2(m0[1] * s)}`;
  for (let i = 0; i < p.length; i++) {
    const c = p[i], m = mid(c, p[(i + 1) % p.length]);
    d += `Q${n2(c[0] * s)} ${n2(c[1] * s)} ${n2(m[0] * s)} ${n2(m[1] * s)}`;
  }
  return d + 'Z';
}

/** Trace an image into vector layers. */
export function trace(src: Px, opts: Partial<TraceOptions> = {}): TraceResult {
  const o = { ...DEFAULT_TRACE, ...opts };
  const img = resample(src, Math.max(100, Math.min(2000, o.detail)));
  const { width: w, height: h } = img;
  const { labels, colors } = classify(img, o);
  const counts = colors.map(() => 0);
  for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) counts[labels[i]]++;
  // draw big areas first, details on top
  let order = colors.map((_, i) => i).filter((i) => counts[i] > 0).sort((a, b) => counts[b] - counts[a]);
  if (o.mode !== 'colour') order = [0];
  else if (o.ignoreWhite) {
    const lightest = order.reduce((m, i) => { const c = colors[i]; const l = lum(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)); return l > m.l ? { i, l } : m; }, { i: -1, l: -1 });
    order = order.filter((i) => i !== lightest.i);
  }
  const mask = new Uint8Array(w * h);
  const layers: Layer[] = [];
  for (const li of order) {
    for (let i = 0; i < mask.length; i++) mask[i] = labels[i] === li ? 1 : 0;
    const loops = outlines(mask, w, h);
    let d = '', a = 0;
    for (const loop of loops) {
      const ar = area(loop);
      if (Math.abs(ar) < o.noise) continue;
      const sp = simplify(loop, o.smooth);
      if (sp.length < 3) continue;
      d += loopPath(sp, img.scale, o.curves);
      a += ar;
    }
    if (d) layers.push({ color: colors[li], d, area: Math.round(a * img.scale * img.scale) });
  }
  return { width: Math.round(w * img.scale), height: Math.round(h * img.scale), scale: img.scale, layers };
}

export function toSvg(r: TraceResult, background?: string): string {
  const bg = background ? `<rect width="${r.width}" height="${r.height}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}" viewBox="0 0 ${r.width} ${r.height}">${bg}${r.layers.map((l) => `<path fill="${l.color}" fill-rule="evenodd" d="${l.d}"/>`).join('')}</svg>`;
}

/** SVG path data → fabric.js 5 path command arrays (absolute M/L/Q/Z only, as produced above). */
export function toFabricPath(d: string): (string | number)[][] {
  const out: (string | number)[][] = [];
  const re = /([MLQZ])([^MLQZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : [];
    out.push([m[1], ...nums]);
  }
  return out;
}
