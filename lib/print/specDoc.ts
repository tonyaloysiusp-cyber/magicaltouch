// Printing Layout & Specification document (A4 landscape, vector SVG pages
// for svgToPdf). Built only from the calculator settings, the job details
// the user typed and the PDFs the user actually supplied — nothing is
// sample data. Magical Touch Design branding lives in the header, footer
// and the promotion box; never on artwork.
//
// Page 1  Imposition (side 1 / side 2 panel arrangement) + specification
// Page 2  Artwork geometry (MediaBox / CropBox / BleedBox / TrimBox / safe)
//         + supplied files + page contents
// Page 3  Production notes + approval and sign-off

import type { FoldResult } from '../fold.ts';
import { FOLDS } from '../fold.ts';

export interface SpecClient { company: string; contact: string; email: string; phone: string }
export interface SpecJob {
  project: string; description: string; artworkFile: string; jobNo: string; orderNo: string; quantity: string;
  date: string; preparedBy: string; status: string; revision: string;
}
export interface SpecPrint {
  paper: string;            // e.g. A4 landscape
  method: string;           // Digital / Offset / …
  colours: string;          // 4/4 full colour both sides
  colourMode: string;       // CMYK
  resolution: string;       // 300 dpi at final size
  stock: string; lamination: string; finishing: string; optional: string;
  binding: string;          // '' for none
  cutting: string;          // cutting instructions
}
export interface SuppliedFile {
  name: string; purpose: string; pages: number;
  sizes: { w: number; h: number }[];           // MediaBox in mm, per page
  trim?: { w: number; h: number } | null;      // TrimBox in mm (page 1)
  bleed?: number | null;                       // mm, from MediaBox/BleedBox vs TrimBox
  colour?: string | null;                      // only when detectable
  fonts?: string[] | null;
  ready: boolean; issues: string[];
}
export interface SpecData {
  client: SpecClient; job: SpecJob; print: SpecPrint;
  fold: FoldResult; bleed: number; safe: number; marks: { len: number; offset: number };
  contents: string[];   // per page/panel number (1 … 2n), user text
  notes: string[];      // production notes (configurable)
  approvals: string[];  // items to sign off
  files: SuppliedFile[];
  logo?: string | null; // PNG data URL
  promo?: { src: string; w: number; h: number } | null; // company ad (JPEG/PNG data URL + its pixel size)
}

export const DEFAULT_NOTES = [
  'Verify duplex orientation before the run (turn on the long edge unless stated).',
  'Print one test sheet, fold it and check panel order before mass production.',
  'Confirm folding direction and that tucked-in panels close flat.',
  'Check front and back panel alignment against the fold positions.',
  'Confirm all fonts are embedded and images are 300 dpi at final size.',
  'Verify brand colours against approved samples.',
  'Confirm paper stock, lamination and finishing before printing.',
];
export const DEFAULT_APPROVALS = ['Artwork approval', 'PDF proof approval', 'Paper stock confirmation', 'Colour confirmation', 'Quantity confirmation', 'Finishing confirmation'];

const W = 297, H = 210, M = 12;
const INK = '#0B0B0F', MUTED = '#5B6472', FAINT = '#94A3B8', LINE = '#D5DAE1', ACCENT = '#7A1F3D', TINT = '#F4F1F7';
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const r1 = (n: number) => Math.round(n * 100) / 100;
const mm = (n: number) => `${r1(n)}`.replace(/\.0+$/, '');
const T = (x: number, y: number, s: string, o: { size?: number; weight?: number; fill?: string; anchor?: string; family?: string } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-family="${o.family || 'Helvetica'}" font-size="${o.size ?? 3}" font-weight="${o.weight ?? 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'start'}">${esc(s)}</text>`;
const label = (x: number, y: number, s: string, anchor = 'start') => T(x, y, s.toUpperCase(), { size: 2.3, fill: ACCENT, anchor, weight: 700 });

/** Wraps text into lines of at most `max` characters (approximate width for Helvetica). */
export function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  for (const para of String(s || '').split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
    }
    out.push(line);
  }
  return out;
}
const lines = (x: number, y: number, s: string, max: number, o: Parameters<typeof T>[3] = {}, lh = 3.6) => wrap(s, max).map((l, i) => T(x, y + i * lh, l, o)).join('');

export function foldLabel(f: FoldResult): string { return FOLDS.find((x) => x.id === f.type)?.label || f.type; }
export function formatLine(f: FoldResult): string {
  const pages = f.panels.length * 2;
  return `${pages}-panel ${f.type === 'half' || f.type === 'cross' ? 'folder' : 'leaflet'}, ${foldLabel(f).toLowerCase()}`;
}
export function foldCount(f: FoldResult): number { return f.folds.length; }

/** Panel numbers in reading order: side 1 = outside left→right (1…n), side 2 = inside left→right as seen when turned over (n+1…2n). */
export function sidePanels(f: FoldResult) {
  const n = f.panels.length, Wf = f.flat.w;
  const side1 = f.panels.map((p, i) => ({ num: i + 1, x: p.x, w: p.w, role: p.outside }));
  const side2 = f.panels.slice().reverse().map((p, i) => ({ num: n + i + 1, x: r1(Wf - p.x - p.w), w: p.w, role: p.inside }));
  return { side1, side2 };
}

function header(d: SpecData, title: string, sub: string, right: string[]): string {
  let g = '';
  g += label(M, 15, 'Printing layout & specification');
  g += T(M, 23, title, { size: 6.4, weight: 700 });
  g += T(M, 28.5, sub, { size: 3, fill: MUTED });
  right.forEach((s, i) => { g += T(W - M, 15 + i * 4, s, { size: 2.5, fill: MUTED, anchor: 'end' }); });
  g += `<line x1="${M}" y1="33" x2="${W - M}" y2="33" stroke="${LINE}" stroke-width="0.3"/>`;
  return g;
}
function footer(d: SpecData, page: number, pages: number): string {
  let g = `<line x1="${M}" y1="${H - 11}" x2="${W - M}" y2="${H - 11}" stroke="${LINE}" stroke-width="0.3"/>`;
  if (d.logo) g += `<image x="${M}" y="${H - 8.6}" width="26" height="${r1(26 * (129 / 900))}" href="${d.logo}"/>`;
  else g += T(M, H - 6, 'MAGICAL TOUCH DESIGN', { size: 2.6, weight: 700 });
  const meta = ['www.magicaltouchdesign.com', d.job.jobNo && `Job ${d.job.jobNo}`, d.job.artworkFile || d.job.project, d.job.date].filter(Boolean).join('  ·  ');
  g += T(M + 30, H - 6, meta, { size: 2.3, fill: MUTED });
  g += T(W - M, H - 6, `SHEET ${page} OF ${pages}  ·  PRINTING LAYOUT & SPECIFICATION${d.job.revision ? `  ·  REV ${d.job.revision}` : ''}`, { size: 2.3, fill: MUTED, anchor: 'end' });
  // Brand rainbow hairline (as on magicaltouchdesign.com).
  const cols = ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80', '#FACC15'];
  cols.forEach((c, i) => { g += `<rect x="${(W / cols.length) * i}" y="0" width="${W / cols.length + 0.2}" height="1.2" fill="${c}"/>`; });
  return g;
}
function promoBox(d: SpecData, x: number, y: number, w: number, h: number): string {
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}"/>`;
  const textBlock = (tx: number, tw: number) => T(tx, y + h / 2 - 3, 'Magical Touch Design', { size: Math.min(5, tw / 14), weight: 700, fill: '#FFFFFF' })
    + T(tx, y + h / 2 + 2.5, 'Design · Print · Textile · Embroidery', { size: 2.6, fill: '#CBD5E1' })
    + T(tx, y + h / 2 + 7, 'www.magicaltouchdesign.com', { size: 2.6, fill: '#FFFFFF', weight: 700 });
  if (!d.promo) return g + textBlock(x + 6, w - 12);
  // Pictures are placed at their own proportions (never stretched).
  const ar = d.promo.w / d.promo.h;
  if (w / h > ar * 1.25) {
    const iw = h * ar;
    g += `<image x="${r1(x)}" y="${r1(y)}" width="${r1(iw)}" height="${r1(h)}" href="${d.promo.src}"/>`;
    if (w - iw > 40) g += textBlock(x + iw + 6, w - iw - 10);
  } else {
    const ih = Math.min(h, w / ar), iw = ih * ar;
    g += `<image x="${r1(x + (w - iw) / 2)}" y="${r1(y + (h - ih) / 2)}" width="${r1(iw)}" height="${r1(ih)}" href="${d.promo.src}"/>`;
  }
  return g;
}

/** Side diagram: trim, bleed, panels with numbers and roles, fold lines. */
function sideDiagram(f: FoldResult, panels: { num: number; x: number; w: number; role: string }[], contents: string[], x: number, y: number, w: number, h: number, bleed: number, side: 1 | 2): string {
  // Schematic (panel widths to scale across, height fitted): a preview, not a print file.
  const kx = (w - 4) / (f.flat.w + 2 * bleed), ky = (h - 4) / (f.flat.h + 2 * bleed), k = kx;
  const ox = x + 2 + bleed * kx, oy = y + 2 + bleed * ky;
  let g = `<rect x="${r1(ox - bleed * kx)}" y="${r1(oy - bleed * ky)}" width="${r1((f.flat.w + 2 * bleed) * kx)}" height="${r1((f.flat.h + 2 * bleed) * ky)}" fill="#FCEFF3" stroke="#E7A3B5" stroke-width="0.2"/>`;
  g += `<rect x="${r1(ox)}" y="${r1(oy)}" width="${r1(f.flat.w * kx)}" height="${r1(f.flat.h * ky)}" fill="${TINT}" stroke="${INK}" stroke-width="0.35"/>`;
  g += T(x + w - 2, y + h - 0.5, 'preview only — not a print file', { size: 1.8, fill: FAINT, anchor: 'end' });
  for (const p of panels) {
    const cx = ox + (p.x + p.w / 2) * kx, cy = oy + (f.flat.h * ky) / 2;
    g += T(cx, cy - 2, String(p.num), { size: 6, anchor: 'middle', weight: 300 });
    g += T(cx, cy + 3.5, p.role, { size: 2.2, anchor: 'middle', fill: MUTED });
    const c = contents[p.num - 1];
    if (c) wrap(c, Math.max(8, Math.floor((p.w * k) / 1.35))).slice(0, 2).forEach((l, i) => { g += T(cx, cy + 7 + i * 3, l, { size: 2, anchor: 'middle', fill: FAINT }); });
  }
  for (const fl of f.folds) {
    if (fl.x != null) { const fx = side === 1 ? fl.x : f.flat.w - fl.x; g += `<line x1="${r1(ox + fx * kx)}" y1="${r1(oy)}" x2="${r1(ox + fx * kx)}" y2="${r1(oy + f.flat.h * ky)}" stroke="${INK}" stroke-width="0.3" stroke-dasharray="1.2 1.2"/>`; }
    if (fl.y != null) g += `<line x1="${r1(ox)}" y1="${r1(oy + fl.y * ky)}" x2="${r1(ox + f.flat.w * kx)}" y2="${r1(oy + fl.y * ky)}" stroke="${INK}" stroke-width="0.3" stroke-dasharray="1.2 1.2"/>`;
  }
  return g;
}

export function specPages(d: SpecData): string[] {
  const f = d.fold, { side1, side2 } = sidePanels(f), n = f.panels.length;
  const title = `${d.job.project || 'Untitled job'} — ${formatLine(f).split(',')[0]}`;
  const sub = d.job.description || `${d.print.paper}, ${n} panels per side, ${foldLabel(f).toLowerCase()} — ${n * 2} printed panels.`;
  const right = [
    d.client.company && `CLIENT: ${d.client.company}`,
    (d.client.contact || d.client.email) && `CONTACT: ${[d.client.contact, d.client.email, d.client.phone].filter(Boolean).join(' · ')}`,
    d.job.artworkFile && `ARTWORK: ${d.job.artworkFile}`,
  ].filter(Boolean) as string[];
  const widthsEqual = f.panels.every((p) => Math.abs(p.w - f.panels[0].w) < 0.05);
  const panelLine = widthsEqual ? `${mm(f.panels[0].w)} × ${mm(f.flat.h)} mm` : f.panels.map((p) => mm(p.w)).join(' / ') + ` × ${mm(f.flat.h)} mm`;
  const foldsAt = f.folds.filter((x) => x.x != null).map((x) => mm(x.x!)).join(' / ');

  // ── Page 1 ──
  let p1 = header(d, title, sub, right);
  const LW = 168;
  p1 += T(M, 41, `Imposition — one ${d.print.paper || `${mm(f.flat.w)} × ${mm(f.flat.h)} mm`} sheet, printed ${d.print.colours.startsWith('4/0') || d.print.colours.startsWith('1/0') ? 'one side' : 'both sides'}`, { size: 3.4, weight: 700 });
  p1 += label(M, 48, `Side 1 — panels 1 to ${n}, left to right`);
  p1 += sideDiagram(f, side1, d.contents, M, 50, LW, 46, d.bleed, 1);
  p1 += T(M, 100, `${(d.print.paper || '').toUpperCase()} ${mm(f.flat.w)} × ${mm(f.flat.h)} MM`, { size: 2.2, fill: MUTED });
  if (foldsAt) p1 += T(M + LW, 100, `FOLDS AT ${foldsAt} MM`, { size: 2.2, fill: MUTED, anchor: 'end' });
  p1 += label(M, 108, `Side 2 — panels ${n + 1} to ${2 * n}, left to right`);
  p1 += sideDiagram(f, side2, d.contents, M, 110, LW, 46, d.bleed, 2);
  p1 += T(M, 160, `PRINT ${d.print.colours.toUpperCase()}`, { size: 2.2, fill: MUTED });
  p1 += T(M + LW, 160, `PANEL ${widthsEqual ? 'WIDTH' : 'WIDTHS'} ${widthsEqual ? mm(f.panels[0].w) : f.panels.map((p) => mm(p.w)).join(' / ')} MM`, { size: 2.2, fill: MUTED, anchor: 'end' });
  // Fold note
  p1 += `<rect x="${M}" y="165" width="${LW}" height="28" fill="${TINT}"/><rect x="${M}" y="165" width="0.9" height="28" fill="${ACCENT}"/>`;
  p1 += T(M + 4, 171, `Fold: ${foldLabel(f).toLowerCase()}, ${foldCount(f)} fold${foldCount(f) === 1 ? '' : 's'}`, { size: 3, weight: 700 });
  p1 += lines(M + 4, 176, [...f.sequence, ...f.errors.map((e) => `CHECK: ${e}`)].join(' '), 120, { size: 2.4, fill: MUTED }, 3.2);
  // Specification table
  const SX = M + LW + 8, SW = W - M - SX;
  p1 += `<rect x="${SX}" y="37" width="${SW}" height="112" fill="none" stroke="${LINE}" stroke-width="0.3"/>`;
  p1 += T(SX + 4, 44, 'Specification', { size: 3.4, weight: 700 });
  const rows: [string, string][] = [
    ['Format', formatLine(f)],
    ['Flat size', `${mm(f.flat.w)} × ${mm(f.flat.h)} mm${d.print.paper ? ` (${d.print.paper})` : ''}`],
    ['Folded size', `${mm(f.folded.w)} × ${mm(f.folded.h)} mm (${n} panels)`],
    ['Panels', `${2 * n} (${n} per side, 2 printed sides)`],
    ['Panel size', panelLine],
    ['Colours', `${d.print.colours} · ${d.print.colourMode}`],
    ['Bleed', `${mm(d.bleed)} mm on all four edges`],
    ['Safety margin', `${mm(d.safe)} mm from trim and folds`],
    ['Resolution', d.print.resolution],
    ['Method', d.print.method],
    ['Stock', d.print.stock || 'To be confirmed'],
    ['Finishing', d.print.finishing || `Trim to ${mm(f.flat.w)} × ${mm(f.flat.h)} mm, ${foldCount(f)} fold${foldCount(f) === 1 ? '' : 's'}`],
    ['Lamination', d.print.lamination || 'None'],
    ...(d.print.binding ? [['Binding', d.print.binding] as [string, string]] : []),
    ...(d.print.optional ? [['Optional', d.print.optional] as [string, string]] : []),
    ['Quantity', d.job.quantity ? `${d.job.quantity} copies` : '______ copies (to confirm)'],
  ];
  let ry = 51;
  for (const [k, v] of rows) {
    p1 += label(SX + 4, ry, k);
    const vl = wrap(v, 44);
    vl.slice(0, 2).forEach((l, i) => { p1 += T(SX + 30, ry + i * 3.2, l, { size: 2.6 }); });
    ry += Math.max(6.2, vl.slice(0, 2).length * 3.2 + 3);
    p1 += `<line x1="${SX + 4}" y1="${r1(ry - 3.6)}" x2="${SX + SW - 4}" y2="${r1(ry - 3.6)}" stroke="${LINE}" stroke-width="0.15"/>`;
  }
  p1 += promoBox(d, SX, 153, SW, 40);

  // ── Page 2 ──
  const mediaW = f.flat.w + 2 * (d.bleed + d.marks.offset + d.marks.len), mediaH = f.flat.h + 2 * (d.bleed + d.marks.offset + d.marks.len);
  let p2 = header(d, 'Artwork geometry & supplied files', 'How each page is built, and which file to print from.', [
    `PANEL TRIM ${panelLine}`, `BLEED ${mm(d.bleed)} MM ALL EDGES`, `MEDIA BOX ${mm(mediaW)} × ${mm(mediaH)} MM WITH CROP MARKS`,
  ]);
  p2 += T(M, 41, 'Page geometry', { size: 3.4, weight: 700 });
  // Diagram of one sheet
  const GX = M, GY = 45, GW = 62, GH = 74;
  const k = Math.min(GW / mediaW, GH / mediaH);
  const gx = GX + (GW - mediaW * k) / 2, gy = GY + (GH - mediaH * k) / 2;
  const off = (d.marks.offset + d.marks.len) * k, b = d.bleed * k;
  p2 += `<rect x="${r1(gx)}" y="${r1(gy)}" width="${r1(mediaW * k)}" height="${r1(mediaH * k)}" fill="none" stroke="${FAINT}" stroke-width="0.3" stroke-dasharray="1 1"/>`;
  p2 += T(gx + 1, gy + 3, `MEDIA ${mm(mediaW)}×${mm(mediaH)}`, { size: 1.9, fill: FAINT });
  p2 += `<rect x="${r1(gx + off)}" y="${r1(gy + off)}" width="${r1((f.flat.w + 2 * d.bleed) * k)}" height="${r1((f.flat.h + 2 * d.bleed) * k)}" fill="#F3E3C4" stroke="#C9A86A" stroke-width="0.3"/>`;
  p2 += T(gx + off + 1, gy + off + 3, 'BLEED', { size: 1.9, fill: '#8A6A2E' });
  const tx = gx + off + b, ty = gy + off + b, tw = f.flat.w * k, th = f.flat.h * k;
  p2 += `<rect x="${r1(tx)}" y="${r1(ty)}" width="${r1(tw)}" height="${r1(th)}" fill="#FFFFFF" stroke="${INK}" stroke-width="0.35"/>`;
  p2 += T(tx + 1, ty + 3, `TRIM ${mm(f.flat.w)}×${mm(f.flat.h)}`, { size: 1.9 });
  p2 += `<rect x="${r1(tx + d.safe * k)}" y="${r1(ty + d.safe * k)}" width="${r1(Math.max(0, tw - 2 * d.safe * k))}" height="${r1(Math.max(0, th - 2 * d.safe * k))}" fill="#EAF7F2" stroke="#2F9E7A" stroke-width="0.25" stroke-dasharray="1 0.8"/>`;
  p2 += T(tx + tw / 2, ty + th / 2, `SAFE ${mm(d.safe)} mm`, { size: 1.9, anchor: 'middle', fill: '#2F9E7A' });
  // crop marks
  const cm = (x: number, y: number, dx: number, dy: number) => `<path d="M${r1(x + dx * (b + d.marks.offset * k))} ${r1(y)}h${r1(dx * d.marks.len * k)}M${r1(x)} ${r1(y + dy * (b + d.marks.offset * k))}v${r1(dy * d.marks.len * k)}" stroke="${INK}" stroke-width="0.25"/>`;
  p2 += cm(tx, ty, -1, -1) + cm(tx + tw, ty, 1, -1) + cm(tx, ty + th, -1, 1) + cm(tx + tw, ty + th, 1, 1);
  // Legend
  const LX = GX + GW + 6;
  const legend: [string, string, string][] = [
    ['MediaBox', 'none', `Whole page: trim + bleed + ${mm(d.marks.offset)} mm offset + ${mm(d.marks.len)} mm crop marks (${mm(mediaW)} × ${mm(mediaH)} mm).`],
    ['CropBox', 'none', 'What viewers show — set to the MediaBox so the marks are visible.'],
    ['BleedBox', '#F3E3C4', `Trim + ${mm(d.bleed)} mm on every edge; artwork continues to here.`],
    ['TrimBox', '#FFFFFF', `Finished size after cutting: ${mm(f.flat.w)} × ${mm(f.flat.h)} mm.`],
    ['Safe area', '#EAF7F2', `Keep all text ${mm(d.safe)} mm inside the trim and away from folds.`],
  ];
  legend.forEach(([name, fill, desc], i) => {
    const y = 49 + i * 10.5;
    p2 += `<rect x="${LX}" y="${y - 2.6}" width="5" height="3.4" fill="${fill === 'none' ? '#FFFFFF' : fill}" stroke="${fill === 'none' ? FAINT : INK}" stroke-width="0.25"${fill === 'none' ? ' stroke-dasharray="0.8 0.6"' : ''}/>`;
    p2 += T(LX + 7, y, name, { size: 2.6, weight: 700 });
    p2 += lines(LX + 7, y + 3.4, desc, 52, { size: 2.2, fill: MUTED }, 2.8);
  });
  p2 += lines(LX, 104, 'Backgrounds and photographs that reach the edge of the page continue into the bleed. Crop marks sit outside the bleed and never touch the artwork.', 58, { size: 2.2, fill: MUTED }, 2.8);
  // Method note
  p2 += `<rect x="${M}" y="126" width="${LW}" height="26" fill="${TINT}"/><rect x="${M}" y="126" width="0.9" height="26" fill="${ACCENT}"/>`;
  p2 += T(M + 4, 132, `${d.print.method || 'Printing method'}`, { size: 3, weight: 700 });
  const methodNote = /offset/i.test(d.print.method)
    ? 'Offset: the printer imposes the supplied pages to suit their press and folding machine; use the panel order on sheet 1 and the fold positions above.'
    : /digital/i.test(d.print.method)
      ? 'Digital: print straight from the press file at 100 %, duplex, with the panel order on sheet 1. Short runs are usually digital.'
      : 'Confirm the press and the imposition with the printer before the run.';
  p2 += lines(M + 4, 137, methodNote, 120, { size: 2.4, fill: MUTED }, 3.2);
  p2 += promoBox(d, M, 156, LW, 37);
  // Supplied files
  const FX = M + LW + 8, FW = W - M - FX;
  p2 += T(FX, 41, 'Supplied files', { size: 3.4, weight: 700 });
  let fy = 48;
  if (!d.files.length) { p2 += lines(FX, fy, 'No files supplied yet. Add the press and reference PDFs in the calculator to list them here with their real page sizes and boxes.', 46, { size: 2.4, fill: MUTED }, 3.2); fy += 12; }
  for (const fl of d.files.slice(0, 4)) {
    p2 += label(FX, fy, fl.purpose);
    p2 += T(FX + 22, fy, fl.name, { size: 2.6, weight: 700 });
    const size = fl.sizes[0] ? `${mm(fl.sizes[0].w)} × ${mm(fl.sizes[0].h)} mm` : '—';
    const desc = [`${fl.pages} page${fl.pages === 1 ? '' : 's'}`, `media ${size}`, fl.trim ? `trim ${mm(fl.trim.w)} × ${mm(fl.trim.h)} mm` : 'no TrimBox', fl.bleed != null ? `${mm(fl.bleed)} mm bleed` : 'no bleed', fl.colour || '', fl.ready ? 'ready to print' : `not ready: ${fl.issues.join('; ')}`].filter(Boolean).join(' · ');
    const dl = wrap(desc, 44);
    dl.slice(0, 3).forEach((l, i) => { p2 += T(FX + 22, fy + 3.4 + i * 3, l, { size: 2.2, fill: fl.ready ? MUTED : '#B42318' }); });
    fy += 6 + Math.min(3, dl.length) * 3;
  }
  // Page contents
  fy = Math.max(fy + 4, 84);
  p2 += T(FX, fy, 'Page contents', { size: 3.4, weight: 700 }); fy += 6;
  for (let i = 0; i < 2 * n && fy < 192; i++) {
    const role = i < n ? side1[i].role : side2[i - n].role;
    p2 += label(FX, fy, `Panel ${i + 1}`);
    const txt = d.contents[i] || `${role} — content to be confirmed`;
    const tl = wrap(txt, 42).slice(0, 2);
    tl.forEach((l, j) => { p2 += T(FX + 22, fy + j * 3, l, { size: 2.4, fill: d.contents[i] ? INK : FAINT }); });
    fy += Math.max(6, tl.length * 3 + 3);
  }

  // ── Page 3 ──
  let p3 = header(d, 'Production notes & approval', 'Checks before printing, and the customer sign-off.', [
    d.job.orderNo && `ORDER ${d.job.orderNo}`, d.job.status && `STATUS ${d.job.status.toUpperCase()}`, d.job.preparedBy && `PREPARED BY ${d.job.preparedBy}`,
  ].filter(Boolean) as string[]);
  p3 += T(M, 41, 'Production notes', { size: 3.4, weight: 700 });
  let ny = 48;
  for (const nt of [...d.notes, ...f.notes]) { const nl = wrap(nt, 95); nl.forEach((l, i) => { p3 += T(M + (i ? 4 : 0), ny + i * 3.3, (i ? '' : '•  ') + l, { size: 2.6 }); }); ny += nl.length * 3.3 + 2; if (ny > 120) break; }
  if (d.print.cutting) { ny += 2; p3 += T(M, ny, 'Cutting instructions', { size: 3, weight: 700 }); ny += 5; p3 += lines(M, ny, d.print.cutting, 95, { size: 2.6 }, 3.3); }
  const AX = 160;
  p3 += T(AX, 41, 'Approval', { size: 3.4, weight: 700 });
  let ay = 49;
  for (const a of d.approvals) {
    p3 += `<rect x="${AX}" y="${ay - 3}" width="3.6" height="3.6" fill="none" stroke="${INK}" stroke-width="0.3"/>`;
    p3 += T(AX + 6, ay, a, { size: 2.8 });
    p3 += `<line x1="${AX + 70}" y1="${ay + 0.6}" x2="${W - M}" y2="${ay + 0.6}" stroke="${LINE}" stroke-width="0.25"/>`;
    p3 += T(W - M, ay - 1, 'initials', { size: 1.8, fill: FAINT, anchor: 'end' });
    ay += 9;
  }
  ay += 6;
  for (const s of ['Customer name', 'Customer signature', 'Approval date']) {
    p3 += label(AX, ay, s);
    p3 += `<line x1="${AX + 34}" y1="${ay + 0.6}" x2="${W - M}" y2="${ay + 0.6}" stroke="${INK}" stroke-width="0.3"/>`;
    ay += 11;
  }
  p3 += lines(AX, ay + 2, 'Printing starts only after this page is signed and returned. Approval confirms the artwork, the PDF proof, paper stock, colours, quantity and finishing listed in this document.', 62, { size: 2.3, fill: MUTED }, 3);
  p3 += promoBox(d, M, 150, 140, 43);

  const pages = [p1, p2, p3];
  return pages.map((g, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${g}${footer(d, i + 1, pages.length)}</svg>`);
}
