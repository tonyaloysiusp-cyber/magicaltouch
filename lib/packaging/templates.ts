// Packaging design templates: a design theme laid out on a real dieline.
// A template is described as a neutral scene (rectangles, text, circles,
// paths in millimetres on the flat blank). The same scene draws the gallery
// preview and mockup (SVG) and becomes editable objects in the design editor
// (lib/packaging/editorBridge.ts). All copy is placeholder text for the
// customer to replace — no real brands.

import { makeDieline, type BoxStyleId, type Dieline, type DiePanel } from './dieline.ts';

export type SceneItem =
  | { k: 'rect'; name: string; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; rx?: number; opacity?: number }
  | { k: 'circle'; name: string; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: 'path'; name: string; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: 'text'; name: string; x: number; y: number; w: number; text: string; size: number; font: string; weight?: number; italic?: boolean; fill: string; align?: 'left' | 'center' | 'right'; spacing?: number; rot?: number; lineHeight?: number };

export type Motif = 'leaves' | 'dots' | 'stripes' | 'waves' | 'grid' | 'stars' | 'sunburst' | 'diamonds' | 'none';
export interface Theme {
  id: string; name: string; brand: string; product: string; tagline: string; story: string; detail: string;
  bg: string; ink: string; accent: string; soft: string;
  display: string; body: string; displayWeight: number; caps?: boolean;
  motif: Motif; layout: 'centered' | 'band' | 'frame' | 'split';
}

export const THEMES: Theme[] = [
  { id: 'botanical-tea', name: 'Botanical tea', brand: 'VERDANT', product: 'Green Tea Blend', tagline: '20 pyramid bags', story: 'A calm blend of green tea leaves and garden herbs. Add your own story here.', detail: 'Net weight 40 g', bg: '#EEF2E6', ink: '#1F3B2C', accent: '#5B7F5A', soft: '#C9D8BF', display: 'Playfair Display', body: 'Montserrat', displayWeight: 600, caps: true, motif: 'leaves', layout: 'centered' },
  { id: 'luxe-cosmetics', name: 'Luxury cosmetics', brand: 'Aurelle', product: 'Night Renewal Serum', tagline: '30 ml · 1 fl oz', story: 'Describe the formula, the ritual and what makes it yours.', detail: 'Dermatologically tested', bg: '#111111', ink: '#F5EBD9', accent: '#C9A45C', soft: '#2A2622', display: 'Cormorant Garamond', body: 'Montserrat', displayWeight: 500, motif: 'none', layout: 'frame' },
  { id: 'kraft-coffee', name: 'Kraft coffee', brand: 'ROAST & CO.', product: 'House Espresso', tagline: 'Whole beans · 250 g', story: 'Notes of cocoa, caramel and toasted nuts. Roasted in small batches.', detail: 'Roast date: ________', bg: '#C9A57A', ink: '#2B1D12', accent: '#7A4A2A', soft: '#B48D60', display: 'Oswald', body: 'Lato', displayWeight: 600, caps: true, motif: 'diamonds', layout: 'band' },
  { id: 'kids-toys', name: 'Playful toys', brand: 'Pip & Pop', product: 'Building Blocks', tagline: 'Ages 3+ · 48 pieces', story: 'Build, stack and imagine. Tell parents what is inside the box.', detail: 'Contains small parts', bg: '#FFF4D6', ink: '#1E1B3A', accent: '#FF6B35', soft: '#4CC9F0', display: 'Fredoka', body: 'Poppins', displayWeight: 600, motif: 'dots', layout: 'split' },
  { id: 'tech-gadget', name: 'Tech gadget', brand: 'NOVA', product: 'Wireless Earbuds', tagline: '40 h battery · USB-C', story: 'List the features, what is in the box and the warranty.', detail: 'Model NV-01', bg: '#0F172A', ink: '#E2E8F0', accent: '#38BDF8', soft: '#1E293B', display: 'Montserrat', body: 'Inter', displayWeight: 700, caps: true, motif: 'grid', layout: 'split' },
  { id: 'sweet-bakery', name: 'Sweet bakery', brand: 'Sugar Lane', product: 'Butter Cookies', tagline: 'Baked fresh daily', story: 'Hand-made with real butter. Add ingredients and allergy notes here.', detail: 'Best before: ________', bg: '#FDE8EC', ink: '#5A2A3A', accent: '#E07A93', soft: '#FFFFFF', display: 'Pacifico', body: 'Poppins', displayWeight: 400, motif: 'stripes', layout: 'centered' },
  { id: 'candle', name: 'Soy candle', brand: 'Ember', product: 'Cedar & Amber', tagline: 'Soy wax · 45 h burn', story: 'Warm cedarwood with a touch of amber. Trim the wick before lighting.', detail: '200 g', bg: '#F4EDE4', ink: '#2B2118', accent: '#9C4A2E', soft: '#E9C46A', display: 'Playfair Display', body: 'Lato', displayWeight: 500, motif: 'sunburst', layout: 'frame' },
  { id: 'spice', name: 'Spice market', brand: 'MASALA HOUSE', product: 'Garam Masala', tagline: 'Hand-ground · 100 g', story: 'A warm blend of roasted spices. Add usage ideas and origin here.', detail: 'Store in a cool, dry place', bg: '#9C3D23', ink: '#FFF3E0', accent: '#F4A259', soft: '#7E2E18', display: 'Oswald', body: 'Lato', displayWeight: 600, caps: true, motif: 'diamonds', layout: 'band' },
  { id: 'skincare', name: 'Clean skincare', brand: 'pure.', product: 'Daily Moisturiser', tagline: 'For all skin types · 50 ml', story: 'Light, fragrance-free care for every day. Add key ingredients here.', detail: 'Vegan · cruelty free', bg: '#FFFFFF', ink: '#3E2C2E', accent: '#E8B4B8', soft: '#F8EDEE', display: 'Poppins', body: 'Poppins', displayWeight: 600, motif: 'waves', layout: 'split' },
  { id: 'wine-gift', name: 'Wine gift', brand: 'Château Rouge', product: 'Reserve Gift Box', tagline: 'A bottle to remember', story: 'A gift for a special occasion. Add the vintage and tasting notes here.', detail: '75 cl', bg: '#5A0F1F', ink: '#F6E7C8', accent: '#D4AF6A', soft: '#741A2C', display: 'Cormorant Garamond', body: 'Lato', displayWeight: 600, motif: 'stars', layout: 'frame' },
  { id: 'eco-reusable', name: 'Eco reusable', brand: 'refill', product: 'Reusable Bottle', tagline: 'Plastic-free packaging', story: 'This box is made to be kept and reused. Recycle it when you are done.', detail: 'Printed with water-based inks', bg: '#E3EFE3', ink: '#163A24', accent: '#2BB673', soft: '#BFE3C7', display: 'Poppins', body: 'Inter', displayWeight: 700, motif: 'leaves', layout: 'band' },
  { id: 'chocolate', name: 'Fine chocolate', brand: 'Cacao Noir', product: 'Dark Chocolate 72 %', tagline: 'Single origin', story: 'Bean-to-bar chocolate with notes of red fruit. Add the origin story here.', detail: 'Net weight 100 g', bg: '#3B2418', ink: '#F3E3C9', accent: '#C08A4B', soft: '#53342A', display: 'Playfair Display', body: 'Montserrat', displayWeight: 700, motif: 'waves', layout: 'centered' },
];

export interface PackTemplate { id: string; name: string; theme: Theme; style: BoxStyleId; L: number; W: number; D: number; t: number }
const STYLE_FOR: Record<string, [BoxStyleId, number, number, number][]> = {
  'botanical-tea': [['rte', 70, 70, 110], ['traylid', 160, 110, 50]],
  'luxe-cosmetics': [['rte', 45, 45, 120], ['traylid', 120, 120, 40], ['matchbox', 110, 70, 30]],
  'kraft-coffee': [['ste', 90, 60, 160], ['seal', 110, 70, 180], ['fol', 400, 300, 250]],
  'kids-toys': [['seal', 200, 80, 150], ['rsc', 300, 200, 150]],
  'tech-gadget': [['traylid', 110, 110, 40], ['rte', 90, 40, 120]],
  'sweet-bakery': [['tray', 180, 120, 50], ['rte', 120, 60, 120]],
  'candle': [['rte', 80, 80, 90], ['traylid', 100, 100, 100]],
  'spice': [['rte', 60, 40, 140], ['traylid', 140, 100, 45]],
  'skincare': [['rte', 55, 55, 110], ['ste', 50, 35, 150]],
  'wine-gift': [['rte', 95, 95, 340], ['traylid', 360, 120, 110]],
  'eco-reusable': [['rte', 80, 80, 240], ['hsc', 300, 220, 160]],
  'chocolate': [['matchbox', 160, 80, 20], ['rte', 160, 25, 85]],
};
export const PACK_TEMPLATES: PackTemplate[] = THEMES.flatMap((th) => (STYLE_FOR[th.id] || []).map(([style, L, W, D], i) => ({
  id: `${th.id}-${style}`, name: `${th.name} · ${style === 'matchbox' ? 'drawer box' : i === 0 ? 'box' : style === 'traylid' ? 'gift box' : style === 'sleeve' ? 'sleeve' : style.endsWith('sc') ? 'shipper' : style === 'tray' ? 'tray' : 'box'}`,
  theme: th, style, L, W, D, t: style === 'rsc' || style === 'hsc' || style === 'fol' ? 3 : style === 'traylid' || style === 'tray' || style === 'matchbox' ? 1.5 : 0.45,
})));

export function templateDieline(t: PackTemplate): Dieline {
  const corr = t.style === 'rsc' || t.style === 'hsc' || t.style === 'fol';
  return makeDieline({ style: t.style, L: t.L, W: t.W, D: t.D, t: t.t, glue: corr ? 30 : 14, tuck: 15, lidDepth: Math.min(t.D, 30) });
}

const isMain = (p: DiePanel) => p.name === 'Front' || p.name === 'Lid base' || (p.name === 'Tray front wall');
function motifItems(m: Motif, area: { x: number; y: number; w: number; h: number }, colour: string, name: string, scale = 1): SceneItem[] {
  const out: SceneItem[] = [];
  const s = 9 * scale, { x, y, w, h } = area;
  if (m === 'none' || w < 6 || h < 6) return out;
  if (m === 'dots') { const r = +(s * 0.18).toFixed(2); let d = ''; for (let yy = y + s / 2; yy < y + h; yy += s) for (let xx = x + s / 2 + ((Math.round((yy - y) / s) % 2) * s) / 2; xx < x + w; xx += s) d += `M${(xx - r).toFixed(1)} ${yy.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; out.push({ k: 'path', name, d, fill: colour }); }
  else if (m === 'stripes') { for (let xx = x; xx < x + w; xx += s) out.push({ k: 'rect', name, x: xx, y, w: Math.min(s / 2, x + w - xx), h, fill: colour }); }
  else if (m === 'grid') { let d = ''; for (let xx = x; xx <= x + w; xx += s) d += `M${xx} ${y} L${xx} ${y + h} `; for (let yy = y; yy <= y + h; yy += s) d += `M${x} ${yy} L${x + w} ${yy} `; out.push({ k: 'path', name, d, stroke: colour, sw: 0.25 }); }
  else if (m === 'diamonds') { let d = ''; for (let yy = y; yy < y + h; yy += s) for (let xx = x + ((Math.round((yy - y) / s) % 2) * s) / 2; xx < x + w; xx += s) d += `M${xx + s / 2} ${yy + s * 0.2} L${xx + s * 0.8} ${yy + s / 2} L${xx + s / 2} ${yy + s * 0.8} L${xx + s * 0.2} ${yy + s / 2} Z `; out.push({ k: 'path', name, d, fill: colour }); }
  else if (m === 'waves') { let d = ''; for (let yy = y + s / 2; yy < y + h; yy += s * 0.9) { d += `M${x} ${yy}`; for (let xx = x; xx < x + w; xx += s) d += ` Q${xx + s / 4} ${yy - s * 0.3} ${xx + s / 2} ${yy} T${xx + s} ${yy}`; d += ' '; } out.push({ k: 'path', name, d, stroke: colour, sw: 0.6 }); }
  else if (m === 'stars') { let d = ''; for (let yy = y + s / 2; yy < y + h; yy += s * 1.4) for (let xx = x + s / 2 + ((Math.round((yy - y) / (s * 1.4)) % 2) * s * 0.7); xx < x + w; xx += s * 1.4) { const r1 = s * 0.22, r2 = s * 0.09; for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? r2 : r1; d += `${i ? 'L' : 'M'}${(xx + r * Math.cos(a)).toFixed(2)} ${(yy + r * Math.sin(a)).toFixed(2)} `; } d += 'Z '; } out.push({ k: 'path', name, d, fill: colour }); }
  else if (m === 'leaves') { let d = ''; for (let yy = y + s / 2; yy < y + h; yy += s * 1.2) for (let xx = x + s / 2 + ((Math.round((yy - y) / (s * 1.2)) % 2) * s * 0.6); xx < x + w; xx += s * 1.2) { const l = s * 0.42; d += `M${xx - l} ${yy + l * 0.5} Q${xx - l * 0.2} ${yy - l} ${xx + l} ${yy - l * 0.5} Q${xx + l * 0.2} ${yy + l} ${xx - l} ${yy + l * 0.5} Z `; } out.push({ k: 'path', name, d, fill: colour }); }
  else if (m === 'sunburst') { const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h); let d = ''; for (let i = 0; i < 36; i += 2) { const a0 = (i * Math.PI) / 18, a1 = ((i + 1) * Math.PI) / 18; d += `M${cx} ${cy} L${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)} L${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)} Z `; } out.push({ k: 'path', name, d, fill: colour, opacity: 0.22 }); }
  return out;
}

/** The artwork for a template on its dieline (mm, blank origin), including the bleed. */
export function templateScene(t: PackTemplate, bleed = 3): SceneItem[] {
  const d = templateDieline(t), th = t.theme, out: SceneItem[] = [];
  out.push({ k: 'rect', name: 'Background', x: -bleed, y: -bleed, w: d.w + 2 * bleed, h: d.h + 2 * bleed, fill: th.bg });
  const faces = d.panels.filter((p) => p.face), flaps = d.panels.filter((p) => !p.face);
  const main = faces.find((p) => p.name === 'Front') || faces.find((p) => p.name === 'Lid base') || faces.find((p) => p.name === 'Sleeve top') || faces.find(isMain) || faces[0];
  const back = faces.find((p) => p.name === 'Back' || p.name === 'Sleeve bottom' || p.name === 'Tray back wall' || p.name === 'Lid back wall');
  const sides = faces.filter((p) => p.name === 'Side' || p.name === 'Sleeve side' || /end wall/.test(p.name));
  const motifC = th.layout === 'frame' ? th.accent : th.soft;
  // flaps and closures carry the pattern
  for (const p of flaps) out.push(...motifItems(th.motif, p, motifC, `Pattern · ${p.name}`, 0.8));
  // band layout: a colour band right across all faces
  if (th.layout === 'band' && faces.length) {
    const fx0 = Math.min(...faces.map((p) => p.x)), fx1 = Math.max(...faces.map((p) => p.x + p.w));
    const by = main.y + main.h * 0.58, bh = Math.min(main.h * 0.2, 30);
    out.push({ k: 'rect', name: 'Colour band', x: fx0 - bleed, y: by, w: fx1 - fx0 + 2 * bleed, h: bh, fill: th.accent });
    out.push(...motifItems(th.motif, { x: fx0, y: by + 2, w: fx1 - fx0, h: bh - 4 }, th.soft, 'Pattern · band', 0.7));
  }
  if (th.layout === 'split') {
    for (const p of [main, ...(back ? [back] : [])]) out.push({ k: 'rect', name: `Colour block · ${p.name}`, x: p.x, y: p.y, w: p.w, h: p.h * 0.42, fill: th.accent });
    for (const p of sides) out.push(...motifItems(th.motif, { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 }, th.soft, `Pattern · ${p.name}`, 0.7));
  }
  if (th.layout === 'centered') for (const p of sides) out.push(...motifItems(th.motif, { x: p.x + 2, y: p.y + p.h * 0.6, w: p.w - 4, h: p.h * 0.38 }, th.soft, `Pattern · ${p.name}`, 0.7));
  if (th.layout === 'frame') {
    for (const p of [main, ...(back ? [back] : [])]) { const m = Math.min(p.w, p.h) * 0.07; out.push({ k: 'rect', name: `Frame · ${p.name}`, x: p.x + m, y: p.y + m, w: p.w - 2 * m, h: p.h - 2 * m, stroke: th.accent, sw: 0.5 }); out.push({ k: 'rect', name: `Frame inner · ${p.name}`, x: p.x + m + 1.5, y: p.y + m + 1.5, w: p.w - 2 * m - 3, h: p.h - 2 * m - 3, stroke: th.accent, sw: 0.2 }); }
    if (th.motif !== 'none') for (const p of sides) out.push(...motifItems(th.motif, { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 }, th.soft, `Pattern · ${p.name}`, 0.7));
  }
  // main face: brand, product, tagline
  const fw = main.w, pad = Math.max(4, fw * 0.08);
  const brandSize = Math.min(fw * (th.brand.length > 10 ? 0.11 : 0.16), main.h * 0.14, 22);
  const onBlock = th.layout === 'split';
  const brandY = th.layout === 'split' ? main.y + main.h * 0.12 : th.layout === 'band' ? main.y + main.h * 0.2 : main.y + main.h * 0.28;
  const ink = th.ink, brandInk = onBlock ? th.bg : ink;
  out.push({ k: 'text', name: 'Brand name', x: main.x + pad, y: brandY, w: fw - 2 * pad, text: th.caps ? th.brand.toUpperCase() : th.brand, size: brandSize, font: th.display, weight: th.displayWeight, fill: brandInk, align: 'center', spacing: th.caps ? 0.12 : 0 });
  out.push({ k: 'rect', name: 'Rule', x: main.x + fw * 0.4, y: brandY + brandSize * 1.45, w: fw * 0.2, h: 0.4, fill: onBlock ? th.bg : th.accent });
  const prodY = th.layout === 'split' ? main.y + main.h * 0.5 : th.layout === 'band' ? main.y + main.h * 0.6 + Math.min(main.h * 0.2, 30) / 2 - brandSize * 0.3 : brandY + brandSize * 2;
  out.push({ k: 'text', name: 'Product name', x: main.x + pad, y: prodY, w: fw - 2 * pad, text: th.product, size: Math.min(brandSize * 0.48, 9), font: th.body, weight: 600, fill: th.layout === 'band' ? th.bg : ink, align: 'center' });
  out.push({ k: 'text', name: 'Tagline', x: main.x + pad, y: main.y + main.h * 0.86, w: fw - 2 * pad, text: th.tagline, size: Math.min(brandSize * 0.32, 5), font: th.body, weight: 500, fill: ink, align: 'center', spacing: 0.08 });
  // back: story and details
  if (back) {
    const bp = Math.max(4, back.w * 0.1);
    out.push({ k: 'text', name: 'Back · brand', x: back.x + bp, y: back.y + back.h * 0.14 + (th.layout === 'split' ? 0 : 0), w: back.w - 2 * bp, text: th.caps ? th.brand.toUpperCase() : th.brand, size: Math.min(brandSize * 0.6, 10), font: th.display, weight: th.displayWeight, fill: onBlock ? th.bg : ink, align: 'left' });
    out.push({ k: 'text', name: 'Back · story', x: back.x + bp, y: back.y + back.h * 0.48, w: back.w - 2 * bp, text: th.story, size: Math.min(back.w * 0.045, 3.6), font: th.body, weight: 400, fill: ink, align: 'left', lineHeight: 1.35 });
    out.push({ k: 'text', name: 'Back · details', x: back.x + bp, y: back.y + back.h * 0.82, w: back.w - 2 * bp, text: th.detail, size: Math.min(back.w * 0.04, 3.2), font: th.body, weight: 600, fill: ink, align: 'left' });
  }
  // sides: product name running up the panel
  for (const p of sides) {
    if (p.w < 12 || p.h < 30) continue;
    out.push({ k: 'text', name: `Side · ${p.name}`, x: p.x + p.w / 2 - Math.min(p.w * 0.18, 5) * 0.6, y: p.y + p.h * 0.55, w: p.h * 0.5, text: th.caps ? th.brand.toUpperCase() : th.brand, size: Math.min(p.w * 0.18, 6), font: th.display, weight: th.displayWeight, fill: ink, align: 'center', rot: -90, spacing: th.caps ? 0.1 : 0 });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function sceneItemSvg(it: SceneItem): string {
  const op = 'opacity' in it && it.opacity != null ? ` opacity="${it.opacity}"` : '';
  if (it.k === 'rect') return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.fill || 'none'}"${it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.sw || 0.3}"` : ''}${it.rx ? ` rx="${it.rx}"` : ''}${op}/>`;
  if (it.k === 'circle') return `<circle cx="${it.cx.toFixed(2)}" cy="${it.cy.toFixed(2)}" r="${it.r.toFixed(2)}" fill="${it.fill || 'none'}"${op}/>`;
  if (it.k === 'path') return `<path d="${it.d}" fill="${it.fill || 'none'}"${it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.sw || 0.3}"` : ''}${op}/>`;
  const anchor = it.align === 'center' ? 'middle' : it.align === 'right' ? 'end' : 'start';
  const tx = it.align === 'center' ? it.x + it.w / 2 : it.align === 'right' ? it.x + it.w : it.x;
  const lines = wrap(it.text, it.w, it.size);
  const lh = it.size * (it.lineHeight || 1.2);
  const body = lines.map((ln, i) => `<tspan x="${tx}" dy="${i ? lh : 0}">${esc(ln)}</tspan>`).join('');
  const tr = it.rot ? ` transform="rotate(${it.rot} ${it.x} ${it.y})"` : '';
  return `<text x="${tx}" y="${it.y + it.size * 0.8}" font-family="'${it.font}', sans-serif" font-size="${it.size}" font-weight="${it.weight || 400}"${it.italic ? ' font-style="italic"' : ''} fill="${it.fill}" text-anchor="${anchor}"${it.spacing ? ` letter-spacing="${it.spacing * it.size}"` : ''}${tr}>${body}</text>`;
}
/** Rough word wrap for previews (the editor wraps with the real font). */
export function wrap(text: string, w: number, size: number): string[] {
  const max = Math.max(4, Math.floor(w / (size * 0.52)));
  const out: string[] = [];
  for (const para of text.split('\n')) { let line = ''; for (const word of para.split(' ')) { if ((line + ' ' + word).trim().length > max && line) { out.push(line); line = word; } else line = (line + ' ' + word).trim(); } out.push(line); }
  return out;
}

/** Flat preview: artwork + dieline (cut magenta, crease cyan dashed). */
export function templateFlatSvg(t: PackTemplate, o: { lines?: boolean } = {}): string {
  const d = templateDieline(t), b = 3, pad = 6;
  const body = templateScene(t, b).map(sceneItemSvg).join('');
  const clip = d.panels.map((p) => `M${p.x - 0.6} ${p.y - 0.6} h${p.w + 1.2} v${p.h + 1.2} h${-p.w - 1.2} Z`).join(' ');
  const lines = o.lines === false ? '' : d.lines.map((l) => `<path d="${l.d}" fill="none" stroke="${l.kind === 'cut' ? '#EC008C' : '#00A0E3'}" stroke-width="${Math.max(d.w, d.h) / 500}"${l.kind === 'cut' ? '' : ' stroke-dasharray="2 1.2"'}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${d.w + 2 * pad} ${d.h + 2 * pad}"><defs><clipPath id="c-${t.id}"><path d="${clip}"/></clipPath></defs><g clip-path="url(#c-${t.id})">${body}</g>${lines}</svg>`;
}

/** Scene items that can show inside a panel (bounds overlap; rotated text by its anchor). Patterns are split per mark. */
function itemsOn(items: SceneItem[], p: { x: number; y: number; w: number; h: number }): SceneItem[] {
  const hit = (x0: number, y0: number, x1: number, y1: number) => x1 >= p.x - 1 && x0 <= p.x + p.w + 1 && y1 >= p.y - 1 && y0 <= p.y + p.h + 1;
  const out: SceneItem[] = [];
  for (const it of items) {
    if (it.k === 'rect') { if (hit(it.x, it.y, it.x + it.w, it.y + it.h)) out.push(it); }
    else if (it.k === 'circle') { if (hit(it.cx - it.r, it.cy - it.r, it.cx + it.r, it.cy + it.r)) out.push(it); }
    else if (it.k === 'text') { const r = it.rot ? Math.max(it.w, it.size * 3) : 0; if (hit(it.x - r, it.y - r, it.x + it.w + r, it.y + it.size * 4 + r)) out.push(it); }
    else {
      // keep only the sub-paths of a pattern that fall in the panel
      const subs = it.d.split(/(?=M)/).filter((sp) => { const n = (sp.match(/-?\d*\.?\d+/g) || []).map(Number); const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1); return xs.length && hit(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)); });
      if (subs.length) out.push({ ...it, d: subs.join('') });
    }
  }
  return out;
}

/** 3D mockup: front, side and lid artwork mapped onto an isometric box (near corner in the middle). */
const sleeveBox0 = (d: Dieline) => d.panels.some((p) => p.name === 'Sleeve top');
export function templateMockupSvg(t: PackTemplate): string {
  const d = templateDieline(t), items = templateScene(t, 3);
  const P = (n: string) => d.panels.find((p) => p.name === n);
  const lidBox = !!P('Lid base') && !P('Front');
  const front = lidBox ? (P('Lid front wall') || d.panels[0]) : (P('Front') || P('Tray front wall') || d.panels[0]);
  const side = sleeveBox0(d) ? (d.panels.find((p) => p.name === 'Sleeve side') || front) : lidBox ? (d.panels.find((p) => p.name === 'Lid end wall') || front) : (P('Side') || d.panels.find((p) => /end wall/.test(p.name)) || front);
  const sleeveBox = !!P('Sleeve top');
  const top = lidBox ? P('Lid base')! : sleeveBox ? P('Sleeve top')! : (P('Top closure') || P('Top flap') || P('Tray base') || front);
  const L = t.L, W = t.W, H = lidBox ? Math.min(t.D, 30) * 1.0 : t.D;
  const cos = Math.cos(Math.PI / 6), sin = 0.5;
  const k = 170 / Math.max((L + W) * cos, H + (L + W) * sin);
  const fW = L * k, sW = W * k, fH = H * k;
  const ox = 16 + sW * cos, oy = 16 + (fW + sW) * sin;
  const face = (p: { x: number; y: number; w: number; h: number }, m: number[], shade: number) =>
    `<g transform="matrix(${m.map((v) => v.toFixed(4)).join(' ')})"><svg x="0" y="0" width="${p.w}" height="${p.h}" viewBox="${p.x} ${p.y} ${p.w} ${p.h}" preserveAspectRatio="none">${itemsOn(items, p).map(sceneItemSvg).join('')}</svg>${shade ? `<rect width="${p.w}" height="${p.h}" fill="#000" opacity="${shade}"/>` : ''}</g>`;
  const mFront = [(fW * cos) / front.w, (-fW * sin) / front.w, 0, fH / front.h, ox, oy];
  const mSide = [(sW * cos) / side.w, (sW * sin) / side.w, 0, fH / side.h, ox - sW * cos, oy - sW * sin];
  const mTop = [(fW * cos) / top.w, (-fW * sin) / top.w, (sW * cos) / top.h, (sW * sin) / top.h, ox - sW * cos, oy - sW * sin];
  const Wv = ox + fW * cos + 16, Hv = oy + fH + 22;
  const shadow = `<ellipse cx="${(ox + (fW - sW) * cos / 2).toFixed(1)}" cy="${(oy + fH - (fW - sW) * sin / 2 + 2).toFixed(1)}" rx="${((fW + sW) * cos * 0.55).toFixed(1)}" ry="${((fW + sW) * sin * 0.28).toFixed(1)}" fill="#000" opacity="0.13"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wv.toFixed(1)} ${Hv.toFixed(1)}">${shadow}${face(side, mSide, 0.16)}${face(front, mFront, 0.02)}${face(top, mTop, 0)}</svg>`;
}
