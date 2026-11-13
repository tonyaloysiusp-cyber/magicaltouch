// ---------------------------------------------------------------------
// lib/colour.ts — colour maths for the Colour Explorer and recolouring:
// HEX/RGB/HSL/CMYK conversion, harmonies, perceptual distance (CIE Lab
// ΔE76) and WCAG contrast. Pure functions, unit tested.
// ---------------------------------------------------------------------

export type RGB = [number, number, number];

export function normHex(h: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || '').trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return '#' + s.toUpperCase();
}
export function hexToRgb(h: string): RGB {
  const n = normHex(h) || '#000000';
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}
export const rgbToHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
export const hsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb(h, s, l));

export function rgbToCmyk([r, g, b]: RGB): [number, number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const k = 1 - Math.max(R, G, B);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1 - R - k) / (1 - k), (1 - G - k) / (1 - k), (1 - B - k) / (1 - k), k].map((v) => Math.round(v * 100)) as [number, number, number, number];
}

export type Harmony = 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic' | 'monochrome';
export const HARMONIES: { id: Harmony; label: string }[] = [
  { id: 'complementary', label: 'Complementary' },
  { id: 'analogous', label: 'Analogous' },
  { id: 'triadic', label: 'Triadic' },
  { id: 'split', label: 'Split complementary' },
  { id: 'tetradic', label: 'Tetradic' },
  { id: 'monochrome', label: 'Monochromatic' },
];
export function harmony(hex: string, kind: Harmony): string[] {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const at = (dh: number, ds = 0, dl = 0) => hsl(h + dh, Math.max(0, Math.min(100, s + ds)), Math.max(4, Math.min(96, l + dl)));
  switch (kind) {
    case 'complementary': return [at(0), at(0, -10, 22), at(180), at(180, -12, -18), at(0, -30, 40)];
    case 'analogous': return [at(-30), at(-15), at(0), at(15), at(30)];
    case 'triadic': return [at(0), at(120), at(240), at(0, -20, 30), at(120, -20, -20)];
    case 'split': return [at(0), at(150), at(210), at(0, -15, 30), at(0, 0, -25)];
    case 'tetradic': return [at(0), at(90), at(180), at(270), at(0, -25, 35)];
    case 'monochrome': return [at(0, 0, -30), at(0, 0, -15), at(0), at(0, -10, 18), at(0, -20, 34)];
  }
}

// CIE Lab and ΔE (perceptual colour distance).
function lin(c: number) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
export function rgbToLab([r, g, b]: RGB): [number, number, number] {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
export function deltaE(a: string, b: string): number {
  const A = rgbToLab(hexToRgb(a)), B = rgbToLab(hexToRgb(b));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Black or white — whichever reads better on the colour. */
export const readableOn = (hex: string) => (contrast(hex, '#000000') >= contrast(hex, '#FFFFFF') ? '#000000' : '#FFFFFF');

export type Mood = 'warm' | 'cool' | 'pastel' | 'earthy' | 'neon' | 'luxury' | 'neutral';
export function moodOf(hex: string): Mood[] {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const out: Mood[] = [];
  if (s < 12) out.push('neutral');
  else {
    if (h < 70 || h >= 330) out.push('warm'); else if (h >= 160 && h < 290) out.push('cool');
    if (l > 75 && s > 25) out.push('pastel');
    if (s > 85 && l > 45 && l < 65) out.push('neon');
    if (s < 50 && l < 55 && h >= 15 && h < 90) out.push('earthy');
  }
  if ((l < 22 && s < 40) || (h >= 35 && h < 55 && s > 35 && s < 75 && l > 40 && l < 65)) out.push('luxury');
  return out;
}

export const MOOD_PALETTES: { mood: Mood; name: string; colors: string[] }[] = [
  { mood: 'warm', name: 'Sunlit terrace', colors: ['#B5563C', '#E7B07A', '#F3D9B1', '#7A3B2E', '#FBF3EA'] },
  { mood: 'warm', name: 'Saffron market', colors: ['#E3A72F', '#C2571A', '#7D2E1F', '#F6E3B4', '#2B1A12'] },
  { mood: 'cool', name: 'Harbour morning', colors: ['#1E3A5F', '#3B82C4', '#9CC3E6', '#E7EEF6', '#0B1220'] },
  { mood: 'cool', name: 'Glacier', colors: ['#0F5F6F', '#5DCCB8', '#BFE9E0', '#F2FAF8', '#123033'] },
  { mood: 'pastel', name: 'Sorbet', colors: ['#F7C6D0', '#FDE2B8', '#C9E7D4', '#CFE0F7', '#E6D7F5'] },
  { mood: 'pastel', name: 'Linen & lilac', colors: ['#EDE4F5', '#D7C4EA', '#F4EDE2', '#B9A6D0', '#5E4B73'] },
  { mood: 'earthy', name: 'Olive grove', colors: ['#6B7146', '#A8A26A', '#D9CFA6', '#8A5A3C', '#F2EDE0'] },
  { mood: 'earthy', name: 'Clay studio', colors: ['#9C5B43', '#C99A7A', '#E8D5C0', '#4A3B33', '#F6EFE7'] },
  { mood: 'neon', name: 'Night drive', colors: ['#FF2FC8', '#2CE6F2', '#B6FF3B', '#120A1F', '#3B1D6E'] },
  { mood: 'neon', name: 'Arcade', colors: ['#FF5A1F', '#FFE53B', '#00F5A0', '#1A1A2E', '#7B2FF7'] },
  { mood: 'luxury', name: 'Black & gold', colors: ['#0E0E10', '#C9A86A', '#E8D7AE', '#2A2620', '#F7F2E8'] },
  { mood: 'luxury', name: 'Champagne', colors: ['#F3E9DA', '#D9C19A', '#A6874E', '#3E3427', '#FFFFFF'] },
];

// ---------------------------------------------------------------- collections
// Named palettes by theme. "Skin tones" are shades for illustration and
// portraits in designs — a drawing aid, not about any person.
export type Collection = 'warm' | 'cool' | 'pastel' | 'vintage' | 'luxury' | 'corporate' | 'festival' | 'nature' | 'gradient' | 'skin';
export const COLLECTIONS: { id: Collection; label: string }[] = [
  { id: 'warm', label: 'Warm' }, { id: 'cool', label: 'Cool' }, { id: 'pastel', label: 'Pastel' }, { id: 'vintage', label: 'Vintage' },
  { id: 'luxury', label: 'Luxury' }, { id: 'corporate', label: 'Corporate' }, { id: 'festival', label: 'Festival' }, { id: 'nature', label: 'Nature' },
  { id: 'gradient', label: 'Gradient' }, { id: 'skin', label: 'Skin tones (illustration)' },
];
export const PALETTES: { c: Collection; name: string; colors: string[] }[] = [
  ...MOOD_PALETTES.filter((p) => ['warm', 'cool', 'pastel', 'luxury'].includes(p.mood)).map((p) => ({ c: p.mood as Collection, name: p.name, colors: p.colors })),
  { c: 'warm', name: 'Terracotta sunset', colors: ['#8C3B2B', '#C8653F', '#E8A15C', '#F4D29C', '#FFF4E3'] },
  { c: 'cool', name: 'Nordic fjord', colors: ['#14213D', '#2E4A6B', '#6C8EAD', '#B8CCE0', '#F1F5F9'] },
  { c: 'pastel', name: 'Cotton candy', colors: ['#FFD6E8', '#FFE9C7', '#D8F3DC', '#CDE7FF', '#E9DCFF'] },
  { c: 'vintage', name: 'Old postcard', colors: ['#C9A66B', '#8A6E4B', '#D9C3A0', '#5B7065', '#EFE6D6'] },
  { c: 'vintage', name: 'Retro diner', colors: ['#D8483B', '#F2B544', '#2E8C83', '#F5E9D3', '#2B2B2B'] },
  { c: 'vintage', name: 'Faded film', colors: ['#7E9C9F', '#D5B48C', '#B86F52', '#E8DCC8', '#3D3A36'] },
  { c: 'luxury', name: 'Emerald velvet', colors: ['#0B3D2E', '#14614A', '#C9A86A', '#EFE3C2', '#101010'] },
  { c: 'luxury', name: 'Royal plum', colors: ['#2E1A3B', '#5B2C6F', '#B48EAD', '#E6D5B8', '#C9A86A'] },
  { c: 'corporate', name: 'Trust blue', colors: ['#0B2545', '#13315C', '#3B82C4', '#8DA9C4', '#EEF4ED'] },
  { c: 'corporate', name: 'Slate & teal', colors: ['#1F2933', '#3E4C59', '#0E9AA7', '#9AA5B1', '#F5F7FA'] },
  { c: 'corporate', name: 'Clean finance', colors: ['#102A43', '#243B53', '#2BB673', '#D9E2EC', '#FFFFFF'] },
  { c: 'festival', name: 'Diwali glow', colors: ['#7A0C2E', '#D9480F', '#F5A623', '#FFD86B', '#2B0F3A'] },
  { c: 'festival', name: 'Holi colours', colors: ['#FF3E9A', '#FFB400', '#00C2A8', '#5B5BFF', '#FF6B35'] },
  { c: 'festival', name: 'Eid evening', colors: ['#0B3D2E', '#127A5C', '#D4AF37', '#F3E7C9', '#1B1F3B'] },
  { c: 'festival', name: 'Christmas', colors: ['#7F1D1D', '#B91C1C', '#166534', '#D4AF37', '#FAF7F0'] },
  { c: 'festival', name: 'Onam pookalam', colors: ['#F59E0B', '#EA580C', '#FDE68A', '#16A34A', '#FFF7E6'] },
  { c: 'nature', name: 'Forest floor', colors: ['#283618', '#606C38', '#DDA15E', '#BC6C25', '#FEFAE0'] },
  { c: 'nature', name: 'Ocean reef', colors: ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'] },
  { c: 'nature', name: 'Desert bloom', colors: ['#9B2226', '#CA6702', '#EE9B00', '#E9D8A6', '#94D2BD'] },
  { c: 'gradient', name: 'Sunrise', colors: ['#FF5F6D', '#FF9966', '#FFC371'] },
  { c: 'gradient', name: 'Aurora', colors: ['#00C9A7', '#4D8AF0', '#8E5CF7'] },
  { c: 'gradient', name: 'Peach to lilac', colors: ['#FFB199', '#FF8E9E', '#C79BFF'] },
  { c: 'gradient', name: 'Deep sea', colors: ['#0F2027', '#203A43', '#2C5364'] },
  { c: 'skin', name: 'Light shades', colors: ['#FBE3D4', '#F5D0B5', '#EDBB99', '#E3A982', '#D9966E'] },
  { c: 'skin', name: 'Medium shades', colors: ['#D49A6A', '#C68650', '#B57440', '#A0643A', '#8D5524'] },
  { c: 'skin', name: 'Deep shades', colors: ['#7A4A2A', '#6B3E22', '#5A321B', '#4A2914', '#3B200F'] },
];

// ---------------------------------------------------------------- contrast
/** WCAG grades for text on a background. */
export function contrastGrades(fg: string, bg: string) {
  const r = contrast(fg, bg);
  return { ratio: r, aaNormal: r >= 4.5, aaLarge: r >= 3, aaaNormal: r >= 7, aaaLarge: r >= 4.5 };
}

// ---------------------------------------------------------------- gradients
export interface GradientStop { color: string; at: number } // at 0–100
export function gradientCss(stops: GradientStop[], angle: number, kind: 'linear' | 'radial' = 'linear'): string {
  const s = [...stops].sort((a, b) => a.at - b.at).map((x) => `${x.color} ${Math.round(x.at)}%`).join(', ');
  return kind === 'radial' ? `radial-gradient(circle, ${s})` : `linear-gradient(${Math.round(angle)}deg, ${s})`;
}
export function gradientSvg(stops: GradientStop[], angle: number, w: number, h: number, kind: 'linear' | 'radial' = 'linear'): string {
  const st = [...stops].sort((a, b) => a.at - b.at).map((x) => `<stop offset="${x.at}%" stop-color="${x.color}"/>`).join('');
  // CSS angle: 0deg = to top, clockwise.
  const a = ((angle - 90) * Math.PI) / 180, cx = 0.5, cy = 0.5;
  const dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
  const def = kind === 'radial'
    ? `<radialGradient id="g" cx="50%" cy="50%" r="70%">${st}</radialGradient>`
    : `<linearGradient id="g" x1="${(cx - dx).toFixed(4)}" y1="${(cy - dy).toFixed(4)}" x2="${(cx + dx).toFixed(4)}" y2="${(cy + dy).toFixed(4)}">${st}</linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${def}</defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
}

// ---------------------------------------------------------------- export
export function paletteCss(colors: string[], name = 'palette'): string {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'palette';
  return `:root {\n${colors.map((c, i) => `  --${key}-${i + 1}: ${c};`).join('\n')}\n}\n`;
}
export function paletteJson(colors: string[], name = 'Palette'): string {
  return JSON.stringify({ name, colors: colors.map((hex) => { const rgb = hexToRgb(hex); return { hex, rgb, cmyk: rgbToCmyk(rgb), hsl: rgbToHsl(rgb).map((v) => Math.round(v)) }; }) }, null, 2);
}
/** GIMP / Inkscape / Krita palette (.gpl). */
export function paletteGpl(colors: string[], name = 'Palette'): string {
  return `GIMP Palette\nName: ${name}\nColumns: ${colors.length}\n#\n${colors.map((c) => { const [r, g, b] = hexToRgb(c); return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${c}`; }).join('\n')}\n`;
}
/** Adobe Swatch Exchange (.ase) for Illustrator, Photoshop and InDesign. */
export function paletteAse(colors: string[], name = 'Palette'): Uint8Array {
  const parts: number[] = [];
  const u16 = (n: number) => parts.push((n >> 8) & 255, n & 255);
  const u32 = (n: number) => parts.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  const f32 = (f: number) => { const b = new DataView(new ArrayBuffer(4)); b.setFloat32(0, f); for (let i = 0; i < 4; i++) parts.push(b.getUint8(i)); };
  const str = (s: string) => { const t = s + '\0'; u16(t.length); for (const ch of t) u16(ch.charCodeAt(0)); };
  const strLen = (s: string) => 2 + (s.length + 1) * 2;
  parts.push(0x41, 0x53, 0x45, 0x46); u16(1); u16(0); u32(colors.length + 2);
  u16(0xc001); u32(strLen(name)); str(name); // group start
  for (const c of colors) {
    const [r, g, b] = hexToRgb(c);
    u16(0x0001); u32(strLen(c) + 4 + 12 + 2);
    str(c); parts.push(0x52, 0x47, 0x42, 0x20); f32(r / 255); f32(g / 255); f32(b / 255); u16(2); // 2 = normal
  }
  u16(0xc002); u32(0); // group end
  return new Uint8Array(parts);
}

// ---------------------------------------------------------------- wheel
/** Point on a colour wheel (radius 1, hue 0 at the top, clockwise) ↔ hue and saturation. */
export function wheelToHs(x: number, y: number): { h: number; s: number } {
  const h = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  return { h, s: Math.min(1, Math.hypot(x, y)) * 100 };
}
export function hsToWheel(h: number, s: number): { x: number; y: number } {
  const a = (h * Math.PI) / 180, r = Math.min(100, s) / 100;
  return { x: Math.sin(a) * r, y: -Math.cos(a) * r };
}

// ---------------------------------------------------------------- generator

export type GenMode = 'auto' | 'analogous' | 'complementary' | 'triadic' | 'monochrome' | 'pastel' | 'vibrant' | 'earthy' | 'dark';
export const GEN_MODES: { id: GenMode; label: string }[] = [
  { id: 'auto', label: 'Smart mix' }, { id: 'analogous', label: 'Analogous' }, { id: 'complementary', label: 'Complementary' },
  { id: 'triadic', label: 'Triadic' }, { id: 'monochrome', label: 'Monochrome' }, { id: 'pastel', label: 'Pastel' },
  { id: 'vibrant', label: 'Vibrant' }, { id: 'earthy', label: 'Earthy' }, { id: 'dark', label: 'Dark mode' },
];

function rnd(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

/**
 * A balanced palette (dark → light) for a mode. Locked entries stay as they
 * are and steer the hue; the rest are generated around them.
 */
export function generatePalette(mode: GenMode, locked: (string | null)[], seed: number, count = 5): string[] {
  const R = rnd(seed);
  const anchor = locked.find(Boolean);
  const h0 = anchor ? rgbToHsl(hexToRgb(anchor))[0] : Math.floor(R() * 360);
  const pickMode = mode === 'auto' ? (['analogous', 'complementary', 'triadic', 'split'] as const)[Math.floor(R() * 4)] : mode;
  const hues: number[] = [];
  for (let i = 0; i < count; i++) {
    let h = h0;
    if (pickMode === 'analogous' || mode === 'earthy') h = h0 + (i - 2) * (18 + R() * 10);
    else if (pickMode === 'complementary') h = i % 2 ? h0 + 180 + (R() - 0.5) * 20 : h0 + (R() - 0.5) * 20;
    else if (pickMode === 'triadic') h = h0 + (i % 3) * 120 + (R() - 0.5) * 12;
    else if (pickMode === 'split') h = h0 + [0, 150, 210, 0, 180][i % 5] + (R() - 0.5) * 10;
    else if (pickMode === 'monochrome') h = h0 + (R() - 0.5) * 8;
    else h = h0 + (i - 2) * (25 + R() * 25);
    hues.push(((h % 360) + 360) % 360);
  }
  const L = mode === 'dark' ? [8, 14, 24, 55, 78] : mode === 'pastel' ? [62, 74, 82, 89, 95] : [16 + R() * 6, 34 + R() * 8, 52 + R() * 8, 72 + R() * 8, 92 + R() * 4];
  const S = (i: number) => mode === 'pastel' ? 45 + R() * 25 : mode === 'vibrant' ? 78 + R() * 20 : mode === 'earthy' ? 22 + R() * 25 : mode === 'monochrome' ? 35 + R() * 30 : mode === 'dark' ? (i < 3 ? 18 + R() * 15 : 70 + R() * 25) : (i === 0 || i === 4 ? 20 + R() * 25 : 50 + R() * 35);
  const earthyHue = (h: number) => (mode === 'earthy' ? 20 + ((h - 20 + 360) % 360) * 0.18 : h);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(locked[i] || hsl(earthyHue(hues[i]), Math.round(S(i)), Math.round(L[Math.min(i, L.length - 1)])));
  return out;
}

const NAMES: [string, string][] = [
  ['Black', '#000000'], ['Charcoal', '#36454F'], ['Graphite', '#474A51'], ['Slate', '#708090'], ['Silver', '#C0C0C0'], ['Snow', '#FFFAFA'], ['White', '#FFFFFF'], ['Ivory', '#FFFFF0'], ['Cream', '#FFFDD0'], ['Beige', '#F5F5DC'],
  ['Sand', '#C2B280'], ['Tan', '#D2B48C'], ['Camel', '#C19A6B'], ['Coffee', '#6F4E37'], ['Chocolate', '#7B3F00'], ['Brown', '#964B00'], ['Rust', '#B7410E'], ['Terracotta', '#E2725B'], ['Burnt orange', '#CC5500'], ['Orange', '#FF8C00'],
  ['Peach', '#FFCBA4'], ['Apricot', '#FBCEB1'], ['Coral', '#FF7F50'], ['Salmon', '#FA8072'], ['Tomato', '#FF6347'], ['Red', '#E0201B'], ['Crimson', '#DC143C'], ['Ruby', '#9B111E'], ['Maroon', '#800000'], ['Burgundy', '#800020'],
  ['Wine', '#722F37'], ['Rose', '#FF66CC'], ['Pink', '#FFC0CB'], ['Blush', '#DE5D83'], ['Hot pink', '#FF69B4'], ['Magenta', '#FF00FF'], ['Fuchsia', '#C154C1'], ['Plum', '#8E4585'], ['Mauve', '#E0B0FF'], ['Lavender', '#B57EDC'],
  ['Lilac', '#C8A2C8'], ['Violet', '#7F00FF'], ['Purple', '#6A0DAD'], ['Indigo', '#4B0082'], ['Navy', '#000080'], ['Dark navy', '#0B2545'], ['Ink blue', '#13315C'], ['Oxford blue', '#002147'], ['Prussian blue', '#003153'], ['Midnight', '#191970'], ['Royal blue', '#4169E1'], ['Cobalt', '#0047AB'], ['Blue', '#1F6FEB'], ['Azure', '#007FFF'],
  ['Sky', '#87CEEB'], ['Baby blue', '#89CFF0'], ['Steel blue', '#4682B4'], ['Denim', '#1560BD'], ['Teal', '#008080'], ['Turquoise', '#40E0D0'], ['Aqua', '#00FFFF'], ['Mint', '#98FF98'], ['Seafoam', '#93E9BE'], ['Jade', '#00A86B'],
  ['Emerald', '#50C878'], ['Green', '#228B22'], ['Forest', '#014421'], ['Olive', '#808000'], ['Moss', '#8A9A5B'], ['Sage', '#B2AC88'], ['Lime', '#BFFF00'], ['Chartreuse', '#7FFF00'], ['Pistachio', '#93C572'], ['Khaki', '#C3B091'],
  ['Mustard', '#FFDB58'], ['Gold', '#D4AF37'], ['Yellow', '#FFD500'], ['Lemon', '#FFF44F'], ['Butter', '#FFFAA0'], ['Amber', '#FFBF00'], ['Honey', '#EBA937'], ['Bronze', '#CD7F32'], ['Copper', '#B87333'], ['Champagne', '#F7E7CE'],
];
/** Nearest everyday name for a colour ("Teal", "Coral"…). */
export function colourName(hex: string): string {
  let best = NAMES[0][0], d = Infinity;
  for (const [n, h] of NAMES) { const e = deltaE(hex, h); if (e < d) { d = e; best = n; } }
  return best;
}

/** Main colours of an image (k-means on its pixels), dark → light. */
export function extractPalette(pixels: Uint8ClampedArray, k = 5): string[] {
  const pts: RGB[] = [];
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200) pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  if (!pts.length) return [];
  let cs: RGB[] = Array.from({ length: k }, (_, i) => pts[Math.floor(((i + 0.5) / k) * pts.length)]);
  // Spread the starting centres by brightness.
  const byL = [...pts].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  cs = Array.from({ length: k }, (_, i) => byL[Math.floor(((i + 0.5) / k) * byL.length)]);
  for (let it = 0; it < 10; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      for (let j = 0; j < cs.length; j++) { const c = cs[j]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = j; } }
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    cs = cs.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] as RGB : c));
  }
  return [...new Set(cs.map(rgbToHex))].sort((a, b) => luminance(a) - luminance(b));
}

/** Roles for previews: darkest, lightest, the two most colourful, and the rest. */
export function paletteRoles(cols: string[]): { dark: string; light: string; primary: string; accent: string; mid: string } {
  const by = [...cols].sort((a, b) => luminance(a) - luminance(b));
  const dark = by[0], light = by[by.length - 1];
  const sat = (h: string) => { const [, s, l] = rgbToHsl(hexToRgb(h)); return s * (1 - Math.abs(l - 50) / 60); };
  const rest = cols.filter((c) => c !== dark && c !== light).sort((a, b) => sat(b) - sat(a));
  return { dark, light, primary: rest[0] || dark, accent: rest[1] || rest[0] || light, mid: rest[2] || rest[1] || dark };
}
