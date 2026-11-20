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

export type BoxStyleId = 'rte' | 'ste' | 'seal' | 'sleeve' | 'tray' | 'traylid' | 'rsc' | 'hsc';
export interface BoxStyleDef { id: BoxStyleId; name: string; code: string; group: 'Folding carton' | 'Tray & lid' | 'Corrugated'; hint: string }
export const BOX_STYLES: BoxStyleDef[] = [
  { id: 'rte', name: 'Reverse tuck end', code: 'ECMA A20 type', group: 'Folding carton', hint: 'Top tuck on the back, bottom tuck on the front — cosmetics, pharma, retail.' },
  { id: 'ste', name: 'Straight tuck end', code: 'ECMA A20 type', group: 'Folding carton', hint: 'Both tucks on the back panel — a clean, uninterrupted front.' },
  { id: 'seal', name: 'Seal end (glued)', code: 'ECMA A10 type', group: 'Folding carton', hint: 'Glued top and bottom flaps — cereal, food and multipacks.' },
  { id: 'sleeve', name: 'Sleeve', code: 'Open ends', group: 'Folding carton', hint: 'A wrap that slides over a tray or product.' },
  { id: 'tray', name: 'Four-corner tray', code: 'Glued corners', group: 'Tray & lid', hint: 'Open tray with corner flaps glued inside the walls.' },
  { id: 'traylid', name: 'Tray with lid', code: 'Two pieces', group: 'Tray & lid', hint: 'A tray and a slightly larger lid on one sheet — gift boxes.' },
  { id: 'rsc', name: 'Regular slotted container', code: 'FEFCO 0201', group: 'Corrugated', hint: 'The standard shipping box: flaps meet in the middle.' },
  { id: 'hsc', name: 'Half slotted container', code: 'FEFCO 0200', group: 'Corrugated', hint: 'Like 0201 with no top flaps — open top.' },
];

export interface DieOptions {
  style: BoxStyleId;
  L: number; W: number; D: number;   // inside length (front), width (side), depth (height), mm
  t: number;                         // board thickness, mm
  glue: number;                      // glue flap width, mm
  tuck: number;                      // tuck flap depth, mm (tuck styles)
  lidDepth: number;                  // lid height, mm (tray with lid)
}
export const DEFAULT_DIE: DieOptions = { style: 'rte', L: 80, W: 40, D: 120, t: 0.4, glue: 14, tuck: 15, lidDepth: 30 };

// ── Path helpers ──
const f = (n: number) => String(Math.round(n * 100) / 100);
const P = (pts: [number, number][], close = false) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + (close ? ' Z' : '');
const seg = (a: [number, number], b: [number, number]) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
/** Quarter-circle corner as a cubic from a to b around the corner point c. */
const K = 0.5523;
const corner = (a: [number, number], c: [number, number], b: [number, number]) =>
  ` C${f(a[0] + (c[0] - a[0]) * K)} ${f(a[1] + (c[1] - a[1]) * K)} ${f(b[0] + (c[0] - b[0]) * K)} ${f(b[1] + (c[1] - b[1]) * K)} ${f(b[0])} ${f(b[1])}`;

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

function glueFlap(n: Net, x: number, y0: number, y1: number, g: number) {
  const tp = Math.min(g * 0.9, (y1 - y0) / 4);
  n.crease(seg([x, y0], [x, y1]));
  n.cut(P([[x, y0], [x - g, y0 + tp], [x - g, y1 - tp], [x, y1]]));
  n.panel('Glue flap', x - g, y0 + tp, g, y1 - y0 - 2 * tp, false);
}

// ── Box styles ──
function tuckBox(o: DieOptions, straight: boolean): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t;
  const g = o.glue, td = Math.max(8, o.tuck), dd = Math.min(Wp * 0.85, Lp / 2 - 1);
  const top = Wp + td, x0 = g, x1 = x0 + Wp, x2 = x1 + Lp, x3 = x2 + Wp, x4 = x3 + Lp;
  const y0 = top, y1 = y0 + Dp;
  // panels: glue | side | front | side | back
  n.panel('Side', x0, y0, Wp, Dp); n.panel('Front', x1, y0, Lp, Dp); n.panel('Side', x2, y0, Wp, Dp); n.panel('Back', x3, y0, Lp, Dp);
  for (const x of [x1, x2, x3]) n.crease(seg([x, y0], [x, y1]));
  n.cut(seg([x4, y0], [x4, y1]));
  glueFlap(n, x0, y0, y1, g);
  // top: tuck on the back; bottom: on the front (reverse) or the back (straight)
  tuckClosure(n, x3, x4, y0, Wp, td, -1, 'Top');
  n.cut(seg([x1, y0], [x2, y0]));
  if (straight) { tuckClosure(n, x3, x4, y1, Wp, td, 1, 'Bottom'); n.cut(seg([x1, y1], [x2, y1])); }
  else { tuckClosure(n, x1, x2, y1, Wp, td, 1, 'Bottom'); n.cut(seg([x3, y1], [x4, y1])); }
  // dust flaps on both sides, top and bottom; taper toward the panel that carries the tuck
  dustFlap(n, x0, x1, y0, dd, -1, false); dustFlap(n, x2, x3, y0, dd, -1, true);
  if (straight) { dustFlap(n, x0, x1, y1, dd, 1, false); dustFlap(n, x2, x3, y1, dd, 1, true); }
  else { dustFlap(n, x0, x1, y1, dd, 1, true); dustFlap(n, x2, x3, y1, dd, 1, false); }
  const H = y1 + Wp + td;
  return { style: straight ? 'ste' : 'rte', title: straight ? 'Straight tuck end carton' : 'Reverse tuck end carton', w: x4, h: H, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Dust flaps ${f(dd)} mm, tuck ${f(td)} mm, glue flap ${f(g)} mm.`, 'Glue the flap to the inside of the back panel.'] };
}

function sealEnd(o: DieOptions): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t, g = o.glue;
  const major = Math.max(10, Wp - 2), minor = Math.max(8, Wp * 0.45);
  const x0 = g, x1 = x0 + Wp, x2 = x1 + Lp, x3 = x2 + Wp, x4 = x3 + Lp, y0 = major, y1 = y0 + Dp;
  n.panel('Side', x0, y0, Wp, Dp); n.panel('Front', x1, y0, Lp, Dp); n.panel('Side', x2, y0, Wp, Dp); n.panel('Back', x3, y0, Lp, Dp);
  for (const x of [x1, x2, x3]) n.crease(seg([x, y0], [x, y1]));
  n.cut(seg([x4, y0], [x4, y1]));
  glueFlap(n, x0, y0, y1, g);
  for (const [a, b, depth, nm] of [[x0, x1, minor, 'Dust flap'], [x1, x2, major, 'Top flap'], [x2, x3, minor, 'Dust flap'], [x3, x4, major, 'Top flap']] as [number, number, number, string][]) {
    flap(n, a, b, y0, depth, -1, 1, nm); flap(n, a, b, y1, depth, 1, 1, nm.replace('Top', 'Bottom'));
  }
  return { style: 'seal', title: 'Seal end carton', w: x4, h: y1 + major, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Major flaps ${f(major)} mm overlap and are glued; dust flaps ${f(minor)} mm.`] };
}

function sleeve(o: DieOptions): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + t, Wp = o.W + t, Dp = o.D, g = o.glue;
  const x0 = g, x1 = x0 + Wp, x2 = x1 + Lp, x3 = x2 + Wp, x4 = x3 + Lp, y0 = 0, y1 = Dp;
  n.panel('Side', x0, y0, Wp, Dp); n.panel('Front', x1, y0, Lp, Dp); n.panel('Side', x2, y0, Wp, Dp); n.panel('Back', x3, y0, Lp, Dp);
  for (const x of [x1, x2, x3]) n.crease(seg([x, y0], [x, y1]));
  glueFlap(n, x0, y0, y1, g);
  n.cut(P([[x0, y0], [x4, y0], [x4, y1], [x0, y1]]));
  return { style: 'sleeve', title: 'Sleeve', w: x4, h: Dp, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t, notes: ['Open at both ends; the depth is the sleeve width along the product.'] };
}

/** Four-corner tray at (ox, oy): base L×W, walls D, corner flaps on the long walls glued inside the end walls. */
function trayAt(n: Net, ox: number, oy: number, L: number, W: number, D: number, label: string) {
  const bx0 = ox + D, by0 = oy + D, bx1 = bx0 + L, by1 = by0 + W, cf = Math.max(4, D - 1);
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
    n.cut(P([[bx0, y0 + dir * 0.5], [bx0 - cf, y0 + dir * (D * 0.25)], [bx0 - cf, y1]]));
    n.cut(P([[bx1, y0 + dir * 0.5], [bx1 + cf, y0 + dir * (D * 0.25)], [bx1 + cf, y1]]));
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

function slotted(o: DieOptions, topFlaps: boolean): Dieline {
  const n = new Net(), t = o.t;
  const Lp = o.L + 2 * t, Wp = o.W + 2 * t, Dp = o.D + 2 * t, g = Math.max(o.glue, 25);
  const fd = Wp / 2 + t, slot = Math.max(3, 2 * t + 1);
  const x0 = g, x1 = x0 + Lp, x2 = x1 + Wp, x3 = x2 + Lp, x4 = x3 + Wp;
  const y0 = topFlaps ? fd : 0, y1 = y0 + Dp;
  n.panel('Front', x0, y0, Lp, Dp); n.panel('Side', x1, y0, Wp, Dp); n.panel('Back', x2, y0, Lp, Dp); n.panel('Side', x3, y0, Wp, Dp);
  for (const x of [x1, x2, x3]) n.crease(seg([x, y0], [x, y1]));
  n.cut(seg([x4, y0], [x4, y1]));
  glueFlap(n, x0, y0, y1, g);
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
  return { style: topFlaps ? 'rsc' : 'hsc', title: topFlaps ? 'Regular slotted container (FEFCO 0201)' : 'Half slotted container (FEFCO 0200)', w: x4, h: y1 + fd, lines: n.lines, panels: n.panels, inside: { L: o.L, W: o.W, D: o.D }, t,
    notes: [`Flaps ${f(fd)} mm (meet in the middle), slots ${f(slot)} mm, manufacturer's joint ${f(g)} mm.`] };
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
