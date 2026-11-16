// Press sheet engine: puts a finished job (cover spread, folded leaflet,
// card, flyer…) on the paper it is printed on, the way a print operator
// does — actual size centred on a bigger sheet (A3, SRA3, 33 × 48 cm) or
// "fit to print" scaled into the printer's printable area — with crop marks
// (four styles), fold marks, registration targets and an info line outside
// the artwork. Pure geometry here (mm, y down); `pressPdf` writes the real
// PDF (pdf-lib) with the artwork embedded and the PDF boxes set, and
// `templateSvg` the working file (guides + instructions, not for print).

export interface PressJob {
  name: string;
  trimW: number; trimH: number; bleed: number;
  /** Fold lines inside one item, from its trim's top-left (x: vertical fold, y: horizontal fold). */
  folds: { x?: number; y?: number; label?: string }[];
  /** Panel guide lines for the working template (x from the trim's left). */
  panels?: { x: number; w: number; name: string }[];
  safe?: number;
  /** What the info line says the job is ("Perfect binding cover A4", "Tri-fold leaflet"…). */
  title: string;
}

export type MarkType = 1 | 2 | 3 | 4;
export interface PressOptions {
  sheet: { w: number; h: number; name: string } | 'finished';
  mode: 'actual' | 'fit';
  margin: number;           // printer non-printable margin on every edge (mm)
  cols: number; rows: number; gap: number; // step & repeat (1 × 1 for one item)
  markType: MarkType;
  markLen: number; markOffset: number; markWeight: number;
  cutColour: string; foldColour: string; regColour: string;
  foldMarks: boolean; info: boolean;
  rotate?: boolean;         // turn the job 90° on the sheet
}

export const SHEETS: { id: string; name: string; w: number; h: number }[] = [
  { id: 'a4', name: 'A4', w: 210, h: 297 },
  { id: 'a3', name: 'A3', w: 297, h: 420 },
  { id: 'sra3', name: 'SRA3', w: 320, h: 450 },
  { id: '33x48', name: '33 × 48 cm', w: 330, h: 480 },
  { id: 'a3plus', name: 'A3+ (329 × 483)', w: 329, h: 483 },
  { id: 'sra2', name: 'SRA2', w: 450, h: 640 },
];

export const DEFAULT_PRESS: PressOptions = {
  sheet: { ...SHEETS[1] }, mode: 'actual', margin: 3, cols: 1, rows: 1, gap: 0,
  markType: 1, markLen: 5, markOffset: 3, markWeight: 0.25, cutColour: '#E30613', foldColour: '#00A651', regColour: '#000000',
  foldMarks: true, info: true,
};

export type Line = { x1: number; y1: number; x2: number; y2: number; color: string; width: number; dash?: string; kind: 'cut' | 'fold' | 'reg' };
export type Circle = { cx: number; cy: number; r: number; color: string; width: number };
export type Label = { x: number; y: number; text: string; size: number; color: string; anchor?: 'start' | 'middle' | 'end'; rotate?: number };

export interface PressLayout {
  sheet: { w: number; h: number; name: string };
  scale: number;
  /** Trim boxes of every item on the sheet (scaled, sheet mm). */
  items: { x: number; y: number; w: number; h: number }[];
  bleed: number;            // scaled bleed
  block: { x: number; y: number; w: number; h: number }; // all trims together
  lines: Line[]; circles: Circle[]; labels: Label[];
  printable: { x: number; y: number; w: number; h: number };
  fits: boolean; warnings: string[];
  needed: { w: number; h: number }; // sheet needed at actual size (incl. marks + margin)
  rotated: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Size of the area the job needs around its trims: bleed + mark offset + mark length (+ info line). */
function frame(job: PressJob, o: PressOptions) {
  const mark = Math.max(job.bleed, o.markOffset) + o.markLen + (o.markType === 1 ? 0 : 2);
  const info = o.info ? 7 : 0;
  return { mark, info };
}

export function layoutPress(job0: PressJob, o: PressOptions): PressLayout {
  const rotated = !!o.rotate;
  const job = rotated ? { ...job0, trimW: job0.trimH, trimH: job0.trimW, folds: job0.folds.map((f) => ({ x: f.y, y: f.x != null ? job0.trimW - f.x : undefined, label: f.label })), panels: [] } : job0;
  const cols = Math.max(1, Math.round(o.cols)), rows = Math.max(1, Math.round(o.rows));
  const gap = Math.max(0, o.gap);
  const bw = cols * job.trimW + (cols - 1) * gap, bh = rows * job.trimH + (rows - 1) * gap;
  const { mark, info } = frame(job, o);
  const needW = bw + 2 * mark + 2 * o.margin, needH = bh + 2 * mark + info + 2 * o.margin;
  const sheet = o.sheet === 'finished' ? { w: r2(bw + 2 * mark), h: r2(bh + 2 * mark + info), name: 'Finished size + marks' } : o.sheet;
  const printable = { x: o.margin, y: o.margin, w: sheet.w - 2 * o.margin, h: sheet.h - 2 * o.margin };
  const warnings: string[] = [];
  let scale = 1;
  const availW = printable.w - 2 * mark, availH = printable.h - 2 * mark - info;
  const fitsActual = bw <= availW + 0.01 && bh <= availH + 0.01;
  if (o.mode === 'fit') scale = Math.min(1, availW / bw, availH / bh);
  if (scale <= 0) scale = 0.01;
  const fits = o.mode === 'fit' ? scale > 0 : fitsActual;
  if (o.mode === 'actual' && !fitsActual) warnings.push(`At actual size the job needs a sheet of at least ${r2(needW)} × ${r2(needH)} mm (with ${o.margin} mm printer margin); ${sheet.name} is ${sheet.w} × ${sheet.h} mm. Choose a bigger sheet or Fit to print.`);
  if (o.mode === 'fit' && scale < 1) warnings.push(`Fit to print: scaled to ${r2(scale * 100)} % — the printed piece is smaller than the finished size (${r2(job.trimW * scale)} × ${r2(job.trimH * scale)} mm instead of ${job.trimW} × ${job.trimH} mm).`);
  const sw = bw * scale, sh = bh * scale;
  const bx = (sheet.w - sw) / 2, by = (sheet.h - sh + info) / 2;
  const tw = job.trimW * scale, th = job.trimH * scale, g = gap * scale, b = job.bleed * scale;
  const items: PressLayout['items'] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) items.push({ x: r2(bx + c * (tw + g)), y: r2(by + r * (th + g)), w: r2(tw), h: r2(th) });

  const lines: Line[] = [], circles: Circle[] = [], labels: Label[] = [];
  const W = o.markWeight, L = o.markLen, off = Math.max(b, o.markOffset);
  const cut = (x1: number, y1: number, x2: number, y2: number) => lines.push({ x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), color: o.cutColour, width: W, kind: 'cut' });
  const reg = (x1: number, y1: number, x2: number, y2: number) => lines.push({ x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), color: o.regColour, width: W, kind: 'reg' });
  const X0 = bx, X1 = bx + sw, Y0 = by, Y1 = by + sh;
  // Cut positions along x (every column edge) and y (every row edge).
  const xs: number[] = [], ys: number[] = [];
  for (let c = 0; c < cols; c++) { xs.push(bx + c * (tw + g)); xs.push(bx + c * (tw + g) + tw); }
  for (let r = 0; r < rows; r++) { ys.push(by + r * (th + g)); ys.push(by + r * (th + g) + th); }
  const uniq = (a: number[]) => [...new Set(a.map((v) => r2(v)))].sort((p, q) => p - q);
  const UX = uniq(xs), UY = uniq(ys);
  const outerX = [UX[0], UX[UX.length - 1]], outerY = [UY[0], UY[UY.length - 1]];
  const innerX = UX.slice(1, -1), innerY = UY.slice(1, -1);
  const plus = (cx: number, cy: number, s: number) => { reg(cx - s, cy, cx + s, cy); reg(cx, cy - s, cx, cy + s); };
  const target = (cx: number, cy: number, s: number) => { plus(cx, cy, s); circles.push({ cx: r2(cx), cy: r2(cy), r: r2(s * 0.45), color: o.regColour, width: W }); };
  const cornerBracket = (x: number, y: number, dx: number, dy: number) => {
    // Double L: one on the trim lines, one on the bleed lines, outside the bleed.
    for (const e of [0, b]) {
      const px = x + dx * e, py = y + dy * e;
      cut(px + dx * off, py + dy * (off - e) + dy * 0, px + dx * (off + L), py + dy * (off - e));
      cut(px + dx * (off - e), py + dy * off, px + dx * (off - e), py + dy * (off + L));
    }
  };
  const gutterDouble = (side: -1 | 1, ya: number, yb: number) => {
    // Two crop lines (both trims of a gutter) crossed by one line: the "╪" mark.
    const x = side < 0 ? X0 - off : X1 + off, x2 = x + side * L;
    cut(x, ya, x2, ya); cut(x, yb, x2, yb);
    const mx = (x + x2) / 2; cut(mx, ya - L * 0.5, mx, yb + L * 0.5);
  };
  const gutterDoubleX = (side: -1 | 1, xa: number, xb: number) => {
    const y = side < 0 ? Y0 - off : Y1 + off, y2 = y + side * L;
    cut(xa, y, xa, y2); cut(xb, y, xb, y2);
    const my = (y + y2) / 2; cut(xa - L * 0.5, my, xb + L * 0.5, my);
  };
  const gutPairs = (inner: number[]) => { const p: [number, number][] = []; for (let i = 0; i + 1 < inner.length; i += 2) p.push([inner[i], inner[i + 1]]); return p; };

  if (o.markType === 1) {
    // Standard: a crop mark on every cut line, top / bottom and left / right.
    for (const x of UX) { cut(x, Y0 - off, x, Y0 - off - L); cut(x, Y1 + off, x, Y1 + off + L); }
    for (const y of UY) { cut(X0 - off, y, X0 - off - L, y); cut(X1 + off, y, X1 + off + L, y); }
  } else {
    // Corners
    if (o.markType === 4) for (const x of outerX) for (const y of outerY) { const dx = x === outerX[0] ? -1 : 1, dy = y === outerY[0] ? -1 : 1; cut(x + dx * off, y, x + dx * (off + L), y); cut(x, y + dy * off, x, y + dy * (off + L)); }
    else for (const x of outerX) for (const y of outerY) cornerBracket(x, y, x === outerX[0] ? -1 : 1, y === outerY[0] ? -1 : 1);
    // Gutters between items: double marks (shared gutters with gap 0 get single lines)
    const gx = g > 0.01 ? gutPairs(innerX) : [], gy = g > 0.01 ? gutPairs(innerY) : [];
    for (const [a, c] of gy) { gutterDouble(-1, a, c); gutterDouble(1, a, c); }
    for (const [a, c] of gx) { gutterDoubleX(-1, a, c); gutterDoubleX(1, a, c); }
    if (g <= 0.01) { for (const x of innerX) { cut(x, Y0 - off, x, Y0 - off - L); cut(x, Y1 + off, x, Y1 + off + L); } for (const y of innerY) { cut(X0 - off, y, X0 - off - L, y); cut(X1 + off, y, X1 + off + L, y); } }
    // Registration
    const s = L * 0.5, ty = Y0 - off - L / 2, byy = Y1 + off + L / 2, lx = X0 - off - L / 2, rx = X1 + off + L / 2; // same band as the crop marks
    const colMid = Array.from({ length: cols }, (_, c) => bx + c * (tw + g) + tw / 2);
    const rowMid = Array.from({ length: rows }, (_, r) => by + r * (th + g) + th / 2);
    const midX = (X0 + X1) / 2, midY = (Y0 + Y1) / 2;
    if (o.markType === 2) { plus(midX, ty, s); plus(midX, byy, s); }
    if (o.markType === 3) { const at = cols > 1 ? [...colMid, ...gx.map(([a, c]) => (a + c) / 2)] : [midX]; for (const x of at) { plus(x, ty, s); plus(x, byy, s); } for (const y of rows > 1 ? rowMid : [midY]) { plus(lx, y, s); plus(rx, y, s); } }
    if (o.markType === 4) { for (const x of cols > 1 ? colMid : [midX - sw / 4, midX + sw / 4]) { target(x, ty, s); target(x, byy, s); } if (cols > 1) for (const [a, c] of gx) { plus((a + c) / 2, ty, s); plus((a + c) / 2, byy, s); } else { plus(midX, ty, s); plus(midX, byy, s); } for (const y of rows > 1 ? rowMid : [midY]) { target(lx, y, s); target(rx, y, s); } }
  }
  // Fold marks (green), outside the artwork, for every item.
  if (o.foldMarks) for (const it of items) for (const f of job.folds) {
    if (f.x != null) {
      const x = it.x + f.x * scale;
      lines.push({ x1: r2(x), y1: r2(Y0 - off), x2: r2(x), y2: r2(Y0 - off - L), color: o.foldColour, width: W, dash: '1 0.6', kind: 'fold' });
      lines.push({ x1: r2(x), y1: r2(Y1 + off), x2: r2(x), y2: r2(Y1 + off + L), color: o.foldColour, width: W, dash: '1 0.6', kind: 'fold' });
    }
    if (f.y != null) {
      const y = it.y + f.y * scale;
      lines.push({ x1: r2(X0 - off), y1: r2(y), x2: r2(X0 - off - L), y2: r2(y), color: o.foldColour, width: W, dash: '1 0.6', kind: 'fold' });
      lines.push({ x1: r2(X1 + off), y1: r2(y), x2: r2(X1 + off + L), y2: r2(y), color: o.foldColour, width: W, dash: '1 0.6', kind: 'fold' });
    }
  }
  // Fold labels under the bottom fold marks (e.g. SPINE 8.4 mm).
  if (o.foldMarks && items.length === 1) {
    const xsF = job.folds.filter((f) => f.x != null).map((f) => f.x! * scale + items[0].x);
    for (let i = 0; i + 1 < xsF.length; i++) if (job.folds[i].label) labels.push({ x: r2((xsF[i] + xsF[i + 1]) / 2), y: r2(Y1 + off + L + 2.5), text: job.folds[i].label!, size: 1.8, color: o.foldColour, anchor: 'middle' });
  }
  if (o.info) {
    const what = `${job.title} · ${job.trimW} × ${job.trimH} mm${job.bleed ? ` + ${job.bleed} mm bleed` : ''}${cols * rows > 1 ? ` · ${cols * rows} up (${cols} × ${rows})` : ''}`;
    const how = o.mode === 'fit' && scale < 1 ? `FIT TO PRINT ${r2(scale * 100)} %` : 'ACTUAL SIZE';
    labels.push({ x: r2(Math.max(o.margin + 1, X0 - off)), y: r2(Math.max(o.margin + 3, Y0 - off - L - 2)), text: `${what} · ${how} · print on ${sheet.name} (${sheet.w} × ${sheet.h} mm) · ${job.name}`, size: 2.4, color: '#111111' });
  }
  return { sheet, scale: Math.round(scale * 10000) / 10000, items, bleed: r2(b), block: { x: r2(bx), y: r2(by), w: r2(sw), h: r2(sh) }, lines, circles, labels, printable, fits, warnings, needed: { w: r2(needW), h: r2(needH) }, rotated };
}

/** The smallest standard sheet the job fits on at actual size (or null). */
export function suggestSheet(job: PressJob, o: PressOptions): (typeof SHEETS)[number] | null {
  for (const s of SHEETS) for (const rot of [false, true]) {
    const l = layoutPress(job, { ...o, sheet: s, mode: 'actual', rotate: rot });
    if (l.fits) return s;
  }
  return null;
}

/** How many items fit on the sheet at actual size (best of both orientations). */
export function maxUp(job: PressJob, o: PressOptions): { cols: number; rows: number; rotate: boolean } {
  let best = { cols: 1, rows: 1, rotate: false, n: 0 };
  for (const rotate of [false, true]) {
    const w = rotate ? job.trimH : job.trimW, h = rotate ? job.trimW : job.trimH;
    const sheet = o.sheet === 'finished' ? null : o.sheet;
    if (!sheet) break;
    const { mark, info } = frame(job, o);
    const aw = sheet.w - 2 * o.margin - 2 * mark, ah = sheet.h - 2 * o.margin - 2 * mark - info;
    const cols = Math.max(0, Math.floor((aw + o.gap) / (w + o.gap))), rows = Math.max(0, Math.floor((ah + o.gap) / (h + o.gap)));
    if (cols * rows > best.n) best = { cols, rows, rotate, n: cols * rows };
  }
  return { cols: Math.max(1, best.cols), rows: Math.max(1, best.rows), rotate: best.rotate };
}

function marksSvg(l: PressLayout): string {
  return l.lines.map((ln) => `<line x1="${ln.x1}" y1="${ln.y1}" x2="${ln.x2}" y2="${ln.y2}" stroke="${ln.color}" stroke-width="${ln.width}"${ln.dash ? ` stroke-dasharray="${ln.dash}"` : ''}/>`).join('')
    + l.circles.map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="none" stroke="${c.color}" stroke-width="${c.width}"/>`).join('')
    + l.labels.map((t) => `<text x="${t.x}" y="${t.y}" font-family="Helvetica" font-size="${t.size}" fill="${t.color}" text-anchor="${t.anchor || 'start'}">${t.text.replace(/[&<]/g, (c) => (c === '&' ? '&amp;' : '&lt;'))}</text>`).join('');
}

/** Working template (SVG, mm): trim, bleed, panel and fold guides, marks and the instruction box. Not a print file. */
export function templateSvg(job: PressJob, l: PressLayout, o: PressOptions): string {
  const k = l.scale, b = l.bleed;
  let g = `<rect width="${l.sheet.w}" height="${l.sheet.h}" fill="#FFFFFF"/>`;
  g += `<rect x="${l.printable.x}" y="${l.printable.y}" width="${r2(l.printable.w)}" height="${r2(l.printable.h)}" fill="none" stroke="#CBD5E1" stroke-width="0.2" stroke-dasharray="2 2"/>`;
  for (const it of l.items) {
    g += `<rect x="${r2(it.x - b)}" y="${r2(it.y - b)}" width="${r2(it.w + 2 * b)}" height="${r2(it.h + 2 * b)}" fill="none" stroke="#3B9BD8" stroke-width="0.25"/>`;
    g += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="none" stroke="#111111" stroke-width="0.3"/>`;
    for (const f of (l.rotated ? [] : job.folds)) {
      if (f.x != null) g += `<line x1="${r2(it.x + f.x * k)}" y1="${it.y}" x2="${r2(it.x + f.x * k)}" y2="${r2(it.y + it.h)}" stroke="#111111" stroke-width="0.25"/>`;
      if (f.y != null) g += `<line x1="${it.x}" y1="${r2(it.y + f.y * k)}" x2="${r2(it.x + it.w)}" y2="${r2(it.y + f.y * k)}" stroke="#111111" stroke-width="0.25"/>`;
    }
    if (job.safe && !l.rotated) g += `<rect x="${r2(it.x + job.safe * k)}" y="${r2(it.y + job.safe * k)}" width="${r2(it.w - 2 * job.safe * k)}" height="${r2(it.h - 2 * job.safe * k)}" fill="none" stroke="#2F9E7A" stroke-width="0.2" stroke-dasharray="1.5 1"/>`;
    if (!l.rotated) for (const p of job.panels || []) g += `<text x="${r2(it.x + (p.x + p.w / 2) * k)}" y="${r2(it.y + 8)}" font-family="Helvetica" font-size="3" fill="#94A3B8" text-anchor="middle">${p.name}</text>`;
  }
  g += marksSvg(l);
  // Instruction box (working file only), in the last item.
  const it = l.items[l.items.length - 1];
  const bw = Math.min(110, it.w * 0.6), bh = 62, x = it.x + it.w - bw - 6, y = it.y + it.h * 0.5;
  if (it.w > 60 && it.h > 80) {
    g += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${bh}" fill="#F7E3DA" opacity="0.92"/>`;
    const T = (dy: number, s: string, size = 2.6) => `<text x="${r2(x + 6)}" y="${r2(y + dy)}" font-family="Helvetica" font-size="${size}" fill="#B42318">${s}</text>`;
    g += T(7, 'This box: instructions for the working file only');
    g += `<line x1="${r2(x + 6)}" y1="${r2(y + 13)}" x2="${r2(x + 16)}" y2="${r2(y + 13)}" stroke="${o.cutColour}" stroke-width="0.5"/>` + T(14, 'cutting mark').replace(`x="${r2(x + 6)}"`, `x="${r2(x + 19)}"`);
    g += `<line x1="${r2(x + 6)}" y1="${r2(y + 19)}" x2="${r2(x + 16)}" y2="${r2(y + 19)}" stroke="${o.foldColour}" stroke-width="0.5"/>` + T(20, 'folding mark').replace(`x="${r2(x + 6)}"`, `x="${r2(x + 19)}"`);
    g += `<rect x="${r2(x + 6)}" y="${r2(y + 23)}" width="9" height="6" fill="none" stroke="#111" stroke-width="0.3"/>` + T(27.5, `finished (trim) size ${job.trimW} × ${job.trimH} mm`).replace(`x="${r2(x + 6)}"`, `x="${r2(x + 19)}"`);
    g += `<rect x="${r2(x + 6)}" y="${r2(y + 32)}" width="9" height="6" fill="none" stroke="#3B9BD8" stroke-width="0.3"/>` + T(36.5, `${job.bleed} mm bleed — artwork runs to here`).replace(`x="${r2(x + 6)}"`, `x="${r2(x + 19)}"`);
    if (job.safe) g += `<rect x="${r2(x + 6)}" y="${r2(y + 41)}" width="9" height="6" fill="none" stroke="#2F9E7A" stroke-width="0.3" stroke-dasharray="1.5 1"/>` + T(45.5, `safe area ${job.safe} mm — keep text inside`).replace(`x="${r2(x + 6)}"`, `x="${r2(x + 19)}"`);
    g += T(56, 'Important: this is a working file, not ready to print.', 2.6);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.sheet.w}mm" height="${l.sheet.h}mm" viewBox="0 0 ${l.sheet.w} ${l.sheet.h}">${g}</svg>`;
}

export type Artwork = { kind: 'pdf'; bytes: Uint8Array; page?: number } | { kind: 'png' | 'jpg'; bytes: Uint8Array } | null;

const MM = 72 / 25.4;
const hex = (c: string) => { const n = parseInt(c.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [number, number, number]; };

/**
 * Print-ready PDF: the artwork (its trim + bleed area, or the whole artwork page fitted to trim + bleed)
 * in every item, clipped to its bleed (and to the gutter middle when items touch), marks outside,
 * and MediaBox / CropBox = sheet, BleedBox / TrimBox = the job (for one item).
 */
export async function pressPdf(job: PressJob, l: PressLayout, art: Artwork): Promise<Uint8Array> {
  return pressPdfPages([{ job, layout: l, art }], job.name);
}

/** One press sheet per entry (e.g. outside + inside of a leaflet), in one PDF. */
export async function pressPdfPages(sheets: { job: PressJob; layout: PressLayout; art: Artwork }[], title: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(`${title} — print`); doc.setProducer('Magical Touch Design'); doc.setCreator('Magical Touch Design');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const srcCache = new Map<Uint8Array, any>();
  for (const sh of sheets) await drawSheet(doc, font, srcCache, sh.job, sh.layout, sh.art);
  return doc.save({ useObjectStreams: false });
}

async function drawSheet(doc: any, font: any, srcCache: Map<Uint8Array, any>, job: PressJob, l: PressLayout, art: Artwork) {
  const { PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, setDashPattern } = await import('pdf-lib');
  const page = doc.addPage([l.sheet.w * MM, l.sheet.h * MM]);
  const H = l.sheet.h;
  const Y = (y: number) => (H - y) * MM;
  const b = l.bleed;
  let embedded: any = null, artBox: { w: number; h: number; bleedPt?: number } | null = null;
  if (art?.kind === 'pdf') {
    let src = srcCache.get(art.bytes);
    if (!src) { src = await PDFDocument.load(art.bytes, { ignoreEncryption: true }); srcCache.set(art.bytes, src); }
    const sp = src.getPage(Math.min(src.getPageCount() - 1, art.page || 0));
    const m = sp.getMediaBox(), t = sp.getTrimBox();
    const hasTrim = Math.abs(t.width - m.width) > 0.5;
    // Use the artwork's own bleed box when it has a trim box; otherwise the whole page = trim + bleed.
    const bb = sp.getBleedBox();
    const box = hasTrim ? (Math.abs(bb.width - t.width) > 0.5 ? bb : m) : m;
    embedded = await doc.embedPage(sp, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height });
    artBox = { w: box.width, h: box.height };
  } else if (art && (art.kind === 'png' || art.kind === 'jpg')) {
    embedded = art.kind === 'png' ? await doc.embedPng(art.bytes) : await doc.embedJpg(art.bytes);
    artBox = { w: embedded.width, h: embedded.height };
  }
  for (let i = 0; i < l.items.length; i++) {
    const it = l.items[i];
    if (!embedded) continue;
    // Clip to the item's bleed, never past the middle of the gutter to the next item.
    const nb = (dir: 'l' | 'r' | 't' | 'b') => {
      const others = l.items.filter((o) => o !== it);
      let lim = b;
      for (const o of others) {
        if (dir === 'r' && Math.abs(o.y - it.y) < 0.1 && o.x > it.x) lim = Math.min(lim, (o.x - (it.x + it.w)) / 2);
        if (dir === 'l' && Math.abs(o.y - it.y) < 0.1 && o.x < it.x) lim = Math.min(lim, (it.x - (o.x + o.w)) / 2);
        if (dir === 'b' && Math.abs(o.x - it.x) < 0.1 && o.y > it.y) lim = Math.min(lim, (o.y - (it.y + it.h)) / 2);
        if (dir === 't' && Math.abs(o.x - it.x) < 0.1 && o.y < it.y) lim = Math.min(lim, (it.y - (o.y + o.h)) / 2);
      }
      return Math.max(0, lim);
    };
    const cx0 = it.x - nb('l'), cx1 = it.x + it.w + nb('r'), cy0 = it.y - nb('t'), cy1 = it.y + it.h + nb('b');
    page.pushOperators(pushGraphicsState(), rectangle(cx0 * MM, Y(cy1), (cx1 - cx0) * MM, (cy1 - cy0) * MM), clip(), endPath());
    const dx = it.x - b, dy = it.y - b, dw = it.w + 2 * b, dh = it.h + 2 * b;
    if (art?.kind === 'pdf') page.drawPage(embedded, { x: dx * MM, y: Y(dy + dh), width: dw * MM, height: dh * MM });
    else {
      // Image: cover the trim + bleed area keeping its proportions (centred).
      const k = Math.max(dw / artBox!.w, dh / artBox!.h), iw = artBox!.w * k, ih = artBox!.h * k;
      page.drawImage(embedded, { x: (dx + (dw - iw) / 2) * MM, y: Y(dy + (dh - ih) / 2 + ih), width: iw * MM, height: ih * MM });
    }
    page.pushOperators(popGraphicsState());
  }
  for (const ln of l.lines) {
    const [r, g, bl] = hex(ln.color);
    if (ln.dash) page.pushOperators(setDashPattern(ln.dash.split(' ').map((v) => Number(v) * MM), 0));
    page.drawLine({ start: { x: ln.x1 * MM, y: Y(ln.y1) }, end: { x: ln.x2 * MM, y: Y(ln.y2) }, thickness: ln.width * MM, color: rgb(r, g, bl) });
    if (ln.dash) page.pushOperators(setDashPattern([], 0));
  }
  for (const c of l.circles) { const [r, g, bl] = hex(c.color); page.drawCircle({ x: c.cx * MM, y: Y(c.cy), size: c.r * MM, borderColor: rgb(r, g, bl), borderWidth: c.width * MM }); }
  for (const t of l.labels) {
    const [r, g, bl] = hex(t.color), size = t.size * MM, w = font.widthOfTextAtSize(t.text, size);
    const x = t.anchor === 'middle' ? t.x * MM - w / 2 : t.anchor === 'end' ? t.x * MM - w : t.x * MM;
    page.drawText(t.text, { x, y: Y(t.y), size, font, color: rgb(r, g, bl) });
  }
  // PDF boxes: trim and bleed of the job (all items together when there are several).
  const bx0 = l.block.x, by0 = l.block.y, bw = l.block.w, bh = l.block.h;
  page.setTrimBox(bx0 * MM, Y(by0 + bh), bw * MM, bh * MM);
  page.setBleedBox((bx0 - b) * MM, Y(by0 + bh + b), (bw + 2 * b) * MM, (bh + 2 * b) * MM);
  page.setCropBox(0, 0, l.sheet.w * MM, l.sheet.h * MM);
}

/** Reads a press PDF back and checks it (dimensions, page count, boxes) before it is offered. */
export async function verifyPressPdf(bytes: Uint8Array, l: PressLayout, pages = 1): Promise<{ ok: boolean; issues: string[] }> {
  const { PDFDocument } = await import('pdf-lib');
  const d = await PDFDocument.load(bytes);
  const issues: string[] = [];
  if (d.getPageCount() !== pages) issues.push(`Expected ${pages} page${pages > 1 ? 's' : ''}, found ${d.getPageCount()}.`);
  for (let pi = 0; pi < d.getPageCount(); pi++) {
  const p = d.getPage(pi), m = p.getMediaBox(), t = p.getTrimBox(), b = p.getBleedBox();
  const mm = (v: number) => v / MM;
  if (Math.abs(mm(m.width) - l.sheet.w) > 0.2 || Math.abs(mm(m.height) - l.sheet.h) > 0.2) issues.push(`Sheet ${mm(m.width).toFixed(1)} × ${mm(m.height).toFixed(1)} mm, expected ${l.sheet.w} × ${l.sheet.h} mm.`);
  if (Math.abs(mm(t.width) - l.block.w) > 0.2 || Math.abs(mm(t.height) - l.block.h) > 0.2) issues.push('TrimBox does not match the finished size.');
  if (l.bleed > 0 && Math.abs(mm(b.width - t.width) / 2 - l.bleed) > 0.2) issues.push('BleedBox does not match the bleed.');
  }
  // Marks must stay outside the bleed of every item.
  const inside = (x: number, y: number) => l.items.some((it) => x > it.x - l.bleed + 0.01 && x < it.x + it.w + l.bleed - 0.01 && y > it.y - l.bleed + 0.01 && y < it.y + it.h + l.bleed - 0.01);
  for (const ln of l.lines) for (let s = 0; s <= 1; s += 0.25) if (inside(ln.x1 + (ln.x2 - ln.x1) * s, ln.y1 + (ln.y2 - ln.y1) * s)) { issues.push('A mark touches the artwork.'); s = 2; break; }
  const outside = l.lines.some((ln) => [ln.x1, ln.x2].some((x) => x < l.printable.x - 0.01 || x > l.printable.x + l.printable.w + 0.01) || [ln.y1, ln.y2].some((y) => y < l.printable.y - 0.01 || y > l.printable.y + l.printable.h + 0.01));
  if (outside && l.fits) issues.push('Some marks fall in the printer’s non-printable margin.');
  return { ok: !issues.length, issues: [...new Set(issues)] };
}
