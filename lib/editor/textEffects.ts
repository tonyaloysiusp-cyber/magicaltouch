// Text styles that keep text fully editable: outline, shadow, glow,
// highlight, gradient fill and curved/wavy baselines. Nothing here turns
// text into a picture.

export type TextEffectKind = 'none' | 'shadow' | 'lift' | 'glow' | 'neon' | 'outline' | 'hollow' | 'highlight' | 'echo';

export interface TextFx {
  effect: TextEffectKind;
  color: string; // effect colour
  amount: number; // 0..100 effect strength (blur / offset / thickness)
  curve: number; // -100..100, 0 = straight
  wave: number; // 0..100 wavy baseline
}

export const DEFAULT_TEXT_FX: TextFx = { effect: 'none', color: '#09090B', amount: 50, curve: 0, wave: 0 };

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
  return { ...DEFAULT_TEXT_FX, ...(obj?.__textFx || {}) };
}

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
  obj.set({ shadow: null, stroke: obj.__fxStroke ? null : obj.stroke, strokeWidth: obj.__fxStroke ? 0 : obj.strokeWidth, textBackgroundColor: obj.__fxHighlight ? '' : obj.textBackgroundColor });
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
  obj.dirty = true;
}

// --- Curved and wavy text ---------------------------------------------------

// Width of the text laid out on one line (used to size the curve).
function singleLineWidth(obj: any) {
  try {
    const lines = (obj.text || '').split('\n');
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'normal'} ${obj.fontSize || 40}px "${obj.fontFamily || 'Arial'}"`;
    const extra = ((obj.charSpacing || 0) / 1000) * (obj.fontSize || 40);
    return Math.max(...lines.map((l: string) => ctx.measureText(l).width + extra * l.length), 10);
  } catch {
    return (obj.text || '').length * (obj.fontSize || 40) * 0.55;
  }
}

// Builds the baseline path for curve (-100..100) or wave (0..100).
export function textPathD(obj: any, curve: number, wave: number): string | null {
  const w = singleLineWidth(obj);
  const size = obj.fontSize || 40;
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
  if (curve > 0) {
    // Rainbow: text on the top of a circle.
    const y = -R * Math.cos(phi);
    return `M ${x0} ${y + R} A ${R} ${R} 0 0 1 ${x1} ${y + R}`;
  }
  // Smile: text along the bottom of a circle.
  const y = R * Math.cos(phi);
  return `M ${x0} ${-y + R} A ${R} ${R} 0 0 0 ${x1} ${-y + R}`.replace(/NaN/g, '0');
}

// Applies curve/wave. Curved text stays live, editable text on a path.
export function applyTextShape(F: any, obj: any, curve: number, wave: number) {
  const center = obj.getCenterPoint();
  const d = textPathD(obj, curve, wave);
  if (!d) {
    if (obj.path) {
      obj.set({ path: null });
      if (obj.__preCurveWidth) obj.set({ width: obj.__preCurveWidth });
      obj.__preCurveWidth = undefined;
    }
  } else {
    if (!obj.path && obj.type === 'textbox') obj.__preCurveWidth = obj.width;
    const path = new F.Path(d, { visible: false, fill: '', stroke: '' });
    obj.set({ path, pathAlign: 'baseline', pathSide: 'left', pathStartOffset: 0 });
    if (obj.type === 'textbox') obj.set({ width: singleLineWidth(obj) + 2 });
  }
  if (obj.initDimensions) obj.initDimensions();
  obj.setPositionByOrigin(center, 'center', 'center');
  obj.dirty = true;
  obj.setCoords();
}

export function applyTextFx(F: any, obj: any, fx: TextFx) {
  applyTextEffect(F, obj, fx);
  applyTextShape(F, obj, fx.curve, fx.wave);
  obj.__textFx = fx.effect === 'none' && !fx.curve && !fx.wave ? undefined : { ...fx };
}
