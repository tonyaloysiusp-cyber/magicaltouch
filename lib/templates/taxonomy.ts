// Two separate ways to browse templates:
//   purpose  -> the template's category (Business Card, Flyer, Birthday…)
//   style    -> how it looks (Luxury, Minimalist, Playful…), stored as
//               "style:<id>" tags so it never mixes with the purpose.
// Colour palette, print/digital use, shape and page count are worked out
// from the template's real data (colours, size, unit, pages).

import type { Template } from '@/lib/templatesData';

export const STYLES = [
  { id: 'luxury', label: 'Luxury' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'modern', label: 'Modern' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'vintage-retro', label: 'Vintage & retro' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'artistic', label: 'Artistic' },
  { id: 'playful', label: 'Playful' },
  { id: 'colorful', label: 'Colourful' },
  { id: 'bold-typography', label: 'Bold typography' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'premium-monochrome', label: 'Premium monochrome' },
  { id: 'dark-cinematic', label: 'Dark cinematic' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'floral', label: 'Floral' },
  { id: 'organic-natural', label: 'Organic & natural' },
  { id: 'futuristic', label: 'Futuristic' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'classic', label: 'Classic' },
  { id: 'scandinavian', label: 'Scandinavian' },
  { id: 'hand-drawn', label: 'Hand-drawn' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'professional-business', label: 'Professional business' },
  { id: 'youthful-energetic', label: 'Youthful & energetic' },
] as const;
export type StyleId = (typeof STYLES)[number]['id'];
export const styleLabel = (id: string) => STYLES.find((s) => s.id === id)?.label || id;

export function stylesOf(t: Template): string[] {
  return (t.tags || []).filter((x) => x.startsWith('style:')).map((x) => x.slice(6));
}
/** Tags people should see (internal style/page tags hidden). */
export const visibleTags = (t: Template) => (t.tags || []).filter((x) => !x.startsWith('style:') && !/^\d+ pages$/.test(x));

// ---------------------------------------------------------------- colour
const rgb = (hex: string) => {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
};
const hsl = (hex: string) => {
  const c = rgb(hex);
  if (!c) return null;
  const [r, g, b] = c;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};
const isGold = (c: ReturnType<typeof hsl>) => !!c && c.h > 30 && c.h < 58 && c.s > 0.3 && c.l > 0.35 && c.l < 0.75;
const isDark = (c: ReturnType<typeof hsl>) => !!c && c.l < 0.2;
const isLight = (c: ReturnType<typeof hsl>) => !!c && c.l > 0.88;
const isGrey = (c: ReturnType<typeof hsl>) => !!c && c.s < 0.1;
const hueIn = (c: ReturnType<typeof hsl>, a: number, b: number) => !!c && c.s >= 0.2 && c.l > 0.12 && c.l < 0.9 && (a < b ? c.h >= a && c.h < b : c.h >= a || c.h < b);

export const PALETTES: { id: string; label: string; swatch: [string, string]; test: (a: ReturnType<typeof hsl>, b: ReturnType<typeof hsl>) => boolean }[] = [
  { id: 'black-gold', label: 'Black & gold', swatch: ['#111111', '#C9A227'], test: (a, b) => (isDark(a) && isGold(b)) || (isDark(b) && isGold(a)) },
  { id: 'blue-white', label: 'Blue & white', swatch: ['#1E4FA0', '#FFFFFF'], test: (a, b) => (hueIn(a, 195, 250) && (isLight(b) || isGrey(b))) || (hueIn(b, 195, 250) && (isLight(a) || isGrey(a))) },
  { id: 'monochrome', label: 'Monochrome', swatch: ['#111111', '#E5E5E5'], test: (a, b) => isGrey(a) && isGrey(b) },
  { id: 'dark', label: 'Dark', swatch: ['#0F0F1A', '#3A3A55'], test: (a) => isDark(a) },
  { id: 'pastel', label: 'Pastel', swatch: ['#F8D7E3', '#D7E8F8'], test: (a, b) => !!a && !!b && a.l > 0.8 && b.l > 0.68 && (a.s > 0.15 || b.s > 0.15) },
  { id: 'pink', label: 'Pink & blush', swatch: ['#F06292', '#FCE4EC'], test: (a, b) => hueIn(a, 320, 355) || hueIn(b, 320, 355) },
  { id: 'red', label: 'Red', swatch: ['#C62828', '#FFEBEE'], test: (a, b) => hueIn(a, 355, 12) || hueIn(b, 355, 12) },
  { id: 'warm', label: 'Orange & warm', swatch: ['#EF6C00', '#FFE0B2'], test: (a, b) => hueIn(a, 12, 45) || hueIn(b, 12, 45) },
  { id: 'yellow', label: 'Yellow & gold', swatch: ['#F9A825', '#FFF8E1'], test: (a, b) => hueIn(a, 45, 65) || hueIn(b, 45, 65) },
  { id: 'green', label: 'Green', swatch: ['#2E7D32', '#E8F5E9'], test: (a, b) => hueIn(a, 75, 165) || hueIn(b, 75, 165) },
  { id: 'teal', label: 'Teal & aqua', swatch: ['#00897B', '#E0F2F1'], test: (a, b) => hueIn(a, 165, 195) || hueIn(b, 165, 195) },
  { id: 'blue', label: 'Blue', swatch: ['#1565C0', '#E3F2FD'], test: (a, b) => hueIn(a, 195, 250) || hueIn(b, 195, 250) },
  { id: 'purple', label: 'Purple', swatch: ['#6A1B9A', '#F3E5F5'], test: (a, b) => hueIn(a, 250, 320) || hueIn(b, 250, 320) },
];

export function palettesOf(t: Template): string[] {
  const a = hsl(t.colors?.[0] || ''), b = hsl(t.colors?.[1] || '');
  return PALETTES.filter((p) => p.test(a, b)).map((p) => p.id);
}

// ---------------------------------------------------------------- use & size
const PRINT_WORDS = /card|letterhead|flyer|brochure|poster|magazine|menu|certificate|resume|invitation|invite|stationery|trifold|banner|book|portfolio|envelope|label|print/i;
const DIGITAL_WORDS = /instagram|story|post|social|facebook|youtube|linkedin|pinterest|presentation|slide|deck|whatsapp|thumbnail|reel|tiktok|email|web/i;

export function mediumOf(t: Template): 'print' | 'digital' {
  const text = [t.name, t.category, ...(t.tags || [])].join(' ');
  if (t.unit && t.unit !== 'px') return 'print';
  if (DIGITAL_WORDS.test(text)) return 'digital';
  if (PRINT_WORDS.test(text) || (t.dpi || 0) >= 300) return 'print';
  return 'digital';
}

export function pageCountOf(t: Template): number {
  const tag = (t.tags || []).find((x) => /^\d+ pages$/.test(x));
  return tag ? parseInt(tag, 10) : 1;
}

export function shapeOf(t: Template): 'portrait' | 'landscape' | 'square' {
  if (t.orientation) return t.orientation;
  const r = t.width / Math.max(1, t.height);
  return r > 1.04 ? 'landscape' : r < 0.96 ? 'portrait' : 'square';
}

const RATIOS: { id: string; label: string; r: number }[] = [
  { id: '1:1', label: '1:1 square', r: 1 },
  { id: '4:5', label: '4:5', r: 4 / 5 },
  { id: '9:16', label: '9:16 story', r: 9 / 16 },
  { id: '16:9', label: '16:9 wide', r: 16 / 9 },
  { id: 'a-series', label: 'A4 / A5 (1:1.41)', r: 1 / 1.414 },
  { id: 'a-series-l', label: 'A landscape', r: 1.414 },
  { id: '2:3', label: '2:3', r: 2 / 3 },
  { id: '5:7', label: '5:7 card', r: 5 / 7 },
  { id: 'card', label: 'Business card', r: 3.5 / 2 },
];
export const ASPECTS = RATIOS.map(({ id, label }) => ({ id, label }));
export function aspectOf(t: Template): string | null {
  const r = t.width / Math.max(1, t.height);
  let best: string | null = null, err = 0.035;
  RATIOS.forEach((x) => {
    const e = Math.abs(Math.log(r / x.r));
    if (e < err) { err = e; best = x.id; }
  });
  return best;
}
