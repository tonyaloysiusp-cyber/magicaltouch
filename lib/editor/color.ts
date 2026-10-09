// Colour conversions for the colour picker (pure functions).

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function hexToRgb(hex: string): RGB | null {
  let h = (hex || '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsv({ r, g, b }: RGB) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsl({ r, g, b }: RGB) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const { h } = rgbToHsv({ r, g, b });
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  const H = ((h % 360) + 360) % 360;
  if (H < 60) [r, g, b] = [c, x, 0];
  else if (H < 120) [r, g, b] = [x, c, 0];
  else if (H < 180) [r, g, b] = [0, c, x];
  else if (H < 240) [r, g, b] = [0, x, c];
  else if (H < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

// Device-independent CMYK (the common naive conversion; printers apply
// their own colour profile on top of this).
export function rgbToCmyk({ r, g, b }: RGB) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const k = 1 - Math.max(R, G, B);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - R - k) / (1 - k)) * 100),
    m: Math.round(((1 - G - k) / (1 - k)) * 100),
    y: Math.round(((1 - B - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): RGB {
  const K = clamp(k, 0, 100) / 100;
  return {
    r: 255 * (1 - clamp(c, 0, 100) / 100) * (1 - K),
    g: 255 * (1 - clamp(m, 0, 100) / 100) * (1 - K),
    b: 255 * (1 - clamp(y, 0, 100) / 100) * (1 - K),
  };
}

// Any CSS colour Fabric may hand back (#hex, rgb(), rgba()) → #RRGGBB.
export function normalizeColor(c: any): string | null {
  if (!c || typeof c !== 'string') return null;
  if (c.startsWith('#')) {
    const rgb = hexToRgb(c);
    return rgb ? rgbToHex(rgb) : null;
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return rgbToHex({ r, g, b });
  }
  return null;
}

// Relative luminance contrast ratio (WCAG).
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
    const ch = [rgb.r, rgb.g, rgb.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Pleasant palettes from one colour (for "suggested colours").
export function suggestPalette(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const { h, s, l } = rgbToHsl(rgb);
  const mk = (hh: number, ss: number, ll: number) => rgbToHex(hslToRgb((hh + 360) % 360, clamp(ss, 0, 100), clamp(ll, 0, 100)));
  return [mk(h, s, l), mk(h, s * 0.6, Math.min(94, l + 30)), mk(h + 30, s, l), mk(h - 30, s, l), mk(h + 180, s * 0.8, l), mk(h, s * 0.4, 14)];
}

const RECENT_KEY = 'mt:recentColors';
export function readRecentColors(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.slice(0, 12) : [];
  } catch {
    return [];
  }
}
export function rememberColor(hex: string) {
  try {
    const list = [hex, ...readRecentColors().filter((c) => c.toUpperCase() !== hex.toUpperCase())].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode: recent colours just aren't remembered.
  }
}

// Colours already used in the design (fills, strokes, text, gradients).
export function documentColors(canvas: any): string[] {
  const seen = new Map<string, number>();
  const add = (c: any) => {
    const n = normalizeColor(c);
    if (n) seen.set(n, (seen.get(n) || 0) + 1);
  };
  const visit = (o: any) => {
    if (!o || o.__isGuide) return;
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach(visit);
    if (typeof o.fill === 'string') add(o.fill);
    else if (o.fill && o.fill.colorStops) o.fill.colorStops.forEach((s: any) => add(s.color));
    if (typeof o.stroke === 'string') add(o.stroke);
  };
  canvas?.getObjects?.().forEach(visit);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 16);
}

// Any CSS colour → its #RRGGBB part and its opacity (0..1).
export function parseColorAlpha(c: any): { hex: string; alpha: number } {
  if (typeof c !== 'string' || !c) return { hex: '#000000', alpha: 1 };
  const s = c.trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 4) h = h.split('').map((x) => x + x).join('');
    const rgb = hexToRgb('#' + h.slice(0, 6));
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { hex: rgb ? rgbToHex(rgb) : '#000000', alpha: Number.isFinite(a) ? a : 1 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map((x) => parseFloat(x));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return { hex: rgbToHex({ r, g, b }), alpha: clamp(Number.isFinite(a) ? a : 1, 0, 1) };
  }
  return { hex: normalizeColor(s) || '#000000', alpha: 1 };
}

// #RRGGBB plus an opacity → the simplest CSS colour for it.
export function withAlpha(hex: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  if (a >= 0.999) return hex.toUpperCase();
  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${Math.round(a * 1000) / 1000})`;
}
