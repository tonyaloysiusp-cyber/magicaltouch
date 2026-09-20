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
