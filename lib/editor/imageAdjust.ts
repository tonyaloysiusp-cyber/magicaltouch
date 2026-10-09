// Live, non-destructive photo adjustments for images placed on a design.
//
// Adjustments are stored as Fabric filters on the image (plus the slider
// values in `__adjust`), so the original photo is never changed: they can
// be tweaked or removed at any time, survive saving/undo, and follow the
// image through Replace.

export interface Adjust {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  vibrance: number; // -100..100
  exposure: number; // -100..100
  temperature: number; // -100 (cool)..100 (warm)
  tint: number; // -100 (green)..100 (magenta)
  highlights: number; // -100..100
  shadows: number; // -100..100
  sharpness: number; // 0..100
  blur: number; // 0..100
  vignette: number; // 0..100
  grayscale: boolean;
  sepia: boolean;
}

export const DEFAULT_ADJUST: Adjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  grayscale: false,
  sepia: false,
};

export const ADJUST_SLIDERS: { key: keyof Adjust; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
];

// One-tap looks. Each is just a set of slider values, so it stays editable.
export const FILTER_PRESETS: { id: string; label: string; adjust: Partial<Adjust> }[] = [
  { id: 'none', label: 'Original', adjust: {} },
  { id: 'vivid', label: 'Vivid', adjust: { contrast: 18, saturation: 25, vibrance: 20 } },
  { id: 'warm', label: 'Warm', adjust: { temperature: 35, saturation: 8, exposure: 5 } },
  { id: 'cool', label: 'Cool', adjust: { temperature: -35, tint: -5, contrast: 6 } },
  { id: 'bright', label: 'Bright', adjust: { exposure: 22, shadows: 25, contrast: -6 } },
  { id: 'drama', label: 'Drama', adjust: { contrast: 38, highlights: -30, shadows: -18, vignette: 45, saturation: -10 } },
  { id: 'fade', label: 'Fade', adjust: { contrast: -28, shadows: 30, saturation: -18 } },
  { id: 'vintage', label: 'Vintage', adjust: { sepia: true, contrast: -10, vignette: 35, exposure: 4 } },
  { id: 'mono', label: 'Mono', adjust: { grayscale: true, contrast: 15 } },
  { id: 'noir', label: 'Noir', adjust: { grayscale: true, contrast: 45, vignette: 55, exposure: -8 } },
  { id: 'pastel', label: 'Pastel', adjust: { exposure: 15, saturation: -25, contrast: -18, tint: 8 } },
  { id: 'golden', label: 'Golden', adjust: { temperature: 55, tint: 10, highlights: -10, vibrance: 15 } },
];

let registered = false;

// Registers this app's custom filters with Fabric (needed before any saved
// design is loaded) and makes sure filters run on the 2D canvas path,
// which has no image-size limit and supports every filter here.
export function ensureImageFilters(F: any) {
  if (!F) return;
  try {
    if (F.Canvas2dFilterBackend && !(F.filterBackend instanceof F.Canvas2dFilterBackend)) {
      F.filterBackend = new F.Canvas2dFilterBackend();
    }
  } catch {
    // Keep Fabric's default backend.
  }
  if (registered) return;
  registered = true;
  const Base = F.Image.filters.BaseFilter;
  const define = (type: string, props: Record<string, any>) => {
    // Every setting is saved with the filter (Fabric's default only saves
    // one "main" value), so undo, saving and reopening keep the look.
    const params = Object.keys(props).filter((k) => typeof props[k] !== 'function' && k !== 'mainParameter');
    const klass = F.util.createClass(Base, {
      type,
      ...props,
      toObject(this: any) {
        const o: Record<string, any> = { type: this.type };
        params.forEach((k) => (o[k] = this[k]));
        return o;
      },
    });
    klass.fromObject = Base.fromObject;
    F.Image.filters[type] = klass;
  };

  // Exposure in linear light (like a camera's exposure compensation).
  define('MTExposure', {
    exposure: 0,
    mainParameter: 'exposure',
    applyTo2d(options: any) {
      const data = options.imageData.data;
      const gain = Math.pow(2, this.exposure);
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        const s = i / 255;
        const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        const v = Math.min(1, lin * gain);
        lut[i] = Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
      }
      for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
    },
    isNeutralState() {
      return !this.exposure;
    },
  });

  // White balance: temperature (blue ↔ amber) and tint (green ↔ magenta).
  define('MTWhiteBalance', {
    temperature: 0,
    tint: 0,
    applyTo2d(options: any) {
      const data = options.imageData.data;
      const t = this.temperature;
      const g = this.tint;
      const rGain = 1 + t * 0.18 + g * 0.06;
      const gGain = 1 - g * 0.14;
      const bGain = 1 - t * 0.18 + g * 0.06;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * rGain;
        data[i + 1] = data[i + 1] * gGain;
        data[i + 2] = data[i + 2] * bGain;
      }
    },
    isNeutralState() {
      return !this.temperature && !this.tint;
    },
  });

  // Highlights / shadows: brighten or darken only the light or dark tones.
  define('MTTone', {
    highlights: 0,
    shadows: 0,
    applyTo2d(options: any) {
      const data = options.imageData.data;
      const hl = this.highlights;
      const sh = this.shadows;
      const lut = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const l = i / 255;
        const shadowW = Math.pow(1 - l, 2);
        const highW = Math.pow(l, 2);
        lut[i] = (sh * shadowW * 0.5 + hl * highW * 0.5) * 255;
      }
      for (let i = 0; i < data.length; i += 4) {
        const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
        const d = lut[l];
        data[i] += d;
        data[i + 1] += d;
        data[i + 2] += d;
      }
    },
    isNeutralState() {
      return !this.highlights && !this.shadows;
    },
  });

  // Vibrance: boosts muted colours more than already-vivid ones.
  define('MTVibrance', {
    vibrance: 0,
    applyTo2d(options: any) {
      const data = options.imageData.data;
      const v = this.vibrance;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        const avg = (r + g + b) / 3;
        // Positive: strongest on muted colours. Negative: plain desaturate.
        const k = v >= 0 ? v * (1 - sat) * 1.5 : v;
        data[i] = avg + (r - avg) * (1 + k);
        data[i + 1] = avg + (g - avg) * (1 + k);
        data[i + 2] = avg + (b - avg) * (1 + k);
      }
    },
    isNeutralState() {
      return !this.vibrance;
    },
  });

  // Darkens the edges toward the corners.
  define('MTVignette', {
    amount: 0,
    applyTo2d(options: any) {
      const { data, width, height } = options.imageData;
      const cx = width / 2;
      const cy = height / 2;
      const maxD = Math.sqrt(cx * cx + cy * cy);
      const a = this.amount;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxD;
          const k = 1 - a * Math.max(0, d - 0.35) * 1.4;
          const i = (y * width + x) * 4;
          data[i] *= k;
          data[i + 1] *= k;
          data[i + 2] *= k;
        }
      }
    },
    isNeutralState() {
      return !this.amount;
    },
  });
}

export function buildAdjustFilters(F: any, a: Adjust): any[] {
  ensureImageFilters(F);
  const f = F.Image.filters;
  const out: any[] = [];
  if (a.exposure) out.push(new f.MTExposure({ exposure: (a.exposure / 100) * 1.5 }));
  if (a.temperature || a.tint) out.push(new f.MTWhiteBalance({ temperature: a.temperature / 100, tint: a.tint / 100 }));
  if (a.brightness) out.push(new f.Brightness({ brightness: (a.brightness / 100) * 0.35 }));
  if (a.contrast) out.push(new f.Contrast({ contrast: (a.contrast / 100) * 0.45 }));
  if (a.highlights || a.shadows) out.push(new f.MTTone({ highlights: a.highlights / 100, shadows: a.shadows / 100 }));
  if (a.saturation) out.push(new f.Saturation({ saturation: a.saturation / 100 }));
  if (a.vibrance) out.push(new f.MTVibrance({ vibrance: a.vibrance / 100 }));
  if (a.grayscale) out.push(new f.Grayscale());
  if (a.sepia) out.push(new f.Sepia());
  if (a.blur) out.push(new f.Blur({ blur: (a.blur / 100) * 0.4 }));
  if (a.sharpness) {
    const s = (a.sharpness / 100) * 0.9;
    out.push(new f.Convolute({ matrix: [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0] }));
  }
  if (a.vignette) out.push(new f.MTVignette({ amount: a.vignette / 100 }));
  return out;
}

export function readAdjust(img: any): Adjust {
  return { ...DEFAULT_ADJUST, ...(img?.__adjust || {}) };
}

export const adjustIsDefault = (a: Adjust) =>
  (Object.keys(DEFAULT_ADJUST) as (keyof Adjust)[]).every((k) => a[k] === DEFAULT_ADJUST[k]);

// Rebuilds every image's filters from its saved slider values (after a
// design is opened or an undo), so a look is never lost even if an older
// save didn't store all of a filter's settings.
export function reviveImageAdjust(F: any, canvas: any) {
  if (!F || !canvas) return;
  const visit = (o: any) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach(visit);
    if (o.type === 'image' && o.__adjust && !adjustIsDefault(readAdjust(o))) {
      try {
        o.filters = buildAdjustFilters(F, readAdjust(o));
        o.applyFilters();
        o.dirty = true;
      } catch {
        // A picture that can't be read (e.g. still loading) keeps its filters.
      }
    }
  };
  canvas.getObjects().forEach(visit);
}

// Applies slider values to an image.
export function applyAdjust(F: any, img: any, a: Adjust) {
  img.filters = buildAdjustFilters(F, a);
  img.__adjust = adjustIsDefault(a) ? undefined : { ...a };
  img.applyFilters();
  img.dirty = true;
}

// --- One-click enhance ------------------------------------------------------

// Looks at the photo's brightness and colour spread and returns gentle
// corrections (auto levels, a little vibrance). Never extreme.
export function autoEnhance(img: any): Partial<Adjust> {
  const el: any = img?._originalElement || img?.getElement?.();
  if (!el || typeof document === 'undefined') return { contrast: 10, vibrance: 15 };
  const c = document.createElement('canvas');
  const k = 160 / Math.max(el.naturalWidth || el.width || 1, el.naturalHeight || el.height || 1);
  c.width = Math.max(1, Math.round((el.naturalWidth || el.width) * k));
  c.height = Math.max(1, Math.round((el.naturalHeight || el.height) * k));
  const ctx = c.getContext('2d');
  if (!ctx) return { contrast: 10, vibrance: 15 };
  try {
    ctx.drawImage(el, 0, 0, c.width, c.height);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let sum = 0;
    let sat = 0;
    const lums: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      lums.push(l);
      sum += l;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      sat += mx ? (mx - mn) / mx : 0;
    }
    const n = lums.length || 1;
    const mean = sum / n;
    lums.sort((a, b) => a - b);
    const lo = lums[Math.floor(n * 0.02)];
    const hi = lums[Math.floor(n * 0.98)];
    const spread = Math.max(1, hi - lo);
    const meanSat = sat / n;
    const clamp = (v: number, a: number, b: number) => Math.round(Math.max(a, Math.min(b, v)));
    return {
      exposure: clamp(((128 - mean) / 128) * 40, -30, 35),
      contrast: clamp(((200 - spread) / 200) * 45, -10, 35),
      vibrance: clamp(((0.35 - meanSat) / 0.35) * 35, 0, 30),
      shadows: mean < 90 ? 15 : 0,
      highlights: mean > 170 ? -15 : 0,
    };
  } catch {
    // A photo from another site that can't be read back: a safe default.
    return { contrast: 10, vibrance: 15 };
  }
}
