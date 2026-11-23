// Packaging dielines — parametric nets for folding cartons, trays and
// corrugated boxes, drawn in millimetres (y down).
//
// Every line is one of: cut (die knife), crease (fold) or perf. Panels are
// named so the artwork template and the editor can label them. Sizes are the
// INSIDE size of the finished box; panel widths add the board thickness so the
// box closes around the product (a standard carton allowance — confirm the
// final dieline with your die maker before cutting steel).

export type LineKind = 'cut' | 'crease' | 'perf';
export interface DieLine { kind: LineKind; d: string }
export interface DiePanel { name: string; x: number; y: number; w: number; h: number; face?: boolean }
export interface Dieline {
  style: BoxStyleId; title: string;
  w: number; h: number;              // flat (blank) size, mm
  lines: DieLine[]; panels: DiePanel[];
  notes: string[];
  inside: { L: number; W: number; D: number }; t: number;
}

export type BoxStyleId = 'rte' | 'ste' | 'seal' | 'sleeve' | 'tray' | 'traylid' | 'matchbox' | 'rsc' | 'hsc' | 'fol' | 'pillow' | 'snap123' | 'crash' | 'gable' | 'mailer';
export interface BoxStyleDef { id: BoxStyleId; name: string; code: string; group: 'Folding carton' | 'Tray & lid' | 'Corrugated'; hint: string }
export const BOX_STYLES: BoxStyleDef[] = [
  { id: 'rte', name: 'Reverse tuck end', code: 'ECMA A20 type', group: 'Folding carton', hint: 'Top tuck on the back, bottom tuck on the front — cosmetics, pharma, retail.' },
  { id: 'ste', name: 'Straight tuck end', code: 'ECMA A20 type', group: 'Folding carton', hint: 'Both tucks on the back panel — a clean, uninterrupted front.' },
  { id: 'seal', name: 'Seal end (glued)', code: 'ECMA A10 type', group: 'Folding carton', hint: 'Glued top and bottom flaps — cereal, food and multipacks.' },
  { id: 'snap123', name: 'Tuck top, 1-2-3 snap-lock bottom', code: 'ECMA A55 type', group: 'Folding carton', hint: 'Bottom flaps fold in order 1-2-3 and lock — heavier products, no glue at the bottom.' },
  { id: 'crash', name: 'Tuck top, crash-lock bottom', code: 'ECMA A60 type', group: 'Folding carton', hint: 'Pre-glued bottom pops open in one move — fast packing, strong base.' },
  { id: 'gable', name: 'Gable box with handle', code: 'Gable carrier', group: 'Folding carton', hint: 'Roof-shaped top with a carry handle, crash-lock bottom — gifts, food, take-away.' },
  { id: 'pillow', name: 'Pillow box', code: 'ECMA F70.01', group: 'Folding carton', hint: 'Curved ends that close by pressing in — gifts, small items. Make a sample first.' },
  { id: 'sleeve', name: 'Sleeve', code: 'Open ends', group: 'Folding carton', hint: 'A wrap that slides over a tray or product.' },
  { id: 'tray', name: 'Four-corner tray', code: 'Glued corners', group: 'Tray & lid', hint: 'Open tray with corner flaps glued inside the walls.' },
  { id: 'traylid', name: 'Tray with lid', code: 'Two pieces', group: 'Tray & lid', hint: 'A tray and a slightly larger lid on one sheet — gift boxes.' },
  { id: 'matchbox', name: 'Tray and sleeve', code: 'Matchbox / drawer', group: 'Tray & lid', hint: 'A four-corner tray that slides into a sleeve — drawer boxes.' },
  { id: 'mailer', name: 'Mailer box (roll end, tuck top)', code: 'FEFCO 0427', group: 'Corrugated', hint: 'E-commerce mailer: double front wall, ears locked in, tuck-in lid. No glue.' },
  { id: 'rsc', name: 'Regular slotted container', code: 'FEFCO 0201', group: 'Corrugated', hint: 'The standard shipping box: flaps meet in the middle.' },
  { id: 'hsc', name: 'Half slotted container', code: 'FEFCO 0200', group: 'Corrugated', hint: 'Like 0201 with no top flaps — open top.' },
  { id: 'fol', name: 'Full overlap container', code: 'FEFCO 0203', group: 'Corrugated', hint: 'All flaps the full width — outer flaps overlap completely for strength.' },
];

export interface DieOptions {
  style: BoxStyleId;
  L: number; W: number; D: number;   // inside length (front), width (side), depth (height), mm
  t: number;                         // board thickness, mm
  glue: number;                      // glue flap width, mm
  tuck: number;                      // tuck flap depth, mm (tuck styles)
  lidDepth: number;                  // lid height, mm (tray with lid)
  /** glue flap end bevel, degrees from square (0 = straight ends). Folder-gluer guides use about 7–15°, hand-glued samples often 30–45°. */
  glueAngle?: number;
  /** which panel the glue flap is attached to: the narrow side panel (glued inside the back) or the back panel (glued inside the side) */
  gluePos?: 'side' | 'back';
  /** half-round thumb notch on the panel the top tuck slides behind */
  thumbNotch?: boolean;
}
export const DEFAULT_DIE: DieOptions = { style: 'rte', L: 80, W: 40, D: 120, t: 0.4, glue: 14, tuck: 15, lidDepth: 30, glueAngle: 45, gluePos: 'side', thumbNotch: false };
export const GLUE_ANGLES = [0, 10, 15, 30, 45] as const;

// ── Path helpers ──
const f = (n: number) => String(Math.round(n * 100) / 100);
const P = (pts: [number, number][], close = false) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + (close ? ' Z' : '');
const seg = (a: [number, number], b: [number, number]) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
/** Quarter-circle corner as a cubic from a to b around the corner point c. */
const K = 0.5523;
const corner = (a: [number, number], c: [number, number], b: [number, number]) =>
  ` C${f(a[0] + (c[0] - a[0]) * K)} ${f(a[1] + (c[1] - a[1]) * K)} ${f(b[0] + (c[0] - b[0]) * K)} ${f(b[1] + (c[1] - b[1]) * K)} ${f(b[0])} ${f(b[1])}`;

/** Circular arc as cubic Béziers (≤90° each) from angle a0 to a1 around (cx, cy); continues the current path. */
function arcC(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2))), da = (a1 - a0) / segs, h = (4 / 3) * Math.tan(da / 4) * r;
  let out = '';
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + i * da, t1 = t0 + da;
    const p0 = [cx + r * Math.cos(t0), cy + r * Math.sin(t0)], p1 = [cx + r * Math.cos(t1), cy + r * Math.sin(t1)];
    out += ` C${f(p0[0] - h * Math.sin(t0))} ${f(p0[1] + h * Math.cos(t0))} ${f(p1[0] + h * Math.sin(t1))} ${f(p1[1] - h * Math.cos(t1))} ${f(p1[0])} ${f(p1[1])}`;
  }
  return out;
}
/** Arc from (a, y) to (b, y) rising `rise` mm up (dir −1) or down (dir +1) in the middle, as cubics. */
function bowPath(a: number, b: number, y: number, rise: number, dir: 1 | -1): string {
  const c = (b - a) / 2, r = (c * c + rise * rise) / (2 * rise), cx = a + c, cy = y - dir * (r - rise);
  const half = Math.asin(Math.min(1, c / r));
  // angles measured in screen coords (y down): the bow's middle is at angle +90° (down) or −90° (up)
  const mid = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  const a0 = dir === 1 ? mid + half : mid - half, a1 = dir === 1 ? mid - half : mid + half;
  return `M${f(a)} ${f(y)}` + arcC(cx, cy, r, a0, a1);
}

class Net {
  lines: DieLine[] = []; panels: DiePanel[] = [];
  cut(d: string) { this.lines.push({ kind: 'cut', d }); }
  crease(d: string) { this.lines.push({ kind: 'crease', d }); }
  panel(name: string, x: number, y: number, w: number, h: number, face = true) { this.panels.push({ name, x, y, w, h, face }); }
}

/**
 * A tuck closure (panel of depth `cd`) and its tuck flap (depth `td`) on panel [x0, x1].
 * `dir` −1 grows upward from y0, +1 downward. Shoulders (1.5 mm) and rounded tuck corners.
 */
function tuckClosure(n: Net, x0: number, x1: number, y0: number, cd: number, td: number, dir: 1 | -1, label: string) {
  const y1 = y0 + dir * cd, y2 = y1 + dir * td;
  const sh = Math.min(1.5, (x1 - x0) / 20), r = Math.min(td * 0.75, (x1 - x0) / 4, 12);
  n.crease(seg([x0, y0], [x1, y0]));
  n.crease(seg([x0 + sh, y1], [x1 - sh, y1]));
  n.cut(seg([x0, y0], [x0, y1]) + ` L${f(x0 + sh)} ${f(y1)}`);
  n.cut(seg([x1, y0], [x1, y1]) + ` L${f(x1 - sh)} ${f(y1)}`);
  let d = `M${f(x0 + sh)} ${f(y1)} L${f(x0 + sh)} ${f(y2 - dir * r)}`;
  d += corner([x0 + sh, y2 - dir * r], [x0 + sh, y2], [x0 + sh + r, y2]);
  d += ` L${f(x1 - sh - r)} ${f(y2)}`;
  d += corner([x1 - sh - r, y2], [x1 - sh, y2], [x1 - sh, y2 - dir * r]);
  d += ` L${f(x1 - sh)} ${f(y1)}`;
  n.cut(d);
  n.panel(`${label} closure`, x0, Math.min(y0, y1), x1 - x0, cd, false);
  n.panel(`${label} tuck`, x0, Math.min(y1, y2), x1 - x0, td, false);
}

/** A dust flap on a side panel [x0, x1]: tapered on the side that meets the tuck. */
function dustFlap(n: Net, x0: number, x1: number, y0: number, depth: number, dir: 1 | -1, taperRight: boolean) {
  const w = x1 - x0, y1 = y0 + dir * depth, rel = 1, tp = Math.min(depth * 0.45, w * 0.35);
  n.crease(seg([x0, y0], [x1, y0]));
  const pts: [number, number][] = taperRight
    ? [[x0, y0], [x0 + rel, y0 + dir * 2], [x0 + rel, y1], [x1 - tp, y1], [x1 - rel, y0 + dir * 2], [x1, y0]]
    : [[x0, y0], [x0 + rel, y0 + dir * 2], [x0 + tp, y1], [x1 - rel, y1], [x1 - rel, y0 + dir * 2], [x1, y0]];
  n.cut(P(pts));
}

/** A rectangular flap with small side reliefs (seal-end and slotted boxes). */
function flap(n: Net, x0: number, x1: number, y0: number, depth: number, dir: 1 | -1, relief: number, name: string) {
  const y1 = y0 + dir * depth;
  n.crease(seg([x0, y0], [x1, y0]));
  n.cut(P([[x0, y0], [x0 + relief, y0], [x0 + relief, y1], [x1 - relief, y1], [x1 - relief, y0], [x1, y0]]));
  n.panel(name, x0 + relief, Math.min(y0, y1), x1 - x0 - 2 * relief, depth, false);
}

function glueFlap(n: Net, x: number, y0: number, y1: number, g: number, angle = 45) {
  const tp = Math.min(g * Math.tan((Math.max(0, Math.min(60, angle)) * Math.PI) / 180), (y1 - y0) / 4);
  n.crease(seg([x, y0], [x, y1]));
  n.cut(P([[x, y0], [x - g, y0 + tp], [x - g, y1 - tp], [x, y1]]));
  n.panel('Glue flap', x - g, y0 + tp, g, y1 - y0 - 2 * tp, false);
}

// ── Box styles ──
/** Body columns for a four-panel carton: glue flap then the panels in order; `back` puts the glue flap on the back panel. */
function bodyCols(Lp: number, Wp: number, g: number, gluePos: 'side' | 'back' = 'side') {
  const order: ('Side' | 'Front' | 'Back')[] = gluePos === 'back' ? ['Back', 'Side', 'Front', 'Side'] : ['Side', 'Front', 'Side', 'Back'];
  let x = g; const cols = order.map((name) => { const w = name === 'Side' ? Wp : Lp; const c = { name, x0: x, x1: x + w }; x += w; return c; });
  return { cols, end: x, front: cols.find((c) => c.name === 'Front')!, back: cols.find((c) => c.name === 'Back')!, sides: cols.filter((c) => c.name === 'Side') };
}

function tuckBox(o: DieOptions, straight: boolean): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t;
  const g = o.glue, td = Math.max(8, o.tuck), dd = Math.min(Wp * 0.85, Lp / 2 - 1);
  const top = Wp + td, { cols, end, front, back } = bodyCols(Lp, Wp, g, o.gluePos);
  const y0 = top, y1 = y0 + Dp;
  cols.forEach((c) => n.panel(c.name, c.x0, y0, c.x1 - c.x0, Dp));
  cols.slice(1).forEach((c) => n.crease(seg([c.x0, y0], [c.x0, y1])));
  n.cut(seg([end, y0], [end, y1]));
  glueFlap(n, g, y0, y1, g, o.glueAngle);
  // top: tuck on the back; bottom: on the front (reverse) or the back (straight)
  tuckClosure(n, back.x0, back.x1, y0, Wp, td, -1, 'Top');
  if (o.thumbNotch) {
    // half-round notch in the front panel's top edge so the tuck can be pulled open
    const r = Math.min(10, Lp / 6, Dp / 6), cx = (front.x0 + front.x1) / 2;
    n.cut(`M${f(front.x0)} ${f(y0)} L${f(cx - r)} ${f(y0)}` + arcC(cx, y0, r, Math.PI, 0) + ` L${f(front.x1)} ${f(y0)}`);
  } else n.cut(seg([front.x0, y0], [front.x1, y0]));
  const bot = straight ? back : front, open = straight ? front : back;
  tuckClosure(n, bot.x0, bot.x1, y1, Wp, td, 1, 'Bottom'); n.cut(seg([open.x0, y1], [open.x1, y1]));
  // dust flaps on both sides, top and bottom; each tapers on the edge next to the panel that carries the tuck
  const rightOf = (i: number) => cols[(i + 1) % cols.length];
  cols.forEach((c, i) => {
    if (c.name !== 'Side') return;
    dustFlap(n, c.x0, c.x1, y0, dd, -1, rightOf(i) === back);
    dustFlap(n, c.x0, c.x1, y1, dd, 1, rightOf(i) === bot);
  });
  const H = y1 + Wp + td;
  return { style: straight ? 'ste' : 'rte', title: straight ? 'Straight tuck end carton' : 'Reverse tuck end carton', w: end, h: H, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Dust flaps ${f(dd)} mm, tuck ${f(td)} mm, glue flap ${f(g)} mm${o.glueAngle != null ? ` with ${f(o.glueAngle)}° ends` : ''}.`, o.gluePos === 'back' ? 'Glue flap on the back panel — glue it to the inside of the side panel.' : 'Glue flap on the side panel — glue it to the inside of the back panel.'] };
}

function sealEnd(o: DieOptions): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t, g = o.glue;
  const major = Math.max(10, Wp - 2), minor = Math.max(8, Wp * 0.45);
  const { cols, end: x4 } = bodyCols(Lp, Wp, g, o.gluePos), y0 = major, y1 = y0 + Dp;
  cols.forEach((c) => n.panel(c.name, c.x0, y0, c.x1 - c.x0, Dp));
  cols.slice(1).forEach((c) => n.crease(seg([c.x0, y0], [c.x0, y1])));
  n.cut(seg([x4, y0], [x4, y1]));
  glueFlap(n, g, y0, y1, g, o.glueAngle);
  for (const c of cols) {
    const side = c.name === 'Side', depth = side ? minor : major, nm = side ? 'Dust flap' : 'Top flap';
    flap(n, c.x0, c.x1, y0, depth, -1, 1, nm); flap(n, c.x0, c.x1, y1, depth, 1, 1, nm.replace('Top', 'Bottom'));
  }
  return { style: 'seal', title: 'Seal end carton', w: x4, h: y1 + major, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Major flaps ${f(major)} mm overlap and are glued; dust flaps ${f(minor)} mm.`] };
}

function sleeve(o: DieOptions): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D, g = o.glue;
  const { cols, end: x4 } = bodyCols(Lp, Wp, g, o.gluePos), x0 = g, y0 = 0, y1 = Dp;
  cols.forEach((c) => n.panel(c.name, c.x0, y0, c.x1 - c.x0, Dp));
  cols.slice(1).forEach((c) => n.crease(seg([c.x0, y0], [c.x0, y1])));
  glueFlap(n, x0, y0, y1, g, o.glueAngle);
  n.cut(P([[x0, y0], [x4, y0], [x4, y1], [x0, y1]]));
  return { style: 'sleeve', title: 'Sleeve', w: x4, h: Dp, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t, notes: ['Open at both ends; the depth is the sleeve width along the product.'] };
}

/** Four-corner tray at (ox, oy): base L×W, walls D, corner flaps on the long walls glued inside the end walls. */
function trayAt(n: Net, ox: number, oy: number, L: number, W: number, D: number, label: string) {
  // Corner flaps fold onto the end wall (length W); the two flaps on one wall must not overlap.
  const bx0 = ox + D, by0 = oy + D, bx1 = bx0 + L, by1 = by0 + W, cf = Math.max(4, Math.min(D - 1, W / 2 - 1));
  n.panel(`${label} base`, bx0, by0, L, W);
  n.panel(`${label} front wall`, bx0, by1, L, D); n.panel(`${label} back wall`, bx0, oy, L, D);
  n.panel(`${label} end wall`, ox, by0, D, W); n.panel(`${label} end wall`, bx1, by0, D, W);
  // base edges fold
  n.crease(P([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], true));
  // long walls with corner flaps (flaps fold at the wall ends)
  for (const [y0, dir] of [[by0, -1], [by1, 1]] as [number, 1 | -1][]) {
    const y1 = y0 + dir * D;
    n.crease(seg([bx0, y0], [bx0, y1])); n.crease(seg([bx1, y0], [bx1, y1]));
    n.cut(seg([bx0 - cf, y1], [bx1 + cf, y1]));
    const ch = Math.min(D * 0.25, cf);  // 45°-ish relief at the base so the flap clears the base fold
    n.cut(P([[bx0, y0 + dir * 0.5], [bx0 - cf, y0 + dir * ch], [bx0 - cf, y1]]));
    n.cut(P([[bx1, y0 + dir * 0.5], [bx1 + cf, y0 + dir * ch], [bx1 + cf, y1]]));
  }
  // end walls
  n.cut(P([[bx0, by0], [ox, by0], [ox, by1], [bx0, by1]]));
  n.cut(P([[bx1, by0], [bx1 + D, by0], [bx1 + D, by1], [bx1, by1]]));
}

function tray(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, L = o.L + 2 * t, W = o.W + 2 * t, D = o.D;
  trayAt(n, 0, 0, L, W, D, 'Tray');
  return { style: 'tray', title: 'Four-corner tray', w: L + 2 * D, h: W + 2 * D, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t, notes: ['Glue the corner flaps to the inside of the end walls.'] };
}

function trayLid(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, L = o.L + 2 * t, W = o.W + 2 * t, D = o.D;
  const lL = L + 2 * t + 1, lW = W + 2 * t + 1, lD = Math.max(10, Math.min(o.lidDepth, D));
  trayAt(n, 0, 0, L, W, D, 'Tray');
  const gap = 12, ox = L + 2 * D + gap;
  trayAt(n, ox, 0, lL, lW, lD, 'Lid');
  return { style: 'traylid', title: 'Tray with lid', w: ox + lL + 2 * lD, h: Math.max(W + 2 * D, lW + 2 * lD), lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Lid inside ${f(lL)} × ${f(lW)} mm (tray outside + 1 mm play), ${f(lD)} mm deep.`] };
}

/** Tray that slides into a sleeve: tray as tray(), sleeve wraps the tray's outside with 1 mm play. */
function matchbox(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, L = o.L + 2 * t, W = o.W + 2 * t, D = o.D;
  trayAt(n, 0, 0, L, W, D, 'Tray');
  // sleeve inside = tray outside + play; its length runs along the tray width
  const sL = L + 2 * t + 1, sD = D + 2 * t + 1, sLen = W + 2 * t, g = Math.max(o.glue, 12);
  const oy = W + 2 * D + 14, x0 = g, x1 = x0 + sL, x2 = x1 + sD, x3 = x2 + sL, x4 = x3 + sD;
  n.panel('Sleeve top', x0, oy, sL, sLen); n.panel('Sleeve side', x1, oy, sD, sLen); n.panel('Sleeve bottom', x2, oy, sL, sLen); n.panel('Sleeve side', x3, oy, sD, sLen);
  for (const x of [x1, x2, x3]) n.crease(seg([x, oy], [x, oy + sLen]));
  glueFlap(n, x0, oy, oy + sLen, g, o.glueAngle);
  n.cut(P([[x0, oy], [x4, oy], [x4, oy + sLen], [x0, oy + sLen]]));
  return { style: 'matchbox', title: 'Tray and sleeve', w: Math.max(L + 2 * D, x4), h: oy + sLen, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Sleeve inside ${f(sL)} × ${f(sD)} mm (tray outside + 1 mm play), ${f(sLen)} mm long.`] };
}

function slotted(o: DieOptions, topFlaps: boolean, full = false): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + 2 * t, Wp = o.W + 2 * t, Dp = o.D + 2 * t, g = Math.max(o.glue, 25);
  // 0201: flaps half the width (outer flaps meet); 0203: flaps the full width (outer flaps overlap).
  const fd = full ? Wp : Wp / 2 + t, slot = Math.max(3, 2 * t + 1);
  const x0 = g, x1 = x0 + Lp, x2 = x1 + Wp, x3 = x2 + Lp, x4 = x3 + Wp;
  const y0 = topFlaps ? fd : 0, y1 = y0 + Dp;
  n.panel('Front', x0, y0, Lp, Dp); n.panel('Side', x1, y0, Wp, Dp); n.panel('Back', x2, y0, Lp, Dp); n.panel('Side', x3, y0, Wp, Dp);
  for (const x of [x1, x2, x3]) n.crease(seg([x, y0], [x, y1]));
  n.cut(seg([x4, y0], [x4, y1]));
  glueFlap(n, x0, y0, y1, g, o.glueAngle);
  const cols: [number, number][] = [[x0, x1], [x1, x2], [x2, x3], [x3, x4]];
  cols.forEach(([a, b], i) => {
    const ra = i === 0 ? 0 : slot / 2, rb = i === 3 ? 0 : slot / 2;
    const fl = (y: number, dir: 1 | -1, nm: string) => {
      const yy = y + dir * fd;
      n.crease(seg([a, y], [b, y]));
      n.cut(P([[a, y], [a + ra, y], [a + ra, yy], [b - rb, yy], [b - rb, y], [b, y]]));
      n.panel(nm, a + ra, Math.min(y, yy), b - a - ra - rb, fd, false);
    };
    fl(y1, 1, 'Bottom flap');
    if (topFlaps) fl(y0, -1, 'Top flap'); else n.cut(seg([a, y0], [b, y0]));
  });
  return { style: full ? 'fol' : topFlaps ? 'rsc' : 'hsc', title: full ? 'Full overlap container (FEFCO 0203)' : topFlaps ? 'Regular slotted container (FEFCO 0201)' : 'Half slotted container (FEFCO 0200)', w: x4, h: y1 + fd, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Flaps ${f(fd)} mm (${full ? 'outer flaps overlap fully' : 'meet in the middle'}), slots ${f(slot)} mm, manufacturer's joint ${f(g)} mm.`] };
}

/**
 * Pillow box (ECMA F70.01 type). Closed: length L, width W, thickness D in the middle.
 * Cross-section is two arcs of chord W and rise D/2, so each panel is that arc's length wide.
 * Each end is a curved crease (rise k) with a matching curved cut beyond it; pressing the ends in
 * along the curved creases closes the box. k = D/2 is the usual starting point — make a sample.
 */
function pillow(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, W = o.W + t, s = Math.max(2, Math.min(W * 0.45, (o.D + 2 * t) / 2)), L = o.L;
  const R = (W * W / 4 + s * s) / (2 * s), arc = 2 * R * Math.asin(Math.min(1, W / (2 * R)));
  const pw = arc, k = s, g = o.glue;
  const x0 = g, x1 = x0 + pw, x2 = x1 + pw, y0 = k, y1 = y0 + L;
  n.panel('Front', x0, y0, pw, L); n.panel('Back', x1, y0, pw, L);
  n.crease(seg([x1, y0], [x1, y1]));
  glueFlap(n, x0, y0, y1, g, o.glueAngle);
  n.cut(seg([x2, y0], [x2, y1]));
  const arcPath = bowPath;
  for (const [a, b] of [[x0, x1], [x1, x2]] as [number, number][]) {
    // top end: crease bows into the panel, cut bows out beyond the panel edge
    n.crease(arcPath(a, b, y0, k, 1)); n.cut(arcPath(a, b, y0, k, -1));
    n.crease(arcPath(a, b, y1, k, -1)); n.cut(arcPath(a, b, y1, k, 1));
    n.panel('End flap', a, y0 - k, b - a, k, false); n.panel('End flap', a, y1, b - a, k, false);
  }
  return { style: 'pillow', title: 'Pillow box', w: x2, h: y1 + k, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Panels ${f(pw)} mm wide (arc over ${f(W)} mm with ${f(s)} mm rise), end curves ${f(k)} mm.`, 'Curved creases need a sample: score depth and curve rise depend on the board.'] };
}

// ── Lock bottoms, gable and mailer ──
// Shapes follow how each style folds; sizes are derived from L, W, D and the board, not copied from a drawing.

/** Four-panel body with a tuck top (tuck on the back, dust flaps on the sides). Returns the columns and edges. */
function tuckTopBody(n: Net, o: DieOptions, extraTop = 0) {
  const t = o.t, Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t, g = o.glue, td = Math.max(8, o.tuck), dd = Math.min(Wp * 0.85, Lp / 2 - 1);
  const { cols, end, front, back } = bodyCols(Lp, Wp, g, o.gluePos);
  const y0 = Wp + td + extraTop, y1 = y0 + Dp;
  cols.forEach((c) => n.panel(c.name, c.x0, y0, c.x1 - c.x0, Dp));
  cols.slice(1).forEach((c) => n.crease(seg([c.x0, y0], [c.x0, y1])));
  n.cut(seg([end, y0], [end, y1]));
  glueFlap(n, g, y0, y1, g, o.glueAngle);
  return { t, Lp, Wp, Dp, g, td, dd, cols, end, front, back, y0, y1 };
}
function addTuckTop(n: Net, o: DieOptions, b: ReturnType<typeof tuckTopBody>) {
  const { cols, front, back, y0, Wp, td, dd, Lp, Dp } = b;
  tuckClosure(n, back.x0, back.x1, y0, Wp, td, -1, 'Top');
  if (o.thumbNotch) { const r = Math.min(10, Lp / 6, Dp / 6), cx = (front.x0 + front.x1) / 2; n.cut(`M${f(front.x0)} ${f(y0)} L${f(cx - r)} ${f(y0)}` + arcC(cx, y0, r, Math.PI, 0) + ` L${f(front.x1)} ${f(y0)}`); }
  else n.cut(seg([front.x0, y0], [front.x1, y0]));
  cols.forEach((c, i) => { if (c.name === 'Side') dustFlap(n, c.x0, c.x1, y0, dd, -1, cols[(i + 1) % cols.length] === back); });
}

/**
 * 1-2-3 snap-lock bottom. Fold the two side flaps in (1), then the back flap (2), which reaches past the
 * middle and has a slit; the front flap (3) has a tongue that pushes through the slit and locks.
 */
function addSnapBottom(n: Net, b: ReturnType<typeof tuckTopBody>) {
  const { cols, front, back, y1, Wp } = b;
  const half = Wp / 2, backD = Wp * 0.62, tongueD = Wp * 0.24;
  for (const c of cols) {
    const w = c.x1 - c.x0;
    n.crease(seg([c.x0, y1], [c.x1, y1]));
    if (c.name === 'Side') {
      // (1) side flap: half the width, both ends angled so it clears the walls
      const d = half - 1, a = Math.min(d * 0.6, w * 0.25);
      n.cut(P([[c.x0, y1], [c.x0 + a, y1 + d], [c.x1 - a, y1 + d], [c.x1, y1]]));
      n.panel('Bottom flap 1', c.x0 + a, y1, w - 2 * a, d, false);
    } else if (c === back) {
      // (2) back flap with the locking slit at the box middle
      const sl = w * 0.34 + 2, cx = (c.x0 + c.x1) / 2, a = Math.min(6, w * 0.06);
      n.cut(P([[c.x0, y1], [c.x0 + 1, y1 + 1], [c.x0 + a, y1 + backD], [c.x1 - a, y1 + backD], [c.x1 - 1, y1 + 1], [c.x1, y1]]));
      n.cut(seg([cx - sl / 2, y1 + half], [cx + sl / 2, y1 + half]));
      n.panel('Bottom flap 2', c.x0 + a, y1, w - 2 * a, backD, false);
    } else {
      // (3) front flap: half the width plus a centred tongue that goes through the slit
      const tw = w * 0.34, cx = (c.x0 + c.x1) / 2, a = Math.min(6, w * 0.06), r = Math.min(4, tw / 4);
      n.cut(P([[c.x0, y1], [c.x0 + 1, y1 + 1], [c.x0 + a, y1 + half], [cx - tw / 2, y1 + half], [cx - tw / 2, y1 + half + tongueD - r]]) + corner([cx - tw / 2, y1 + half + tongueD - r], [cx - tw / 2, y1 + half + tongueD], [cx - tw / 2 + r, y1 + half + tongueD]) + ` L${f(cx + tw / 2 - r)} ${f(y1 + half + tongueD)}` + corner([cx + tw / 2 - r, y1 + half + tongueD], [cx + tw / 2, y1 + half + tongueD], [cx + tw / 2, y1 + half + tongueD - r]) + ` L${f(cx + tw / 2)} ${f(y1 + half)} L${f(c.x1 - a)} ${f(y1 + half)} L${f(c.x1 - 1)} ${f(y1 + 1)} L${f(c.x1)} ${f(y1)}`);
      n.crease(seg([cx - tw / 2, y1 + half], [cx + tw / 2, y1 + half]));
      n.panel('Bottom flap 3', c.x0 + a, y1, w - 2 * a, half + tongueD, false);
    }
  }
  return y1 + Math.max(backD, half + tongueD);
}

/**
 * Crash-lock (auto-lock) bottom. Each side flap carries a 45° web: its outer triangle is glued to the
 * neighbouring front/back flap at the converter, so the bottom folds flat with the carton and springs
 * into place when the carton is opened. Front and back flaps overlap past the middle and hook.
 */
function addCrashBottom(n: Net, b: ReturnType<typeof tuckTopBody>) {
  const { cols, y1, Wp } = b;
  const half = Wp / 2, major = Math.min(Wp * 0.8, half + Math.max(8, Wp * 0.2));
  cols.forEach((c, i) => {
    const w = c.x1 - c.x0;
    n.crease(seg([c.x0, y1], [c.x1, y1]));
    if (c.name === 'Side') {
      const d = half;
      // web crease from the corner it shares with the next panel, at 45°
      const nextIsRight = true;
      const cx = nextIsRight ? c.x1 : c.x0, dir = nextIsRight ? -1 : 1;
      n.cut(P([[c.x0, y1], [c.x0 + 1, y1 + 1], [c.x0 + 1, y1 + d], [c.x1, y1 + d]]));
      n.crease(seg([cx, y1], [cx + dir * Math.min(d, w), y1 + Math.min(d, w)]));
      n.panel('Glue area', c.x1 - Math.min(d, w) * 0.7, y1 + Math.min(d, w) * 0.15, Math.min(d, w) * 0.6, Math.min(d, w) * 0.5, false);
      n.panel('Lock web', c.x0 + 1, y1, w - 1, d, false);
    } else {
      // front/back flap: past the middle, 45° lead-in on the side that swings, small hook notch to lock
      const a = Math.min(major, w * 0.3), hookW = Math.min(10, w * 0.12), hookD = Math.min(6, major * 0.2);
      const hx = c.x0 + w * 0.5;
      n.cut(P([[c.x0, y1], [c.x0, y1 + half], [c.x0 + a, y1 + major], [hx - hookW / 2, y1 + major], [hx - hookW / 2, y1 + major - hookD], [hx + hookW / 2, y1 + major - hookD], [hx + hookW / 2, y1 + major], [c.x1 - 2, y1 + major], [c.x1 - 2, y1 + 1], [c.x1, y1]]));
      n.panel(i === 0 ? 'Bottom flap' : 'Bottom flap', c.x0 + a, y1, w - a - 2, major, false);
    }
  });
  return y1 + major;
}

function snap123(o: DieOptions): Dieline {
  const n = new Net(), b = tuckTopBody(n, o); addTuckTop(n, o, b); const h = addSnapBottom(n, b);
  return { style: 'snap123', title: 'Tuck top, 1-2-3 snap-lock bottom', w: b.end, h, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t: b.t,
    notes: ['Bottom: fold the side flaps (1), then the back flap (2), then push the front tongue (3) through the slit.', `Tuck ${f(b.td)} mm, glue flap ${f(b.g)} mm.`] };
}
function crash(o: DieOptions): Dieline {
  const n = new Net(), b = tuckTopBody(n, o); addTuckTop(n, o, b); const h = addCrashBottom(n, b);
  return { style: 'crash', title: 'Tuck top, crash-lock bottom', w: b.end, h, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t: b.t,
    notes: ['Converter glues the side seam and the four bottom webs; the bottom opens into place in one move.', 'Make a sample: web angle and hook depth are tuned per board.'] };
}

/** Gable box: crash-lock bottom, roof panels on the front and back with a stacked handle, gusseted sides. */
function gable(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t, g = o.glue;
  const roof = Wp * 0.71, handle = Math.max(30, Math.min(60, o.D * 0.45)), top = roof + handle;
  const { cols, end } = bodyCols(Lp, Wp, g, o.gluePos);
  const y0 = top, y1 = y0 + Dp, yr = y0 - roof, yh = yr - handle;
  cols.forEach((c) => n.panel(c.name, c.x0, y0, c.x1 - c.x0, Dp));
  // body creases run up through the roof so the gussets stay hinged to the roof panels
  cols.slice(1).forEach((c) => n.crease(seg([c.x0, yr], [c.x0, y1])));
  n.cut(seg([end, yr], [end, y1]));
  glueFlap(n, g, yr, y1, g, o.glueAngle);
  for (const c of cols) {
    const w = c.x1 - c.x0, cx = (c.x0 + c.x1) / 2;
    n.crease(seg([c.x0, y0], [c.x1, y0]));
    if (c.name === 'Side') {
      // gusset: diagonals from the base corners to the middle, then straight up; folds in as the roof closes
      const mid = y0 - Math.min(Wp / 2, roof - 1);
      n.crease(seg([c.x0, y0], [cx, mid])); n.crease(seg([c.x1, y0], [cx, mid])); n.crease(seg([cx, mid], [cx, yr]));
      n.cut(seg([c.x0, yr], [c.x1, yr]));
      n.panel('Gusset', c.x0, yr, w, roof, false);
    } else {
      n.crease(seg([c.x0, yr], [c.x1, yr]));
      n.cut(P([[c.x0, yr], [c.x0, yh], [c.x1, yh], [c.x1, yr]]));
      // handle hole (the two handle panels lie back to back)
      const hw = Math.min(90, w * 0.55), hh = Math.min(22, handle * 0.45), hy = yh + handle * 0.45, r = hh / 2;
      n.cut(`M${f(cx - hw / 2 + r)} ${f(hy - r)} L${f(cx + hw / 2 - r)} ${f(hy - r)}` + arcC(cx + hw / 2 - r, hy, r, -Math.PI / 2, Math.PI / 2) + ` L${f(cx - hw / 2 + r)} ${f(hy + r)}` + arcC(cx - hw / 2 + r, hy, r, Math.PI / 2, (3 * Math.PI) / 2) + ' Z');
      n.panel('Roof', c.x0, yr, w, roof); n.panel('Handle', c.x0, yh, w, handle, false);
    }
  }
  // the glue flap and side cut stop at the roof line on the outer edge
  const b = { t, Lp, Wp, Dp, g, td: 0, dd: 0, cols, end, front: cols.find((c) => c.name === 'Front')!, back: cols.find((c) => c.name === 'Back')!, y0, y1 };
  const h = addCrashBottom(n, b as any);
  return { style: 'gable', title: 'Gable box with handle', w: end, h, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Roof ${f(roof)} mm on each side (about 45°), handle ${f(handle)} mm, crash-lock bottom.`, 'Glue or staple the two handle panels together after filling.'] };
}

/**
 * Mailer, FEFCO 0427 type. Base in the middle; the front wall rolls over into a double wall whose tabs
 * lock into slots in the base; the side walls are double with ears that tuck behind the rolled front and
 * the back wall; the back wall carries the lid, its dust flaps and the front tuck.
 */
function mailer(o: DieOptions): Dieline {
  const n = new Net(), t = o.t, L = o.L + 2 * t, W = o.W + 2 * t, D = o.D + 2 * t;
  const ear = Math.max(10, D - 2 * t - 2), lidW = W + t, tuck = Math.max(12, D - 4), dust = Math.max(10, D - 3);
  const ox = 2 * D + 6, oy = tuck + lidW + D;          // base origin
  const bx0 = ox, bx1 = ox + L, by0 = oy, by1 = oy + W;
  n.panel('Base', bx0, by0, L, W, false);
  // side walls: outer (D) then inner (D - t), folded over
  for (const side of [-1, 1] as const) {
    const xa = side === -1 ? bx0 : bx1, xo = xa + side * D, xi = xo + side * (D - t);
    n.crease(seg([xa, by0], [xa, by1])); n.crease(seg([xo, by0 + t], [xo, by1 - t]));
    n.panel('Side wall', Math.min(xa, xo), by0, D, W);
    // ears on the outer wall, folding against the front and back walls
    for (const [y, dir] of [[by0, -1], [by1, 1]] as [number, 1 | -1][]) {
      n.crease(seg([xa, y], [xo, y]));
      n.cut(P([[xa, y], [xa + side * 1, y + dir * 1], [xa + side * 2, y + dir * ear], [xo - side * Math.min(ear * 0.5, D * 0.4), y + dir * ear], [xo, y + dir * 2], [xo, y]]));
    }
    // inner wall outline with locking lugs
    const lug = Math.min(12, W * 0.12), ly = by0 + W * 0.3;
    n.cut(P([[xo, by0 + t], [xi, by0 + t + 2], [xi, ly], [xi + side * 4, ly], [xi + side * 4, ly + lug], [xi, ly + lug], [xi, by1 - W * 0.3 - lug], [xi + side * 4, by1 - W * 0.3 - lug], [xi + side * 4, by1 - W * 0.3], [xi, by1 - W * 0.3], [xi, by1 - t - 2], [xo, by1 - t]]));
  }
  // front wall (outer D), rolled inner wall (D - t) with tabs into base slots
  const fy0 = by1, fy1 = fy0 + D, fy2 = fy1 + D - t, tabW = Math.min(25, L * 0.12), tabD = Math.min(6, D * 0.3);
  n.crease(seg([bx0, fy0], [bx1, fy0])); n.crease(seg([bx0, fy1], [bx1, fy1]));
  n.panel('Front wall', bx0, fy0, L, D); n.panel('Front inner wall', bx0, fy1, L, D - t, false);
  n.cut(seg([bx0, fy0], [bx0, fy2])); n.cut(seg([bx1, fy0], [bx1, fy2]));
  const t1 = bx0 + L * 0.25, t2 = bx1 - L * 0.25;
  n.cut(P([[bx0, fy2], [t1 - tabW / 2, fy2], [t1 - tabW / 2, fy2 + tabD], [t1 + tabW / 2, fy2 + tabD], [t1 + tabW / 2, fy2], [t2 - tabW / 2, fy2], [t2 - tabW / 2, fy2 + tabD], [t2 + tabW / 2, fy2 + tabD], [t2 + tabW / 2, fy2], [bx1, fy2]]));
  // slots in the base, just inside the front edge (behind the rolled wall and the ears)
  const sy = by1 - 3 * t - 3;
  for (const tx of [t1, t2]) n.cut(P([[tx - tabW / 2 - 1, sy], [tx + tabW / 2 + 1, sy], [tx + tabW / 2 + 1, sy + 3], [tx - tabW / 2 - 1, sy + 3]], true));
  // back wall, lid, lid dust flaps, front tuck
  const ky1 = by0, ky0 = ky1 - D, ly0 = ky0 - lidW, tuckY = ly0 - tuck;
  n.crease(seg([bx0, ky1], [bx1, ky1])); n.crease(seg([bx0, ky0], [bx1, ky0])); n.crease(seg([bx0, ly0], [bx1, ly0]));
  n.panel('Back wall', bx0, ky0, L, D); n.panel('Lid', bx0, ly0, L, lidW);
  n.cut(seg([bx0, ky0], [bx0, ky1])); n.cut(seg([bx1, ky0], [bx1, ky1]));
  for (const side of [-1, 1] as const) {
    const xa = side === -1 ? bx0 : bx1, xd = xa + side * dust;
    n.crease(seg([xa, ly0], [xa, ky0]));
    n.cut(P([[xa, ky0], [xa + side * 1, ky0 - 2], [xd, ky0 - Math.min(10, lidW * 0.15)], [xd, ly0 + Math.min(dust * 0.6, lidW * 0.3)], [xa + side * 2, ly0], [xa, ly0]]));
  }
  tuckClosure(n, bx0, bx1, ly0, 0.0001, tuck, -1, 'Lid front');
  const w = bx1 + 2 * D + 6, h = fy2 + tabD;
  return { style: 'mailer', title: 'Mailer box (FEFCO 0427)', w, h, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: ['Fold the side walls up and over, tuck the ears in, roll the front wall over the ears and push its tabs into the base slots, then close the lid and tuck it in.', 'Corrugated E or B flute is usual. Make a sample.'] };
}

export function makeDieline(o: DieOptions): Dieline {
  const c = { ...o, L: Math.max(10, o.L), W: Math.max(10, o.W), D: Math.max(5, o.D), t: Math.max(0.1, Math.min(8, o.t)), glue: Math.max(6, o.glue), tuck: Math.max(8, o.tuck) };
  switch (c.style) {
    case 'rte': return tuckBox(c, false);
    case 'ste': return tuckBox(c, true);
    case 'seal': return sealEnd(c);
    case 'sleeve': return sleeve(c);
    case 'tray': return tray(c);
    case 'traylid': return trayLid(c);
    case 'rsc': return slotted(c, true);
    case 'hsc': return slotted(c, false);
    case 'fol': return slotted(c, true, true);
    case 'matchbox': return matchbox(c);
    case 'pillow': return pillow(c);
    case 'snap123': return snap123(c);
    case 'crash': return crash(c);
    case 'gable': return gable(c);
    case 'mailer': return mailer(c);
  }
}

/** Length of every line of one kind (mm) — knife and crease rule lengths for the die quote. */
export function ruleLength(d: Dieline, kind: LineKind): number {
  let total = 0;
  for (const l of d.lines) {
    if (l.kind !== kind) continue;
    const nums = (l.d.match(/-?\d*\.?\d+/g) || []).map(Number);
    const cmds = l.d.match(/[MLCZ]/g) || [];
    let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
    for (const c of cmds) {
      if (c === 'M') { cx = sx = nums[i++]; cy = sy = nums[i++]; }
      else if (c === 'L') { const x = nums[i++], y = nums[i++]; total += Math.hypot(x - cx, y - cy); cx = x; cy = y; }
      else if (c === 'C') { const p = nums.slice(i, i + 6); i += 6; let px = cx, py = cy; for (let s = 1; s <= 12; s++) { const u = s / 12, v = 1 - u; const x = v * v * v * cx + 3 * v * v * u * p[0] + 3 * v * u * u * p[2] + u * u * u * p[4]; const y = v * v * v * cy + 3 * v * v * u * p[1] + 3 * v * u * u * p[3] + u * u * u * p[5]; total += Math.hypot(x - px, y - py); px = x; py = y; } cx = p[4]; cy = p[5]; }
      else if (c === 'Z') { total += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; }
    }
  }
  return total;
}

export const DIE_COLOURS = { cut: '#EC008C', crease: '#00A0E3', perf: '#F7A600', bleed: '#9AD0F5' } as const;

/** SVG of the dieline (mm units). Layers are groups with ids CUT, CREASE, BLEED, LABELS. */
export function dielineSvg(d: Dieline, o: { bleed?: number; labels?: boolean; layers?: Partial<Record<'cut' | 'crease' | 'bleed' | 'labels' | 'dims', boolean>>; margin?: number; art?: string } = {}): string {
  const m = o.margin ?? 12, b = o.bleed ?? 3, L = { cut: true, crease: true, bleed: true, labels: true, dims: true, ...(o.layers || {}) };
  const W = d.w + 2 * m, H = d.h + 2 * m;
  const of = (k: LineKind) => d.lines.filter((l) => l.kind === k).map((l) => l.d).join(' ');
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}mm" height="${f(H)}mm"><rect width="${f(W)}" height="${f(H)}" fill="#FFFFFF"/><g transform="translate(${m} ${m})">`;
  if (L.bleed && b > 0) g += `<g id="BLEED"><path d="${of('cut')}" fill="none" stroke="${DIE_COLOURS.bleed}" stroke-opacity="0.45" stroke-width="${f(2 * b)}" stroke-linejoin="round"/></g>`;
  if (o.art) g += `<g id="ARTWORK">${o.art}</g>`;
  if (L.labels) {
    g += '<g id="LABELS" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">';
    for (const p of d.panels) {
      if (p.w < 8 || p.h < 6) continue;
      const fs = Math.max(2.2, Math.min(p.face ? 7 : 3.4, p.w / 9, p.h / 4));
      g += `<text x="${f(p.x + p.w / 2)}" y="${f(p.y + p.h / 2 + fs * 0.35)}" font-size="${f(fs)}" fill="${p.face ? '#9AA3AF' : '#B8BEC7'}">${p.name}</text>`;
      if (p.face && p.h > 30) g += `<text x="${f(p.x + p.w / 2)}" y="${f(p.y + p.h / 2 + fs * 0.35 + fs * 1.1)}" font-size="${f(fs * 0.42)}" fill="#B8BEC7">${f(p.w)} × ${f(p.h)} mm</text>`;
    }
    g += '</g>';
  }
  if (L.crease) g += `<g id="CREASE"><path d="${of('crease')}" fill="none" stroke="${DIE_COLOURS.crease}" stroke-width="0.35" stroke-dasharray="3 1.6"/></g>`;
  if (L.cut) g += `<g id="CUT"><path d="${of('cut')}" fill="none" stroke="${DIE_COLOURS.cut}" stroke-width="0.35" stroke-linejoin="round"/></g>`;
  if (L.dims) {
    const y = d.h + 6, x = d.w + 6;
    g += `<g id="DIMENSIONS" font-family="Arial, Helvetica, sans-serif" font-size="2.6" fill="#6B7280" stroke="#9CA3AF" stroke-width="0.2">`
      + `<path d="M0 ${f(y)}H${f(d.w)}M0 ${f(y - 1.5)}V${f(y + 1.5)}M${f(d.w)} ${f(y - 1.5)}V${f(y + 1.5)}"/><text stroke="none" x="${f(d.w / 2)}" y="${f(y + 4)}" text-anchor="middle">${f(d.w)} mm</text>`
      + `<path d="M${f(x)} 0V${f(d.h)}M${f(x - 1.5)} 0H${f(x + 1.5)}M${f(x - 1.5)} ${f(d.h)}H${f(x + 1.5)}"/><text stroke="none" x="${f(x + 1.5)}" y="${f(d.h / 2)}" transform="rotate(90 ${f(x + 1.5)} ${f(d.h / 2)})" text-anchor="middle">${f(d.h)} mm</text></g>`;
  }
  return g + '</g></svg>';
}

/** Simple isometric view of the closed box (inside size) for the preview. */
export function boxIsoSvg(o: { L: number; W: number; D: number }, colours = { front: '#FFFFFF', side: '#EEF0F4', top: '#F7F8FA' }): string {
  const c = Math.cos(Math.PI / 6), sn = 0.5;
  const pt = (x: number, y: number, z: number): [number, number] => [(x - y) * c, (x + y) * sn - z];
  const { L, W, D } = o;
  const faces: [[number, number][], string][] = [
    [[pt(L, W, 0), pt(L, 0, 0), pt(L, 0, D), pt(L, W, D)], colours.side],
    [[pt(0, W, 0), pt(L, W, 0), pt(L, W, D), pt(0, W, D)], colours.front],
    [[pt(0, W, D), pt(L, W, D), pt(L, 0, D), pt(0, 0, D)], colours.top],
  ];
  const all = faces.flatMap(([ps]) => ps), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0, pad = Math.max(w, h) * 0.04, sw = Math.max(w, h) / 220;
  const body = faces.map(([ps, fill]) => `<path d="M${ps.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z" fill="${fill}" stroke="#0B0B12" stroke-width="${f(sw)}" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0 - pad)} ${f(y0 - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}">${body}</svg>`;
}
