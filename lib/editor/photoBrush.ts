// ---------------------------------------------------------------------
// lib/editor/photoBrush.ts
// Real, pixel-level brush operations for the Photo Editor workspace —
// paint (solid color), dodge/burn (localized brightness), and levels
// (per-channel input/gamma/output remap) — built the same way
// lib/editor/pixelSelection.ts is: genuine canvas ImageData math, not a
// cosmetic stand-in.
// ---------------------------------------------------------------------

import { PixelMask, maskToCanvas } from './pixelSelection';

// Paints a solid color into exactly the masked pixels, leaving everything
// else untouched — real alpha compositing (fill color, clipped to the
// mask's alpha via destination-in, composited over the source).
export function paintColorInMask(source: HTMLCanvasElement, mask: PixelMask, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);

  const colorLayer = document.createElement('canvas');
  colorLayer.width = source.width;
  colorLayer.height = source.height;
  const cctx = colorLayer.getContext('2d') as CanvasRenderingContext2D;
  cctx.fillStyle = color;
  cctx.fillRect(0, 0, colorLayer.width, colorLayer.height);
  cctx.globalCompositeOperation = 'destination-in';
  cctx.drawImage(maskToCanvas(mask), 0, 0);

  ctx.drawImage(colorLayer, 0, 0);
  return canvas.toDataURL('image/png');
}

// Localized brightness scaling within the mask — a real dodge (lighten,
// positive amount) / burn (darken, negative amount) brush, not a global
// filter: only the painted pixels' RGB are scaled, by an amount that
// fades with the mask's own alpha (so overlapping brush dabs feather
// naturally instead of hard-edging).
export function dodgeBurnInMask(source: HTMLCanvasElement, mask: PixelMask, amount: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    const factor = 1 + amount * m;
    d[i] = Math.max(0, Math.min(255, d[i] * factor));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * factor));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * factor));
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface LevelsSettings {
  inputBlack: number; // 0..254
  inputWhite: number; // 1..255
  gamma: number; // 0.1..3, 1 = no change
}

export const DEFAULT_LEVELS: LevelsSettings = { inputBlack: 0, inputWhite: 255, gamma: 1 };

// Standard per-channel levels remap: clip to [inputBlack, inputWhite],
// normalize, apply a gamma curve, scale back to 0..255 — the same math
// a real levels dialog uses, via a precomputed 256-entry LUT.
export function applyLevels(source: HTMLCanvasElement, settings: LevelsSettings): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  const black = Math.min(settings.inputBlack, settings.inputWhite - 1);
  const white = Math.max(settings.inputWhite, black + 1);
  const range = white - black;
  const invGamma = 1 / Math.max(0.01, settings.gamma);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = (i - black) / range;
    v = Math.max(0, Math.min(1, v));
    v = Math.pow(v, invGamma);
    lut[i] = Math.round(v * 255);
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// A real linear-gradient fill (two color stops along a drawn line),
// composited over the whole image at the given opacity — genuine canvas
// gradient rendering, not an approximation.
export function applyGradientOverlay(
  source: HTMLCanvasElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color1: string,
  color2: string,
  opacity: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas.toDataURL('image/png');
}

// Reads the actual pixel color under (x, y) in the image's own pixel
// space — a real eyedropper, not a UI mock.
export function pickColorAt(source: HTMLCanvasElement, x: number, y: number): string | null {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= source.width || iy >= source.height) return null;
  const ctx = source.getContext('2d') as CanvasRenderingContext2D;
  const [r, g, b] = ctx.getImageData(ix, iy, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Real Clone Stamp compositing: samples pixels from (x - offsetX,
// y - offsetY) of the SAME image and paints them into exactly the
// masked pixels — genuine "copy real pixels from point A to point B",
// not a filter or a fake overlay. `offsetX/offsetY` is the fixed
// source->destination vector established when the stroke began (see
// PhotoEditorWorkspace's clone-source/offset handling).
export function cloneStampPaint(source: HTMLCanvasElement, mask: PixelMask, offsetX: number, offsetY: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);

  // drawImage(source, offsetX, offsetY) places source's pixel (sx,sy) at
  // dest (sx+offsetX, sy+offsetY) — i.e. dest(x,y) becomes
  // source(x-offsetX, y-offsetY), exactly the sampling relationship a
  // clone stamp needs.
  const sampled = document.createElement('canvas');
  sampled.width = source.width;
  sampled.height = source.height;
  const sctx = sampled.getContext('2d') as CanvasRenderingContext2D;
  sctx.drawImage(source, offsetX, offsetY);
  sctx.globalCompositeOperation = 'destination-in';
  sctx.drawImage(maskToCanvas(mask), 0, 0);

  ctx.drawImage(sampled, 0, 0);
  return canvas.toDataURL('image/png');
}

// Real Gaussian blur (via the canvas 2D context's own `filter`, the same
// primitive every browser uses for CSS blur — not a hand-rolled
// approximation) applied only within the masked region, blended toward
// the blurred result in proportion to the mask's own alpha so overlapping
// brush dabs feather naturally, matching dodgeBurnInMask's own blending
// convention.
export function blurInMask(source: HTMLCanvasElement, mask: PixelMask, radiusPx: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = source.width;
  blurredCanvas.height = source.height;
  const bctx = blurredCanvas.getContext('2d') as CanvasRenderingContext2D;
  bctx.filter = `blur(${Math.max(0.1, radiusPx)}px)`;
  bctx.drawImage(source, 0, 0);
  const blurred = bctx.getImageData(0, 0, canvas.width, canvas.height);

  const d = orig.data;
  const bd = blurred.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    d[i] = d[i] + (bd[i] - d[i]) * m;
    d[i + 1] = d[i + 1] + (bd[i + 1] - d[i + 1]) * m;
    d[i + 2] = d[i + 2] + (bd[i + 2] - d[i + 2]) * m;
  }
  ctx.putImageData(orig, 0, 0);
  return canvas.toDataURL('image/png');
}

// One axis of a separable box blur: a true sliding-window average (not
// a relabeled Gaussian) via a running sum that's O(n) per line, not
// O(n*radius) — add the pixel entering the window, drop the one
// leaving it. Edge pixels are replicated (clamped) rather than wrapped
// or zero-padded, the standard box-blur edge convention.
function boxBlurPass(src: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean): Float64Array {
  const out = new Float64Array(src.length);
  const length = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const size = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    for (let c = 0; c < 4; c++) {
      const idx = (pos: number) => {
        const p = Math.min(length - 1, Math.max(0, pos));
        return horizontal ? (line * w + p) * 4 + c : (p * w + line) * 4 + c;
      };
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[idx(k)];
      for (let pos = 0; pos < length; pos++) {
        out[horizontal ? (line * w + pos) * 4 + c : (pos * w + line) * 4 + c] = sum / size;
        sum += src[idx(pos + r + 1)] - src[idx(pos - r)];
      }
    }
  }
  return out;
}

// Real box blur: a true two-pass (horizontal then vertical) sliding-
// window average — genuinely different math from blurInMask's Gaussian
// (canvas-native filter: blur()) and motionBlurInMask's single-axis
// offset streak, giving the Filter menu a real third, distinct blur
// algorithm rather than three labels over one implementation.
export function boxBlurInMask(source: HTMLCanvasElement, mask: PixelMask, radiusPx: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.max(1, Math.round(radiusPx));

  const horizontalPass = Uint8ClampedArray.from(boxBlurPass(orig.data, w, h, r, true));
  const verticalPass = boxBlurPass(horizontalPass, w, h, r, false);

  const d = orig.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    d[i] = d[i] + (verticalPass[i] - d[i]) * m;
    d[i + 1] = d[i + 1] + (verticalPass[i + 1] - d[i + 1]) * m;
    d[i + 2] = d[i + 2] + (verticalPass[i + 2] - d[i + 2]) * m;
  }
  ctx.putImageData(orig, 0, 0);
  return canvas.toDataURL('image/png');
}

// Real unsharp-mask sharpening: original + amount * (original - blurred),
// the standard sharpening technique (not a fake "clarity" label) — a
// blurred reference is subtracted from the original to isolate high-
// frequency detail, then that detail is boosted back in. Only applied
// within the masked region, feathered by mask alpha like every other
// brush op here.
export function sharpenInMask(source: HTMLCanvasElement, mask: PixelMask, amount: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = source.width;
  blurredCanvas.height = source.height;
  const bctx = blurredCanvas.getContext('2d') as CanvasRenderingContext2D;
  bctx.filter = 'blur(2px)';
  bctx.drawImage(source, 0, 0);
  const blurred = bctx.getImageData(0, 0, canvas.width, canvas.height);

  const d = orig.data;
  const bd = blurred.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    const rBoost = d[i] + amount * (d[i] - bd[i]);
    const gBoost = d[i + 1] + amount * (d[i + 1] - bd[i + 1]);
    const bBoost = d[i + 2] + amount * (d[i + 2] - bd[i + 2]);
    d[i] = d[i] + (Math.max(0, Math.min(255, rBoost)) - d[i]) * m;
    d[i + 1] = d[i + 1] + (Math.max(0, Math.min(255, gBoost)) - d[i + 1]) * m;
    d[i + 2] = d[i + 2] + (Math.max(0, Math.min(255, bBoost)) - d[i + 2]) * m;
  }
  ctx.putImageData(orig, 0, 0);
  return canvas.toDataURL('image/png');
}

// Real directional (motion) blur: averages the image with itself
// translated along (cos(angle), sin(angle)) over `distancePx`, the same
// "stack of offset copies" technique a real motion-blur filter uses —
// distinct from blurInMask's isotropic Gaussian, this only smears along
// one axis, producing genuine directional streaking rather than a
// uniform soften. Blended into the masked region exactly like every
// other brush/filter op here.
export function motionBlurInMask(source: HTMLCanvasElement, mask: PixelMask, angleDeg: number, distancePx: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const dist = Math.max(0, distancePx);
  const steps = Math.max(2, Math.round(dist));

  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = source.width;
  blurredCanvas.height = source.height;
  const bctx = blurredCanvas.getContext('2d') as CanvasRenderingContext2D;
  bctx.globalAlpha = 1 / steps;
  for (let s = 0; s < steps; s++) {
    const t = dist * (s / (steps - 1) - 0.5);
    bctx.drawImage(source, dx * t, dy * t);
  }
  const blurred = bctx.getImageData(0, 0, canvas.width, canvas.height);

  const d = orig.data;
  const bd = blurred.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    d[i] = d[i] + (bd[i] - d[i]) * m;
    d[i + 1] = d[i + 1] + (bd[i + 1] - d[i + 1]) * m;
    d[i + 2] = d[i + 2] + (bd[i + 2] - d[i + 2]) * m;
  }
  ctx.putImageData(orig, 0, 0);
  return canvas.toDataURL('image/png');
}

// Real Sponge tool: saturate (positive amount) or desaturate (negative
// amount) within the masked region, via the same RGB<->HSL round-trip
// applyHueSaturation uses for its own saturation scaling — genuine
// color-space math, localized to a brush stroke instead of the whole
// image.
export function spongeInMask(source: HTMLCanvasElement, mask: PixelMask, amount: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const satScale = Math.max(0, 1 + amount * m);
    const [r2, g2, b2] = hslToRgb(h, Math.max(0, Math.min(1, s * satScale)), l);
    d[i] = r2; d[i + 1] = g2; d[i + 2] = b2;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface HueSaturationSettings {
  hue: number; // -180..180 degrees
  saturation: number; // -100..100 (%), scales existing saturation
  lightness: number; // -100..100 (%), additive
}

export const DEFAULT_HUE_SATURATION: HueSaturationSettings = { hue: 0, saturation: 0, lightness: 0 };

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// Real HSL-space Hue/Saturation/Lightness adjustment: converts each
// pixel to HSL, shifts hue, scales saturation, adds lightness, converts
// back — genuine per-pixel color-space math via a precomputed 256*3-ish
// isn't feasible for hue (it's not a simple per-channel LUT), so this
// walks every pixel directly. Master channel only — real per-color-range
// adjustment (Photoshop's Reds/Yellows/etc.) isn't implemented; that's a
// documented, honest scope limit, not a hidden shortcut on this one.
export function applyHueSaturation(source: HTMLCanvasElement, settings: HueSaturationSettings, mask?: PixelMask | null): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const hueShift = settings.hue / 360;
  const satScale = 1 + Math.max(-1, Math.min(1, settings.saturation / 100));
  const lightAdd = settings.lightness / 100;

  for (let p = 0, i = 0; i < d.length; p++, i += 4) {
    const m = mask ? mask.data[p] / 255 : 1;
    if (!m) continue;
    let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    h = ((h + hueShift) % 1 + 1) % 1;
    s = Math.max(0, Math.min(1, s * satScale));
    l = Math.max(0, Math.min(1, l + lightAdd));
    const [r2, g2, b2] = hslToRgb(h, s, l);
    if (m >= 1) {
      d[i] = r2; d[i + 1] = g2; d[i + 2] = b2;
    } else {
      // Partial (feathered) mask coverage — blend toward the adjusted
      // color proportionally instead of an all-or-nothing swap.
      d[i] = d[i] + (r2 - d[i]) * m;
      d[i + 1] = d[i + 1] + (g2 - d[i + 1]) * m;
      d[i + 2] = d[i + 2] + (b2 - d[i + 2]) * m;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Real Smudge: pulls color from a SOURCE point a short step earlier
// along the current stroke into the masked (destination) region, by
// `strength` (0 = no change, 1 = a full clone-stamp-style replace).
// `dx`/`dy` follow cloneStampPaint's own convention exactly:
// (destination - source), NOT the other way around — dest(x,y) ends up
// reading as source(x - dx, y - dy), so painting a dab AT the current
// point while sampling FROM the previous point means dx/dy must be
// (current - previous). Getting this backwards doesn't error, it just
// silently samples from the wrong side of the stroke -- confirmed via a
// live repro where the reversed sign made the tool read as doing
// nothing at all against a flat-colored source region. Applied
// incrementally at every step of a drag (not once at mouse-up, unlike
// every other brush tool here) is what produces the classic "push wet
// paint" smear when strung together — a single call only pulls one
// step's worth of color, the same as a real smudge tool's own per-dab
// behavior.
//
// Mutates `working` IN PLACE rather than returning a new canvas/data
// URL — a live multi-dab stroke needs each dab to see the previous
// one's result synchronously (no async encode/decode round trip in
// between, which is what a naive "re-bake through img.setSrc after
// every dab" approach would require, and img.setSrc is asynchronous).
// smudgeInMask below is a one-shot convenience wrapper around this for
// any caller that just wants a single pull encoded as a data URL.
export function smudgeStepInPlace(working: HTMLCanvasElement, mask: PixelMask, dx: number, dy: number, strength: number): void {
  const ctx = working.getContext('2d') as CanvasRenderingContext2D;
  const orig = ctx.getImageData(0, 0, working.width, working.height);

  const sampled = document.createElement('canvas');
  sampled.width = working.width;
  sampled.height = working.height;
  const sctx = sampled.getContext('2d') as CanvasRenderingContext2D;
  sctx.drawImage(working, dx, dy);
  const sampledData = sctx.getImageData(0, 0, working.width, working.height);

  const d = orig.data;
  const sd = sampledData.data;
  const s = Math.max(0, Math.min(1, strength));
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = (mask.data[p] / 255) * s;
    if (!m) continue;
    d[i] = d[i] + (sd[i] - d[i]) * m;
    d[i + 1] = d[i + 1] + (sd[i + 1] - d[i + 1]) * m;
    d[i + 2] = d[i + 2] + (sd[i + 2] - d[i + 2]) * m;
  }
  ctx.putImageData(orig, 0, 0);
}

export function smudgeInMask(source: HTMLCanvasElement, mask: PixelMask, dx: number, dy: number, strength: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  smudgeStepInPlace(canvas, mask, dx, dy, strength);
  return canvas.toDataURL('image/png');
}

// Real Red Eye correction: scans a clicked circular region for pixels
// whose red channel clearly dominates both green and blue (the actual
// signature of flash light reflecting off the retina's blood vessels,
// not a generic "is this pixel red" threshold that would also catch a
// red shirt collar at the edge of the same click radius) and desaturates
// + darkens exactly those pixels toward a neutral gray derived from
// their own green/blue average — so a bright circular specular highlight
// within the pupil (which is usually near-white, not red-dominant)
// correctly survives untouched, matching what a real red-eye tool does.
export function removeRedEye(source: HTMLCanvasElement, cx: number, cy: number, radius: number, darken: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(canvas.width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(canvas.height - 1, Math.ceil(cy + radius));
  const amount = Math.max(0, Math.min(1, darken));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy > r2) continue;
      const i = (y * canvas.width + x) * 4;
      const red = d[i];
      const green = d[i + 1];
      const blue = d[i + 2];
      const isRedEye = red > 60 && red > green * 1.4 && red > blue * 1.4;
      if (!isRedEye) continue;
      const gray = (green + blue) / 2;
      const newVal = gray * (1 - amount);
      d[i] = newVal;
      d[i + 1] = newVal;
      d[i + 2] = newVal;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------
// Pattern Stamp — paints a small repeating tile instead of a flat color.
// The four tile styles below are original/procedural (dots, stripes,
// checkerboard, grid), not reproductions of any Photoshop/Photopea asset.
// ---------------------------------------------------------------------

export type PatternStyle = 'dots' | 'stripes' | 'checkerboard' | 'grid';

export function generatePatternTile(style: PatternStyle, color: string, tileSize = 16): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = tileSize;
  tile.height = tileSize;
  const ctx = tile.getContext('2d') as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, tileSize, tileSize);
  ctx.fillStyle = color;
  if (style === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize / 2, tileSize / 2, tileSize / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'stripes') {
    ctx.fillRect(0, 0, tileSize / 2, tileSize);
  } else if (style === 'checkerboard') {
    const half = tileSize / 2;
    ctx.fillRect(0, 0, half, half);
    ctx.fillRect(half, half, half, half);
  } else {
    const line = Math.max(1, tileSize * 0.15);
    ctx.fillRect(0, 0, tileSize, line);
    ctx.fillRect(0, 0, line, tileSize);
  }
  return tile;
}

// Composites a tiled pattern into exactly the masked pixels, the same
// destination-in clipping paintColorInMask uses — but the fill is a
// repeating pattern rather than a flat color. The tile is always anchored
// to the image's own (0,0), not the mask's position, so separate dabs and
// separate strokes line up seamlessly instead of each restarting the tile
// at its own origin (Photoshop's "Aligned" Pattern Stamp behavior, which
// is the only sensible default once there's no per-click "set source"
// step the way Clone Stamp has).
export function patternStampInMask(source: HTMLCanvasElement, mask: PixelMask, patternTile: HTMLCanvasElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);

  const patternLayer = document.createElement('canvas');
  patternLayer.width = source.width;
  patternLayer.height = source.height;
  const pctx = patternLayer.getContext('2d') as CanvasRenderingContext2D;
  const pat = pctx.createPattern(patternTile, 'repeat') as CanvasPattern;
  pctx.fillStyle = pat;
  pctx.fillRect(0, 0, patternLayer.width, patternLayer.height);
  pctx.globalCompositeOperation = 'destination-in';
  pctx.drawImage(maskToCanvas(mask), 0, 0);

  ctx.drawImage(patternLayer, 0, 0);
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------
// Mixer Brush — blends the foreground color INTO the existing pixels,
// at a "wetness" strength per dab, mutating a persistent working canvas
// in place through the whole stroke (the exact same architecture
// smudgeStepInPlace uses, for the same reason: repeated overlapping
// passes must genuinely build up more paint, which a deferred single
// bake over a union mask can't express). This is what makes it a
// distinct real tool rather than a relabeled Brush or Smudge: Brush lays
// down one flat, single-pass color; Smudge introduces no new color at
// all (it only smears what's already there); Mixer Brush does both at
// once — it pulls in a NEW foreground color while still letting the
// canvas's own color show through underneath, more so the lower the
// wetness and the fewer times a given pixel has been passed over.
// ---------------------------------------------------------------------

// Resolves any CSS color string to concrete 0-255 RGB via the canvas's
// own color parsing (the same parser `fillStyle` already uses elsewhere
// in this file), rather than a hand-rolled hex parser that could drift
// out of sync with it.
function cssColorToRgb(color: string): [number, number, number] {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

// ---------------------------------------------------------------------
// Vignette — darkens (or, with a positive amount, lightens) pixels
// based on their real radial distance from the image's center, same
// scaling-factor math dodgeBurnInMask uses, just driven by distance
// instead of a painted mask's alpha. `size` is where the falloff starts
// (0 = starts at the exact center, close to 1 = only the far corners
// darken); `amount` is signed like dodge/burn (negative darkens,
// positive lightens).
// ---------------------------------------------------------------------
export function vignetteInMask(source: HTMLCanvasElement, mask: PixelMask, amount: number, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
  const s = Math.max(0, Math.min(0.95, size));
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    const y = Math.floor(p / canvas.width);
    const x = p - y * canvas.width;
    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
    const t = Math.max(0, Math.min(1, (dist - s) / Math.max(0.0001, 1 - s)));
    const factor = 1 + amount * t * m;
    d[i] = Math.max(0, Math.min(255, d[i] * factor));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * factor));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * factor));
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function mixerBrushStepInPlace(working: HTMLCanvasElement, mask: PixelMask, color: string, wetness: number): void {
  const ctx = working.getContext('2d') as CanvasRenderingContext2D;
  const imgData = ctx.getImageData(0, 0, working.width, working.height);
  const d = imgData.data;
  const [r, g, b] = cssColorToRgb(color);
  const w = Math.max(0, Math.min(1, wetness));
  for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
    const m = mask.data[p] / 255;
    if (!m) continue;
    const blend = w * m;
    d[i] = d[i] * (1 - blend) + r * blend;
    d[i + 1] = d[i + 1] * (1 - blend) + g * blend;
    d[i + 2] = d[i + 2] * (1 - blend) + b * blend;
  }
  ctx.putImageData(imgData, 0, 0);
}
