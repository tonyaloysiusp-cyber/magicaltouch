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
