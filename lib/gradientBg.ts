// Gradient Background Generator — soft "mesh" gradients made of colour
// spots over a base colour, with optional film grain. The same model gives
// CSS (for websites) and SVG (vector, for print and the editor).

export interface Spot { x: number; y: number; r: number; color: string } // x, y, r in % of the canvas
export interface GradientBg { base: string; spots: Spot[]; grain: number } // grain 0–100

export const GRADIENT_PRESETS: { id: string; label: string; g: GradientBg }[] = [
  { id: 'aurora', label: 'Aurora', g: { base: '#0B1026', grain: 12, spots: [{ x: 15, y: 20, r: 60, color: '#22D3EE' }, { x: 80, y: 15, r: 55, color: '#A78BFA' }, { x: 60, y: 85, r: 65, color: '#34D399' }, { x: 10, y: 90, r: 45, color: '#1E40AF' }] } },
  { id: 'sunset', label: 'Sunset', g: { base: '#FDE68A', grain: 8, spots: [{ x: 10, y: 10, r: 60, color: '#FB7185' }, { x: 90, y: 20, r: 55, color: '#F97316' }, { x: 50, y: 95, r: 70, color: '#C026D3' }] } },
  { id: 'spectrum', label: 'Magical spectrum', g: { base: '#FFFFFF', grain: 6, spots: [{ x: 5, y: 15, r: 55, color: '#F2708F' }, { x: 40, y: 0, r: 50, color: '#A69BD3' }, { x: 75, y: 30, r: 55, color: '#35C2F1' }, { x: 30, y: 90, r: 55, color: '#5DCCB8' }, { x: 95, y: 90, r: 50, color: '#8CC84B' }] } },
  { id: 'pastel', label: 'Pastel dream', g: { base: '#FFF7ED', grain: 4, spots: [{ x: 20, y: 25, r: 55, color: '#FBCFE8' }, { x: 80, y: 20, r: 50, color: '#BFDBFE' }, { x: 50, y: 85, r: 60, color: '#DDD6FE' }] } },
  { id: 'ocean', label: 'Deep ocean', g: { base: '#020617', grain: 10, spots: [{ x: 20, y: 80, r: 70, color: '#0EA5E9' }, { x: 85, y: 20, r: 60, color: '#1D4ED8' }, { x: 60, y: 60, r: 40, color: '#14B8A6' }] } },
  { id: 'peach', label: 'Peach fuzz', g: { base: '#FFEDD5', grain: 10, spots: [{ x: 15, y: 15, r: 60, color: '#FDBA74' }, { x: 85, y: 85, r: 60, color: '#FCA5A5' }, { x: 75, y: 15, r: 40, color: '#FEF3C7' }] } },
  { id: 'forest', label: 'Forest', g: { base: '#052E16', grain: 14, spots: [{ x: 20, y: 30, r: 60, color: '#15803D' }, { x: 80, y: 70, r: 60, color: '#65A30D' }, { x: 50, y: 0, r: 40, color: '#0F766E' }] } },
  { id: 'royal', label: 'Royal gold', g: { base: '#1E1B4B', grain: 12, spots: [{ x: 80, y: 20, r: 55, color: '#F59E0B' }, { x: 20, y: 80, r: 60, color: '#7C3AED' }, { x: 70, y: 90, r: 40, color: '#BE185D' }] } },
  { id: 'mint', label: 'Mint fresh', g: { base: '#F0FDFA', grain: 4, spots: [{ x: 10, y: 80, r: 60, color: '#99F6E4' }, { x: 90, y: 10, r: 55, color: '#A7F3D0' }, { x: 60, y: 50, r: 35, color: '#BAE6FD' }] } },
  { id: 'diwali', label: 'Festive glow', g: { base: '#450A0A', grain: 12, spots: [{ x: 50, y: 40, r: 55, color: '#F59E0B' }, { x: 10, y: 90, r: 50, color: '#DC2626' }, { x: 95, y: 85, r: 45, color: '#DB2777' }] } },
];

export const BG_SIZES: { label: string; w: number; h: number }[] = [
  { label: 'Desktop wallpaper · 1920 × 1080', w: 1920, h: 1080 },
  { label: '4K wallpaper · 3840 × 2160', w: 3840, h: 2160 },
  { label: 'Phone wallpaper · 1080 × 1920', w: 1080, h: 1920 },
  { label: 'Instagram post · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Instagram portrait · 1080 × 1350', w: 1080, h: 1350 },
  { label: 'YouTube thumbnail · 1280 × 720', w: 1280, h: 720 },
  { label: 'Presentation · 1920 × 1080', w: 1920, h: 1080 },
  { label: 'A4 print · 2480 × 3508', w: 2480, h: 3508 },
];

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '').padEnd(6, '0');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
};

export function gradientCss(g: GradientBg): string {
  const layers = g.spots.map((s) => `radial-gradient(circle at ${s.x}% ${s.y}%, ${s.color} 0%, ${hexA(s.color, 0)} ${s.r}%)`);
  return `background-color: ${g.base};\nbackground-image: ${layers.join(',\n  ')};`;
}

export function gradientStyle(g: GradientBg): Record<string, string> {
  return { backgroundColor: g.base, backgroundImage: g.spots.map((s) => `radial-gradient(circle at ${s.x}% ${s.y}%, ${s.color} 0%, ${hexA(s.color, 0)} ${s.r}%)`).join(', ') };
}

/** Vector SVG of the gradient (grain as an SVG noise filter). */
export function gradientSvg(g: GradientBg, w: number, h: number): string {
  const d = Math.hypot(w, h) / Math.SQRT2; // CSS "circle" radius % is of the diagonal / √2
  const defs = g.spots.map((s, i) => `<radialGradient id="s${i}" cx="${(s.x / 100) * w}" cy="${(s.y / 100) * h}" r="${((s.r / 100) * d).toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${s.color}"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></radialGradient>`).join('');
  const grain = g.grain > 0 ? `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>` : '';
  const rects = g.spots.map((_, i) => `<rect width="${w}" height="${h}" fill="url(#s${i})"/>`).join('');
  const noise = g.grain > 0 ? `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="${(g.grain / 100) * 0.6}" style="mix-blend-mode:overlay"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}${grain}</defs><rect width="${w}" height="${h}" fill="${g.base}"/>${rects}${noise}</svg>`;
}

/** A random pleasing gradient from a seed colour family. */
export function randomGradient(seed = Math.random()): GradientBg {
  let a = Math.floor(seed * 1e9) || 1;
  const R = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
  const hue = R() * 360;
  const hsl = (h: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12, f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  };
  const dark = R() > 0.5;
  const n = 3 + Math.floor(R() * 3);
  return {
    base: dark ? hsl(hue, 50, 8) : hsl(hue, 60, 96),
    grain: Math.round(R() * 14),
    spots: Array.from({ length: n }, (_, i) => ({ x: Math.round(R() * 100), y: Math.round(R() * 100), r: 40 + Math.round(R() * 30), color: hsl((hue + i * (40 + R() * 60)) % 360, 70 + R() * 25, dark ? 50 + R() * 15 : 70 + R() * 15) })),
  };
}
