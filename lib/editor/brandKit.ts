// The user's brand kit (colours, fonts, logo, business details), saved to
// their account and cached on the device so it works offline too.

import { supabase } from '@/lib/supabase';
import { normalizeColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrastRatio } from './color';

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

// Works out which colour of the design should become which brand colour.
// Colours are first grouped into "families" (shades of one hue, e.g. a
// dark and a light blue), ranked by how much of the design they cover.
// The most prominent family becomes the first brand colour, the next the
// second, and so on. Inside a family every shade keeps its offset from the
// family's main colour, so light stays light, dark stays dark and text
// keeps its contrast. Large backgrounds take the brand hue but keep their
// own lightness. Greys, black and white are never touched.
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
      if (x.styles) Object.values(x.styles).forEach((line: any) => Object.values(line || {}).forEach((st: any) => st?.fill && note(st.fill, 0, 0.2)));
    })
  );
  const pa = Math.max(1, pageArea);
  const entries = [...stats.entries()].map(([c, st]) => ({ c, st, h: hsl(c), score: Math.min(st.area / pa, 0.3) + st.text * 0.04 }));
  // Group into hue families.
  const fams: { rep: (typeof entries)[number]; members: typeof entries; score: number; area: number }[] = [];
  const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  entries
    .sort((a, b) => b.score - a.score)
    .forEach((e) => {
      const f = fams.find((x) => hueDist(x.rep.h.h, e.h.h) < 24 && Math.abs(x.rep.h.s - e.h.s) < 55);
      if (f) {
        f.members.push(e);
        f.score += e.score;
        f.area += e.st.area;
      } else fams.push({ rep: e, members: [e], score: e.score, area: e.st.area });
    });
  fams.sort((a, b) => b.score - a.score);
  // Families that are mostly a big background come after the accents.
  const accents = fams.filter((f) => f.area / pa <= 0.3);
  const surfaces = fams.filter((f) => f.area / pa > 0.3);
  const assign = (f: (typeof fams)[number], b: string, surface: boolean) => {
    const hb = hsl(b);
    const rep = f.rep.h;
    f.members.forEach((m) => {
      const hc = m.h;
      if (surface) {
        map.set(m.c, fromHsl(hb.h, hc.s < 25 ? hc.s : Math.min(hb.s, hc.s), hc.l));
        return;
      }
      const sat = rep.s > 4 ? hb.s * Math.min(1.6, hc.s / rep.s) : hb.s;
      let l = hc.l + (hb.l - rep.l);
      // Never flip a shade across the middle (keeps text readable).
      if ((hc.l > 62 && l < 45) || (hc.l < 38 && l > 55)) l = hc.l;
      map.set(m.c, fromHsl(hb.h, sat, l));
    });
  };
  accents.forEach((f, i) => assign(f, colors[i % colors.length], false));
  surfaces.forEach((f, i) => assign(f, colors[(i + (accents.length ? 1 : 0)) % colors.length], true));
  return map;
}

// ---------------------------------------------------------------- reset
// Before the first colour change, each object remembers its own colours,
// so "Reset colours" can bring back the template's colours (only the
// colours: text, positions, pictures and fonts stay as they are now).
function colorSnapshot(x: any) {
  return {
    fill: typeof x.fill === 'string' ? x.fill : x.fill?.colorStops ? x.fill.colorStops.map((s: any) => s.color) : null,
    stroke: typeof x.stroke === 'string' ? x.stroke : null,
    styles: x.styles ? JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(x.styles).map(([ln, line]: any) => [ln, Object.fromEntries(Object.entries(line || {}).filter(([, st]: any) => st?.fill).map(([ci, st]: any) => [ci, st.fill]))])))) : null,
  };
}
const eachLeaf = (o: any, fn: (o: any) => void) => {
  if (o.type === 'group' && o.getObjects) o.getObjects().forEach((c: any) => eachLeaf(c, fn));
  else fn(o);
};
export function rememberOriginalColors(objects: any[]) {
  objects.forEach((o) => eachLeaf(o, (x) => { if (!x.__origColors) x.__origColors = colorSnapshot(x); }));
}
export function hasOriginalColors(objects: any[]) {
  let found = false;
  objects.forEach((o) => eachLeaf(o, (x) => { if (x.__origColors) found = true; }));
  return found;
}
export function resetOriginalColors(objects: any[], keep = false): number {
  let n = 0;
  objects.forEach((o) =>
    eachLeaf(o, (x) => {
      const oc = x.__origColors;
      if (!oc) return;
      if (typeof oc.fill === 'string') x.set({ fill: oc.fill });
      else if (Array.isArray(oc.fill) && x.fill?.colorStops) x.fill.colorStops.forEach((s: any, i: number) => oc.fill[i] && (s.color = oc.fill[i]));
      if (typeof oc.stroke === 'string') x.set({ stroke: oc.stroke });
      if (oc.styles && x.styles) Object.entries(oc.styles).forEach(([ln, line]: any) => Object.entries(line).forEach(([ci, f]: any) => { if (x.styles[ln]?.[ci]) x.styles[ln][ci].fill = f; }));
      if (!keep) delete x.__origColors;
      x.dirty = true;
      n++;
    })
  );
  return n;
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
  // A second palette is always worked out from the template's own colours,
  // so trying several palettes never drifts.
  if (opts.colors) resetOriginalColors(objects, true);
  const map = opts.colors ? brandColorMap(objects, kit.colors.filter(Boolean), area) : new Map<string, string>();
  if (map.size) rememberOriginalColors(objects);
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
  if (map.size) keepTextReadable(objects, kit.colors.filter(Boolean));
}

// After a colour change, any text that has become hard to read on whatever
// sits behind it gets the most readable brand colour (or white / near-black).
function keepTextReadable(objects: any[], brand: string[]) {
  const solid = (o: any) => (typeof o.fill === 'string' ? normalizeColor(o.fill) : o.fill?.colorStops ? normalizeColor(o.fill.colorStops[Math.floor(o.fill.colorStops.length / 2)].color) : null);
  const rect = (o: any) => (o.getBoundingRect ? o.getBoundingRect(true, true) : { left: o.left, top: o.top, width: o.width * (o.scaleX || 1), height: o.height * (o.scaleY || 1) });
  objects.forEach((x, i) => {
    if (!x.fontSize || typeof x.fill !== 'string') return;
    const now = normalizeColor(x.fill);
    const was = normalizeColor(x.__origColors?.fill);
    if (!now) return;
    const r = rect(x);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let bgObj: any = null;
    for (let j = i - 1; j >= 0; j--) {
      const o = objects[j];
      if (o.fontSize || o.type === 'image' || o.opacity === 0) continue;
      const b = rect(o);
      if (cx >= b.left && cx <= b.left + b.width && cy >= b.top && cy <= b.top + b.height && b.width * b.height > r.width * r.height * 0.6 && solid(o)) { bgObj = o; break; }
    }
    if (!bgObj) return;
    const bgNow = solid(bgObj)!;
    const bgWas = normalizeColor(typeof bgObj.__origColors?.fill === 'string' ? bgObj.__origColors.fill : null) || bgNow;
    const before = was ? contrastRatio(was, bgWas) : 4.5;
    const after = contrastRatio(now, bgNow);
    const need = Math.min(3, before * 0.85);
    if (after >= need) return;
    const options = [...brand.map((c) => normalizeColor(c)).filter(Boolean) as string[], '#FFFFFF', '#141414'];
    const brandOk = options.slice(0, -2).filter((c) => contrastRatio(c, bgNow) >= need).sort((a, b) => contrastRatio(b, bgNow) - contrastRatio(a, bgNow));
    const pick = brandOk[0] || options.sort((a, b) => contrastRatio(b, bgNow) - contrastRatio(a, bgNow))[0];
    x.set({ fill: pick });
  });
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
