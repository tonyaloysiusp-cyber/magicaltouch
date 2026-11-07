// Professional text effects, drawn in layers ("passes") so text stays live
// and editable: 3D block, retro stripes, gold, chrome, holographic, glass,
// fire, ice, neon tube, candy, comic, sticker, splice and vintage.
// One engine for the design editor (Fabric text) and Photo Studio (canvas):
// each host draws its own glyphs for every pass with the paint given here.

export type PremiumLook =
  | 'block3d' | 'retro' | 'vintage' | 'gold' | 'chrome' | 'holo' | 'glass' | 'fire' | 'ice' | 'neontube' | 'candy' | 'comic' | 'sticker' | 'splice';

export interface Gradient { stops: [number, string][]; dir: 'v' | 'd' | 'h' }
export type Paint = string | Gradient;

export interface Pass {
  dx: number; dy: number; // offset in px
  fill?: Paint | null; // glyph fill
  stroke?: Paint | null; // glyph outline
  lineWidth?: number; // outline width (centred on the edge)
  shadow?: { color: string; blur: number; dx?: number; dy?: number } | null;
  alpha?: number;
}

export const PREMIUM_LOOKS: { id: PremiumLook; label: string; usesColor: boolean; dark?: boolean; defaultColor: string }[] = [
  { id: 'block3d', label: '3D Block', usesColor: true, defaultColor: '#3B82F6' },
  { id: 'retro', label: 'Retro', usesColor: false, defaultColor: '#FFD23F' },
  { id: 'vintage', label: 'Vintage', usesColor: false, defaultColor: '#F6E7C8' },
  { id: 'gold', label: 'Gold', usesColor: false, dark: true, defaultColor: '#F7D774' },
  { id: 'chrome', label: 'Chrome', usesColor: false, defaultColor: '#D7DCE4' },
  { id: 'holo', label: 'Holographic', usesColor: false, defaultColor: '#C6A0FF' },
  { id: 'glass', label: 'Glass', usesColor: true, dark: true, defaultColor: '#7DD3FC' },
  { id: 'fire', label: 'Fire', usesColor: false, dark: true, defaultColor: '#FF7A00' },
  { id: 'ice', label: 'Ice', usesColor: false, defaultColor: '#5BC0EB' },
  { id: 'neontube', label: 'Neon tube', usesColor: true, dark: true, defaultColor: '#FF4FD8' },
  { id: 'candy', label: 'Bubble', usesColor: true, defaultColor: '#FF5FA2' },
  { id: 'comic', label: 'Comic', usesColor: false, defaultColor: '#FFD400' },
  { id: 'sticker', label: 'Sticker', usesColor: true, defaultColor: '#7C3AED' },
  { id: 'splice', label: 'Splice', usesColor: true, defaultColor: '#22D3EE' },
];
export const isPremium = (id: string | null | undefined): id is PremiumLook => !!id && PREMIUM_LOOKS.some((l) => l.id === id);

// ---- colour helpers
const hex = (c: string) => {
  const h = (c || '#000').replace('#', '');
  const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (c: string, k: number) => { const [r, g, b] = hex(c); return k >= 0 ? toHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : toHex(r * (1 + k), g * (1 + k), b * (1 + k)); };
export const rgba = (c: string, a: number) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const gloss: Gradient = { dir: 'v', stops: [[0, 'rgba(255,255,255,0.75)'], [0.45, 'rgba(255,255,255,0.12)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']] };

/** How far the effect reaches outside the letters (so nothing is cut off). */
export function premiumExtent(look: PremiumLook, size: number) {
  const u = size / 50;
  const depth: Record<string, number> = { block3d: size * 0.12, retro: u * 9, vintage: u * 7.5, comic: u * 5, splice: u * 3.5, sticker: u * 2 };
  const glow: Record<string, number> = { neontube: u * 16, fire: u * 12, holo: u * 7, ice: u * 6, gold: u * 4, chrome: u * 4, glass: u * 4, sticker: u * 6, candy: u * 5, block3d: u * 3, comic: u * 4 };
  return { depth: depth[look] || 0, glow: (glow[look] || 0) + u * 4 };
}

/** The passes for a look, back to front. `size` = font size in px. */
export function premiumPasses(look: PremiumLook, color: string, size: number): Pass[] {
  const u = size / 50; // 1u = 2% of the font size
  const P: Pass[] = [];
  switch (look) {
    case 'block3d': {
      const n = Math.max(4, Math.min(40, Math.round(size * 0.12)));
      const side = shade(color, -0.45);
      P.push({ dx: n, dy: n, fill: 'rgba(0,0,0,0.35)', shadow: { color: 'rgba(0,0,0,0.35)', blur: u * 6 } });
      for (let i = n; i >= 1; i--) P.push({ dx: i, dy: i, fill: i === n ? shade(color, -0.6) : side, stroke: side, lineWidth: 1 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, shade(color, 0.45)], [0.55, color], [1, shade(color, -0.15)]] }, stroke: shade(color, -0.35), lineWidth: u * 0.8 });
      P.push({ dx: 0, dy: 0, fill: gloss, alpha: 0.5 });
      break;
    }
    case 'retro': {
      const layers = ['#1B998B', '#E84855', '#FF9B42'];
      layers.forEach((c, i) => P.push({ dx: (3 - i) * u * 3, dy: (3 - i) * u * 3, fill: c, stroke: '#1A1A2E', lineWidth: u * 1.6 }));
      P.push({ dx: 0, dy: 0, fill: '#FFD23F', stroke: '#1A1A2E', lineWidth: u * 1.6 });
      P.push({ dx: -u * 0.6, dy: -u * 0.6, fill: null, stroke: 'rgba(255,255,255,0.65)', lineWidth: u * 0.5 });
      break;
    }
    case 'vintage': {
      ['#29335C', '#DB2B39', '#F3A712'].forEach((c, i) => P.push({ dx: (3 - i) * u * 2.5, dy: (3 - i) * u * 2.5, fill: c, stroke: '#2B2B2B', lineWidth: u * 1.2 }));
      P.push({ dx: 0, dy: 0, fill: '#F6E7C8', stroke: '#2B2B2B', lineWidth: u * 1.2 });
      break;
    }
    case 'gold': {
      P.push({ dx: 0, dy: u * 2, fill: '#2B1A05', shadow: { color: 'rgba(0,0,0,0.55)', blur: u * 4, dy: u * 2 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: { dir: 'v', stops: [[0, '#8A5A12'], [1, '#3D2606']] }, lineWidth: u * 3 });
      P.push({ dx: -u * 0.5, dy: -u * 0.7, fill: '#FFF7D1' });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, '#FFF3B0'], [0.22, '#F7D774'], [0.48, '#C08A25'], [0.52, '#E9B949'], [0.7, '#FCE59A'], [1, '#9A6614']] } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: 'rgba(255,248,214,0.85)', lineWidth: u * 0.45 });
      break;
    }
    case 'chrome': {
      P.push({ dx: 0, dy: u * 2, fill: 'rgba(0,0,0,0.45)', shadow: { color: 'rgba(0,0,0,0.45)', blur: u * 4, dy: u * 2 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: { dir: 'v', stops: [[0, '#F5F7FA'], [0.5, '#1F2937'], [1, '#9AA3B2']] }, lineWidth: u * 3.2 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, '#FFFFFF'], [0.3, '#D7DCE4'], [0.48, '#4B5563'], [0.52, '#C9D6E8'], [0.75, '#8C96A6'], [1, '#F2F5F9']] } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: 'rgba(255,255,255,0.9)', lineWidth: u * 0.45 });
      break;
    }
    case 'holo': {
      P.push({ dx: 0, dy: 0, fill: '#C6A0FF', shadow: { color: 'rgba(198,160,255,0.85)', blur: u * 7 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#FFFFFF', lineWidth: u * 2.4 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'd', stops: [[0, '#FF9AD5'], [0.25, '#C6A0FF'], [0.5, '#8FD3FF'], [0.75, '#9CFFD9'], [1, '#FFF59A']] } });
      P.push({ dx: 0, dy: 0, fill: gloss, alpha: 0.7 });
      break;
    }
    case 'glass': {
      P.push({ dx: 0, dy: u * 2, fill: 'rgba(0,0,0,0.18)', shadow: { color: 'rgba(0,0,0,0.25)', blur: u * 4, dy: u * 2 } });
      P.push({ dx: 0, dy: 0, fill: rgba(color, 0.28) });
      P.push({ dx: 0, dy: 0, fill: gloss, alpha: 0.9 });
      P.push({ dx: 0, dy: 0, fill: null, stroke: 'rgba(255,255,255,0.95)', lineWidth: u * 1.1 });
      P.push({ dx: u * 0.6, dy: u * 0.8, fill: null, stroke: rgba(shade(color, -0.4), 0.55), lineWidth: u * 0.6 });
      break;
    }
    case 'fire': {
      P.push({ dx: 0, dy: 0, fill: '#FF5A00', shadow: { color: 'rgba(255,80,0,0.95)', blur: u * 12 } });
      P.push({ dx: 0, dy: 0, fill: '#FFB000', shadow: { color: 'rgba(255,190,0,0.9)', blur: u * 4 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#5A0E00', lineWidth: u * 1.4 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, '#FFF8B0'], [0.35, '#FFD000'], [0.7, '#FF7A00'], [1, '#D62600']] } });
      break;
    }
    case 'ice': {
      P.push({ dx: 0, dy: 0, fill: '#8FE3FF', shadow: { color: 'rgba(143,227,255,0.9)', blur: u * 6 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#1B6CA8', lineWidth: u * 2.2 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, '#FFFFFF'], [0.35, '#CFF4FF'], [0.6, '#5BC0EB'], [1, '#E8FBFF']] } });
      P.push({ dx: 0, dy: 0, fill: gloss, alpha: 0.8 });
      break;
    }
    case 'neontube': {
      P.push({ dx: 0, dy: 0, fill: null, stroke: color, lineWidth: u * 3.4, shadow: { color, blur: u * 16 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: color, lineWidth: u * 2.6, shadow: { color, blur: u * 6 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: shade(color, 0.75), lineWidth: u * 1.1 });
      break;
    }
    case 'candy': {
      P.push({ dx: 0, dy: u * 2.5, fill: null, stroke: shade(color, -0.65), lineWidth: u * 8, shadow: { color: 'rgba(0,0,0,0.3)', blur: u * 4, dy: u * 2 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#FFFFFF', lineWidth: u * 5.5 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, shade(color, 0.45)], [0.55, color], [1, shade(color, -0.25)]] } });
      P.push({ dx: 0, dy: 0, fill: gloss, alpha: 0.95 });
      break;
    }
    case 'comic': {
      P.push({ dx: u * 5, dy: u * 5, fill: '#1A1A1A', stroke: '#1A1A1A', lineWidth: u * 6 });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#1A1A1A', lineWidth: u * 6 });
      P.push({ dx: 0, dy: 0, fill: { dir: 'v', stops: [[0, '#FFF35C'], [0.6, '#FFD400'], [1, '#FF8A00']] } });
      P.push({ dx: -u * 0.8, dy: -u * 0.8, fill: null, stroke: 'rgba(255,255,255,0.85)', lineWidth: u * 0.7 });
      break;
    }
    case 'sticker': {
      P.push({ dx: 0, dy: u * 2, fill: null, stroke: '#FFFFFF', lineWidth: u * 9, shadow: { color: 'rgba(0,0,0,0.35)', blur: u * 6, dy: u * 2 } });
      P.push({ dx: 0, dy: 0, fill: null, stroke: '#FFFFFF', lineWidth: u * 9 });
      P.push({ dx: 0, dy: 0, fill: color });
      break;
    }
    case 'splice': {
      P.push({ dx: u * 3.5, dy: u * 3.5, fill: color });
      P.push({ dx: 0, dy: 0, fill: null, stroke: shade(color, -0.7), lineWidth: u * 1.4 });
      break;
    }
  }
  return P;
}

/** A canvas gradient for a paint over the box (x, y, w, h). */
export function canvasPaint(ctx: CanvasRenderingContext2D, p: Paint, x: number, y: number, w: number, h: number): string | CanvasGradient {
  if (typeof p === 'string') return p;
  const g = p.dir === 'h' ? ctx.createLinearGradient(x, y, x + w, y) : p.dir === 'd' ? ctx.createLinearGradient(x, y, x + w, y + h) : ctx.createLinearGradient(x, y, x, y + h);
  p.stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

/**
 * Draws a look on a plain canvas. `glyphs(mode)` draws every line of text
 * with ctx.fillText (mode 'fill') or ctx.strokeText (mode 'stroke') at the
 * text's position; (x, y, w, h) is the text box used for gradients.
 */
export function paintPremium(ctx: CanvasRenderingContext2D, look: PremiumLook, color: string, size: number, box: { x: number; y: number; w: number; h: number }, glyphs: (mode: 'fill' | 'stroke') => void) {
  for (const p of premiumPasses(look, color, size)) {
    ctx.save();
    ctx.translate(p.dx, p.dy);
    ctx.globalAlpha *= p.alpha ?? 1;
    if (p.shadow) { ctx.shadowColor = p.shadow.color; ctx.shadowBlur = p.shadow.blur; ctx.shadowOffsetX = p.shadow.dx || 0; ctx.shadowOffsetY = p.shadow.dy || 0; } else { ctx.shadowColor = 'transparent'; }
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (p.stroke && p.lineWidth) { ctx.strokeStyle = canvasPaint(ctx, p.stroke, box.x, box.y, box.w, box.h); ctx.lineWidth = p.lineWidth; glyphs('stroke'); if (p.fill) ctx.shadowColor = 'transparent'; }
    if (p.fill) { ctx.fillStyle = canvasPaint(ctx, p.fill, box.x, box.y, box.w, box.h); glyphs('fill'); }
    ctx.restore();
  }
}

/** Small preview of a look (for effect pickers). */
export function drawLookPreview(c: HTMLCanvasElement, look: PremiumLook, color: string, font = '800 34px Montserrat, system-ui, sans-serif', text = 'Ag') {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  const def = PREMIUM_LOOKS.find((l) => l.id === look);
  if (def?.dark) { ctx.fillStyle = '#111322'; ctx.fillRect(0, 0, c.width, c.height); }
  const size = Math.round(c.height * 0.52);
  ctx.font = font.replace(/\d+px/, `${size}px`);
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const { depth } = premiumExtent(look, size);
  const x = (c.width - w - depth) / 2, y = c.height / 2 - depth / 2;
  paintPremium(ctx, look, color, size, { x, y: y - size / 2, w, h: size }, (m) => (m === 'fill' ? ctx.fillText(text, x, y) : ctx.strokeText(text, x, y)));
}
