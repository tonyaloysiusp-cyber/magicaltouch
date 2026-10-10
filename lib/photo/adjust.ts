// Photo adjustments, applied non-destructively on top of the picture's
// pixels. One pipeline serves both the live preview (on a smaller copy)
// and the full-resolution result, so what you see is what you export:
// every effect with a size (blur, clarity, sharpen, grain) is measured
// relative to the picture, not in screen pixels.

export interface Adjust {
  exposure: number; // -100..100  (±2 stops)
  contrast: number; // -100..100
  highlights: number; // -100..100
  shadows: number; // -100..100
  whites: number; // -100..100
  blacks: number; // -100..100
  temperature: number; // -100..100 (cool .. warm)
  tint: number; // -100..100 (green .. magenta)
  vibrance: number; // -100..100
  saturation: number; // -100..100
  clarity: number; // -100..100
  sharpen: number; // 0..100
  blur: number; // 0..100
  vignette: number; // -100..100 (lighter .. darker edges)
  grain: number; // 0..100
  fade: number; // 0..100
  mono: number; // 0..1 (black & white)
  // ---- Pro colour tools
  levelBlack: number; // 0..250 input black point
  levelWhite: number; // 5..255 input white point
  levelGamma: number; // 10..300 (100 = neutral) midtone
  curve: Curves; // tone curves, points 0..255
  hsl: number[]; // 8 colour ranges × [hue, saturation, luminance], each -100..100
  grade: number[]; // colour grading: [shadow hue, shadow amount, mid hue, mid amount, highlight hue, highlight amount]
}

export type CurvePts = [number, number][];
export interface Curves { all: CurvePts; r: CurvePts; g: CurvePts; b: CurvePts }
export const IDENTITY_CURVE: CurvePts = [[0, 0], [255, 255]];
export const HSL_RANGES = [
  { id: 'red', label: 'Reds', hue: 0, swatch: '#E5484D' },
  { id: 'orange', label: 'Oranges', hue: 30, swatch: '#F38B2C' },
  { id: 'yellow', label: 'Yellows', hue: 58, swatch: '#E9C929' },
  { id: 'green', label: 'Greens', hue: 115, swatch: '#46A758' },
  { id: 'aqua', label: 'Aquas', hue: 180, swatch: '#12A5B5' },
  { id: 'blue', label: 'Blues', hue: 220, swatch: '#3E63DD' },
  { id: 'purple', label: 'Purples', hue: 275, swatch: '#8E4EC6' },
  { id: 'magenta', label: 'Magentas', hue: 320, swatch: '#D6409F' },
] as const;

export const NO_ADJUST: Adjust = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, saturation: 0, clarity: 0, sharpen: 0,
  blur: 0, vignette: 0, grain: 0, fade: 0, mono: 0,
  levelBlack: 0, levelWhite: 255, levelGamma: 100,
  curve: { all: IDENTITY_CURVE, r: IDENTITY_CURVE, g: IDENTITY_CURVE, b: IDENTITY_CURVE },
  hsl: new Array(24).fill(0),
  grade: [220, 0, 40, 0, 40, 0],
};

const NEUTRAL_JSON = JSON.stringify(NO_ADJUST);
export const isNeutral = (a: Adjust) => JSON.stringify({ ...NO_ADJUST, ...a }) === NEUTRAL_JSON;
const isIdentity = (c: CurvePts) => c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 255 && c[1][1] === 255;

/** Smooth curve through the points (monotone cubic, never overshoots). */
export function curveLut(ptsIn: CurvePts): Float32Array {
  const pts = [...ptsIn].sort((a, b) => a[0] - b[0]);
  const lut = new Float32Array(256);
  const n = pts.length;
  if (n < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], t = a * a + b * b;
    if (t > 9) { const k = 3 / Math.sqrt(t); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    if (x <= xs[0]) { lut[x] = ys[0]; continue; }
    if (x >= xs[n - 1]) { lut[x] = ys[n - 1]; continue; }
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = xs[seg + 1] - xs[seg], t = (x - xs[seg]) / h;
    const t2 = t * t, t3 = t2 * t;
    lut[x] = (2 * t3 - 3 * t2 + 1) * ys[seg] + (t3 - 2 * t2 + t) * h * m[seg] + (-2 * t3 + 3 * t2) * ys[seg + 1] + (t3 - t2) * h * m[seg + 1];
  }
  for (let x = 0; x < 256; x++) lut[x] = Math.max(0, Math.min(255, lut[x]));
  return lut;
}

/** Looks at the picture and suggests a balanced starting point. */
export function autoEnhance(src: ImageData): Partial<Adjust> {
  const d = src.data;
  const hist = new Uint32Array(256);
  let sr = 0, sg = 0, sb = 0, cnt = 0, total = 0;
  const step = Math.max(1, Math.floor((src.width * src.height) / 250000));
  for (let i = 0; i < src.width * src.height; i += step) {
    const p = i * 4;
    if (d[p + 3] < 16) continue;
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const L = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    hist[L]++;
    total++;
    if (L > 40 && L < 220) { sr += r; sg += g; sb += b; cnt++; }
  }
  if (!total) return {};
  const pct = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= q * total) return v; }
    return 255;
  };
  const lo = pct(0.004), hi = pct(0.996), mid = pct(0.5);
  const out: Partial<Adjust> = {
    levelBlack: Math.min(60, lo),
    levelWhite: Math.max(195, hi),
    vibrance: 14,
    clarity: 8,
    sharpen: 12,
  };
  // Mid-tones: lift a dark picture, calm a bright one.
  const span = Math.max(1, (out.levelWhite as number) - (out.levelBlack as number));
  const m = (mid - (out.levelBlack as number)) / span;
  out.levelGamma = Math.round(Math.max(70, Math.min(160, (Math.log(0.5) / Math.log(Math.max(0.05, Math.min(0.95, m)))) * 100)));
  if (cnt) {
    const ar = sr / cnt, ag = sg / cnt, ab = sb / cnt;
    out.temperature = Math.round(Math.max(-40, Math.min(40, ((ab - ar) / 255) * 180)));
    out.tint = Math.round(Math.max(-30, Math.min(30, ((ag - (ar + ab) / 2) / 255) * 200)));
  }
  return out;
}

const hueToRgb = (h: number): [number, number, number] => {
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => 0.5 - 0.5 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
};

export interface SliderDef { key: keyof Adjust; label: string; min: number; max: number }
export const LIGHT_SLIDERS: SliderDef[] = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'whites', label: 'Whites', min: -100, max: 100 },
  { key: 'blacks', label: 'Blacks', min: -100, max: 100 },
];
export const COLOR_SLIDERS: SliderDef[] = [
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
];
export const DETAIL_SLIDERS: SliderDef[] = [
  { key: 'clarity', label: 'Clarity', min: -100, max: 100 },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
  { key: 'blur', label: 'Soften / blur', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: -100, max: 100 },
  { key: 'grain', label: 'Film grain', min: 0, max: 100 },
  { key: 'fade', label: 'Fade', min: 0, max: 100 },
];

export interface Look { id: string; name: string; adjust: Partial<Adjust> }
export const LOOKS: Look[] = [
  { id: 'original', name: 'Original', adjust: {} },
  { id: 'auto', name: 'Auto enhance', adjust: { exposure: 6, contrast: 14, highlights: -22, shadows: 24, vibrance: 22, clarity: 12, sharpen: 18 } },
  { id: 'vivid', name: 'Vivid', adjust: { contrast: 22, vibrance: 38, saturation: 10, clarity: 14, sharpen: 15 } },
  { id: 'warm', name: 'Golden', adjust: { temperature: 32, tint: 6, vibrance: 16, highlights: -10, shadows: 10 } },
  { id: 'cool', name: 'Cool', adjust: { temperature: -28, tint: -4, contrast: 8, vibrance: 10 } },
  { id: 'portrait', name: 'Soft portrait', adjust: { exposure: 6, contrast: -6, highlights: -18, shadows: 16, clarity: -18, vibrance: 8, temperature: 8 } },
  { id: 'matte', name: 'Matte', adjust: { contrast: -12, fade: 40, saturation: -12, temperature: 6 } },
  { id: 'film', name: 'Film', adjust: { contrast: 10, fade: 22, grain: 28, saturation: -10, temperature: 10, vignette: 22 } },
  { id: 'dramatic', name: 'Dramatic', adjust: { contrast: 34, highlights: -30, shadows: -10, clarity: 40, vibrance: -10, vignette: 34 } },
  { id: 'bw', name: 'Black & white', adjust: { mono: 1, contrast: 18, clarity: 10 } },
  { id: 'noir', name: 'Noir', adjust: { mono: 1, contrast: 46, blacks: -20, clarity: 26, vignette: 40, grain: 14 } },
  { id: 'fade-bw', name: 'Silver', adjust: { mono: 1, contrast: -8, fade: 34, grain: 18 } },
];

// --------------------------------------------------------------- helpers

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const s2l = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const l2s = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

/** Separable box blur, 3 passes ≈ gaussian. Works on one float channel. */
export function blurChannel(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(1, Math.round(radius));
  let a = src.slice();
  let b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / (2 * r + 1);
        sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (2 * r + 1);
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

function blurRGBA(px: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const n = w * h;
  const out = new Uint8ClampedArray(px.length);
  for (let c = 0; c < 4; c++) {
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = px[i * 4 + c];
    const bl = blurChannel(ch, w, h, radius);
    for (let i = 0; i < n; i++) out[i * 4 + c] = bl[i];
  }
  return out;
}

// Caches the expensive blurs for the live preview: they depend only on
// the source pixels and the radius, not on the other sliders.
const cache = new WeakMap<object, Map<string, any>>();
function cached<T>(owner: object, key: string, make: () => T): T {
  let m = cache.get(owner);
  if (!m) cache.set(owner, (m = new Map()));
  if (!m.has(key)) {
    if (m.size > 6) m.clear();
    m.set(key, make());
  }
  return m.get(key);
}

/**
 * Applies `a` to `src` and returns new pixels. `owner` is any stable
 * object tied to `src` (used to cache blurs between slider moves).
 */
export function applyAdjust(src: ImageData, a: Adjust, owner: object = src): ImageData {
  const { width: w, height: h } = src;
  const n = w * h;
  const long = Math.max(w, h);
  let px: Uint8ClampedArray = src.data as Uint8ClampedArray;

  if (a.blur > 0) {
    const r = (a.blur / 100) * 0.012 * long + 0.5;
    px = cached(owner, `blur${r.toFixed(1)}`, () => blurRGBA(src.data, w, h, r));
  }

  // Per-channel tone curves: white balance → exposure → levels → contrast → fade.
  const temp = a.temperature / 100, tint = a.tint / 100;
  const wb = [1 + temp * 0.18 + tint * 0.05, 1 - tint * 0.14, 1 - temp * 0.18 + tint * 0.05];
  const ev = Math.pow(2, (a.exposure / 100) * 2);
  const blackIn = a.blacks < 0 ? (-a.blacks / 100) * 0.12 : 0;
  const blackOut = a.blacks > 0 ? (a.blacks / 100) * 0.12 : 0;
  const whiteIn = a.whites > 0 ? 1 - (a.whites / 100) * 0.15 : 1;
  const whiteOut = a.whites < 0 ? 1 + (a.whites / 100) * 0.15 : 1;
  const c = a.contrast / 100;
  const fade = (a.fade / 100) * 0.16;
  const luts = [0, 1, 2].map((ch) => {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let x = l2s(clamp01(s2l(v / 255) * ev * wb[ch]));
      x = clamp01((x - blackIn) / (whiteIn - blackIn));
      x = blackOut + x * (whiteOut - blackOut);
      if (c > 0) {
        // smooth S-curve
        const k = 1 + c * 4;
        const sig = (t: number) => 1 / (1 + Math.exp(-k * (t - 0.5)));
        x = (sig(x) - sig(0)) / (sig(1) - sig(0));
      } else if (c < 0) {
        x = 0.5 + (x - 0.5) * (1 + c * 0.6);
      }
      x = fade + x * (1 - fade);
      lut[v] = Math.round(clamp01(x) * 255);
    }
    return lut;
  });

  // Levels and curves, folded into the same per-channel tables.
  const lb0 = a.levelBlack ?? 0, lw0 = a.levelWhite ?? 255, lg0 = (a.levelGamma ?? 100) / 100;
  const cv = a.curve || NO_ADJUST.curve;
  const hasLevels = lb0 !== 0 || lw0 !== 255 || lg0 !== 1;
  const hasCurve = !isIdentity(cv.all) || !isIdentity(cv.r) || !isIdentity(cv.g) || !isIdentity(cv.b);
  if (hasLevels || hasCurve) {
    const all = curveLut(cv.all);
    const per = [cv.r, cv.g, cv.b].map(curveLut);
    const span = Math.max(1, lw0 - lb0);
    luts.forEach((lut, ch) => {
      for (let v = 0; v < 256; v++) {
        let x = lut[v];
        if (hasLevels) x = Math.pow(clamp01((x - lb0) / span), 1 / lg0) * 255;
        x = per[ch][Math.round(all[Math.round(x)])];
        lut[v] = Math.round(x);
      }
    });
  }

  // Per-colour hue / saturation / luminance.
  const hslA = a.hsl || NO_ADJUST.hsl;
  const hasHsl = hslA.some((v) => v !== 0);
  // Colour grading: tint shadows, mid-tones and highlights.
  const gr = a.grade || NO_ADJUST.grade;
  const hasGrade = gr[1] !== 0 || gr[3] !== 0 || gr[5] !== 0;
  const gradeVec = [0, 2, 4].map((i) => {
    const [r, g, b] = hueToRgb(gr[i]);
    const amt = (gr[i + 1] / 100) * 60;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [(r - L) * amt, (g - L) * amt, (b - L) * amt];
  });

  // Highlights / shadows: a lightness-dependent gain.
  const hi = a.highlights / 100, sh = a.shadows / 100;
  const toneGain = new Float32Array(256);
  const toneAdd = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const L = v / 255;
    const ms = Math.pow(clamp01(1 - L / 0.6), 2);
    const mh = Math.pow(clamp01((L - 0.4) / 0.6), 2);
    const t = clamp01(L + sh * 0.3 * ms + hi * 0.3 * mh);
    // Multiply (keeps colours) except in near-black, where adding is safer.
    if (L > 0.06) toneGain[v] = t / L;
    else { toneGain[v] = 1; toneAdd[v] = (t - L) * 255; }
  }
  const hasTone = hi !== 0 || sh !== 0;

  // Local contrast and sharpening use blurred lightness of the source.
  let lum: Float32Array | null = null;
  const needLum = a.clarity !== 0 || a.sharpen > 0;
  if (needLum) {
    lum = cached(owner, 'lum', () => {
      const l = new Float32Array(n);
      const d = src.data;
      for (let i = 0; i < n; i++) l[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
      return l;
    });
  }
  const clarityBlur = a.clarity !== 0 ? cached(owner, `cl${long}`, () => blurChannel(lum!, w, h, Math.max(2, long * 0.015))) : null;
  const sharpBlur = a.sharpen > 0 ? cached(owner, `sh${long}`, () => blurChannel(lum!, w, h, Math.max(1, long / 1800))) : null;
  const clar = (a.clarity / 100) * 0.9;
  const sharp = (a.sharpen / 100) * 1.6;

  const sat = a.saturation / 100, vib = a.vibrance / 100;
  const vig = a.vignette / 100;
  const grain = (a.grain / 100) * 28;
  const mono = a.mono;
  const cx = w / 2, cy = h / 2, rmax = Math.hypot(cx, cy);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) - 0.5;

  const out = new ImageData(w, h);
  const o = out.data;
  const [lr, lg, lb] = luts;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    let r = lr[px[p]], g = lg[px[p + 1]], b = lb[px[p + 2]];
    if (hasTone) {
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      const k = toneGain[L], ad = toneAdd[L];
      r = r * k + ad; g = g * k + ad; b = b * k + ad;
    }
    if (clarityBlur) {
      const d = (lum![i] - clarityBlur[i]) * clar;
      // strongest in the mid-tones
      const L = lum![i] / 255;
      const m = 1 - Math.abs(L - 0.5) * 1.4;
      r += d * m; g += d * m; b += d * m;
    }
    if (sharpBlur) {
      const d = (lum![i] - sharpBlur[i]) * sharp;
      r += d; g += d; b += d;
    }
    if (hasHsl) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const dd = mx - mn;
      if (dd > 2) {
        let hh: number;
        if (mx === r) hh = ((g - b) / dd) % 6;
        else if (mx === g) hh = (b - r) / dd + 2;
        else hh = (r - g) / dd + 4;
        hh = (hh * 60 + 360) % 360;
        // Blend the two nearest colour ranges.
        let dH = 0, dS = 0, dL = 0;
        for (let k = 0; k < 8; k++) {
          const c0 = HSL_RANGES[k].hue, c1 = k < 7 ? HSL_RANGES[k + 1].hue : 360;
          const span = c1 - c0;
          let t = (hh - c0) / span;
          if (t < 0 || t > 1) continue;
          const w0 = 1 - t, k1 = (k + 1) % 8;
          dH = hslA[k * 3] * w0 + hslA[k1 * 3] * t;
          dS = hslA[k * 3 + 1] * w0 + hslA[k1 * 3 + 1] * t;
          dL = hslA[k * 3 + 2] * w0 + hslA[k1 * 3 + 2] * t;
          break;
        }
        const strength = Math.min(1, dd / 60); // greys stay grey
        if (dH || dS || dL) {
          const lv = (mx + mn) / 2 / 255;
          const sv = dd / 255 / (1 - Math.abs(2 * lv - 1) || 1);
          const nh = (hh + dH * 0.45 * strength + 360) % 360;
          const ns = clamp01(sv * (1 + (dS / 100) * strength));
          const nl = clamp01(lv + (dL / 100) * 0.25 * strength * (1 - Math.abs(2 * lv - 1) * 0.5));
          const C = (1 - Math.abs(2 * nl - 1)) * ns;
          const X = C * (1 - Math.abs(((nh / 60) % 2) - 1));
          const m0 = nl - C / 2;
          let rr = 0, gg = 0, bb = 0;
          if (nh < 60) { rr = C; gg = X; } else if (nh < 120) { rr = X; gg = C; } else if (nh < 180) { gg = C; bb = X; }
          else if (nh < 240) { gg = X; bb = C; } else if (nh < 300) { rr = X; bb = C; } else { rr = C; bb = X; }
          r = (rr + m0) * 255; g = (gg + m0) * 255; b = (bb + m0) * 255;
        }
      }
    }
    if (hasGrade) {
      const L = clamp01((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
      const ws = (1 - L) * (1 - L), wh = L * L, wm = Math.max(0, 1 - Math.abs(2 * L - 1) * 1.2);
      r += gradeVec[0][0] * ws + gradeVec[1][0] * wm + gradeVec[2][0] * wh;
      g += gradeVec[0][1] * ws + gradeVec[1][1] * wm + gradeVec[2][1] * wh;
      b += gradeVec[0][2] * ws + gradeVec[1][2] * wm + gradeVec[2][2] * wh;
    }
    if (sat !== 0 || vib !== 0 || mono > 0) {
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const curSat = mx > 0 ? (mx - mn) / mx : 0;
      let f = 1 + sat;
      if (vib) f *= 1 + vib * (1 - curSat) * (vib > 0 ? 1.2 : 1);
      if (mono > 0) f *= 1 - mono;
      r = L + (r - L) * f; g = L + (g - L) * f; b = L + (b - L) * f;
    }
    if (vig !== 0) {
      const x = i % w, y = (i / w) | 0;
      const d = Math.hypot(x - cx, y - cy) / rmax;
      const t = clamp01((d - 0.35) / 0.65);
      const k = 1 - vig * t * t * 0.75;
      if (vig > 0) { r *= k; g *= k; b *= k; }
      else { r = 255 - (255 - r) * k; g = 255 - (255 - g) * k; b = 255 - (255 - b) * k; }
    }
    if (grain > 0) {
      const gn = rnd() * grain;
      r += gn; g += gn; b += gn;
    }
    o[p] = r; o[p + 1] = g; o[p + 2] = b; o[p + 3] = px[p + 3];
  }
  return out;
}

/** Full-size result of `base` with `a` applied (returns `base` itself if nothing to do). */
export function renderAdjusted(base: HTMLCanvasElement, a: Adjust): HTMLCanvasElement {
  if (isNeutral(a)) return base;
  const ctx = base.getContext('2d', { willReadFrequently: true })!;
  const src = ctx.getImageData(0, 0, base.width, base.height);
  const res = applyAdjust(src, a, {});
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  out.getContext('2d')!.putImageData(res, 0, 0);
  return out;
}
