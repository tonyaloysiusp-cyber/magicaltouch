// Shape library geometry: every shape as an SVG path drawn inside a
// width × height box with its top-left at (0, 0). Pure functions (no
// Fabric, no DOM) so they're easy to test and reuse for frames, masks and
// exports.

export type ShapeKind =
  | 'rect'
  | 'roundRect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'rightTriangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'polygon'
  | 'star'
  | 'star4'
  | 'heart'
  | 'speech'
  | 'speechRound'
  | 'badge'
  | 'burst'
  | 'banner'
  | 'ribbon'
  | 'cloud'
  | 'arrowRight'
  | 'arrowLeft'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowDouble'
  | 'chevron'
  | 'cross'
  | 'arch'
  | 'blob'
  | 'drop'
  | 'moon'
  | 'line'
  | 'arrowLine';

export interface ShapeParams {
  sides?: number; // polygon
  points?: number; // star / burst / badge
  inner?: number; // star inner radius ratio 0..1
  radius?: number; // corner radius in px (roundRect)
}

export interface ShapeDef {
  kind: ShapeKind;
  label: string;
  group: 'basic' | 'polygons' | 'symbols' | 'callouts' | 'arrows' | 'lines';
  // Shapes that are strokes rather than filled areas.
  stroked?: boolean;
  params?: ShapeParams;
  // Natural aspect (w / h) used when dropped onto the page.
  aspect?: number;
}

export const SHAPES: ShapeDef[] = [
  { kind: 'rect', label: 'Square', group: 'basic' },
  { kind: 'roundRect', label: 'Rounded square', group: 'basic', params: { radius: 24 } },
  { kind: 'circle', label: 'Circle', group: 'basic' },
  { kind: 'ellipse', label: 'Oval', group: 'basic', aspect: 1.5 },
  { kind: 'triangle', label: 'Triangle', group: 'basic' },
  { kind: 'rightTriangle', label: 'Right triangle', group: 'basic' },
  { kind: 'diamond', label: 'Diamond', group: 'polygons' },
  { kind: 'pentagon', label: 'Pentagon', group: 'polygons' },
  { kind: 'hexagon', label: 'Hexagon', group: 'polygons' },
  { kind: 'polygon', label: 'Polygon', group: 'polygons', params: { sides: 8 } },
  { kind: 'star', label: 'Star', group: 'polygons', params: { points: 5, inner: 0.45 } },
  { kind: 'star4', label: 'Sparkle', group: 'polygons' },
  { kind: 'burst', label: 'Burst', group: 'polygons', params: { points: 16, inner: 0.78 } },
  { kind: 'badge', label: 'Badge', group: 'polygons', params: { points: 24 } },
  { kind: 'heart', label: 'Heart', group: 'symbols', aspect: 1.1 },
  { kind: 'cloud', label: 'Cloud', group: 'symbols', aspect: 1.5 },
  { kind: 'drop', label: 'Drop', group: 'symbols', aspect: 0.75 },
  { kind: 'moon', label: 'Moon', group: 'symbols' },
  { kind: 'arch', label: 'Arch', group: 'symbols', aspect: 0.75 },
  { kind: 'blob', label: 'Blob', group: 'symbols' },
  { kind: 'cross', label: 'Plus', group: 'symbols' },
  { kind: 'speech', label: 'Speech bubble', group: 'callouts', aspect: 1.3 },
  { kind: 'speechRound', label: 'Thought bubble', group: 'callouts', aspect: 1.3 },
  { kind: 'banner', label: 'Banner', group: 'callouts', aspect: 3.2 },
  { kind: 'ribbon', label: 'Ribbon', group: 'callouts', aspect: 3 },
  { kind: 'arrowRight', label: 'Arrow right', group: 'arrows', aspect: 1.6 },
  { kind: 'arrowLeft', label: 'Arrow left', group: 'arrows', aspect: 1.6 },
  { kind: 'arrowUp', label: 'Arrow up', group: 'arrows', aspect: 0.62 },
  { kind: 'arrowDown', label: 'Arrow down', group: 'arrows', aspect: 0.62 },
  { kind: 'arrowDouble', label: 'Double arrow', group: 'arrows', aspect: 2 },
  { kind: 'chevron', label: 'Chevron', group: 'arrows', aspect: 1.2 },
  { kind: 'line', label: 'Line', group: 'lines', stroked: true, aspect: 6 },
  { kind: 'arrowLine', label: 'Arrow line', group: 'lines', stroked: true, aspect: 6 },
];

export const shapeDef = (kind: string) => SHAPES.find((s) => s.kind === kind);

const r = (n: number) => Math.round(n * 100) / 100;
const pts = (list: [number, number][], close = true) =>
  list.map(([x, y], i) => `${i ? 'L' : 'M'} ${r(x)} ${r(y)}`).join(' ') + (close ? ' Z' : '');

function regular(w: number, h: number, sides: number, rotation = -Math.PI / 2) {
  const list: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * 2 * Math.PI) / sides;
    list.push([w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2]);
  }
  return pts(list);
}

function starD(w: number, h: number, points: number, inner: number, rotation = -Math.PI / 2) {
  const list: [number, number][] = [];
  const n = Math.max(3, Math.round(points));
  for (let i = 0; i < n * 2; i++) {
    const a = rotation + (i * Math.PI) / n;
    const k = i % 2 === 0 ? 1 : Math.max(0.05, Math.min(0.98, inner));
    list.push([w / 2 + ((Math.cos(a) * w) / 2) * k, h / 2 + ((Math.sin(a) * h) / 2) * k]);
  }
  return pts(list);
}

function roundRectD(w: number, h: number, radius: number) {
  const rr = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (!rr) return pts([[0, 0], [w, 0], [w, h], [0, h]]);
  return [
    `M ${r(rr)} 0`,
    `L ${r(w - rr)} 0`,
    `Q ${r(w)} 0 ${r(w)} ${r(rr)}`,
    `L ${r(w)} ${r(h - rr)}`,
    `Q ${r(w)} ${r(h)} ${r(w - rr)} ${r(h)}`,
    `L ${r(rr)} ${r(h)}`,
    `Q 0 ${r(h)} 0 ${r(h - rr)}`,
    `L 0 ${r(rr)}`,
    `Q 0 0 ${r(rr)} 0 Z`,
  ].join(' ');
}

function ellipseD(w: number, h: number) {
  // Four cubic arcs (kappa approximation of an ellipse).
  const k = 0.5522847498;
  const rx = w / 2;
  const ry = h / 2;
  const cx = rx;
  const cy = ry;
  return [
    `M ${r(cx)} 0`,
    `C ${r(cx + rx * k)} 0 ${r(w)} ${r(cy - ry * k)} ${r(w)} ${r(cy)}`,
    `C ${r(w)} ${r(cy + ry * k)} ${r(cx + rx * k)} ${r(h)} ${r(cx)} ${r(h)}`,
    `C ${r(cx - rx * k)} ${r(h)} 0 ${r(cy + ry * k)} 0 ${r(cy)}`,
    `C 0 ${r(cy - ry * k)} ${r(cx - rx * k)} 0 ${r(cx)} 0 Z`,
  ].join(' ');
}

// Maps a path drawn in a 100 × 100 design box to w × h.
function scaled(d100: string, w: number, h: number) {
  const sx = w / 100;
  const sy = h / 100;
  return d100.replace(/([MLCQZ])([^MLCQZ]*)/g, (_m, cmd: string, args: string) => {
    if (cmd === 'Z') return 'Z ';
    const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out = nums.map((n, i) => r(i % 2 === 0 ? n * sx : n * sy));
    return `${cmd} ${out.join(' ')} `;
  }).trim();
}

const HEART =
  'M 50 92 C 22 72 2 54 2 32 C 2 14 16 2 31 2 C 40 2 46 7 50 14 C 54 7 60 2 69 2 C 84 2 98 14 98 32 C 98 54 78 72 50 92 Z';
const CLOUD =
  'M 25 85 C 10 85 0 75 0 62 C 0 50 9 41 21 40 C 21 24 34 12 50 12 C 63 12 74 20 78 32 C 91 33 100 44 100 57 C 100 72 89 85 74 85 Z';
const SPEECH =
  'M 10 4 L 90 4 C 96 4 100 8 100 14 L 100 64 C 100 70 96 74 90 74 L 42 74 L 20 96 L 24 74 L 10 74 C 4 74 0 70 0 64 L 0 14 C 0 8 4 4 10 4 Z';
const THOUGHT =
  'M 30 70 C 12 72 0 62 2 48 C 3 37 12 31 20 31 C 20 16 33 6 48 8 C 58 0 76 2 82 14 C 94 15 101 27 98 39 C 104 52 96 66 82 66 C 76 75 62 77 52 71 C 46 76 36 76 30 70 Z M 18 82 C 18 78 22 76 25 77 C 28 78 29 82 27 85 C 25 88 20 87 18 82 Z M 8 95 C 8 92 11 91 13 92 C 15 93 15 96 13 97 C 11 98 8 97 8 95 Z';
const BANNER = 'M 0 20 L 14 20 L 14 0 L 86 0 L 86 20 L 100 20 L 92 50 L 100 80 L 86 80 L 86 100 L 14 100 L 14 80 L 0 80 L 8 50 Z';
const RIBBON =
  'M 0 30 L 12 30 L 12 10 C 37 0 63 0 88 10 L 88 30 L 100 30 L 92 55 L 100 80 L 88 80 L 88 90 C 63 80 37 80 12 90 L 12 80 L 0 80 L 8 55 Z';
const DROP = 'M 50 0 C 66 24 100 48 100 68 C 100 88 77 100 50 100 C 23 100 0 88 0 68 C 0 48 34 24 50 0 Z';
const MOON = 'M 62 0 C 34 6 14 30 14 54 C 14 82 38 100 64 100 C 80 100 92 94 100 84 C 92 88 84 90 76 90 C 50 90 32 70 32 46 C 32 26 44 8 62 0 Z';
const ARCH = 'M 0 100 L 0 50 C 0 22 22 0 50 0 C 78 0 100 22 100 50 L 100 100 Z';
const BLOB =
  'M 52 2 C 72 0 92 12 97 32 C 102 52 92 64 88 78 C 82 96 62 102 44 98 C 24 94 6 84 2 64 C -2 44 6 26 20 14 C 30 6 40 3 52 2 Z';
const STAR4 = 'M 50 0 C 55 34 66 45 100 50 C 66 55 55 66 50 100 C 45 66 34 55 0 50 C 34 45 45 34 50 0 Z';

export function shapePathD(kind: ShapeKind, w: number, h: number, params: ShapeParams = {}): string {
  switch (kind) {
    case 'rect':
      return pts([[0, 0], [w, 0], [w, h], [0, h]]);
    case 'roundRect':
      return roundRectD(w, h, params.radius ?? Math.min(w, h) * 0.12);
    case 'circle':
    case 'ellipse':
      return ellipseD(w, h);
    case 'triangle':
      return pts([[w / 2, 0], [w, h], [0, h]]);
    case 'rightTriangle':
      return pts([[0, 0], [w, h], [0, h]]);
    case 'diamond':
      return pts([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case 'pentagon':
      return regular(w, h, 5);
    case 'hexagon':
      return regular(w, h, 6, 0);
    case 'polygon':
      return regular(w, h, Math.max(3, Math.min(64, Math.round(params.sides ?? 8))));
    case 'star':
      return starD(w, h, params.points ?? 5, params.inner ?? 0.45);
    case 'star4':
      return scaled(STAR4, w, h);
    case 'burst':
      return starD(w, h, params.points ?? 16, params.inner ?? 0.78);
    case 'badge': {
      // Scalloped seal: a circle of small bumps.
      const n = Math.max(8, Math.round(params.points ?? 24));
      const parts: string[] = [];
      for (let i = 0; i <= n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const am = a - Math.PI / n;
        const x = w / 2 + (Math.cos(a) * w) / 2 * 0.92;
        const y = h / 2 + (Math.sin(a) * h) / 2 * 0.92;
        const cx = w / 2 + (Math.cos(am) * w) / 2;
        const cy = h / 2 + (Math.sin(am) * h) / 2;
        parts.push(i === 0 ? `M ${r(x)} ${r(y)}` : `Q ${r(cx)} ${r(cy)} ${r(x)} ${r(y)}`);
      }
      return parts.join(' ') + ' Z';
    }
    case 'heart':
      return scaled(HEART, w, h);
    case 'cloud':
      return scaled(CLOUD, w, h);
    case 'speech':
      return scaled(SPEECH, w, h);
    case 'speechRound':
      return scaled(THOUGHT, w, h);
    case 'banner':
      return scaled(BANNER, w, h);
    case 'ribbon':
      return scaled(RIBBON, w, h);
    case 'drop':
      return scaled(DROP, w, h);
    case 'moon':
      return scaled(MOON, w, h);
    case 'arch':
      return scaled(ARCH, w, h);
    case 'blob':
      return scaled(BLOB, w, h);
    case 'cross': {
      const t = 0.32;
      const a = (1 - t) / 2;
      const b = 1 - a;
      return pts([
        [a * w, 0], [b * w, 0], [b * w, a * h], [w, a * h], [w, b * h], [b * w, b * h],
        [b * w, h], [a * w, h], [a * w, b * h], [0, b * h], [0, a * h], [a * w, a * h],
      ]);
    }
    case 'arrowRight':
      return pts([[0, h * 0.3], [w * 0.6, h * 0.3], [w * 0.6, 0], [w, h / 2], [w * 0.6, h], [w * 0.6, h * 0.7], [0, h * 0.7]]);
    case 'arrowLeft':
      return pts([[w, h * 0.3], [w * 0.4, h * 0.3], [w * 0.4, 0], [0, h / 2], [w * 0.4, h], [w * 0.4, h * 0.7], [w, h * 0.7]]);
    case 'arrowUp':
      return pts([[w * 0.3, h], [w * 0.3, h * 0.4], [0, h * 0.4], [w / 2, 0], [w, h * 0.4], [w * 0.7, h * 0.4], [w * 0.7, h]]);
    case 'arrowDown':
      return pts([[w * 0.3, 0], [w * 0.3, h * 0.6], [0, h * 0.6], [w / 2, h], [w, h * 0.6], [w * 0.7, h * 0.6], [w * 0.7, 0]]);
    case 'arrowDouble':
      return pts([
        [0, h / 2], [w * 0.25, 0], [w * 0.25, h * 0.3], [w * 0.75, h * 0.3], [w * 0.75, 0], [w, h / 2],
        [w * 0.75, h], [w * 0.75, h * 0.7], [w * 0.25, h * 0.7], [w * 0.25, h],
      ]);
    case 'chevron':
      return pts([[0, 0], [w * 0.6, 0], [w, h / 2], [w * 0.6, h], [0, h], [w * 0.4, h / 2]]);
    case 'line':
      return `M 0 ${r(h / 2)} L ${r(w)} ${r(h / 2)}`;
    case 'arrowLine': {
      const head = Math.min(h * 0.5, w * 0.25);
      return `M 0 ${r(h / 2)} L ${r(w)} ${r(h / 2)} M ${r(w - head)} ${r(h / 2 - head * 0.6)} L ${r(w)} ${r(h / 2)} L ${r(w - head)} ${r(h / 2 + head * 0.6)}`;
    }
    default:
      return pts([[0, 0], [w, 0], [w, h], [0, h]]);
  }
}
