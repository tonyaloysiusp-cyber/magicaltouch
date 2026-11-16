// Floral and ornament construction (pure; runs in tests). Every result is a
// list of clean vector paths (mm, centred on 0,0) with a colour role, so the
// print studio can add it as an editable group: recolour, resize, rotate,
// ungroup and edit point by point.
//
//   flower    petals (count, shape, length, width, layers, twist), centre
//             (disc, ring of dots, star, spiral), leaves and a stem
//   paisley   teardrop with curled tip, inner outline and dots
//   mandala   rings of petals, dots and scallops with radial symmetry
//   damask    mirrored scroll ornament
//   border    a strip of repeated motifs (floral, leaf, paisley, geometric)
//   neckline  motifs along a U / V / round neckline curve
//   vine      a wavy stem with leaves and flowers along it

export type Role = 'petal' | 'petal2' | 'centre' | 'leaf' | 'stem' | 'accent';
export interface Part { d: string; role: Role; name: string }

export type PetalShape = 'round' | 'pointed' | 'heart' | 'teardrop' | 'spatula' | 'lotus';
export type CentreStyle = 'disc' | 'dots' | 'star' | 'spiral' | 'none';
export type LeafShape = 'oval' | 'pointed' | 'serrated' | 'fern';

export interface FlowerSpec {
  petals: number; shape: PetalShape; length: number; width: number; layers: number; twist: number;
  centre: CentreStyle; centreSize: number; leaves: number; leafShape: LeafShape; stem: boolean;
}
export const DEFAULT_FLOWER: FlowerSpec = { petals: 6, shape: 'round', length: 40, width: 20, layers: 2, twist: 0, centre: 'dots', centreSize: 12, leaves: 2, leafShape: 'pointed', stem: true };

const f = (n: number) => (Math.round(n * 100) / 100).toString();
type P = [number, number];
const rot = ([x, y]: P, a: number): P => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const mv = (p: P, d: P): P => [p[0] + d[0], p[1] + d[1]];
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
/** Cubic path through control points given in a local frame, then rotated by `a` and moved to `at`. */
function shape(cmds: (string | P)[], a = 0, at: P = [0, 0], s = 1): string {
  return cmds.map((c) => (typeof c === 'string' ? c : (() => { const p = mv(rot([c[0] * s, c[1] * s], a), at); return `${f(p[0])} ${f(p[1])}`; })())).join(' ').replace(/ ([MLCZ])/g, '$1').replace(/([MLC]) /g, '$1');
}

/** One petal pointing up (−y) from the origin: length L, width W. */
export function petal(sh: PetalShape, L: number, W: number, a = 0, at: P = [0, 0]): string {
  const w = W / 2;
  switch (sh) {
    case 'pointed': return shape(['M', [0, 0], 'C', [w * 1.1, -L * 0.25], [w * 0.7, -L * 0.75], [0, -L], 'C', [-w * 0.7, -L * 0.75], [-w * 1.1, -L * 0.25], [0, 0], 'Z'], a, at);
    case 'heart': return shape(['M', [0, 0], 'C', [w * 1.3, -L * 0.3], [w * 1.2, -L * 1.05], [w * 0.3, -L * 0.95], 'C', [w * 0.1, -L * 0.93], [0, -L * 0.85], [0, -L * 0.8], 'C', [0, -L * 0.85], [-w * 0.1, -L * 0.93], [-w * 0.3, -L * 0.95], 'C', [-w * 1.2, -L * 1.05], [-w * 1.3, -L * 0.3], [0, 0], 'Z'], a, at);
    case 'teardrop': return shape(['M', [0, -L], 'C', [w * 0.2, -L * 0.7], [w * 1.2, -L * 0.45], [w * 0.9, -L * 0.15], 'C', [w * 0.6, L * 0.05], [-w * 0.6, L * 0.05], [-w * 0.9, -L * 0.15], 'C', [-w * 1.2, -L * 0.45], [-w * 0.2, -L * 0.7], [0, -L], 'Z'], a, at);
    case 'spatula': return shape(['M', [-w * 0.35, 0], 'L', [-w * 0.45, -L * 0.55], 'C', [-w * 1.1, -L * 0.75], [-w * 0.8, -L * 1.02], [0, -L], 'C', [w * 0.8, -L * 1.02], [w * 1.1, -L * 0.75], [w * 0.45, -L * 0.55], 'L', [w * 0.35, 0], 'Z'], a, at);
    case 'lotus': return shape(['M', [0, 0], 'C', [w * 1.4, -L * 0.2], [w * 0.9, -L * 0.7], [0, -L], 'C', [w * 0.15, -L * 0.75], [w * 0.1, -L * 0.4], [0, -L * 0.15], 'C', [-w * 0.1, -L * 0.4], [-w * 0.15, -L * 0.75], [0, -L], 'C', [-w * 0.9, -L * 0.7], [-w * 1.4, -L * 0.2], [0, 0], 'Z'], a, at);
    default: return shape(['M', [0, 0], 'C', [w * 1.3, -L * 0.1], [w * 1.3, -L], [0, -L], 'C', [-w * 1.3, -L], [-w * 1.3, -L * 0.1], [0, 0], 'Z'], a, at);
  }
}

/** One leaf pointing up from `at`. */
export function leaf(sh: LeafShape, L: number, W: number, a = 0, at: P = [0, 0]): string {
  const w = W / 2;
  if (sh === 'oval') return shape(['M', [0, 0], 'C', [w * 1.3, -L * 0.2], [w * 1.2, -L * 0.9], [0, -L], 'C', [-w * 1.2, -L * 0.9], [-w * 1.3, -L * 0.2], [0, 0], 'Z'], a, at);
  if (sh === 'serrated') {
    const n = 5, pts: (string | P)[] = ['M', [0, 0]];
    for (let i = 1; i <= n; i++) { const t = i / n, ww = w * Math.sin(Math.PI * Math.min(0.98, t * 0.95 + 0.05)); pts.push('L', [ww * 1.15, -L * (t - 0.5 / n)], 'L', [ww * 0.85, -L * t]); }
    pts.push('L', [0, -L]);
    for (let i = n; i >= 1; i--) { const t = i / n, ww = w * Math.sin(Math.PI * Math.min(0.98, t * 0.95 + 0.05)); pts.push('L', [-ww * 0.85, -L * t], 'L', [-ww * 1.15, -L * (t - 0.5 / n)]); }
    pts.push('Z');
    return shape(pts, a, at);
  }
  if (sh === 'fern') {
    let d = shape(['M', [-0.6, 0], 'L', [-0.4, -L], 'L', [0.4, -L], 'L', [0.6, 0], 'Z'], a, at);
    const n = 7;
    for (let i = 1; i <= n; i++) { const t = i / (n + 1), ll = W * 0.6 * (1 - t * 0.7); for (const sd of [-1, 1]) d += leaf('pointed', ll, ll * 0.35, a + sd * 1.0, mv(rot([0, -L * t], a), at)); }
    return d;
  }
  return shape(['M', [0, 0], 'C', [w * 1.2, -L * 0.3], [w * 0.6, -L * 0.8], [0, -L], 'C', [-w * 0.6, -L * 0.8], [-w * 1.2, -L * 0.3], [0, 0], 'Z'], a, at);
}

function centreParts(style: CentreStyle, r: number, at: P = [0, 0]): Part[] {
  if (style === 'none' || r <= 0) return [];
  if (style === 'disc') return [{ d: circle(at[0], at[1], r), role: 'centre', name: 'Centre' }];
  if (style === 'dots') {
    let d = circle(at[0], at[1], r * 0.55);
    const n = Math.max(6, Math.round(r * 1.2));
    for (let i = 0; i < n; i++) { const p = mv(rot([0, -r * 0.85], (i / n) * Math.PI * 2), at); d += circle(p[0], p[1], r * 0.14); }
    return [{ d, role: 'centre', name: 'Centre' }];
  }
  if (style === 'star') {
    const n = 8, pts: string[] = [];
    for (let i = 0; i < n * 2; i++) { const p = mv(rot([0, -(i % 2 ? r * 0.45 : r)], (i / (n * 2)) * Math.PI * 2), at); pts.push(`${f(p[0])} ${f(p[1])}`); }
    return [{ d: `M${pts.join('L')}Z`, role: 'centre', name: 'Centre' }];
  }
  // spiral: a ribbon spiral built from offset arcs
  const pts: P[] = [], back: P[] = [];
  for (let t = 0; t <= 1; t += 0.02) { const a = t * Math.PI * 5, rr = r * (0.15 + 0.85 * t), wdt = r * 0.12 * (0.4 + t); pts.push(mv([rr * Math.cos(a), rr * Math.sin(a)], at)); back.push(mv([(rr - wdt) * Math.cos(a), (rr - wdt) * Math.sin(a)], at)); }
  return [{ d: `M${[...pts, ...back.reverse()].map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`, role: 'centre', name: 'Centre spiral' }];
}

/** A whole flower with optional leaves and stem. */
export function flower(s: FlowerSpec, at: P = [0, 0], scale = 1): Part[] {
  const parts: Part[] = [];
  const n = Math.max(3, Math.min(36, Math.round(s.petals)));
  const L = s.length * scale, W = s.width * scale, tw = (s.twist * Math.PI) / 180;
  if (s.stem) {
    const sl = L * 2.6;
    parts.push({ d: shape(['M', [-1.2, 0], 'C', [-L * 0.4, sl * 0.4], [L * 0.3, sl * 0.7], [-0.8, sl], 'L', [1.6, sl], 'C', [L * 0.3 + 2.4, sl * 0.7], [-L * 0.4 + 2.4, sl * 0.4], [1.2, 0], 'Z'], 0, at), role: 'stem', name: 'Stem' });
  }
  if (s.leaves > 0) {
    let d = '';
    for (let i = 0; i < s.leaves; i++) {
      const sd = i % 2 ? 1 : -1, t = 0.5 + 0.35 * Math.floor(i / 2) / Math.max(1, Math.ceil(s.leaves / 2));
      const base: P = mv([0, L * 2.6 * t * (s.stem ? 1 : 0.4)], at);
      d += leaf(s.leafShape, L * 1.1, W * 1.1, sd * 0.9, base);
    }
    parts.push({ d, role: 'leaf', name: 'Leaves' });
  }
  const layers = Math.max(1, Math.min(3, Math.round(s.layers)));
  // Outer layer first (underneath), smaller inner layers on top.
  for (let l = 0; l < layers; l++) {
    const k = 1 - l * 0.28, off = (l % 2 ? Math.PI / n : 0) + tw * (l + 1) * 0.5;
    let d = '';
    for (let i = 0; i < n; i++) d += petal(s.shape, L * k, W * k, (i / n) * Math.PI * 2 + off, at);
    parts.push({ d, role: l % 2 ? 'petal2' : 'petal', name: `Petals ${l + 1}` });
  }
  parts.push(...centreParts(s.centre, s.centreSize * scale, at));
  return parts;
}

export function paisley(size: number, at: P = [0, 0], a = 0): Part[] {
  const s = size / 100;
  const outer = shape(['M', [0, 50], 'C', [-38, 50], [-42, 4], [-22, -22], 'C', [-8, -40], [18, -48], [26, -36], 'C', [34, -24], [20, -12], [12, -20], 'C', [8, -24], [14, -30], [18, -28], 'C', [8, -40], [-14, -24], [-14, -8], 'C', [-14, 14], [10, 22], [22, 30], 'C', [30, 36], [24, 50], [0, 50], 'Z'], a, at, s);
  const inner = shape(['M', [-2, 40], 'C', [-26, 40], [-28, 8], [-14, -6], 'C', [-10, 10], [6, 18], [14, 28], 'C', [18, 34], [12, 40], [-2, 40], 'Z'], a, at, s);
  let dots = '';
  for (let i = 0; i < 9; i++) { const t = i / 8, p = mv(rot([(-34 + 30 * t) * s * (1 - t * 0.2), (40 - 70 * t) * s], a), at); dots += circle(p[0], p[1], 1.8 * s); }
  return [{ d: outer, role: 'petal', name: 'Paisley' }, { d: inner, role: 'petal2', name: 'Paisley inner' }, { d: dots, role: 'accent', name: 'Paisley dots' }];
}

export function mandala(size: number, rings = 3, petals = 12, at: P = [0, 0]): Part[] {
  const R = size / 2, parts: Part[] = [];
  const shapes: PetalShape[] = ['lotus', 'pointed', 'round', 'teardrop'];
  for (let r = rings - 1; r >= 0; r--) {
    const k = (r + 1) / rings, n = petals + r * 4;
    let d = '';
    for (let i = 0; i < n; i++) d += petal(shapes[r % shapes.length], R * k * 0.55, (2 * Math.PI * R * k * 0.5) / n * 1.3, (i / n) * Math.PI * 2 + (r % 2 ? Math.PI / n : 0), mv(rot([0, -R * k * 0.4], (i / n) * Math.PI * 2 + (r % 2 ? Math.PI / n : 0)), at));
    parts.push({ d, role: r % 2 ? 'petal2' : 'petal', name: `Ring ${r + 1}` });
    let dots = '';
    for (let i = 0; i < n; i++) { const p = mv(rot([0, -R * k * 0.98], (i / n) * Math.PI * 2), at); dots += circle(p[0], p[1], Math.max(0.8, R * 0.018)); }
    parts.push({ d: dots, role: 'accent', name: `Dots ${r + 1}` });
  }
  parts.push(...centreParts('star', R * 0.18, at));
  return parts;
}

export function damask(size: number, at: P = [0, 0]): Part[] {
  const s = size / 100;
  const halfL: (string | P)[] = ['M', [0, -50], 'C', [-6, -40], [-22, -40], [-20, -26], 'C', [-18, -14], [-34, -16], [-38, -4], 'C', [-42, 8], [-28, 18], [-18, 12], 'C', [-26, 24], [-14, 38], [-4, 34], 'C', [-8, 42], [-4, 48], [0, 50], 'Z'];
  const L = shape(halfL, 0, at, s), R = shape(halfL.map((c) => (typeof c === 'string' ? c : [-c[0], c[1]] as P)), 0, at, s);
  const curlL = shape(['M', [-30, -30], 'C', [-44, -36], [-48, -20], [-40, -16], 'C', [-36, -14], [-34, -20], [-36, -22], 'C', [-42, -24], [-40, -30], [-30, -30], 'Z'], 0, at, s);
  const curlR = shape(['M', [30, -30], 'C', [44, -36], [48, -20], [40, -16], 'C', [36, -14], [34, -20], [36, -22], 'C', [42, -24], [40, -30], [30, -30], 'Z'], 0, at, s);
  return [{ d: L + R, role: 'petal', name: 'Damask' }, { d: curlL + curlR, role: 'accent', name: 'Damask scrolls' }, ...centreParts('disc', 5 * s, mv([0, 4 * s], at))];
}

export type BorderMotif = 'floral' | 'leaf' | 'paisley' | 'geometric';
/** A horizontal strip `len` × `h` (mm) of repeated motifs, centred on 0,0. */
export function border(len: number, h: number, motif: BorderMotif, at: P = [0, 0]): Part[] {
  const step = motif === 'geometric' ? h * 0.9 : h * 1.15, n = Math.max(1, Math.floor(len / step)), x0 = -((n - 1) * step) / 2;
  const parts: Part[] = [{ d: shape(['M', [-len / 2, -h / 2], 'L', [len / 2, -h / 2], 'L', [len / 2, -h / 2 + h * 0.06], 'L', [-len / 2, -h / 2 + h * 0.06], 'Z', 'M', [-len / 2, h / 2 - h * 0.06], 'L', [len / 2, h / 2 - h * 0.06], 'L', [len / 2, h / 2], 'L', [-len / 2, h / 2], 'Z'], 0, at), role: 'stem', name: 'Border lines' }];
  let a = '', b = '', c = '';
  for (let i = 0; i < n; i++) {
    const p = mv([x0 + i * step, 0], at);
    if (motif === 'floral') { for (const pt of flower({ ...DEFAULT_FLOWER, petals: 5, length: h * 0.28, width: h * 0.2, layers: 1, leaves: 0, stem: false, centre: 'disc', centreSize: h * 0.08 }, p)) { if (pt.role === 'centre') c += pt.d; else a += pt.d; } b += leaf('pointed', h * 0.3, h * 0.12, Math.PI / 2, mv(p, [step / 2 - h * 0.15, 0])); }
    else if (motif === 'leaf') { a += leaf('oval', h * 0.4, h * 0.2, -0.6, mv(p, [0, h * 0.18])) + leaf('oval', h * 0.4, h * 0.2, 0.6, mv(p, [0, h * 0.18])); c += circle(p[0], p[1] - h * 0.18, h * 0.06); }
    else if (motif === 'paisley') { for (const pt of paisley(h * 0.7, p, i % 2 ? Math.PI : 0)) { if (pt.role === 'accent') c += pt.d; else if (pt.role === 'petal2') b += pt.d; else a += pt.d; } }
    else { a += shape(['M', [0, -h * 0.32], 'L', [h * 0.32, 0], 'L', [0, h * 0.32], 'L', [-h * 0.32, 0], 'Z'], 0, p); c += circle(p[0], p[1], h * 0.08); }
  }
  if (a) parts.push({ d: a, role: 'petal', name: 'Border motifs' });
  if (b) parts.push({ d: b, role: motif === 'paisley' ? 'petal2' : 'leaf', name: 'Border details' });
  if (c) parts.push({ d: c, role: 'centre', name: 'Border centres' });
  return parts;
}

export type NeckShape = 'round' | 'u' | 'v' | 'boat';
/** Motifs along a neckline (width × depth, mm) — for neck and yoke embroidery or print. */
export function neckline(width: number, depth: number, shapeK: NeckShape, motifSize: number, at: P = [0, 0]): Part[] {
  const pts: P[] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -width / 2 + width * t;
    let y: number;
    if (shapeK === 'v') y = depth * (1 - Math.abs(2 * t - 1));
    else if (shapeK === 'boat') y = depth * Math.sin(Math.PI * t) * 0.6;
    else if (shapeK === 'u') y = depth * Math.min(1, Math.sin(Math.PI * t) * 1.35);
    else y = depth * Math.sin(Math.PI * t);
    pts.push([x, y]);
  }
  let len = 0; const cum = [0];
  for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len); }
  const n = Math.max(3, Math.floor(len / (motifSize * 1.05)));
  let a = '', b = '', c = '';
  for (let k = 0; k <= n; k++) {
    const target = (k / n) * len; let i = cum.findIndex((v) => v >= target); if (i < 1) i = 1;
    const p = mv(pts[i], at), ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    if (k % 2 === 0) for (const pt of flower({ ...DEFAULT_FLOWER, petals: 5, length: motifSize * 0.42, width: motifSize * 0.3, layers: 1, leaves: 0, stem: false, centre: 'disc', centreSize: motifSize * 0.12 }, p)) { if (pt.role === 'centre') c += pt.d; else a += pt.d; }
    else b += leaf('pointed', motifSize * 0.45, motifSize * 0.2, ang + Math.PI / 2, p) + leaf('pointed', motifSize * 0.45, motifSize * 0.2, ang - Math.PI / 2, p);
  }
  return [{ d: a, role: 'petal', name: 'Neckline flowers' }, { d: b, role: 'leaf', name: 'Neckline leaves' }, { d: c, role: 'centre', name: 'Neckline centres' }];
}

/** A wavy vine `len` mm long with leaves and flowers. */
export function vine(len: number, amp: number, leaves: number, flowers: number, at: P = [0, 0]): Part[] {
  const N = 80, top: P[] = [], bot: P[] = [];
  const y = (x: number) => amp * Math.sin((x / len) * Math.PI * 4);
  for (let i = 0; i <= N; i++) { const x = -len / 2 + (len * i) / N; top.push(mv([x, y(x) - 1.2], at)); bot.push(mv([x, y(x) + 1.2], at)); }
  const stem = `M${[...top, ...bot.reverse()].map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;
  let lf = '', fp = '', fc = '';
  for (let i = 0; i < leaves; i++) { const x = -len / 2 + (len * (i + 0.5)) / leaves, sd = i % 2 ? 1 : -1; lf += leaf('pointed', amp * 0.9, amp * 0.4, sd * 1.2, mv([x, y(x)], at)); }
  for (let i = 0; i < flowers; i++) { const x = -len / 2 + (len * (i + 0.5)) / flowers; for (const pt of flower({ ...DEFAULT_FLOWER, petals: 6, length: amp * 0.6, width: amp * 0.42, layers: 1, leaves: 0, stem: false, centre: 'disc', centreSize: amp * 0.18 }, mv([x, y(x)], at))) { if (pt.role === 'centre') fc += pt.d; else fp += pt.d; } }
  return [{ d: stem, role: 'stem', name: 'Vine' }, ...(lf ? [{ d: lf, role: 'leaf' as Role, name: 'Vine leaves' }] : []), ...(fp ? [{ d: fp, role: 'petal' as Role, name: 'Vine flowers' }] : []), ...(fc ? [{ d: fc, role: 'centre' as Role, name: 'Vine centres' }] : [])];
}

export const ROLE_LABEL: Record<Role, string> = { petal: 'Petals', petal2: 'Inner petals', centre: 'Centre', leaf: 'Leaves', stem: 'Stem / lines', accent: 'Details' };
export const DEFAULT_ROLE_COLOURS: Record<Role, string> = { petal: '#C2435E', petal2: '#F2A7B8', centre: '#E8B53C', leaf: '#3F7D4E', stem: '#2F5D3A', accent: '#7A1F3D' };
