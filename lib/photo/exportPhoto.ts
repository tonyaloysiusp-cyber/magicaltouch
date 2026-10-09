// Saves a finished picture as a file, with its print resolution written
// into the file so it prints at the right size. CMYK files are real
// four-ink files converted through the FOGRA39 press profile.

import { loadCmykTable, loadPressProfile, rgbaToCmyk } from '@/lib/color/cmyk';
import { writePressPdf, writeTiff } from '@/lib/export/printFiles';

export type PhotoFormat = 'jpg' | 'png' | 'webp' | 'tiff' | 'pdf';
export type ColourMode = 'rgb' | 'cmyk';

export const FORMAT_INFO: Record<PhotoFormat, { label: string; note: string; cmyk: boolean; alpha: boolean }> = {
  jpg: { label: 'JPG', note: 'Best for sharing and most printing', cmyk: false, alpha: false },
  png: { label: 'PNG', note: 'Keeps transparent backgrounds', cmyk: false, alpha: true },
  webp: { label: 'WebP', note: 'Small files for websites', cmyk: false, alpha: true },
  tiff: { label: 'TIFF', note: 'Lossless, for print shops and Photoshop', cmyk: true, alpha: true },
  pdf: { label: 'PDF', note: 'Print-ready page at its real size', cmyk: true, alpha: false },
};

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q));

function flatten(c: HTMLCanvasElement, color = '#ffffff'): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = c.width;
  out.height = c.height;
  const x = out.getContext('2d')!;
  x.fillStyle = color;
  x.fillRect(0, 0, out.width, out.height);
  x.drawImage(c, 0, 0);
  return out;
}

// ---- resolution metadata for JPG and PNG

async function jpegWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  // JFIF APP0 right after SOI: FF D8 FF E0 len 'JFIF\0' ver ver units Xd Xd Yd Yd
  if (b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46) {
    b[13] = 1;
    b[14] = (dpi >> 8) & 255; b[15] = dpi & 255;
    b[16] = (dpi >> 8) & 255; b[17] = dpi & 255;
  }
  return new Blob([b], { type: 'image/jpeg' });
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function pngWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // pHYs
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  // insert right after IHDR (8-byte signature + 25-byte IHDR chunk)
  const at = 33;
  return new Blob([b.subarray(0, at), chunk, b.subarray(at)], { type: 'image/png' });
}

export interface ExportOptions {
  format: PhotoFormat;
  colour: ColourMode;
  quality?: number; // 0..1 for jpg/webp
  dpi: number;
}

export async function exportPhoto(canvas: HTMLCanvasElement, opt: ExportOptions): Promise<Blob> {
  const dpi = Math.max(1, Math.round(opt.dpi));
  const info = FORMAT_INFO[opt.format];
  const colour = info.cmyk ? opt.colour : 'rgb';
  if (opt.format === 'jpg') return jpegWithDpi(await toBlob(flatten(canvas), 'image/jpeg', opt.quality ?? 0.92), dpi);
  if (opt.format === 'png') return pngWithDpi(await toBlob(canvas, 'image/png'), dpi);
  if (opt.format === 'webp') return toBlob(canvas, 'image/webp', opt.quality ?? 0.9);

  const src = opt.format === 'pdf' ? flatten(canvas) : canvas;
  const rgba = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height).data;
  if (colour === 'cmyk') {
    const [lut, icc] = await Promise.all([loadCmykTable(), loadPressProfile()]);
    const cmyk = rgbaToCmyk(rgba, lut, { pureBlack: false });
    if (opt.format === 'tiff') return writeTiff({ width: src.width, height: src.height, data: cmyk, mode: 'cmyk', dpi, icc });
    const pt = (px: number) => (px / dpi) * 72;
    return writePressPdf([{ data: cmyk, space: 'cmyk', pxWidth: src.width, pxHeight: src.height, trimW: pt(src.width), trimH: pt(src.height), bleed: 0 }], { icc });
  }
  if (opt.format === 'tiff') {
    // RGB TIFF keeps transparency when there is any.
    let alpha = false;
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) { alpha = true; break; }
    if (alpha) return writeTiff({ width: src.width, height: src.height, data: new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.length), mode: 'rgba', dpi });
    const rgb = new Uint8Array(src.width * src.height * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) { rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]; }
    return writeTiff({ width: src.width, height: src.height, data: rgb, mode: 'rgb', dpi });
  }
  const rgb = new Uint8Array(src.width * src.height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) { rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]; }
  const pt = (px: number) => (px / dpi) * 72;
  return writePressPdf([{ data: rgb, space: 'rgb', pxWidth: src.width, pxHeight: src.height, trimW: pt(src.width), trimH: pt(src.height), bleed: 0 }]);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const extFor = (f: PhotoFormat) => (f === 'jpg' ? 'jpg' : f === 'tiff' ? 'tif' : f);
