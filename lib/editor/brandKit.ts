// The user's brand kit (colours, fonts, logo, business details), saved to
// their account and cached on the device so it works offline too.

import { supabase } from '@/lib/supabase';
import { normalizeColor } from './color';

export interface BrandKit {
  name: string;
  colors: string[];
  fonts: { heading?: string; body?: string };
  logoUrl?: string | null;
  info: { business?: string; tagline?: string; phone?: string; email?: string; website?: string; address?: string };
}

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
      info: kit.info,
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

// Applies a brand kit to the objects of one page: the most-used colours
// become the brand colours (greys, black and white are left alone), big
// text gets the heading font and the rest the body font.
export function applyBrandToObjects(objects: any[], kit: BrandKit) {
  const counts = new Map<string, number>();
  const visit = (o: any, fn: (o: any) => void) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach((c: any) => visit(c, fn));
    else fn(o);
  };
  const note = (c: any) => {
    const n = normalizeColor(c);
    if (n && !isNeutral(n)) counts.set(n, (counts.get(n) || 0) + 1);
  };
  objects.forEach((o) =>
    visit(o, (x) => {
      if (typeof x.fill === 'string') note(x.fill);
      else if (x.fill?.colorStops) x.fill.colorStops.forEach((s: any) => note(s.color));
      if (typeof x.stroke === 'string') note(x.stroke);
    })
  );
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const brand = kit.colors.filter(Boolean);
  const map = new Map<string, string>();
  if (brand.length) ranked.forEach((c, i) => map.set(c, brand[i % brand.length]));
  const swap = (c: any) => {
    const n = normalizeColor(c);
    return n && map.has(n) ? map.get(n)! : c;
  };

  const sizes: number[] = [];
  objects.forEach((o) => visit(o, (x) => x.fontSize && sizes.push(x.fontSize * Math.abs(x.scaleY || 1))));
  sizes.sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;

  objects.forEach((o) =>
    visit(o, (x) => {
      if (typeof x.fill === 'string') x.set({ fill: swap(x.fill) });
      else if (x.fill?.colorStops) {
        x.fill.colorStops.forEach((s: any) => (s.color = swap(s.color)));
      }
      if (typeof x.stroke === 'string') x.set({ stroke: swap(x.stroke) });
      if (x.fontSize && (kit.fonts.heading || kit.fonts.body)) {
        const big = x.fontSize * Math.abs(x.scaleY || 1) >= median * 1.4 || sizes.length <= 1;
        const font = big ? kit.fonts.heading || kit.fonts.body : kit.fonts.body || kit.fonts.heading;
        if (font) x.set({ fontFamily: font });
        // Per-letter font overrides give way to the brand font; other
        // per-letter styling (colours, bold…) is kept.
        if (x.styles) {
          Object.values(x.styles).forEach((line: any) => Object.values(line || {}).forEach((st: any) => st && delete st.fontFamily));
        }
        x.initDimensions?.();
      }
      x.dirty = true;
    })
  );
}
