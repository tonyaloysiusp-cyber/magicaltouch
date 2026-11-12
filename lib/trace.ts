// ---------------------------------------------------------------------
// lib/trace.ts — Image Trace: turns a photo or drawing into vector shapes.
// Modes: colour (k-means palette of 2–32 colours), black & white (Otsu
// threshold), shades of grey and line drawing (edge detection). Small
// artwork is enlarged first, stray pixels are cleaned up (majority filter),
// each colour is traced along pixel edges, simplified (Ramer–Douglas–Peucker)
// and fitted with smooth cubic curves while sharp corners stay sharp.
// Colour layers are stacked (no hairline gaps) and can be split into one
// editable shape per region. Pure functions on RGBA pixel data — runs in the browser
// and in unit tests.
// ---------------------------------------------------------------------

export type TraceMode = 'colour' | 'bw' | 'line' | 'gray';

export interface TraceOptions {
  mode: TraceMode;
  colors: number;        // colour mode: 2–32
  detail: number;        // max side in px the image is traced at (200–1600)
  smooth: number;        // simplify tolerance in px (0.3–4)
  noise: number;         // drop shapes smaller than this many px²
  ignoreWhite: boolean;  // leave the lightest colour out (transparent background)
  threshold?: number;    // bw/line: 0–255, empty = automatic
  curves: boolean;       // smooth corners into curves
  corner?: number;       // turns sharper than this (degrees) stay sharp corners; default 60
  despeckle?: number;    // clean-up passes that remove stray pixels (0–3); default 1
  stack?: boolean;       // colour layers overlap slightly (no hairline gaps); default true
  split?: boolean;       // one editable shape per region instead of one per colour
}

export const DEFAULT_TRACE: TraceOptions = { mode: 'colour', colors: 6, detail: 700, smooth: 1.2, noise: 12, ignoreWhite: false, curves: true };

export const PRESETS: { id: string; label: string; hint: string; o: Partial<TraceOptions> }[] = [
  { id: 'logo', label: 'Logo — clean', hint: 'Flat colours, crisp corners, smooth curves', o: { mode: 'colour', colors: 4, curves: true, corner: 55, smooth: 0.9, noise: 24, despeckle: 2, detail: 1400, ignoreWhite: true } },
  { id: 'bw', label: 'Black & white', hint: 'One colour, like a stamp or stencil', o: { mode: 'bw', colors: 2, ignoreWhite: true, corner: 60, despeckle: 2, detail: 1400 } },
  { id: 'silhouette', label: 'Silhouette', hint: 'A single solid shape', o: { mode: 'bw', colors: 2, ignoreWhite: true, smooth: 1.6, noise: 80, despeckle: 3, detail: 1000 } },
  { id: 'line', label: 'Line art & sketch', hint: 'Outlines from a drawing or photo', o: { mode: 'line', colors: 2, ignoreWhite: true, smooth: 0.8, despeckle: 1, detail: 1200 } },
  { id: 'lettering', label: 'Hand lettering', hint: 'Ink and brush letters, smooth strokes', o: { mode: 'bw', colors: 2, ignoreWhite: true, smooth: 0.7, corner: 75, noise: 10, despeckle: 2, detail: 1600 } },
  { id: 'c3', label: '3 colours', hint: 'Poster style', o: { mode: 'colour', colors: 3, despeckle: 2 } },
  { id: 'c4', label: '4 colours', hint: '', o: { mode: 'colour', colors: 4, despeckle: 2 } },
  { id: 'c6', label: '6 colours', hint: '', o: { mode: 'colour', colors: 6, despeckle: 1 } },
  { id: 'c8', label: '8 colours', hint: '', o: { mode: 'colour', colors: 8, despeckle: 1 } },
  { id: 'c16', label: '16 colours', hint: 'Illustrations', o: { mode: 'colour', colors: 16, smooth: 0.9, despeckle: 1 } },
  { id: 'photo', label: 'High fidelity photo', hint: '32 colours, fine detail', o: { mode: 'colour', colors: 32, smooth: 0.7, noise: 6, despeckle: 1, detail: 1200 } },
  { id: 'gray', label: 'Shades of grey', hint: '5 grey tones', o: { mode: 'gray', colors: 5, despeckle: 1 } },
];

export interface Px { data: Uint8ClampedArray | number[]; width: number; height: number }
export interface Layer { color: string; d: string; area: number; shapes?: string[] }
export interface TraceResult { width: number; height: number; scale: number; layers: Layer[] }

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Nearest-neighbour resample to fit `max` px (keeps small images as they are). */
export function resample(img: Px, max: number, upTo = 1): Px & { scale: number } {
  const want = max / Math.max(img.width, img.height);
  if (want > 1.05 && upTo > 1) return upsample(img, Math.min(upTo, want));
  const k = Math.min(1, want);
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

/** Bilinear enlargement: small logos trace with smoother, more exact edges. */
export function upsample(img: Px, k: number): Px & { scale: number } {
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.max(0, (y + 0.5) / k - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(img.height - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.max(0, (x + 0.5) / k - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(img.width - 1, x0 + 1), fx = sx - x0;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = img.data[(y0 * img.width + x0) * 4 + c], b = img.data[(y0 * img.width + x1) * 4 + c];
        const d = img.data[(y1 * img.width + x0) * 4 + c], e = img.data[(y1 * img.width + x1) * 4 + c];
        out[o + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
      }
    }
  }
  return { data: out, width: w, height: h, scale: 1 / k };
}

/** Majority (mode) filter on the label map: removes stray pixels and jagged specks. */
export function despeckle(labels: Int16Array, w: number, h: number, passes = 1): Int16Array {
  let cur = labels;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Int16Array(cur);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, me = cur[i];
      let same = 0;
      const tally = new Map<number, number>();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const v = cur[i + dy * w + dx];
        if (v === me) same++;
        tally.set(v, (tally.get(v) || 0) + 1);
      }
      if (same >= 3) continue;
      let best = me, bn = 0;
      for (const [v, n] of tally) if (n > bn) { bn = n; best = v; }
      if (bn >= 5) next[i] = best;
    }
    cur = next;
  }
  return cur;
}

/**
 * Anti-aliased edge pixels sit between two colours and would otherwise snap
 * to whichever in-between colour is nearest (a thin coloured halo). They are
 * given to the closest colour among their solid (non-edge) neighbours.
 */
export function fixEdges(img: Px, labels: Int16Array, colors: string[], thr = 40, radius = 3): Int16Array {
  const { width: w, height: h, data: D } = img;
  const rgb = colors.map((c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  const edge = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    for (const j of [x + 1 < w ? i + 1 : -1, y + 1 < h ? i + w : -1]) {
      if (j < 0) continue;
      if (Math.max(Math.abs(D[i * 4] - D[j * 4]), Math.abs(D[i * 4 + 1] - D[j * 4 + 1]), Math.abs(D[i * 4 + 2] - D[j * 4 + 2])) > thr) { edge[i] = 1; edge[j] = 1; }
    }
  }
  const out = new Int16Array(labels);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!edge[i] || labels[i] < 0) continue;
    let best = -1, bd = Infinity;
    for (let r = 1; r <= radius && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
      const j = yy * w + xx, l = labels[j];
      if (edge[j] || l < 0) continue;
      const c = rgb[l];
      const dd = (D[i * 4] - c[0]) ** 2 + (D[i * 4 + 1] - c[1]) ** 2 + (D[i * 4 + 2] - c[2]) ** 2;
      if (dd < bd) { bd = dd; best = l; }
    }
    if (best >= 0) out[i] = best;
  }
  return out;
}

/** k-means colour palette (deterministic k-means++ seeding). */
export function palette(img: Px, k: number): [number, number, number][] {
  const n = img.width * img.height;
  const step = Math.max(1, Math.floor(n / 6000));
  const pts: [number, number, number][] = [];
  // Edge pixels (anti-aliasing between two colours) are left out of the
  // palette, so a black logo on white gives black and white — not a grey halo.
  const W = img.width, D = img.data;
  const edgy = (i: number) => {
    const x = i % W;
    const nb = [x + 1 < W ? i + 1 : -1, i + W < n ? i + W : -1, x > 0 ? i - 1 : -1, i - W >= 0 ? i - W : -1];
    return nb.some((j) => j >= 0 && Math.max(Math.abs(D[i * 4] - D[j * 4]), Math.abs(D[i * 4 + 1] - D[j * 4 + 1]), Math.abs(D[i * 4 + 2] - D[j * 4 + 2])) > 40);
  };
  const collect = (skipEdges: boolean) => {
    for (let i = 0; i < n; i += step) {
      if (D[i * 4 + 3] < 128 || (skipEdges && edgy(i))) continue;
      pts.push([D[i * 4], D[i * 4 + 1], D[i * 4 + 2]]);
    }
  };
  collect(true);
  if (pts.length < 50) { pts.length = 0; collect(false); }
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
  if (o.mode === 'gray') {
    // k-means on brightness → n grey tones (darkest first).
    const n = Math.max(2, Math.min(12, Math.round(o.colors)));
    let c = Array.from({ length: n }, (_, i) => (255 * (i + 0.5)) / n);
    for (let it = 0; it < 10; it++) {
      const sum = new Array(n).fill(0), cnt = new Array(n).fill(0);
      for (let i = 0; i < w * h; i += 3) { if (data[i * 4 + 3] < 128) continue; let bi = 0; for (let j = 1; j < n; j++) if (Math.abs(g[i] - c[j]) < Math.abs(g[i] - c[bi])) bi = j; sum[bi] += g[i]; cnt[bi]++; }
      c = c.map((v, j) => (cnt[j] ? sum[j] / cnt[j] : v));
    }
    c.sort((a, b) => a - b);
    for (let i = 0; i < w * h; i++) { if (data[i * 4 + 3] < 128) continue; let bi = 0; for (let j = 1; j < n; j++) if (Math.abs(g[i] - c[j]) < Math.abs(g[i] - c[bi])) bi = j; labels[i] = bi; }
    return { labels, colors: c.map((v) => hex(v, v, v)) };
  }
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

/**
 * Closed loop → path data. Sharp turns (more than `corner` degrees) stay
 * corners; everything else becomes smooth cubic curves (Catmull-Rom), so
 * logos keep crisp points and round letters stay round.
 */
export function loopPath(p: Pt[], s: number, curves: boolean, corner = 60): string {
  const n = p.length;
  const P = (q: Pt) => `${n2(q[0] * s)} ${n2(q[1] * s)}`;
  if (!curves || n < 4) return 'M' + p.map(P).join('L') + 'Z';
  const at = (i: number) => p[((i % n) + n) % n];
  const isCorner = p.map((_, i) => {
    const a = at(i - 1), b = at(i), c = at(i + 1);
    const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const turn = (Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))) * 180) / Math.PI;
    return turn > corner;
  });
  // Start on a corner when there is one, so the path closes cleanly.
  const start = Math.max(0, isCorner.indexOf(true));
  let d = `M${P(at(start))}`;
  for (let k = 0; k < n; k++) {
    const i = start + k;
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = isCorner[((i % n) + n) % n], c2 = isCorner[(((i + 1) % n) + n) % n];
    if (c1 && c2) { d += `L${P(p2)}`; continue; }
    const t1: Pt = c1 ? [(p2[0] - p1[0]) / 3, (p2[1] - p1[1]) / 3] : [(p2[0] - p0[0]) / 6, (p2[1] - p0[1]) / 6];
    const t2: Pt = c2 ? [(p2[0] - p1[0]) / 3, (p2[1] - p1[1]) / 3] : [(p3[0] - p1[0]) / 6, (p3[1] - p1[1]) / 6];
    d += `C${P([p1[0] + t1[0], p1[1] + t1[1]])} ${P([p2[0] - t2[0], p2[1] - t2[1]])} ${P(p2)}`;
  }
  return d + 'Z';
}

function inside(pt: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1] || 1e-9) + a[0]) c = !c;
  }
  return c;
}

/** Trace an image into vector layers. */
export function trace(src: Px, opts: Partial<TraceOptions> = {}): TraceResult {
  const o = { ...DEFAULT_TRACE, ...opts };
  const detail = Math.max(100, Math.min(2000, o.detail));
  // Small flat artwork is enlarged first (up to 3×) for exact, smooth edges.
  const img = resample(src, detail, o.mode === 'colour' && o.colors > 12 ? 1 : 3);
  const { width: w, height: h } = img;
  const cls = classify(img, o);
  const colors = cls.colors;
  const clean = o.mode === 'colour' || o.mode === 'gray' ? fixEdges(img, cls.labels, colors, Math.max(10, 40 * Math.min(1, img.scale)), img.scale < 1 ? Math.ceil(2 / img.scale) : 2) : cls.labels;
  const labels = (o.despeckle ?? 1) > 0 ? despeckle(clean, w, h, Math.min(3, o.despeckle ?? 1)) : clean;
  const counts = colors.map(() => 0);
  for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) counts[labels[i]]++;
  // Big areas first, details on top.
  let order = colors.map((_, i) => i).filter((i) => counts[i] > 0).sort((a, b) => counts[b] - counts[a]);
  if (o.mode === 'bw' || o.mode === 'line') order = [0];
  else if (o.ignoreWhite) {
    const lightest = order.reduce((m, i) => { const c = colors[i]; const l = lum(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)); return l > m.l ? { i, l } : m; }, { i: -1, l: -1 });
    order = order.filter((i) => i !== lightest.i);
  }
  const stack = o.stack !== false && o.mode !== 'bw' && o.mode !== 'line';
  const rank = new Map(order.map((li, k) => [li, k]));
  const noise = o.noise * Math.max(1, 1 / (img.scale * img.scale));
  const tol = o.smooth / Math.min(1, img.scale);
  const mask = new Uint8Array(w * h);
  const layers: Layer[] = [];
  for (const li of order) {
    const me = rank.get(li)!;
    // Stacked: a layer also covers the areas of the layers drawn above it,
    // so neighbouring colours overlap instead of leaving hairline gaps.
    for (let i = 0; i < mask.length; i++) { const v = labels[i]; mask[i] = v === li || (stack && v >= 0 && (rank.get(v) ?? -1) > me) ? 1 : 0; }
    const loops = outlines(mask, w, h).filter((l) => Math.abs(area(l)) >= noise).map((l) => ({ l, a: area(l), s: simplify(l, tol) })).filter((x) => x.s.length >= 3);
    if (!loops.length) continue;
    const pathOf = (x: { s: Pt[] }) => loopPath(x.s, img.scale, o.curves, o.corner ?? 60);
    let shapes: string[] | undefined;
    if (o.split) {
      // One shape per region: each outer outline with the holes inside it.
      const outers = loops.filter((x) => x.a > 0).sort((a, b) => a.a - b.a);
      const groups = new Map<number, string[]>(outers.map((_, i) => [i, [pathOf(outers[i])]]));
      for (const hole of loops.filter((x) => x.a <= 0)) {
        const k = outers.findIndex((ot) => inside(hole.l[0], ot.l));
        if (k >= 0) groups.get(k)!.push(pathOf(hole));
      }
      shapes = outers.map((_, i) => groups.get(i)!.join(''));
    }
    const d = loops.map(pathOf).join('');
    const a = loops.reduce((t, x) => t + x.a, 0);
    layers.push({ color: colors[li], d, area: Math.round(a * img.scale * img.scale), shapes });
  }
  return { width: Math.round(w * img.scale), height: Math.round(h * img.scale), scale: img.scale, layers };
}

export function toSvg(r: TraceResult, background?: string): string {
  const bg = background ? `<rect id="background" width="${r.width}" height="${r.height}" fill="${background}"/>` : '';
  // One group per colour (named by its hex), one path per shape when split.
  const body = r.layers.map((l, i) => l.shapes && l.shapes.length > 1
    ? `<g id="colour-${i + 1}" data-colour="${l.color}">${l.shapes.map((d) => `<path fill="${l.color}" fill-rule="evenodd" d="${d}"/>`).join('')}</g>`
    : `<path id="colour-${i + 1}" fill="${l.color}" fill-rule="evenodd" d="${l.d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}" viewBox="0 0 ${r.width} ${r.height}">${bg}${body}</svg>`;
}

/** SVG path data → fabric.js 5 path command arrays (absolute M/L/Q/C/Z, as produced above). */
export function toFabricPath(d: string): (string | number)[][] {
  const out: (string | number)[][] = [];
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : [];
    out.push([m[1], ...nums]);
  }
  return out;
}
