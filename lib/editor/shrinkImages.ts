// ---------------------------------------------------------------------
// lib/editor/shrinkImages.ts
// Designs keep their pictures inside the design itself (as data URLs).
// A photo straight from a phone, or a background-removed cut-out (a full
// size PNG), can make one design several megabytes — slow to save, slow
// to open, and heavy for every visitor who opens the template.
//
// shrinkDesignImages() walks a saved design and, for every embedded
// picture larger than it needs to be:
//   · scales it down to what the design actually uses (2.5× its size on
//     the page — still sharp in print — and never above 3000 px)
//   · re-encodes it as WebP (keeps transparency for cut-outs; JPEG when
//     the browser can't make WebP and the picture has no transparency)
//   · fixes the crop / size numbers so it looks exactly the same
// It only ever replaces a picture with a smaller one, and skips anything
// it can't handle safely (e.g. pictures clipped by their own shape).
// Results are cached per picture, so repeated saves are instant.
// ---------------------------------------------------------------------

const MIN_BYTES = 120 * 1024; // leave small pictures alone
const MAX_SIDE = 3000;
export type ShrinkLevel = 'print' | 'balanced' | 'small';
const LEVELS: Record<ShrinkLevel, { max: number; factor: number; q: number }> = { print: { max: 3000, factor: 2.5, q: 0.86 }, balanced: { max: 2000, factor: 2, q: 0.82 }, small: { max: 1400, factor: 1.5, q: 0.78 } };
const cache = new Map<string, { src: string; k: number } | null>();

const bytesOf = (dataUrl: string) => Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = src; });
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)));
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] < 250) return true;
  return false;
}

/** Shrinks one data-URL picture for a target longest side. Returns null when it wouldn't get smaller. */
async function shrinkOne(src: string, needSide: number, max = MAX_SIDE, q = 0.86): Promise<{ src: string; k: number } | null> {
  const key = `${needSide}|${max}|${q}|${src.length}|${src.slice(-64)}`;
  if (cache.has(key)) return cache.get(key)!;
  let out: { src: string; k: number } | null = null;
  try {
    const img = await load(src);
    const nat = Math.max(img.naturalWidth, img.naturalHeight);
    const k = Math.min(1, Math.min(max, Math.max(600, needSide)) / nat);
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    let next = c.toDataURL('image/webp', q);
    if (!next.startsWith('data:image/webp')) next = hasAlpha(ctx, w, h) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
    if (next.length < src.length * 0.85) out = { src: next, k: w / img.naturalWidth };
  } catch { out = null; }
  cache.set(key, out);
  return out;
}

async function walk(objs: any[], stats: { before: number; after: number; count: number }, lv: { max: number; factor: number; q: number }) {
  for (const o of objs || []) {
    if (!o || typeof o !== 'object') continue;
    if (Array.isArray(o.objects)) await walk(o.objects, stats, lv);
    if (String(o.type).toLowerCase() !== 'image' || typeof o.src !== 'string' || !o.src.startsWith('data:image/')) continue;
    if (/svg/.test(o.src.slice(0, 30)) || bytesOf(o.src) < MIN_BYTES) continue;
    if (o.clipPath && !o.clipPath.absolutePositioned) continue; // its shape is in picture pixels — leave it
    const shown = Math.max((o.width || 0) * Math.abs(o.scaleX || 1), (o.height || 0) * Math.abs(o.scaleY || 1));
    if (!shown) continue;
    const r = await shrinkOne(o.src, Math.ceil(shown * lv.factor), lv.max, lv.q);
    if (!r) continue;
    const before = bytesOf(o.src);
    // Same look: picture units shrink by k, so the scale grows by 1/k.
    o.src = r.src;
    o.width = (o.width || 0) * r.k; o.height = (o.height || 0) * r.k;
    o.cropX = (o.cropX || 0) * r.k; o.cropY = (o.cropY || 0) * r.k;
    o.scaleX = (o.scaleX || 1) / r.k; o.scaleY = (o.scaleY || 1) / r.k;
    stats.before += before; stats.after += bytesOf(r.src); stats.count++;
  }
}

/** Shrinks oversized pictures inside a saved design (canvas JSON) in place and returns what changed. */
export async function shrinkDesignImages(json: any, level: ShrinkLevel = 'print'): Promise<{ count: number; saved: number }> {
  const lv = LEVELS[level];
  const stats = { before: 0, after: 0, count: 0 };
  if (typeof document === 'undefined' || !json) return { count: 0, saved: 0 };
  const pages = Array.isArray(json.pages) ? json.pages : null;
  if (pages) for (const p of pages) await walk(p?.objects || p?.canvas?.objects || [], stats, lv);
  await walk(json.objects || [], stats, lv);
  return { count: stats.count, saved: stats.before - stats.after };
}

export const designBytes = (json: any) => { try { return JSON.stringify(json).length; } catch { return 0; } };
export const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
