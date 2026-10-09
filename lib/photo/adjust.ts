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
}

export const NO_ADJUST: Adjust = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, saturation: 0, clarity: 0, sharpen: 0,
  blur: 0, vignette: 0, grain: 0, fade: 0, mono: 0,
};

export const isNeutral = (a: Adjust) => (Object.keys(NO_ADJUST) as (keyof Adjust)[]).every((k) => a[k] === NO_ADJUST[k]);

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
