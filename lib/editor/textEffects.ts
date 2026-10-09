// Text styles that keep text fully editable: outline, shadow, glow,
// highlight, gradient fill and curved/wavy baselines. Nothing here turns
// text into a picture.

export type TextEffectKind = 'none' | 'shadow' | 'lift' | 'glow' | 'neon' | 'outline' | 'hollow' | 'highlight' | 'echo';

export interface TextFx {
  effect: TextEffectKind; // the "look": shadow, glow, neon…
  color: string; // effect colour
  amount: number; // 0..100 effect strength (blur / offset / thickness)
  curve: number; // -100..100, 0 = straight
  wave: number; // 0..100 wavy baseline
  // Layers that combine with any look.
  outline?: { color: string; width: number } | null; // width 0..100
  highlight?: { color: string } | null;
}

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
export function applyTextEffect(F: any, obj: any, fx: TextFx) {
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
  obj.__fxStroke = false;
  obj.__fxHighlight = false;

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
    default:
      break;
  }
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
  const empty = fx.effect === 'none' && !fx.curve && !fx.wave && !fx.outline && !fx.highlight;
  obj.__textFx = empty ? undefined : { ...fx };
}
