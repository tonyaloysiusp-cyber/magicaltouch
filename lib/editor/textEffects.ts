// Text styles that keep text fully editable: outline, shadow, glow,
// highlight, gradient fill and curved/wavy baselines. Nothing here turns
// text into a picture.

import { isPremium, PremiumLook } from '@/lib/textfx/premium';
import { installPremiumText, premiumObjectProps } from '@/lib/textfx/fabricPremium';

export type TextEffectKind = 'none' | 'shadow' | 'lift' | 'glow' | 'neon' | 'outline' | 'hollow' | 'highlight' | 'echo' | 'retro' | 'pop' | 'dreamy' | PremiumLook;

export interface TextFx {
  effect: TextEffectKind; // the "look": shadow, glow, neon…
  color: string; // effect colour
  amount: number; // 0..100 effect strength (blur / offset / thickness)
  curve: number; // -100..100, 0 = straight
  wave: number; // 0..100 wavy baseline
  // Layers that combine with any look.
  outline?: { color: string; width: number } | null; // width 0..100
  highlight?: { color: string } | null;
  // Text effects v2 (Nov 2026): native Fabric properties only, so the look is
  // identical on screen, in PNG/JPG, PDF and SVG exports.
  v?: 2;
  look?: string; // the preset that set these layers (for the gallery highlight)
  gradient?: { colors: string[]; angle: number } | null;
  hollow?: boolean;
  shadow?: { kind: 'soft' | 'hard' | 'glow'; color: string; opacity: number; distance: number; angle: number; blur: number } | null;
}

export type FxShadow = NonNullable<TextFx['shadow']>;

/** The new effect presets: each one just sets the layers below. */
export const TEXT_LOOKS: { id: string; label: string; fx: Partial<TextFx>; dark?: boolean }[] = [
  { id: 'none', label: 'None', fx: {} },
  { id: 'soft-shadow', label: 'Soft shadow', fx: { shadow: { kind: 'soft', color: '#000000', opacity: 45, distance: 30, angle: 45, blur: 40 } } },
  { id: 'hard-shadow', label: 'Hard shadow', fx: { shadow: { kind: 'hard', color: '#09090B', opacity: 100, distance: 45, angle: 45, blur: 0 } } },
  { id: 'lift', label: 'Lift', fx: { shadow: { kind: 'soft', color: '#000000', opacity: 30, distance: 45, angle: 90, blur: 80 } } },
  { id: 'glow', label: 'Glow', dark: true, fx: { shadow: { kind: 'glow', color: '#8CCBFF', opacity: 95, distance: 0, angle: 0, blur: 60 } } },
  { id: 'neon', label: 'Neon', dark: true, fx: { gradient: { colors: ['#FFFFFF', '#FFE3F1'], angle: 90 }, outline: { color: '#FF4FD8', width: 18 }, shadow: { kind: 'glow', color: '#FF4FD8', opacity: 100, distance: 0, angle: 0, blur: 70 } } },
  { id: 'outline', label: 'Outline', fx: { outline: { color: '#09090B', width: 40 } } },
  { id: 'hollow', label: 'Hollow', fx: { hollow: true, outline: { color: '#09090B', width: 25 } } },
  { id: 'sticker', label: 'Sticker', fx: { outline: { color: '#FFFFFF', width: 90 }, shadow: { kind: 'soft', color: '#000000', opacity: 35, distance: 20, angle: 90, blur: 30 } } },
  { id: 'retro', label: 'Retro', fx: { gradient: { colors: ['#FFB547', '#F2708F'], angle: 90 }, outline: { color: '#FFF4E0', width: 45 }, shadow: { kind: 'hard', color: '#1A1A1A', opacity: 100, distance: 55, angle: 45, blur: 0 } } },
  { id: 'comic', label: 'Comic', fx: { gradient: { colors: ['#FFE14D', '#FFC400'], angle: 90 }, outline: { color: '#111111', width: 45 }, shadow: { kind: 'hard', color: '#111111', opacity: 100, distance: 50, angle: 60, blur: 0 } } },
  { id: 'splice', label: 'Splice', fx: { hollow: true, outline: { color: '#09090B', width: 22 }, shadow: { kind: 'hard', color: '#35C2F1', opacity: 100, distance: 50, angle: 45, blur: 0 } } },
  { id: 'gold', label: 'Gold', dark: true, fx: { gradient: { colors: ['#FFF3B0', '#E8B64C', '#9C6B1E', '#F7D774'], angle: 90 }, outline: { color: '#6B4A12', width: 8 }, shadow: { kind: 'soft', color: '#000000', opacity: 40, distance: 18, angle: 90, blur: 25 } } },
  { id: 'rose-gold', label: 'Rose gold', dark: true, fx: { gradient: { colors: ['#FFE1D6', '#E8A08E', '#B5655A', '#F4B6A6'], angle: 90 }, shadow: { kind: 'soft', color: '#000000', opacity: 35, distance: 15, angle: 90, blur: 25 } } },
  { id: 'silver', label: 'Silver', fx: { gradient: { colors: ['#FFFFFF', '#B8BEC8', '#6B7280', '#E5E7EB'], angle: 90 }, outline: { color: '#4B5563', width: 6 } } },
  { id: 'chrome', label: 'Chrome', fx: { gradient: { colors: ['#F8FAFC', '#94A3B8', '#1E293B', '#CBD5E1', '#F8FAFC'], angle: 90 }, outline: { color: '#0F172A', width: 10 } } },
  { id: 'sunset', label: 'Sunset', fx: { gradient: { colors: ['#FFB347', '#F2708F', '#7B5CFF'], angle: 0 } } },
  { id: 'ocean', label: 'Ocean', fx: { gradient: { colors: ['#35C2F1', '#2563EB', '#1E3A8A'], angle: 90 } } },
  { id: 'spectrum', label: 'Spectrum', fx: { gradient: { colors: ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B'], angle: 0 } } },
  { id: 'fire', label: 'Fire', dark: true, fx: { gradient: { colors: ['#FFF06A', '#FF8A00', '#E11D48'], angle: 90 }, shadow: { kind: 'glow', color: '#FF6A00', opacity: 80, distance: 0, angle: 0, blur: 45 } } },
  { id: 'candy', label: 'Candy', fx: { gradient: { colors: ['#FF9AC8', '#FF5FA2'], angle: 90 }, outline: { color: '#FFFFFF', width: 35 }, shadow: { kind: 'hard', color: '#C2185B', opacity: 100, distance: 35, angle: 90, blur: 0 } } },
  { id: 'marker', label: 'Marker', fx: { highlight: { color: '#FFE45C' } } },
  { id: 'emerald', label: 'Emerald', dark: true, fx: { gradient: { colors: ['#A7F3D0', '#10B981', '#065F46'], angle: 90 }, shadow: { kind: 'glow', color: '#34D399', opacity: 50, distance: 0, angle: 0, blur: 35 } } },
  { id: 'ice', label: 'Ice', fx: { gradient: { colors: ['#FFFFFF', '#BDE8FF', '#5BC0EB'], angle: 90 }, outline: { color: '#1D6FA3', width: 10 } } },
];

/** Fx from a preset (keeps curve/wave). */
export function lookFx(id: string, cur: TextFx): TextFx {
  const L = TEXT_LOOKS.find((l) => l.id === id) || TEXT_LOOKS[0];
  return { ...DEFAULT_TEXT_FX, curve: cur.curve, wave: cur.wave, v: 2, look: L.id, gradient: null, hollow: false, shadow: null, outline: null, highlight: null, ...JSON.parse(JSON.stringify(L.fx)) };
}

/** Old effects (before Nov 2026) are still drawn for designs that use them, but no longer offered. */
export const isLegacyFx = (fx: TextFx) => fx.v !== 2 && fx.effect !== 'none';

export const DEFAULT_TEXT_FX: TextFx = { effect: 'none', color: '#09090B', amount: 50, curve: 0, wave: 0, outline: null, highlight: null };

export const TEXT_EFFECTS: { id: TextEffectKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'lift', label: 'Lift' },
  { id: 'glow', label: 'Glow' },
  { id: 'neon', label: 'Neon' },
  { id: 'outline', label: 'Outline' },
  { id: 'hollow', label: 'Hollow' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'echo', label: 'Echo' },
  { id: 'retro', label: 'Retro' },
  { id: 'pop', label: 'Pop' },
  { id: 'dreamy', label: 'Dreamy' },
];

export function readTextFx(obj: any): TextFx {
  const fx: TextFx = { ...DEFAULT_TEXT_FX, ...(obj?.__textFx || {}) };
  // Older designs kept outline and highlight as "looks"; they're layers now.
  if (fx.effect === 'outline') return { ...fx, effect: 'none', outline: { color: fx.color, width: fx.amount } };
  if (fx.effect === 'highlight') return { ...fx, effect: 'none', highlight: { color: fx.color === '#09090B' ? '#F3A6B8' : fx.color } };
  return fx;
}

const outlineWidth = (size: number, w: number) => Math.max(1, size * 0.08 * (0.2 + w / 100));

const withAlpha = (hex: string, a: number) => {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0').slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Applies the effect part (shadow/glow/outline/highlight) of `fx`.
function gradientFor(F: any, g: { colors: string[]; angle: number }) {
  const a = ((g.angle || 0) * Math.PI) / 180;
  const cx = Math.cos(a) / 2, cy = Math.sin(a) / 2;
  const n = Math.max(1, g.colors.length - 1);
  return new F.Gradient({
    type: 'linear', gradientUnits: 'percentage',
    coords: { x1: 0.5 - cx, y1: 0.5 - cy, x2: 0.5 + cx, y2: 0.5 + cy },
    colorStops: g.colors.map((color, i) => ({ offset: i / n, color })),
  });
}

/** Text effects v2: gradient fill, hollow, outline, shadow (soft / hard / glow), highlight. */
function applyFxV2(F: any, obj: any, fx: TextFx) {
  const size = obj.fontSize || 40;
  if (fx.gradient && fx.gradient.colors.length >= 2) {
    obj.__fxFill = obj.__fxFill ?? (typeof obj.fill === 'string' && obj.fill ? obj.fill : '#09090B');
    obj.set({ fill: gradientFor(F, fx.gradient) });
  } else if (fx.hollow) {
    obj.__fxFill = obj.__fxFill ?? (typeof obj.fill === 'string' && obj.fill ? obj.fill : '#09090B');
    obj.set({ fill: 'rgba(0,0,0,0)' });
  }
  if (fx.outline && fx.outline.width > 0) {
    // Outside outline (drawn under the fill) unless the text is hollow.
    const w = fx.hollow ? Math.max(1, size * 0.05 * (0.15 + fx.outline.width / 100)) : outlineWidth(size, fx.outline.width) * 1.6;
    obj.set({ stroke: fx.outline.color, strokeWidth: w, paintFirst: fx.hollow ? 'fill' : 'stroke', strokeLineJoin: 'round', strokeUniform: false });
    obj.__fxStroke = true;
  }
  if (fx.shadow) {
    const sh = fx.shadow;
    const op = Math.max(0, Math.min(1, sh.opacity / 100));
    const dist = sh.kind === 'glow' ? 0 : size * 0.16 * (sh.distance / 100);
    const a = (sh.angle * Math.PI) / 180;
    const blur = sh.kind === 'hard' ? 0 : sh.kind === 'glow' ? size * 0.7 * (0.1 + sh.blur / 100) : size * 0.5 * (sh.blur / 100);
    obj.set({ shadow: new F.Shadow({ color: withAlpha(sh.color, op), blur, offsetX: Math.cos(a) * dist, offsetY: Math.sin(a) * dist, affectStroke: !!fx.hollow }) });
  }
  if (fx.highlight) {
    obj.set({ textBackgroundColor: fx.highlight.color });
    obj.__fxHighlight = true;
  }
  obj.set({ objectCaching: false });
  obj.dirty = true;
}

export function applyTextEffect(F: any, obj: any, fx: TextFx) {
  installPremiumText(F);
  const size = obj.fontSize || 40;
  const k = fx.amount / 100;
  // Reset everything the effects own.
  obj.set({
    shadow: null,
    stroke: obj.__fxStroke ? null : obj.stroke,
    strokeWidth: obj.__fxStroke ? 0 : obj.strokeWidth,
    paintFirst: obj.__fxStroke ? 'fill' : obj.paintFirst,
    textBackgroundColor: obj.__fxHighlight ? '' : obj.textBackgroundColor,
  });
  if (obj.__fxHollowFill !== undefined) {
    obj.set({ fill: obj.__fxHollowFill });
    obj.__fxHollowFill = undefined;
  }
  if (obj.__fxFill !== undefined) {
    obj.set({ fill: obj.__fxFill });
    obj.__fxFill = undefined;
  }
  obj.__fxStroke = false;
  obj.__fxHighlight = false;
  if (fx.v === 2) return applyFxV2(F, obj, fx);

  switch (fx.effect) {
    case 'shadow':
      obj.set({ shadow: new F.Shadow({ color: withAlpha(fx.color, 0.35 + k * 0.4), blur: size * 0.12 * (0.3 + k), offsetX: size * 0.06 * (0.3 + k), offsetY: size * 0.06 * (0.3 + k) }) });
      break;
    case 'lift':
      obj.set({ shadow: new F.Shadow({ color: withAlpha('#000000', 0.18 + k * 0.25), blur: size * 0.35 * (0.4 + k), offsetX: 0, offsetY: size * 0.08 * (0.4 + k) }) });
      break;
    case 'glow':
      obj.set({ shadow: new F.Shadow({ color: withAlpha(fx.color, 0.85), blur: size * 0.45 * (0.25 + k), offsetX: 0, offsetY: 0 }) });
      break;
    case 'neon':
      obj.set({
        shadow: new F.Shadow({ color: withAlpha(fx.color, 1), blur: size * 0.5 * (0.3 + k), offsetX: 0, offsetY: 0 }),
        stroke: withAlpha('#FFFFFF', 0.9),
        strokeWidth: Math.max(0.5, size * 0.012),
      });
      obj.__fxStroke = true;
      break;
    case 'outline':
      obj.set({ stroke: fx.color, strokeWidth: Math.max(1, size * 0.08 * (0.2 + k)), paintFirst: 'stroke', strokeLineJoin: 'round' });
      obj.__fxStroke = true;
      break;
    case 'hollow':
      obj.__fxHollowFill = obj.fill;
      obj.set({ fill: 'rgba(0,0,0,0)', stroke: fx.color, strokeWidth: Math.max(1, size * 0.03 * (0.3 + k)), paintFirst: 'fill' });
      obj.__fxStroke = true;
      break;
    case 'highlight':
      obj.set({ textBackgroundColor: withAlpha(fx.color === '#09090B' ? '#F3A6B8' : fx.color, 0.35 + k * 0.6) });
      obj.__fxHighlight = true;
      break;
    case 'echo':
      obj.set({ shadow: new F.Shadow({ color: withAlpha(fx.color === '#09090B' ? '#8CCBFF' : fx.color, 0.9), blur: 0, offsetX: size * 0.06 * (0.3 + k), offsetY: size * 0.06 * (0.3 + k) }) });
      break;
    case 'retro': {
      // 70s poster: a thick outline in the effect colour and a hard drop.
      obj.set({
        stroke: fx.color === '#09090B' ? '#FFF4E0' : fx.color,
        strokeWidth: Math.max(1, size * 0.06 * (0.4 + k)),
        paintFirst: 'stroke',
        strokeLineJoin: 'round',
        shadow: new F.Shadow({ color: withAlpha('#1A1A1A', 0.95), blur: 0, offsetX: size * 0.07 * (0.4 + k), offsetY: size * 0.07 * (0.4 + k) }),
      });
      obj.__fxStroke = true;
      break;
    }
    case 'pop':
      // Big, flat, colourful offset copy (sticker / pop-art look).
      obj.set({ shadow: new F.Shadow({ color: withAlpha(fx.color === '#09090B' ? '#F2708F' : fx.color, 1), blur: 0, offsetX: size * 0.12 * (0.3 + k), offsetY: size * 0.12 * (0.3 + k) }) });
      break;
    case 'dreamy': {
      // Soft, out-of-focus halo in the text's own colour.
      const own = typeof obj.fill === 'string' && /^#/.test(obj.fill) ? obj.fill : fx.color;
      obj.set({ shadow: new F.Shadow({ color: withAlpha(own, 0.75), blur: size * 0.6 * (0.3 + k), offsetX: 0, offsetY: size * 0.04 }) });
      break;
    }
    default:
      // Professional looks (3D, gold, chrome, neon tube…) are painted live
      // by lib/textfx/fabricPremium.ts; here only the export bounds are set.
      if (isPremium(fx.effect)) obj.set(premiumObjectProps(F, obj, fx.effect));
      break;
  }
  if (isPremium(fx.effect)) { obj.dirty = true; return; }
  // Layers on top of the look.
  if (fx.outline && fx.effect !== 'neon' && fx.effect !== 'hollow') {
    obj.set({ stroke: fx.outline.color, strokeWidth: outlineWidth(size, fx.outline.width), paintFirst: 'stroke', strokeLineJoin: 'round' });
    obj.__fxStroke = true;
  }
  if (fx.highlight && fx.effect !== 'highlight') {
    obj.set({ textBackgroundColor: fx.highlight.color });
    obj.__fxHighlight = true;
  }
  obj.dirty = true;
}

// --- Curved and wavy text ---------------------------------------------------

// Builds the baseline path for curve (-100..100) or wave (0..100) for a
// line of text `w` wide.
export function textPathD(w: number, size: number, curve: number, wave: number): string | null {
  if (wave > 0) {
    const amp = size * 0.5 * (wave / 100);
    const segs = Math.max(2, Math.round(w / (size * 2.2)));
    const seg = w / segs;
    let d = `M 0 0`;
    for (let i = 0; i < segs; i++) {
      const x0 = i * seg;
      const dir = i % 2 === 0 ? -1 : 1;
      d += ` C ${x0 + seg * 0.33} ${dir * amp} ${x0 + seg * 0.66} ${dir * amp} ${x0 + seg} 0`;
    }
    return d;
  }
  if (!curve) return null;
  // Arc length = text width; |curve| = 100 bends it into a half circle.
  const phi = (Math.abs(curve) / 100) * (Math.PI / 2) + 1e-6;
  const R = w / (2 * phi);
  const x0 = -R * Math.sin(phi);
  const x1 = R * Math.sin(phi);
  const yEdge = R * Math.cos(phi);
  if (curve > 0) {
    // Rainbow: along the top of a circle.
    return `M ${x0} ${R - yEdge} A ${R} ${R} 0 0 1 ${x1} ${R - yEdge}`;
  }
  // Smile: along the bottom of a circle.
  return `M ${x0} ${yEdge - R} A ${R} ${R} 0 0 0 ${x1} ${yEdge - R}`;
}

// Applies curve/wave. Curved text stays live, editable text on a path
// (always one line, so it never wraps onto itself).
export function applyTextShape(F: any, obj: any, curve: number, wave: number) {
  const center = obj.getCenterPoint();
  const straight = !curve && !wave;
  if (straight) {
    if (obj.path) {
      obj.set({ path: null });
      if (obj.__preCurveWidth) obj.set({ width: obj.__preCurveWidth });
      obj.__preCurveWidth = undefined;
    }
  } else {
    if (!obj.path && obj.type === 'textbox') obj.__preCurveWidth = obj.width;
    // Measure the text on one line with Fabric's own metrics.
    if (obj.path) obj.set({ path: null });
    if (obj.type === 'textbox') obj.set({ width: 100000 });
    obj.initDimensions?.();
    const w = Math.max(10, obj.calcTextWidth ? obj.calcTextWidth() : obj.width);
    if (obj.type === 'textbox') obj.set({ width: w + 2 });
    const d = textPathD(w, obj.fontSize || 40, curve, wave)!;
    const path = new F.Path(d, { visible: false, fill: '', stroke: '' });
    obj.set({ path, pathAlign: 'baseline', pathSide: 'left', pathStartOffset: 0 });
  }
  obj.initDimensions?.();
  obj.setPositionByOrigin(center, 'center', 'center');
  obj.dirty = true;
  obj.setCoords();
}

export function applyTextFx(F: any, obj: any, fx: TextFx) {
  // Curved and wavy text follows one line.
  if ((fx.curve || fx.wave) && typeof obj.text === 'string' && obj.text.includes('\n')) obj.set({ text: obj.text.replace(/\s*\n\s*/g, ' ') });
  applyTextEffect(F, obj, fx);
  applyTextShape(F, obj, fx.curve, fx.wave);
  const empty = fx.effect === 'none' && !fx.curve && !fx.wave && !fx.outline && !fx.highlight && !fx.gradient && !fx.shadow && !fx.hollow;
  obj.__textFx = empty ? undefined : { ...fx };
}
