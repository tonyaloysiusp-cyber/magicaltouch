// One gradient model for shapes, text, page backgrounds and vector paths.

export interface GradientStop {
  offset: number; // 0..1
  color: string; // #rrggbb
  opacity: number; // 0..1
}

export interface GradientSpec {
  type: 'linear' | 'radial';
  angle: number; // degrees, linear only (0 = left → right)
  stops: GradientStop[];
}

export const BRAND_GRADIENTS: { id: string; label: string; spec: GradientSpec }[] = [
  {
    id: 'sky-rose',
    label: 'Sky to rose',
    spec: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#8CCBFF', opacity: 1 }, { offset: 1, color: '#F3A6B8', opacity: 1 }] },
  },
  {
    id: 'spectrum',
    label: 'Magical spectrum',
    spec: {
      type: 'linear',
      angle: 0,
      stops: [
        { offset: 0, color: '#F2708F', opacity: 1 },
        { offset: 0.3, color: '#A69BD3', opacity: 1 },
        { offset: 0.55, color: '#35C2F1', opacity: 1 },
        { offset: 0.8, color: '#5DCCB8', opacity: 1 },
        { offset: 1, color: '#8CC84B', opacity: 1 },
      ],
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    spec: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#35C2F1', opacity: 1 }, { offset: 1, color: '#3B82C4', opacity: 1 }] },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    spec: { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#F2708F', opacity: 1 }, { offset: 1, color: '#F7B267', opacity: 1 }] },
  },
  {
    id: 'mint',
    label: 'Mint',
    spec: { type: 'linear', angle: 45, stops: [{ offset: 0, color: '#5DCCB8', opacity: 1 }, { offset: 1, color: '#DDE23B', opacity: 1 }] },
  },
  {
    id: 'night',
    label: 'Night',
    spec: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#09090B', opacity: 1 }, { offset: 1, color: '#3B4A7A', opacity: 1 }] },
  },
  {
    id: 'lilac',
    label: 'Lilac',
    spec: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#A69BD3', opacity: 1 }, { offset: 1, color: '#F3A6B8', opacity: 1 }] },
  },
  {
    id: 'glow',
    label: 'Soft glow',
    spec: { type: 'radial', angle: 0, stops: [{ offset: 0, color: '#FFFFFF', opacity: 1 }, { offset: 1, color: '#8CCBFF', opacity: 1 }] },
  },
  {
    id: 'gold',
    label: 'Gold',
    spec: {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#B8862B', opacity: 1 },
        { offset: 0.5, color: '#F5D27A', opacity: 1 },
        { offset: 1, color: '#B8862B', opacity: 1 },
      ],
    },
  },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Gradient coordinates in fractions of the object's box, so the gradient
// follows the object when it's resized or text is edited.
export function gradientCoords(spec: GradientSpec) {
  if (spec.type === 'radial') return { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, r1: 0, r2: 0.5 };
  const a = (spec.angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

export function toFabricGradient(F: any, spec: GradientSpec) {
  const stops = [...spec.stops].sort((a, b) => a.offset - b.offset);
  return new F.Gradient({
    type: spec.type,
    gradientUnits: 'percentage',
    coords: gradientCoords(spec),
    colorStops: stops.map((s) => ({ offset: clamp01(s.offset), color: s.color, opacity: clamp01(s.opacity ?? 1) })),
  });
}

const toHex = (c: string): string => {
  if (!c) return '#000000';
  if (c.startsWith('#')) {
    if (c.length === 4) return '#' + c.slice(1).split('').map((x) => x + x).join('');
    return c.slice(0, 7);
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
};
const alphaOf = (c: string): number => {
  const m = c && c.match(/rgba\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',');
    if (parts.length === 4) return parseFloat(parts[3]);
  }
  return 1;
};

// Reads any Fabric gradient (including ones from older designs) back into
// the editable model.
export function fromFabricGradient(g: any): GradientSpec | null {
  if (!g || typeof g !== 'object' || !g.colorStops) return null;
  const type: 'linear' | 'radial' = g.type === 'radial' ? 'radial' : 'linear';
  let angle = 0;
  if (type === 'linear' && g.coords) {
    const { x1 = 0, y1 = 0, x2 = 1, y2 = 0 } = g.coords;
    angle = Math.round((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
    if (angle < 0) angle += 360;
  }
  const stops: GradientStop[] = g.colorStops.map((s: any) => ({
    offset: clamp01(s.offset ?? 0),
    color: toHex(s.color),
    opacity: s.opacity !== undefined ? s.opacity : alphaOf(s.color),
  }));
  return { type, angle, stops };
}

// CSS preview of a gradient (for swatches and the editor bar).
export function gradientCss(spec: GradientSpec, forceLinear = false) {
  const stops = [...spec.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${hexWithAlpha(s.color, s.opacity)} ${Math.round(s.offset * 100)}%`)
    .join(', ');
  if (spec.type === 'radial' && !forceLinear) return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${(spec.angle + 90) % 360}deg, ${stops})`;
}

export function hexWithAlpha(hex: string, alpha = 1) {
  const h = toHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return alpha >= 1 ? `#${h}` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
