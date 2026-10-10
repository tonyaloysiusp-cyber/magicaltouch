// Photo filters for Photo Studio Pro. Every filter takes a canvas and an
// amount and returns a NEW canvas (inputs are never changed, so history
// snapshots stay valid). All run on the device; nothing is uploaded.

import { makeCanvas } from './ops';

export type FilterId = 'blur' | 'motion' | 'sharpen' | 'noise' | 'pixelate' | 'emboss' | 'posterize' | 'glow' | 'halftone' | 'sepia' | 'mono' | 'invert';

export interface FilterDef {
  id: FilterId;
  label: string;
  hint: string;
  /** Slider range; filters without a slider apply at full strength. */
  amount?: { label: string; min: number; max: number; def: number };
  angle?: boolean;
}

export const FILTERS: FilterDef[] = [
  { id: 'blur', label: 'Blur', hint: 'Soft, even blur (Gaussian).', amount: { label: 'Radius', min: 1, max: 60, def: 8 } },
  { id: 'motion', label: 'Motion blur', hint: 'Streaks in one direction, like movement.', amount: { label: 'Distance', min: 2, max: 120, def: 30 }, angle: true },
  { id: 'sharpen', label: 'Sharpen', hint: 'Crisper edges and details (unsharp mask).', amount: { label: 'Amount', min: 10, max: 300, def: 80 } },
  { id: 'noise', label: 'Add noise', hint: 'Film-like grain.', amount: { label: 'Amount', min: 1, max: 100, def: 18 } },
  { id: 'pixelate', label: 'Pixelate', hint: 'Big square pixels, e.g. to hide a face or plate.', amount: { label: 'Cell size', min: 2, max: 120, def: 18 } },
  { id: 'emboss', label: 'Emboss', hint: 'Raised, stamped-metal look.', amount: { label: 'Strength', min: 10, max: 100, def: 70 } },
  { id: 'posterize', label: 'Posterize', hint: 'Fewer colours, poster-print look.', amount: { label: 'Levels', min: 2, max: 16, def: 5 } },
  { id: 'glow', label: 'Soft glow', hint: 'Dreamy glow around highlights.', amount: { label: 'Glow', min: 5, max: 100, def: 45 } },
  { id: 'halftone', label: 'Halftone', hint: 'Printed-dot comic look.', amount: { label: 'Dot size', min: 4, max: 60, def: 12 } },
  { id: 'sepia', label: 'Sepia', hint: 'Warm vintage tone.', amount: { label: 'Amount', min: 10, max: 100, def: 80 } },
  { id: 'mono', label: 'Black & white', hint: 'Turns the layer black and white.' },
  { id: 'invert', label: 'Invert', hint: 'Swaps every colour for its opposite.' },
];

const copy = (src: HTMLCanvasElement) => {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
};
const dataOf = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
const fromData = (d: ImageData) => {
  const c = makeCanvas(d.width, d.height);
  c.getContext('2d')!.putImageData(d, 0, 0);
  return c;
};

// One horizontal or vertical box-blur pass over premultiplied RGBA.
function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horiz: boolean) {
  const len = horiz ? w : h, lines = horiz ? h : w;
  const step = horiz ? 4 : w * 4, lineStep = horiz ? w * 4 : 4;
  const inv = 1 / (r * 2 + 1);
  for (let l = 0; l < lines; l++) {
    const o = l * lineStep;
    for (let ch = 0; ch < 4; ch++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[o + Math.min(len - 1, Math.max(0, i)) * step + ch];
      for (let i = 0; i < len; i++) {
        dst[o + i * step + ch] = acc * inv;
        acc += src[o + Math.min(len - 1, i + r + 1) * step + ch] - src[o + Math.max(0, i - r) * step + ch];
      }
    }
  }
}

/** Gaussian-like blur: three box passes each way (accurate to a few %). */
export function blurCanvas(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const r = Math.max(1, Math.round(radius / 2));
  const d = dataOf(src), { width: w, height: h } = d;
  const n = w * h * 4;
  let a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i += 4) {
    const al = d.data[i + 3] / 255;
    a[i] = d.data[i] * al; a[i + 1] = d.data[i + 1] * al; a[i + 2] = d.data[i + 2] * al; a[i + 3] = d.data[i + 3];
  }
  for (let k = 0; k < 3; k++) {
    boxPass(a, b, w, h, r, true);
    boxPass(b, a, w, h, r, false);
  }
  const out = new ImageData(w, h);
  for (let i = 0; i < n; i += 4) {
    const al = a[i + 3];
    const m = al > 0 ? 255 / al : 0;
    out.data[i] = a[i] * m; out.data[i + 1] = a[i + 1] * m; out.data[i + 2] = a[i + 2] * m; out.data[i + 3] = al;
  }
  return fromData(out);
}

function motionBlur(src: HTMLCanvasElement, dist: number, angleDeg: number) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  const n = Math.max(2, Math.min(64, Math.round(dist / 2)));
  const a = (angleDeg * Math.PI) / 180;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    ctx.globalAlpha = 1 / (i + 1); // running average
    ctx.drawImage(src, Math.cos(a) * dist * t, Math.sin(a) * dist * t);
  }
  return c;
}

function perPixel(src: HTMLCanvasElement, f: (d: Uint8ClampedArray, i: number) => void) {
  const d = dataOf(src);
  for (let i = 0; i < d.data.length; i += 4) f(d.data, i);
  return fromData(d);
}

function sharpen(src: HTMLCanvasElement, amount: number) {
  const bl = dataOf(blurCanvas(src, 3)).data;
  const k = amount / 100;
  return perPixel(src, (d, i) => {
    d[i] += (d[i] - bl[i]) * k;
    d[i + 1] += (d[i + 1] - bl[i + 1]) * k;
    d[i + 2] += (d[i + 2] - bl[i + 2]) * k;
  });
}

function noise(src: HTMLCanvasElement, amount: number) {
  let s = 1234567;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
  const k = amount * 1.6;
  return perPixel(src, (d, i) => {
    const v = rnd() * k;
    d[i] += v; d[i + 1] += v; d[i + 2] += v;
  });
}

function pixelate(src: HTMLCanvasElement, cell: number) {
  const sw = Math.max(1, Math.round(src.width / cell)), sh = Math.max(1, Math.round(src.height / cell));
  const small = makeCanvas(sw, sh);
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, sw, sh);
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, src.width, src.height);
  return c;
}

function emboss(src: HTMLCanvasElement, strength: number) {
  const d = dataOf(src), { width: w, height: h } = d, s = d.data;
  const out = new ImageData(w, h);
  const k = strength / 100;
  const L = (x: number, y: number) => {
    const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
    return 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const e = 128 + (L(x + 1, y + 1) - L(x - 1, y - 1)) * 2;
    for (let c = 0; c < 3; c++) out.data[i + c] = s[i + c] * (1 - k) + e * k;
    out.data[i + 3] = s[i + 3];
  }
  return fromData(out);
}

function posterize(src: HTMLCanvasElement, levels: number) {
  const n = Math.max(2, Math.round(levels)) - 1;
  const q = (v: number) => Math.round((Math.round((v / 255) * n) / n) * 255);
  return perPixel(src, (d, i) => { d[i] = q(d[i]); d[i + 1] = q(d[i + 1]); d[i + 2] = q(d[i + 2]); });
}

function glow(src: HTMLCanvasElement, amount: number) {
  const c = copy(src);
  const ctx = c.getContext('2d')!;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount / 100;
  ctx.drawImage(blurCanvas(src, Math.max(4, Math.min(src.width, src.height) * 0.02)), 0, 0);
  // Keep the original transparency.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(src, 0, 0);
  return c;
}

function halftone(src: HTMLCanvasElement, dot: number) {
  const d = dataOf(src), { width: w, height: h } = d, s = d.data;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const step = Math.max(3, Math.round(dot));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y; yy < Math.min(h, y + step); yy += 2) for (let xx = x; xx < Math.min(w, x + step); xx += 2) {
      const i = (yy * w + xx) * 4;
      r += s[i]; g += s[i + 1]; b += s[i + 2]; n++;
    }
    r /= n; g /= n; b /= n;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const rad = (step / 2) * 1.15 * Math.sqrt(1 - lum);
    if (rad < 0.3) continue;
    ctx.fillStyle = `rgb(${Math.round(r * 0.75)},${Math.round(g * 0.75)},${Math.round(b * 0.75)})`;
    ctx.beginPath();
    ctx.arc(x + step / 2, y + step / 2, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Runs one filter. `amount` uses the filter's own slider range. */
export function applyFilter(src: HTMLCanvasElement, id: FilterId, amount: number, angle = 0, scale = 1): HTMLCanvasElement {
  // `scale` < 1 when previewing on a smaller copy: size-based amounts shrink with it.
  const px = (v: number) => Math.max(1, v * scale);
  switch (id) {
    case 'blur': return blurCanvas(src, px(amount));
    case 'motion': return motionBlur(src, px(amount), angle);
    case 'sharpen': return sharpen(src, amount);
    case 'noise': return noise(src, amount);
    case 'pixelate': return pixelate(src, px(amount));
    case 'emboss': return emboss(src, amount);
    case 'posterize': return posterize(src, amount);
    case 'glow': return glow(src, amount);
    case 'halftone': return halftone(src, px(amount));
    case 'sepia': {
      const k = amount / 100;
      return perPixel(src, (d, i) => {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        d[i] = r * (1 - k) + Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b) * k;
        d[i + 1] = g * (1 - k) + Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b) * k;
        d[i + 2] = b * (1 - k) + Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b) * k;
      });
    }
    case 'mono': return perPixel(src, (d, i) => { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = v; });
    case 'invert': return perPixel(src, (d, i) => { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; });
  }
}
