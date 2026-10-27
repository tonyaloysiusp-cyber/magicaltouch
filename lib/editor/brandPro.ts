// Pro brand tools: colours from a logo, shades, a brand check of the page,
// switching between several brands, and brand kit files to share.

import type { BrandKit } from './brandKit';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './color';

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img'));
    i.src = src;
  });

/** The main colours of a logo/photo (most used first), skipping see-through pixels. */
export async function paletteFromImage(src: string, count = 5): Promise<string[]> {
  const img = await loadImg(src);
  const N = 72;
  const k = Math.min(1, N / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  // Buckets of similar colours (4 bits per channel), then merge close ones.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n++;
    buckets.set(key, e);
  }
  const list = Array.from(buckets.values()).map((e) => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, n: e.n })).sort((a, b) => b.n - a.n);
  const out: { r: number; g: number; b: number; n: number }[] = [];
  const dist = (a: any, b: any) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  for (const c2 of list) {
    const near = out.find((o) => dist(o, c2) < 48);
    if (near) { near.n += c2.n; continue; }
    out.push({ ...c2 });
    if (out.length >= count * 3) break;
  }
  // Prefer real colours over plain white backgrounds.
  const isWhite = (c2: any) => c2.r > 242 && c2.g > 242 && c2.b > 242;
  return out
    .sort((a, b) => b.n - a.n)
    .filter((c2, i, arr) => !(isWhite(c2) && arr.length > count))
    .slice(0, count)
    .map((c2) => rgbToHex({ r: Math.round(c2.r), g: Math.round(c2.g), b: Math.round(c2.b) }));
}

/** Five steps from light to dark of one colour. */
export function shades(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const { h, s } = rgbToHsl(rgb);
  return [92, 78, 60, 42, 24].map((l) => rgbToHex(hslToRgb(h, Math.min(100, s), l)));
}

const near = (a: string, b: string) => {
  const x = hexToRgb(a), y = hexToRgb(b);
  if (!x || !y) return false;
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b) < 36;
};
const neutral = (hex: string) => {
  const c = hexToRgb(hex);
  if (!c) return true;
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 18;
};

export interface BrandCheck { offColors: string[]; offFonts: string[]; textCount: number }

/** What on these objects doesn't follow the brand (neutrals always pass). */
export function checkBrand(objects: any[], kit: BrandKit): BrandCheck {
  const brandColors = [...kit.colors, ...Object.values(kit.styles || {}).map((s) => s?.color).filter(Boolean)] as string[];
  const brandFonts = new Set([kit.fonts.heading, kit.fonts.body, ...Object.values(kit.styles || {}).map((s) => s?.font)].filter(Boolean) as string[]);
  const colors = new Set<string>(), fonts = new Set<string>();
  let textCount = 0;
  const visit = (o: any) => {
    if (!o || o.__isArtboard || o.__isGuide) return;
    if (o._objects) o._objects.forEach(visit);
    for (const k of ['fill', 'stroke']) {
      const v = o[k];
      if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) colors.add(v.toLowerCase());
    }
    if (typeof o.text === 'string') {
      textCount++;
      if (o.fontFamily) fonts.add(o.fontFamily);
    }
  };
  objects.forEach(visit);
  return {
    offColors: brandColors.length ? Array.from(colors).filter((c) => !neutral(c) && !brandColors.some((b) => near(b, c))) : [],
    offFonts: brandFonts.size ? Array.from(fonts).filter((f) => !brandFonts.has(f)) : [],
    textCount,
  };
}

/** Switch to another saved brand; the current one goes into the list. */
export function switchBrand(kit: BrandKit, index: number): BrandKit {
  const others = [...(kit.others || [])];
  const next = others[index];
  if (!next) return kit;
  const { others: _drop, ...current } = kit;
  void _drop;
  others[index] = current as BrandKit;
  return { ...next, others };
}

export function newBrand(kit: BrandKit, name: string): BrandKit {
  const { others, ...current } = kit;
  return { name, colors: [], fonts: {}, logoUrl: null, info: {}, others: [...(others || []), current as BrandKit] };
}

/** A .json file with the whole brand kit, to keep or give to a teammate. */
export function exportBrandFile(kit: BrandKit) {
  const { others: _o, ...one } = kit;
  void _o;
  const blob = new Blob([JSON.stringify({ magicalTouchBrandKit: 1, kit: one }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(kit.name || 'brand').replace(/[^\w-]+/g, '-').toLowerCase()}-brand-kit.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function readBrandFile(file: File): Promise<BrandKit> {
  const j = JSON.parse(await file.text());
  const k = j?.kit;
  if (!j?.magicalTouchBrandKit || !k || !Array.isArray(k.colors)) throw new Error('That file isn’t a Magical Touch brand kit.');
  return { name: String(k.name || 'Imported brand'), colors: k.colors.filter((c: unknown) => typeof c === 'string').slice(0, 20), fonts: k.fonts || {}, logoUrl: k.logoUrl || null, info: k.info || {}, styles: k.styles, logos: k.logos, colorNames: k.colorNames, apply: k.apply };
}

/** Shrinks a picked logo so the brand kit stays small (max 700 px). */
export async function shrinkLogo(dataUrl: string): Promise<string> {
  try {
    const img = await loadImg(dataUrl);
    const k = Math.min(1, 700 / Math.max(img.naturalWidth, img.naturalHeight));
    if (k >= 1 && dataUrl.length < 400_000) return dataUrl;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch {
    return dataUrl;
  }
}
