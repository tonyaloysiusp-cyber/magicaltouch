// SVG → vector PDF for the site's own generated artwork (team kits, garment
// print files, patterns, rangoli). Walks the SVG and draws every element
// with jsPDF's path operators, so shapes, motifs and letter outlines stay
// real vectors; only embedded photos/logos are pictures.
//
// Supported: svg/g/defs/use, path (all commands incl. arcs), rect, circle,
// ellipse, line, polyline, polygon, image (PNG/JPEG data URLs; SVG data URLs
// are drawn as vectors), simple text, transforms, opacity, fill-rule,
// stroke width/caps/joins, clip-path and userSpaceOnUse <pattern> fills
// (tiled as vectors), linear and radial gradients (drawn as fine vector
// bands clipped to the shape, with stop transparency), and live text in the
// real font (embedded TTF, retypeable) when the fonts are supplied.
// No browser APIs: it runs in tests too.

export type Mat = [number, number, number, number, number, number];
const I: Mat = [1, 0, 0, 1, 0, 0];
export const mul = (a: Mat, b: Mat): Mat => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function parseTransform(s: string | undefined): Mat {
  let m: Mat = I;
  if (!s) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t: RegExpExecArray | null;
  while ((t = re.exec(s))) {
    const a = t[2].trim().split(/[\s,]+/).map(Number);
    let n: Mat = I;
    switch (t[1]) {
      case 'matrix': n = [a[0], a[1], a[2], a[3], a[4], a[5]]; break;
      case 'translate': n = [1, 0, 0, 1, a[0] || 0, a[1] || 0]; break;
      case 'scale': n = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0]; break;
      case 'rotate': {
        const r = ((a[0] || 0) * Math.PI) / 180, c = Math.cos(r), s2 = Math.sin(r);
        n = [c, s2, -s2, c, 0, 0];
        if (a.length > 2) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case 'skewX': n = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0]; break;
      case 'skewY': n = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
    }
    m = mul(m, n);
  }
  return m;
}

// ---------------------------------------------------------------- paths

export type Seg = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];

function arcToCubics(x1: number, y1: number, rx: number, ry: number, phi: number, fa: number, fs: number, x2: number, y2: number): Seg[] {
  if (!rx || !ry) return [['L', x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const p = (phi * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (fa === fs) co = -co;
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const out: Seg[] = [];
  const d = dt / n, k = (4 / 3) * Math.tan(d / 4);
  for (let i = 0; i < n; i++) {
    const a1 = t1, a2 = t1 + d;
    const e1 = [Math.cos(a1), Math.sin(a1)], e2 = [Math.cos(a2), Math.sin(a2)];
    const pt = (ex: number, ey: number) => [cx + rx * cp * ex - ry * sp * ey, cy + rx * sp * ex + ry * cp * ey];
    const c1 = pt(e1[0] - k * e1[1], e1[1] + k * e1[0]), c2 = pt(e2[0] + k * e2[1], e2[1] - k * e2[0]), p2 = pt(e2[0], e2[1]);
    out.push(['C', c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]]);
    t1 = a2;
  }
  return out;
}

/** Any SVG path data → absolute M / L / C / Z segments. */
export function parsePath(d: string): Seg[] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const out: Seg[] = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = '';
  const num = () => Number(toks[i++]);
  const more = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (C) {
      case 'M': { x = ox + num(); y = oy + num(); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; break; }
      case 'L': { x = ox + num(); y = oy + num(); out.push(['L', x, y]); break; }
      case 'H': { x = ox + num(); out.push(['L', x, y]); break; }
      case 'V': { y = oy + num(); out.push(['L', x, y]); break; }
      case 'C': { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; out.push(['C', a[0], a[1], a[2], a[3], a[4], a[5]]); lcx = a[2]; lcy = a[3]; x = a[4]; y = a[5]; break; }
      case 'S': { const r1x = /[CS]/.test(prev) ? 2 * x - lcx : x, r1y = /[CS]/.test(prev) ? 2 * y - lcy : y; const a = [ox + num(), oy + num(), ox + num(), oy + num()]; out.push(['C', r1x, r1y, a[0], a[1], a[2], a[3]]); lcx = a[0]; lcy = a[1]; x = a[2]; y = a[3]; break; }
      case 'Q': { const qx = ox + num(), qy = oy + num(), ex = ox + num(), ey = oy + num(); out.push(['C', x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey]); lqx = qx; lqy = qy; x = ex; y = ey; break; }
      case 'T': { const qx = /[QT]/.test(prev) ? 2 * x - lqx : x, qy = /[QT]/.test(prev) ? 2 * y - lqy : y; const ex = ox + num(), ey = oy + num(); out.push(['C', x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey]); lqx = qx; lqy = qy; x = ex; y = ey; break; }
      case 'A': { const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), ex = ox + num(), ey = oy + num(); out.push(...arcToCubics(x, y, rx, ry, ph, fa, fs, ex, ey)); x = ex; y = ey; break; }
      case 'Z': { out.push(['Z']); x = sx; y = sy; break; }
      default: i++;
    }
    prev = C;
    if (C === 'Z' && more()) continue;
    if (!more() && C !== 'Z') continue;
  }
  return out;
}

// ---------------------------------------------------------------- tiny XML

export interface Node { tag: string; a: Record<string, string>; kids: Node[]; text: string }
export function parseXml(src: string): Node {
  const root: Node = { tag: '#root', a: {}, kids: [], text: '' };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const a: Record<string, string> = {};
      (m[4] || '').replace(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_s, k, _q, v1, v2) => { a[k] = (v1 ?? v2 ?? '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); return ''; });
      const n: Node = { tag: m[3].replace(/^svg:/, ''), a, kids: [], text: '' };
      top.kids.push(n);
      if (!m[5]) stack.push(n);
    } else if (m[6]) top.text += m[6].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return root;
}

// ---------------------------------------------------------------- paint

const NAMED: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080', yellow: '#ffff00', orange: '#ffa500', currentcolor: '#000000' };
export function parseColour(v: string | undefined, defs?: Map<string, Node>): { r: number; g: number; b: number; a: number } | null | 'pattern' {
  if (!v) return null;
  v = v.trim().toLowerCase();
  if (v === 'none' || v === 'transparent') return null;
  const u = v.match(/^url\(#([^)]+)\)/);
  if (u) {
    const d = defs?.get(u[1]);
    if (d?.tag === 'pattern') return 'pattern';
    const stop = d?.kids.find((k) => k.tag === 'stop');
    return stop ? parseColour(styleOf(stop)['stop-color'] || stop.a['stop-color'] || '#000') : null;
  }
  if (NAMED[v]) v = NAMED[v];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = v.match(/^rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[\s,/]+/).map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  return null;
}
function styleOf(n: Node): Record<string, string> {
  const o: Record<string, string> = {};
  (n.a.style || '').split(';').forEach((kv) => { const i = kv.indexOf(':'); if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
  return o;
}

interface Ctx { m: Mat; fill: string; stroke: string; sw: number; op: number; fop: number; sop: number; rule: string; join: string; cap: string; font: number; anchor: string; family?: string; weight?: string; style?: string; spacing?: number; paintOrder?: string; dash?: number[] }

// ---------------------------------------------------------------- render

export interface PdfLike {
  moveTo(x: number, y: number): any; lineTo(x: number, y: number): any; curveTo(a: number, b: number, c: number, d: number, e: number, f: number): any; close(): any;
  fill(): any; fillEvenOdd(): any; stroke(): any; clip(): any; clipEvenOdd?(): any; discardPath(): any;
  setFillColor(r: number, g: number, b: number): any; setDrawColor(r: number, g: number, b: number): any; setLineWidth(w: number): any;
  setLineJoin?(j: string): any; setLineCap?(c: string): any;
  saveGraphicsState(): any; restoreGraphicsState(): any; setGState?(g: any): any; GState?: any;
  addImage?(data: string, fmt: string, x: number, y: number, w: number, h: number, alias?: string, compression?: string, rotation?: number): any;
  text?(t: string, x: number, y: number, opts?: any): any; setFontSize?(n: number): any; setTextColor?(r: number, g: number, b: number): any;
  setFont?(name: string, style?: string): any;
  /** Live-text fonts registered by the caller: face key ("Family|700|0") → jsPDF font name. */
  __faces?: Map<string, string>;
}

export interface RenderStats { paths: number; images: number; skipped: string[] }

/**
 * Draws `svg` onto the current PDF page. `scale` maps SVG user units to PDF
 * units (e.g. mm → mm = 1); `x0`/`y0` offset the drawing.
 */
export function renderSvgToPdf(pdf: PdfLike, svg: string, opts: { scale?: number; x0?: number; y0?: number } = {}): RenderStats {
  const root = parseXml(svg);
  const svgEl = root.kids.find((k) => k.tag === 'svg');
  const stats: RenderStats = { paths: 0, images: 0, skipped: [] };
  if (!svgEl) return stats;
  const defs = new Map<string, Node>();
  const index = (n: Node) => { if (n.a.id) defs.set(n.a.id, n); n.kids.forEach(index); };
  index(svgEl);
  const vb = (svgEl.a.viewBox || '').split(/[\s,]+/).map(Number);
  const s = opts.scale ?? 1;
  let base: Mat = [s, 0, 0, s, opts.x0 || 0, opts.y0 || 0];
  if (vb.length === 4 && (vb[0] || vb[1])) base = mul(base, [1, 0, 0, 1, -vb[0], -vb[1]]);
  const ctx0: Ctx = { m: base, fill: '#000', stroke: 'none', sw: 1, op: 1, fop: 1, sop: 1, rule: 'nonzero', join: 'miter', cap: 'butt', font: 16, anchor: 'start' };
  walk(pdf, svgEl, ctx0, defs, stats, 0);
  return stats;
}

const attr = (n: Node, k: string) => styleOf(n)[k] ?? n.a[k];
const numA = (n: Node, k: string, d = 0) => { const v = attr(n, k); return v === undefined ? d : parseFloat(v) || 0; };

function inherit(n: Node, c: Ctx): Ctx {
  const o = { ...c };
  const g = (k: string) => attr(n, k);
  if (g('fill') !== undefined) o.fill = g('fill')!;
  if (g('stroke') !== undefined) o.stroke = g('stroke')!;
  if (g('stroke-width') !== undefined) o.sw = parseFloat(g('stroke-width')!) || 0;
  if (g('fill-opacity') !== undefined) o.fop = parseFloat(g('fill-opacity')!);
  if (g('stroke-opacity') !== undefined) o.sop = parseFloat(g('stroke-opacity')!);
  if (g('fill-rule') !== undefined) o.rule = g('fill-rule')!;
  if (g('stroke-linejoin') !== undefined) o.join = g('stroke-linejoin')!;
  if (g('stroke-linecap') !== undefined) o.cap = g('stroke-linecap')!;
  if (g('font-size') !== undefined) o.font = parseFloat(g('font-size')!) || o.font;
  if (g('text-anchor') !== undefined) o.anchor = g('text-anchor')!;
  if (g('font-family') !== undefined) o.family = g('font-family')!;
  if (g('font-weight') !== undefined) o.weight = g('font-weight')!;
  if (g('font-style') !== undefined) o.style = g('font-style')!;
  if (g('letter-spacing') !== undefined) o.spacing = parseFloat(g('letter-spacing')!) || 0;
  if (g('paint-order') !== undefined) o.paintOrder = g('paint-order')!;
  if (g('stroke-dasharray') !== undefined) { const v = g('stroke-dasharray')!; o.dash = v === 'none' ? undefined : v.split(/[\s,]+/).map(Number).filter((x) => x > 0); }
  o.op = c.op; // group opacity is applied with a graphics state, not multiplied in
  return o;
}

function shapeSegs(n: Node): Seg[] | null {
  switch (n.tag) {
    case 'path': return parsePath(n.a.d || '');
    case 'rect': {
      const x = numA(n, 'x'), y = numA(n, 'y'), w = numA(n, 'width'), h = numA(n, 'height');
      let rx = numA(n, 'rx', NaN), ry = numA(n, 'ry', NaN);
      if (isNaN(rx)) rx = isNaN(ry) ? 0 : ry; if (isNaN(ry)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx) return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
      return parsePath(`M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`);
    }
    case 'circle': case 'ellipse': {
      const cx = numA(n, 'cx'), cy = numA(n, 'cy');
      const rx = n.tag === 'circle' ? numA(n, 'r') : numA(n, 'rx'), ry = n.tag === 'circle' ? numA(n, 'r') : numA(n, 'ry');
      if (!rx || !ry) return null;
      return parsePath(`M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`);
    }
    case 'line': return [['M', numA(n, 'x1'), numA(n, 'y1')], ['L', numA(n, 'x2'), numA(n, 'y2')]];
    case 'polyline': case 'polygon': {
      const p = (n.a.points || '').trim().split(/[\s,]+/).map(Number);
      if (p.length < 4) return null;
      const out: Seg[] = [['M', p[0], p[1]]];
      for (let i = 2; i + 1 < p.length; i += 2) out.push(['L', p[i], p[i + 1]]);
      if (n.tag === 'polygon') out.push(['Z']);
      return out;
    }
  }
  return null;
}

function emit(pdf: PdfLike, segs: Seg[], m: Mat) {
  for (const s of segs) {
    if (s[0] === 'M') { const p = ap(m, s[1], s[2]); pdf.moveTo(p[0], p[1]); }
    else if (s[0] === 'L') { const p = ap(m, s[1], s[2]); pdf.lineTo(p[0], p[1]); }
    else if (s[0] === 'C') { const a = ap(m, s[1], s[2]), b = ap(m, s[3], s[4]), c = ap(m, s[5], s[6]); pdf.curveTo(a[0], a[1], b[0], b[1], c[0], c[1]); }
    else pdf.close();
  }
}

function bbox(segs: Seg[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) for (let i = 1; i + 1 < s.length; i += 2) { const x = s[i] as number, y = s[i + 1] as number; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

function withOpacity(pdf: PdfLike, op: number, draw: () => void) {
  if (op >= 0.999 || !pdf.GState || !pdf.setGState) { draw(); return; }
  pdf.saveGraphicsState();
  pdf.setGState(new pdf.GState({ opacity: op, 'stroke-opacity': op }));
  try { draw(); } finally { pdf.restoreGraphicsState(); }
}

function applyClip(pdf: PdfLike, ref: string | undefined, c: Ctx, defs: Map<string, Node>): boolean {
  const id = ref?.match(/url\(#([^)]+)\)/)?.[1];
  const cp = id ? defs.get(id) : null;
  if (!cp) return false;
  pdf.saveGraphicsState();
  const add = (n: Node, m: Mat) => {
    const mm = mul(m, parseTransform(n.a.transform));
    if (n.tag === 'g') { n.kids.forEach((k) => add(k, mm)); return; }
    if (n.tag === 'use') { const t = defs.get((n.a['xlink:href'] || n.a.href || '').slice(1)); if (t) add(t, mul(mm, [1, 0, 0, 1, numA(n, 'x'), numA(n, 'y')])); return; }
    const segs = shapeSegs(n);
    if (segs) emit(pdf, segs, mm);
  };
  cp.kids.forEach((k) => add(k, mul(c.m, parseTransform(cp.a.transform))));
  pdf.clip();
  pdf.discardPath();
  return true;
}

function paintShape(pdf: PdfLike, segs: Seg[], c: Ctx, defs: Map<string, Node>, stats: RenderStats, depth: number) {
  const fill = parseColour(c.fill, defs), stroke = parseColour(c.stroke, defs);
  const det = Math.sqrt(Math.abs(c.m[0] * c.m[3] - c.m[1] * c.m[2]));
  if (fill === 'pattern') {
    const pat = defs.get(c.fill.match(/url\(#([^)]+)\)/)![1])!;
    const pw = numA(pat, 'width'), ph = numA(pat, 'height');
    if (pw > 0 && ph > 0 && depth < 4) {
      const pm = mul(c.m, parseTransform(pat.a.patternTransform));
      // Clip to the shape, then tile the pattern's content over its box.
      pdf.saveGraphicsState();
      emit(pdf, segs, c.m);
      c.rule === 'evenodd' && pdf.clipEvenOdd ? pdf.clipEvenOdd() : pdf.clip();
      pdf.discardPath();
      const inv = invert(mul(invert(c.m), pm));
      const [bx0, by0, bx1, by1] = bbox(segs);
      const corners = [ap(inv, bx0, by0), ap(inv, bx1, by0), ap(inv, bx0, by1), ap(inv, bx1, by1)];
      const ux0 = Math.min(...corners.map((p) => p[0])), ux1 = Math.max(...corners.map((p) => p[0])), uy0 = Math.min(...corners.map((p) => p[1])), uy1 = Math.max(...corners.map((p) => p[1]));
      const tiles = (Math.ceil(ux1 / pw) - Math.floor(ux0 / pw) + 1) * (Math.ceil(uy1 / ph) - Math.floor(uy0 / ph) + 1);
      if (tiles < 20000) {
        for (let i = Math.floor(ux0 / pw) - 1; i <= Math.ceil(ux1 / pw); i++) for (let j = Math.floor(uy0 / ph) - 1; j <= Math.ceil(uy1 / ph); j++) {
          const tc: Ctx = { ...c, m: mul(pm, [1, 0, 0, 1, i * pw, j * ph]), fill: '#000', stroke: 'none' };
          pat.kids.forEach((k) => walk(pdf, k, tc, defs, stats, depth + 1));
        }
      } else stats.skipped.push('pattern too dense');
      pdf.restoreGraphicsState();
    }
  } else if (gradientOf(c.fill, defs)) {
    paintGradient(pdf, segs, c, gradientOf(c.fill, defs)!, defs);
  } else if (fill && fill.a * c.fop > 0) {
    withOpacity(pdf, fill.a * c.fop, () => {
      pdf.setFillColor(fill.r, fill.g, fill.b);
      emit(pdf, segs, c.m);
      c.rule === 'evenodd' ? pdf.fillEvenOdd() : pdf.fill();
    });
  }
  if (stroke && stroke !== 'pattern' && c.sw > 0) {
    withOpacity(pdf, stroke.a * c.sop, () => {
      pdf.setDrawColor(stroke.r, stroke.g, stroke.b);
      pdf.setLineWidth(c.sw * det);
      pdf.setLineJoin?.(c.join === 'round' ? 'round' : c.join === 'bevel' ? 'bevel' : 'miter');
      pdf.setLineCap?.(c.cap === 'round' ? 'round' : c.cap === 'square' ? 'square' : 'butt');
      if (c.dash && c.dash.length) (pdf as any).setLineDashPattern?.(c.dash.map((v) => v * det), 0);
      emit(pdf, segs, c.m);
      pdf.stroke();
      if (c.dash && c.dash.length) (pdf as any).setLineDashPattern?.([], 0);
    });
  }
  stats.paths++;
}

// ---------------------------------------------------------------- gradients
interface Grad { kind: 'linear' | 'radial'; units: 'user' | 'box'; a: Record<string, string>; stops: { o: number; r: number; g: number; b: number; a: number }[]; tr: Mat }
function gradientOf(fill: string, defs: Map<string, Node>): Grad | null {
  const id = fill?.match(/^\s*url\(#([^)]+)\)/)?.[1];
  let n = id ? defs.get(id) : null;
  if (!n || (n.tag !== 'linearGradient' && n.tag !== 'radialGradient')) return null;
  const kind = n.tag === 'linearGradient' ? 'linear' : 'radial';
  // Stops may come from a referenced gradient (xlink:href).
  let stopsNode: Node | null | undefined = n;
  for (let i = 0; i < 4 && stopsNode && !stopsNode.kids.some((k) => k.tag === 'stop'); i++) stopsNode = defs.get((stopsNode.a['xlink:href'] || stopsNode.a.href || '').replace(/^#/, ''));
  const stops = (stopsNode?.kids || []).filter((k) => k.tag === 'stop').map((k) => {
    const col = parseColour(styleOf(k)['stop-color'] || k.a['stop-color'] || '#000') as any || { r: 0, g: 0, b: 0, a: 1 };
    const so = parseFloat(styleOf(k)['stop-opacity'] ?? k.a['stop-opacity'] ?? '1');
    const off = String(k.a.offset || '0');
    return { o: Math.max(0, Math.min(1, off.endsWith('%') ? parseFloat(off) / 100 : parseFloat(off) || 0)), r: col.r, g: col.g, b: col.b, a: (col.a ?? 1) * (isNaN(so) ? 1 : so) };
  }).sort((p, q) => p.o - q.o);
  if (!stops.length) return null;
  return { kind, units: n.a.gradientUnits === 'userSpaceOnUse' ? 'user' : 'box', a: n.a, stops, tr: parseTransform(n.a.gradientTransform) };
}
function stopAt(g: Grad, t: number) {
  const s = g.stops; t = Math.max(0, Math.min(1, t));
  if (t <= s[0].o) return s[0];
  for (let i = 1; i < s.length; i++) if (t <= s[i].o) { const a = s[i - 1], b = s[i], k = (t - a.o) / Math.max(1e-9, b.o - a.o); return { o: t, r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k, a: a.a + (b.a - a.a) * k }; }
  return s[s.length - 1];
}
/** Vector gradient: the shape is clipped and filled with many thin bands of interpolated colour. */
function paintGradient(pdf: PdfLike, segs: Seg[], c: Ctx, g: Grad, _defs: Map<string, Node>) {
  const [bx0, by0, bx1, by1] = bbox(segs);
  const bw = bx1 - bx0 || 1, bh = by1 - by0 || 1;
  const num = (k: string, d: number) => { const v = g.a[k]; if (v === undefined) return d; return String(v).endsWith('%') ? parseFloat(v) / 100 : parseFloat(v); };
  // Gradient space → shape user space.
  let gm: Mat = g.units === 'box' ? [bw, 0, 0, bh, bx0, by0] : [1, 0, 0, 1, 0, 0];
  gm = mul(gm, g.tr);
  const full = mul(c.m, gm);
  pdf.saveGraphicsState();
  emit(pdf, segs, c.m);
  c.rule === 'evenodd' && pdf.clipEvenOdd ? pdf.clipEvenOdd() : pdf.clip();
  pdf.discardPath();
  // Shape box in gradient space (to know how far the bands must reach).
  const inv = invert(gm);
  const corners = [ap(inv, bx0, by0), ap(inv, bx1, by0), ap(inv, bx0, by1), ap(inv, bx1, by1)];
  const band = (poly: [number, number][], col: { r: number; g: number; b: number; a: number }) => {
    if (col.a * c.fop <= 0.001) return;
    withOpacity(pdf, col.a * c.fop, () => {
      pdf.setFillColor(Math.round(col.r), Math.round(col.g), Math.round(col.b));
      const q = poly.map(([x, y]) => ap(full, x, y));
      pdf.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) pdf.lineTo(q[i][0], q[i][1]); pdf.close(); pdf.fill();
    });
  };
  const det = Math.sqrt(Math.abs(full[0] * full[3] - full[1] * full[2]));
  if (g.kind === 'linear') {
    const x1 = num('x1', 0), y1 = num('y1', 0), x2 = num('x2', g.units === 'box' ? 1 : 0), y2 = num('y2', 0);
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, vx = -uy, vy = ux;
    const ts = corners.map(([x, y]) => ((x - x1) * ux + (y - y1) * uy) / L);
    const ss = corners.map(([x, y]) => (x - x1) * vx + (y - y1) * vy);
    const t0 = Math.min(0, ...ts), t1 = Math.max(1, ...ts), s0 = Math.min(...ss) - 1, s1 = Math.max(...ss) + 1;
    const steps = Math.max(32, Math.min(400, Math.round(L * det * (t1 - t0) / 0.6)));
    const pt = (t: number, s: number): [number, number] => [x1 + ux * t * L + vx * s, y1 + uy * t * L + vy * s];
    for (let i = 0; i < steps; i++) {
      const ta = t0 + ((t1 - t0) * i) / steps, tb = t0 + ((t1 - t0) * (i + 1)) / steps + (t1 - t0) / steps * 0.25; // slight overlap: no hairline gaps
      band([pt(ta, s0), pt(tb, s0), pt(tb, s1), pt(ta, s1)], stopAt(g, (ta + tb) / 2));
    }
  } else {
    const cx = num('cx', g.units === 'box' ? 0.5 : 0), cy = num('cy', g.units === 'box' ? 0.5 : 0), r = num('r', g.units === 'box' ? 0.5 : 0) || 1e-6;
    const far = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const outer = Math.max(far, r);
    // Outside the gradient's radius: the last colour; then rings inward.
    const steps = Math.max(32, Math.min(300, Math.round(r * det / 0.5)));
    const circle = (rad: number): [number, number][] => Array.from({ length: 72 }, (_, k) => [cx + Math.cos((k / 72) * 2 * Math.PI) * rad, cy + Math.sin((k / 72) * 2 * Math.PI) * rad] as [number, number]);
    band(circle(outer * 1.05 + 1), stopAt(g, 1));
    for (let i = steps; i >= 1; i--) band(circle((r * i) / steps), stopAt(g, (i - 0.5) / steps));
  }
  pdf.restoreGraphicsState();
}

export function invert(m: Mat): Mat {
  const d = m[0] * m[3] - m[1] * m[2] || 1e-12;
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
}

function walk(pdf: PdfLike, n: Node, parent: Ctx, defs: Map<string, Node>, stats: RenderStats, depth: number) {
  if (['defs', 'clipPath', 'pattern', 'linearGradient', 'radialGradient', 'title', 'desc', 'metadata', 'style', 'script', 'mask', 'filter', 'symbol'].includes(n.tag)) return;
  if (attr(n, 'display') === 'none' || attr(n, 'visibility') === 'hidden') return;
  const c = inherit(n, parent);
  c.m = mul(parent.m, parseTransform(n.a.transform));
  const op = n.a.opacity !== undefined || styleOf(n).opacity !== undefined ? parseFloat(attr(n, 'opacity')!) : 1;
  const clipped = applyClip(pdf, attr(n, 'clip-path'), c, defs);
  const run = () => {
    if (n.tag === 'svg' || n.tag === 'g' || n.tag === 'a') {
      if (n.tag === 'svg' && depth > 0) {
        // Nested <svg>: place its viewBox into x/y/width/height.
        const vb = (n.a.viewBox || '').split(/[\s,]+/).map(Number);
        const w = numA(n, 'width'), h = numA(n, 'height');
        if (vb.length === 4 && w && h) c.m = mul(c.m, mul([w / vb[2], 0, 0, h / vb[3], numA(n, 'x'), numA(n, 'y')], [1, 0, 0, 1, -vb[0], -vb[1]]));
      }
      n.kids.forEach((k) => walk(pdf, k, c, defs, stats, depth + 1));
    } else if (n.tag === 'use') {
      const t = defs.get((n.a['xlink:href'] || n.a.href || '').replace(/^#/, ''));
      if (t && depth < 30) walk(pdf, t, { ...c, m: mul(c.m, [1, 0, 0, 1, numA(n, 'x'), numA(n, 'y')]) }, defs, stats, depth + 1);
    } else if (n.tag === 'image') {
      drawImage(pdf, n, c, stats, depth);
    } else if (n.tag === 'text') {
      drawText(pdf, n, c, stats);
    } else {
      const segs = shapeSegs(n);
      if (segs && segs.length) paintShape(pdf, segs, c, defs, stats, depth);
    }
  };
  try { withOpacity(pdf, op, run); } finally { if (clipped) pdf.restoreGraphicsState(); }
}

function drawImage(pdf: PdfLike, n: Node, c: Ctx, stats: RenderStats, depth: number) {
  const href = n.a['xlink:href'] || n.a.href || '';
  const x = numA(n, 'x'), y = numA(n, 'y'), w = numA(n, 'width'), h = numA(n, 'height');
  if (!w || !h) return;
  if (/^data:image\/svg\+xml/i.test(href)) {
    // A vector picture: draw its content as vectors, fitted into the box.
    let text = '';
    try { const i = href.indexOf(','); text = /;base64/i.test(href.slice(0, i)) ? (typeof atob === 'function' ? atob(href.slice(i + 1)) : Buffer.from(href.slice(i + 1), 'base64').toString('utf8')) : decodeURIComponent(href.slice(i + 1)); } catch { return; }
    const inner = parseXml(text).kids.find((k) => k.tag === 'svg');
    if (!inner || depth > 6) return;
    const vb = (inner.a.viewBox || `0 0 ${inner.a.width || w} ${inner.a.height || h}`).split(/[\s,]+/).map(Number);
    const k = Math.min(w / vb[2], h / vb[3]);
    const m = mul(c.m, mul([k, 0, 0, k, x + (w - vb[2] * k) / 2, y + (h - vb[3] * k) / 2], [1, 0, 0, 1, -vb[0], -vb[1]]));
    const defs = new Map<string, Node>();
    const index = (q: Node) => { if (q.a.id) defs.set(q.a.id, q); q.kids.forEach(index); };
    index(inner);
    inner.kids.forEach((q) => walk(pdf, q, { ...c, m, fill: '#000', stroke: 'none' }, defs, stats, depth + 1));
    return;
  }
  const fmt = /^data:image\/png/i.test(href) ? 'PNG' : /^data:image\/jpe?g/i.test(href) ? 'JPEG' : null;
  if (!fmt || !pdf.addImage) { stats.skipped.push('image'); return; }
  // Axis-aligned placement (rotation/skew of pictures is not needed here).
  const p0 = ap(c.m, x, y), p1 = ap(c.m, x + w, y + h);
  pdf.addImage(href, fmt, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1]), undefined, 'FAST');
  stats.images++;
}

/** Face key for a text node's font: "Family|weight|italic". */
export function faceKey(family: string | undefined, weight: string | undefined, style: string | undefined): string {
  const fam = (family || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const w = weight === 'bold' ? 700 : weight === 'normal' || !weight ? 400 : parseInt(weight, 10) || 400;
  return `${fam}|${w}|${style === 'italic' ? 1 : 0}`;
}

function drawText(pdf: PdfLike, n: Node, c: Ctx, stats: RenderStats) {
  if (!pdf.text) return;
  const raw = n.text + n.kids.map((k) => k.text).join('');
  const t = n.a['xml:space'] === 'preserve' ? raw : raw.trim();
  if (!t.trim()) return;
  const col = parseColour(c.fill);
  const stroke = parseColour(c.stroke);
  const det = Math.sqrt(Math.abs(c.m[0] * c.m[3] - c.m[1] * c.m[2]));
  const sxk = Math.hypot(c.m[0], c.m[1]), syk = Math.hypot(c.m[2], c.m[3]);
  const p = ap(c.m, numA(n, 'x'), numA(n, 'y'));
  const face = pdf.__faces?.get(faceKey(c.family, c.weight, c.style));
  if (face) pdf.setFont?.(face, 'normal');
  // Font size in points from user units (1 mm = 2.835 pt when the page is in mm).
  pdf.setFontSize?.(Math.max(1, c.font * syk * 2.835));
  const angle = -(Math.atan2(c.m[1], c.m[0]) * 180) / Math.PI;
  const opts: any = { align: c.anchor === 'middle' ? 'center' : c.anchor === 'end' ? 'right' : 'left', baseline: attr(n, 'dominant-baseline') === 'central' ? 'middle' : 'alphabetic' };
  if (Math.abs(angle) > 0.01) opts.angle = angle;
  if (c.spacing) opts.charSpace = c.spacing * sxk;
  if (Math.abs(sxk / (syk || 1) - 1) > 0.002) opts.horizontalScale = sxk / (syk || 1);
  const hasStroke = stroke && stroke !== 'pattern' && c.sw > 0;
  if (hasStroke) {
    // Outline under the fill (paint-order: stroke), like the screen.
    (pdf as any).setLineWidth(c.sw * det * (c.paintOrder?.includes('stroke') ? 1 : 1));
    (pdf as any).setDrawColor(stroke.r, stroke.g, stroke.b);
    (pdf as any).setLineJoin?.('round');
    pdf.text(t, p[0], p[1], { ...opts, renderingMode: 'stroke' });
  }
  if (col && col !== 'pattern') {
    pdf.setTextColor?.(col.r, col.g, col.b);
    withOpacity(pdf, (col.a ?? 1) * c.fop, () => pdf.text!(t, p[0], p[1], { ...opts, renderingMode: 'fill' }));
  }
  stats.paths++;
}

/** Fonts used by live <text> in these SVGs (face keys). */
export function textFaces(svgs: string[]): string[] {
  const out = new Set<string>();
  const visit = (n: Node, c: { family?: string; weight?: string; style?: string }) => {
    const g = (k: string) => attr(n, k);
    const cc = { family: g('font-family') ?? c.family, weight: g('font-weight') ?? c.weight, style: g('font-style') ?? c.style };
    if (n.tag === 'text' && (n.text + n.kids.map((k) => k.text).join('')).trim()) out.add(faceKey(cc.family, cc.weight, cc.style));
    n.kids.forEach((k) => visit(k, cc));
  };
  for (const s of svgs) visit(parseXml(s), {});
  return [...out];
}

/** A complete vector PDF of an SVG whose size is given in millimetres. */
export async function svgToPdfBlob(svg: string, widthMm: number, heightMm: number, pages?: { svg: string; widthMm: number; heightMm: number }[], o: { loadFont?: (family: string, weight: number, italic: boolean) => Promise<ArrayBuffer | null> } = {}): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const list = pages && pages.length ? pages : [{ svg, widthMm, heightMm }];
  let pdf: any = null;
  const faces = new Map<string, string>();
  for (const pg of list) {
    const orient = pg.widthMm > pg.heightMm ? 'landscape' : 'portrait';
    if (!pdf) {
      pdf = new jsPDF({ unit: 'mm', format: [pg.widthMm, pg.heightMm], orientation: orient, compress: true });
      // Live text: embed the real fonts (subset by jsPDF) so the text stays text — retypeable in Illustrator / Acrobat.
      if (o.loadFont) {
        for (const key of textFaces(list.map((l) => l.svg))) {
          const [fam, w, it] = key.split('|');
          if (!fam || /^(sans-serif|serif|monospace|arial|helvetica)$/i.test(fam)) continue;
          try {
            const buf = await o.loadFont(fam, Number(w), it === '1');
            if (!buf) continue;
            let bin = ''; const u8 = new Uint8Array(buf);
            for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 0x8000)));
            const name = `${fam.replace(/[^A-Za-z0-9]+/g, '')}-${w}${it === '1' ? 'i' : ''}`;
            pdf.addFileToVFS(`${name}.ttf`, btoa(bin));
            pdf.addFont(`${name}.ttf`, name, 'normal');
            faces.set(key, name);
          } catch { /* that face falls back to the built-in font */ }
        }
        pdf.__faces = faces;
      }
    }
    else pdf.addPage([pg.widthMm, pg.heightMm], orient);
    const root = parseXml(pg.svg).kids.find((k) => k.tag === 'svg');
    const vb = (root?.a.viewBox || '').split(/[\s,]+/).map(Number);
    renderSvgToPdf(pdf, pg.svg, { scale: vb.length === 4 && vb[2] ? pg.widthMm / vb[2] : 1 });
  }
  return pdf.output('blob');
}
