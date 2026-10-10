// The user's brand kit (colours, fonts, logo, business details), saved to
// their account and cached on the device so it works offline too.

import { supabase } from '@/lib/supabase';
import { normalizeColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './color';

export interface BrandKit {
  name: string;
  // What "Apply brand" does. Nothing is ever applied automatically.
  apply?: { colors: boolean; fonts: boolean; logo: boolean };
  colors: string[];
  fonts: { heading?: string; body?: string };
  logoUrl?: string | null;
  info: { business?: string; tagline?: string; phone?: string; email?: string; website?: string; address?: string };
}

export const DEFAULT_BRAND_APPLY = { colors: true, fonts: false, logo: false };

export const EMPTY_KIT: BrandKit = { name: 'My brand', colors: [], fonts: {}, logoUrl: null, info: {} };
const LOCAL_KEY = 'mt:brandKit';

function readLocal(): BrandKit | null {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return v ? { ...EMPTY_KIT, ...v } : null;
  } catch {
    return null;
  }
}
function writeLocal(k: BrandKit) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(k));
  } catch {
    // Not critical.
  }
}

export async function loadBrandKit(): Promise<BrandKit> {
  const local = readLocal();
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return local || EMPTY_KIT;
    const { data, error } = await supabase.from('brand_kits').select('*').eq('user_id', auth.user.id).maybeSingle();
    if (error || !data) return local || EMPTY_KIT;
    const kit: BrandKit = {
      name: data.name || 'My brand',
      colors: Array.isArray(data.colors) ? data.colors : [],
      fonts: data.fonts || {},
      logoUrl: data.logo_url,
      info: data.info || {},
      apply: data.info?._apply || undefined,
    };
    writeLocal(kit);
    return kit;
  } catch {
    return local || EMPTY_KIT;
  }
}

export async function saveBrandKit(kit: BrandKit): Promise<boolean> {
  writeLocal(kit);
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { error } = await supabase.from('brand_kits').upsert({
      user_id: auth.user.id,
      name: kit.name,
      colors: kit.colors,
      fonts: kit.fonts,
      logo_url: kit.logoUrl || null,
      info: { ...kit.info, _apply: kit.apply },
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

const isNeutral = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn < 18; // greys, black and white
};

export interface BrandApplyOptions {
  colors: boolean;
  fonts: boolean;
}

const hsl = (hex: string) => rgbToHsl(hexToRgb(hex)!);
const fromHsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb(h, Math.max(0, Math.min(100, s)), Math.max(0, Math.min(100, l))));

// Works out which colour of the design should become which brand colour,
// by the job the colour does rather than by a blind swap:
//  - the most prominent coloured accent becomes the first (primary) brand
//    colour, the next one the second, and so on;
//  - big background areas take the brand hue but keep their own lightness,
//    so a pale background stays pale and text on it stays readable;
//  - text and small accents take the exact brand colour unless that would
//    flip light to dark (then the brand hue at the original lightness).
// Greys, black and white are never touched.
export function brandColorMap(objects: any[], brand: string[], pageArea: number): Map<string, string> {
  const map = new Map<string, string>();
  const colors = brand.map((c) => normalizeColor(c)).filter(Boolean) as string[];
  if (!colors.length) return map;
  const stats = new Map<string, { area: number; text: number }>();
  const note = (c: any, area: number, text: number) => {
    const n = normalizeColor(c);
    if (!n || isNeutral(n)) return;
    const st = stats.get(n) || { area: 0, text: 0 };
    st.area += area;
    st.text += text;
    stats.set(n, st);
  };
  const visit = (o: any, fn: (o: any) => void) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach((c: any) => visit(c, fn));
    else fn(o);
  };
  objects.forEach((o) =>
    visit(o, (x) => {
      const isText = !!x.fontSize;
      const area = isText ? 0 : Math.abs((x.width || 0) * (x.scaleX || 1) * (x.height || 0) * (x.scaleY || 1));
      if (typeof x.fill === 'string') note(x.fill, area, isText ? 1 : 0);
      else if (x.fill?.colorStops) x.fill.colorStops.forEach((s: any) => note(s.color, area / x.fill.colorStops.length, 0));
      if (typeof x.stroke === 'string' && x.strokeWidth) note(x.stroke, 0, 0.3);
    })
  );
  const pa = Math.max(1, pageArea);
  const ranked = [...stats.entries()]
    .map(([c, st]) => ({ c, st, surface: st.area / pa > 0.25, score: Math.min(st.area / pa, 0.25) + st.text * 0.05 }))
    .sort((a, b) => b.score - a.score);
  // Accents get the brand colours first (primary first); backgrounds follow.
  const accents = ranked.filter((r) => !r.surface);
  const surfaces = ranked.filter((r) => r.surface);
  accents.forEach((r, i) => {
    const b = colors[i % colors.length];
    const hb = hsl(b);
    const hc = hsl(r.c);
    map.set(r.c, Math.abs(hb.l - hc.l) <= 30 ? b : fromHsl(hb.h, hb.s, hc.l));
  });
  surfaces.forEach((r, i) => {
    const b = colors[(i + (accents.length ? 1 : 0)) % colors.length];
    const hb = hsl(b);
    const hc = hsl(r.c);
    map.set(r.c, fromHsl(hb.h, hc.s < 30 ? hc.s : Math.max(hc.s * 0.5, Math.min(hb.s, hc.s + 15)), hc.l));
  });
  return map;
}

// Applies a brand kit to the objects of one page. Only what the customer
// switched on is applied: colours (see brandColorMap) and/or fonts (big
// text gets the heading font, the rest the body font).
export function applyBrandToObjects(objects: any[], kit: BrandKit, opts: BrandApplyOptions = { colors: true, fonts: false }, pageArea = 0) {
  const visit = (o: any, fn: (o: any) => void) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach((c: any) => visit(c, fn));
    else fn(o);
  };
  let area = pageArea;
  if (!area) objects.forEach((o) => (area = Math.max(area, Math.abs((o.width || 0) * (o.scaleX || 1) * (o.height || 0) * (o.scaleY || 1)))));
  const map = opts.colors ? brandColorMap(objects, kit.colors.filter(Boolean), area) : new Map<string, string>();
  const swap = (c: any) => {
    const n = normalizeColor(c);
    return n && map.has(n) ? map.get(n)! : c;
  };

  const sizes: number[] = [];
  objects.forEach((o) => visit(o, (x) => x.fontSize && sizes.push(x.fontSize * Math.abs(x.scaleY || 1))));
  sizes.sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const useFonts = opts.fonts && !!(kit.fonts.heading || kit.fonts.body);

  objects.forEach((o) =>
    visit(o, (x) => {
      if (map.size) {
        if (typeof x.fill === 'string') x.set({ fill: swap(x.fill) });
        else if (x.fill?.colorStops) x.fill.colorStops.forEach((s: any) => (s.color = swap(s.color)));
        if (typeof x.stroke === 'string') x.set({ stroke: swap(x.stroke) });
        if (x.styles) {
          Object.values(x.styles).forEach((line: any) => Object.values(line || {}).forEach((st: any) => st && st.fill && (st.fill = swap(st.fill))));
        }
      }
      if (useFonts && x.fontSize) {
        const big = x.fontSize * Math.abs(x.scaleY || 1) >= median * 1.4 || sizes.length <= 1;
        const font = big ? kit.fonts.heading || kit.fonts.body : kit.fonts.body || kit.fonts.heading;
        if (font) x.set({ fontFamily: font });
        // Per-letter font overrides give way to the brand font; other
        // per-letter styling (colours, bold…) is kept.
        if (x.styles) {
          Object.values(x.styles).forEach((line: any) => Object.values(line || {}).forEach((st: any) => st && delete st.fontFamily));
        }
      }
      x.initDimensions?.();
      x.dirty = true;
    })
  );
}

// Ready-made palettes customers can pick for their brand (or apply to a
// design straight away).
export const BRAND_PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Ocean', colors: ['#0B5FA5', '#35C2F1', '#F4B63F'] },
  { name: 'Blush', colors: ['#D9467A', '#F6B7C8', '#5B2A86'] },
  { name: 'Forest', colors: ['#1F6F50', '#9BC53D', '#E9B44C'] },
  { name: 'Sunset', colors: ['#E4572E', '#F3A712', '#29335C'] },
  { name: 'Royal', colors: ['#3D2C8D', '#C59B2E', '#916BBF'] },
  { name: 'Coral', colors: ['#FF6F59', '#43AA8B', '#254441'] },
  { name: 'Mono teal', colors: ['#0F766E', '#14B8A6', '#99F6E4'] },
  { name: 'Berry', colors: ['#7B1E3B', '#E05780', '#F2C14E'] },
  { name: 'Citrus', colors: ['#F59E0B', '#84CC16', '#0EA5E9'] },
  { name: 'Earth', colors: ['#8C5A3C', '#C9A227', '#4E6E58'] },
  { name: 'Lavender', colors: ['#7C5CBF', '#C4B5FD', '#F472B6'] },
  { name: 'Classic', colors: ['#B91C1C', '#1E3A8A', '#D4A017'] },
];
