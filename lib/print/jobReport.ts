// JOB REPORT — the one document that travels with a print job (A4 landscape,
// 2 pages, vector SVG for svgToPdf). Branded Magical Touch Design in the
// header and footer only; the artwork and the print files never carry the
// brand.
//
// Page 1  Job & specification: who / what, a preview of every side with its
//         folds and panel sizes, the specification and the print files.
// Page 2  Production: how the file is built (trim, bleed, safe, cut and fold
//         marks — the "working file" instructions), folding sequence, cutting
//         and printing instructions, notes and the approval sign-off.

import type { PrintJobInfo } from './printJob.ts';
import { sideFolds, sidePanels } from './printJob.ts';

export interface JobDetails {
  jobName: string; client: string; designer: string; company: string; contact: string;
  quantity: string; stock: string; colours: string; notes: string;
}
export const EMPTY_DETAILS: JobDetails = { jobName: '', client: '', designer: '', company: '', contact: '', quantity: '', stock: '', colours: '', notes: '' };

export interface ReportFile { label: string; file: string; sheet: string; scale: number; printed: string; marks: string }
export interface JobReportData {
  job: PrintJobInfo; details: JobDetails; date: string;
  previews: ({ src: string; w: number; h: number } | null)[];
  files: ReportFile[];
  margin: number; markType: number; colour: string;
  logo?: { src: string; w: number; h: number } | null;
}

export const PRODUCTION_NOTES = [
  'Print one copy first, cut and fold it, and check panel order and fold positions before the run.',
  'Print duplex jobs turning on the edge shown in this report; check with the folded dummy.',
  'Fonts are embedded and artwork is vector where possible; check photos are 300 dpi at final size.',
  'Check colours against the approved proof; screen colours are not a colour proof.',
];
export const APPROVALS = ['Artwork and text', 'Sizes, folds and panel order', 'Paper stock and finishing', 'Colours', 'Quantity'];

const W = 297, H = 210, M = 12;
const INK = '#09090B', MUTED = '#52525B', FAINT = '#A1A1AA', LINE = '#E4E4E7', ACCENT = '#3B82C4', TINT = '#F4F4F5';
const CUT = '#E30613', FOLD = '#00A651', BLEED = '#3B9BD8', SAFE = '#2F9E7A';
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

export function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  for (const para of String(s || '').split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
    }
    if (line) out.push(line);
  }
  return out;
}
const T = (x: number, y: number, s: string, size = 2.8, o: { bold?: boolean; color?: string; anchor?: string } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${o.bold ? ' font-weight="700"' : ''} fill="${o.color || INK}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const label = (x: number, y: number, s: string) => T(x, y, s.toUpperCase(), 2.3, { bold: true, color: ACCENT });

function header(d: JobReportData, title: string): string {
  const cols = ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80', '#FACC15'];
  let g = cols.map((c, i) => `<rect x="${r2((W / cols.length) * i)}" y="0" width="${r2(W / cols.length + 0.2)}" height="1.4" fill="${c}"/>`).join('');
  let x = M;
  if (d.logo) { const lh = 7.5, lw = lh * (d.logo.w / d.logo.h); g += `<image x="${M}" y="7" width="${r2(lw)}" height="${lh}" href="${d.logo.src}"/>`; x = M + lw + 6; }
  else { g += T(M, 12.5, 'MAGICAL TOUCH DESIGN', 3.6, { bold: true }); x = M + 52; }
  g += `<line x1="${r2(x - 3)}" y1="7" x2="${r2(x - 3)}" y2="15" stroke="${LINE}" stroke-width="0.3"/>`;
  g += T(x, 10.5, 'JOB REPORT', 2.4, { bold: true, color: ACCENT });
  g += T(x, 15, title, 3.4, { bold: true });
  g += T(W - M, 10.5, d.date, 2.6, { color: MUTED, anchor: 'end' });
  g += T(W - M, 15, d.details.jobName || 'Untitled job', 2.6, { color: MUTED, anchor: 'end' });
  g += `<line x1="${M}" y1="20" x2="${W - M}" y2="20" stroke="${LINE}" stroke-width="0.3"/>`;
  return g;
}
function footer(page: number, pages: number): string {
  return `<line x1="${M}" y1="${H - 11}" x2="${W - M}" y2="${H - 11}" stroke="${LINE}" stroke-width="0.3"/>`
    + T(M, H - 6.5, 'Magical Touch Design · www.magicaltouchdesign.com', 2.3, { bold: true, color: MUTED })
    + T(W / 2, H - 6.5, 'Technical document — not a print file', 2.3, { color: FAINT, anchor: 'middle' })
    + T(W - M, H - 6.5, `Page ${page} of ${pages}`, 2.3, { color: MUTED, anchor: 'end' });
}

/** Rows of "label  value" with wrapping; returns the new y. */
function rows(g: { s: string }, x: number, y: number, w: number, items: [string, string][], keyW = 30, size = 2.55): number {
  const max = Math.max(16, Math.floor((w - keyW) / (size * 0.5)));
  for (const [k, v] of items) {
    const ls = wrap(v || '—', max);
    g.s += T(x, y, k, 2.35, { color: MUTED });
    ls.forEach((ln, i) => { g.s += T(x + keyW, y + i * 3.25, ln, size); });
    y += Math.max(1, ls.length) * 3.25 + 1;
    g.s += `<line x1="${x}" y1="${r2(y - 2.6)}" x2="${x + w}" y2="${r2(y - 2.6)}" stroke="${LINE}" stroke-width="0.15"/>`;
  }
  return y;
}

function previews(d: JobReportData, x: number, y: number, w: number, h: number): string {
  const j = d.job, n = Math.max(1, j.sides.length);
  const cols = n > 2 ? 2 : 1, rowsN = Math.ceil(n / cols);
  const cellW = (w - (cols - 1) * 6) / cols, cellH = (h - rowsN * 16) / rowsN;
  let g = '';
  for (let i = 0; i < n; i++) {
    const c = i % cols, rr = Math.floor(i / cols);
    const k = Math.min(cellW / j.trimW, cellH / j.trimH), pw = j.trimW * k, ph = j.trimH * k;
    const x0 = x + c * (cellW + 6) + (cellW - pw) / 2, y0 = y + 4 + rr * (cellH + 16);
    g += T(x0, y0 - 1.5, `${j.sides[i] || `Side ${i + 1}`}${n > 1 ? ` · side ${i + 1} of ${n}` : ''}`, 2.6, { bold: true });
    const pv = d.previews[i];
    if (pv) g += `<image x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" href="${pv.src}"/>`;
    else g += `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" fill="${TINT}"/>`;
    g += `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" fill="none" stroke="${INK}" stroke-width="0.3"/>`;
    const panels = sidePanels(j, i);
    if (!pv) panels.forEach((p, pi) => { const cx = x0 + (p.x + p.w / 2) * k; g += T(cx, y0 + ph / 2, String(i * panels.length + pi + 1), 6, { color: FAINT, anchor: 'middle' }) + T(cx, y0 + ph / 2 + 4.5, p.name, 2, { color: MUTED, anchor: 'middle' }); });
    for (const f of sideFolds(j, i)) {
      if (f.x != null) g += `<line x1="${r2(x0 + f.x * k)}" y1="${r2(y0 - 1.5)}" x2="${r2(x0 + f.x * k)}" y2="${r2(y0 + ph + 1.5)}" stroke="${FOLD}" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
      if (f.y != null) g += `<line x1="${r2(x0 - 1.5)}" y1="${r2(y0 + f.y * k)}" x2="${r2(x0 + pw + 1.5)}" y2="${r2(y0 + f.y * k)}" stroke="${FOLD}" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
    }
    for (const p of panels) {
      const a = x0 + p.x * k, b = x0 + (p.x + p.w) * k, py = y0 + ph + 3;
      g += `<path d="M${r2(a + 0.4)} ${r2(py)}H${r2(b - 0.4)}M${r2(a + 0.4)} ${r2(py - 1)}v2M${r2(b - 0.4)} ${r2(py - 1)}v2" stroke="${FAINT}" stroke-width="0.2" fill="none"/>`;
      if (b - a > 9) g += T((a + b) / 2, py + 3, `${r2(p.w)} mm`, 2.1, { color: MUTED, anchor: 'middle' });
    }
    if (!panels.length) g += T(x0 + pw / 2, y0 + ph + 4, `${j.trimW} × ${j.trimH} mm`, 2.2, { color: MUTED, anchor: 'middle' });
  }
  return g;
}

export function jobReportPages(d: JobReportData): string[] {
  const j = d.job, det = d.details;
  const title = `${j.title} · ${j.trimW} × ${j.trimH} mm`;

  // ── Page 1: job & specification ──
  const p1 = { s: header(d, title) };
  const LW = 165, RX = M + LW + 10, RW = W - M - RX;
  p1.s += label(M, 28, 'Preview');
  p1.s += previews(d, M, 32, LW, 130);
  p1.s += `<line x1="${M}" y1="173" x2="${M + 7}" y2="173" stroke="${FOLD}" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>` + T(M + 9, 173.8, 'fold', 2.2, { color: MUTED });
  p1.s += `<rect x="${M + 20}" y="171.8" width="6" height="2.4" fill="none" stroke="${INK}" stroke-width="0.25"/>` + T(M + 28, 173.8, 'finished (trim) edge — panel numbers in reading order', 2.2, { color: MUTED });
  // Job
  p1.s += label(RX, 28, 'Job');
  let y = rows(p1, RX, 34, RW, [
    ['Job', det.jobName], ['Client', det.client], ['Designer', det.designer],
    ['Company', [det.company, det.contact].filter(Boolean).join(' · ')], ['Quantity', det.quantity ? `${det.quantity} copies` : 'To confirm'],
  ]);
  // Specification
  p1.s += label(RX, y + 3, 'Specification');
  const spec: [string, string][] = [
    ['Finished size', `${j.trimW} × ${j.trimH} mm${j.sides.length > 1 ? `, printed ${j.sides.length} sides` : ''}`],
    ...(j.folded ? [['Folded size', `${r1(j.folded.w)} × ${r1(j.folded.h)} mm${j.folded.thick ? ` · ≈ ${j.folded.thick} mm thick` : ''}`] as [string, string]] : []),
    ...(j.panels.length > 1 ? [['Panels', j.panels.map((p) => `${r2(p.w)}`).join(' / ') + ' mm'] as [string, string]] : []),
    ...(j.folds.length ? [['Folds', [...j.folds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => `${f.x != null ? `${r2(f.x)} mm` : `${r2(f.y!)} mm ↓`}${f.dir ? ` ${f.dir}` : ''}`).join(' · ')] as [string, string]] : []),
    ['Bleed / safe', `${j.bleed} mm bleed · ${j.safe} mm safe area`],
    ['Paper', det.stock || (j.values || []).find(([k]) => k === 'Paper')?.[1] || 'To confirm'],
    ['Colours', det.colours || d.colour],
    ...(j.values || []).filter(([k]) => k !== 'Paper'),
  ];
  y = rows(p1, RX, y + 9, RW, spec);
  // Files
  if (d.files.length) {
    p1.s += label(RX, y + 3, 'Print files');
    y = rows(p1, RX, y + 9, RW, d.files.map((f) => [f.label, `${f.sheet} · ${f.scale < 1 ? `scaled ${r1(f.scale * 100)} %` : '100 %'} · ${f.marks}`]));
  }

  // ── Page 2: production ──
  const p2 = { s: header(d, 'Production & approval') };
  // How the file is built — the working-file instructions.
  p2.s += label(M, 28, 'How the file is built');
  const legend: [string, string][] = [
    [`<line x1="0" y1="1.5" x2="9" y2="1.5" stroke="${CUT}" stroke-width="0.5"/>`, 'Cut marks — cut here (red, outside the artwork)'],
    [`<line x1="0" y1="1.5" x2="9" y2="1.5" stroke="${FOLD}" stroke-width="0.5" stroke-dasharray="1.2 0.8"/>`, j.folds.length ? 'Fold marks — fold here (green, outside the artwork)' : 'Fold marks — none on this job'],
    [`<rect x="0" y="0" width="9" height="3.4" fill="none" stroke="${INK}" stroke-width="0.35"/>`, `Finished (trim) size — ${j.trimW} × ${j.trimH} mm`],
    [`<rect x="0" y="0" width="9" height="3.4" fill="none" stroke="${BLEED}" stroke-width="0.35"/>`, `Bleed — artwork runs ${j.bleed} mm past the trim on every edge`],
    [`<rect x="0" y="0" width="9" height="3.4" fill="none" stroke="${SAFE}" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`, `Safe area — keep text ${j.safe} mm inside the trim${j.folds.length ? ' and away from folds' : ''}`],
  ];
  legend.forEach(([icon, txt], i) => { const yy = 34 + i * 6.2; p2.s += `<g transform="translate(${M} ${r2(yy - 2.8)})">${icon}</g>` + T(M + 13, yy, txt, 2.6); });
  y = 34 + legend.length * 6.2 + 4;
  p2.s += label(M, y, 'Cutting & printing'); y += 6;
  const fit = d.files.find((f) => f.scale < 1);
  const howTo = [
    `Print at 100 % / "Actual size" — never "Fit to page". Any scaling is already in the file${fit ? ` (the fit-to-print file is ${r1(fit.scale * 100)} %)` : ''}.`,
    `Printer no-print edge allowed for: ${d.margin} mm. Crop marks: type ${d.markType}.`,
    `Cut on the red marks to ${j.trimW} × ${j.trimH} mm${j.folds.length ? ', then fold on the green marks in the order below' : ''}.`,
    ...(j.sides.length > 1 ? [`Two-sided: ${j.sides.join(' then ')}; ${j.folds.some((f) => f.y != null) ? 'turn on the long edge' : 'turn on the short edge'} and check against a folded dummy.`] : []),
  ];
  for (const s of howTo) { const ls = wrap(s, 92); ls.forEach((ln, i) => { p2.s += T(M + (i ? 3 : 0), y + i * 3.3, (i ? '' : '•  ') + ln, 2.6); }); y += ls.length * 3.3 + 1.6; }
  if (j.sequence?.length) {
    y += 2; p2.s += label(M, y, 'Folding sequence'); y += 6;
    j.sequence.forEach((s, i) => { const ls = wrap(s, 92); ls.forEach((ln, k) => { p2.s += T(M + (k ? 4 : 0), y + k * 3.3, (k ? '' : `${i + 1}.  `) + ln, 2.6); }); y += ls.length * 3.3 + 1.2; });
  }
  y += 2; p2.s += label(M, y, 'Production notes'); y += 6;
  for (const s of [...PRODUCTION_NOTES, ...(det.notes ? [det.notes] : [])]) { if (y > 188) break; const ls = wrap(s, 92); ls.forEach((ln, i) => { p2.s += T(M + (i ? 3 : 0), y + i * 3.3, (i ? '' : '•  ') + ln, 2.6, { color: s === det.notes ? INK : MUTED }); }); y += ls.length * 3.3 + 1.4; }
  // Approval
  const AX = 196;
  p2.s += `<rect x="${AX - 6}" y="24" width="${W - M - AX + 6}" height="${H - 24 - 16}" fill="${TINT}"/>`;
  p2.s += label(AX, 31, 'Approval');
  let ay = 39;
  for (const a of APPROVALS) {
    p2.s += `<rect x="${AX}" y="${ay - 2.9}" width="3.4" height="3.4" fill="#FFFFFF" stroke="${INK}" stroke-width="0.3"/>` + T(AX + 6, ay, a, 2.6);
    ay += 7.5;
  }
  ay += 5;
  for (const s of ['Name', 'Signature', 'Date']) {
    p2.s += T(AX, ay, s, 2.4, { color: MUTED }) + `<line x1="${AX + 20}" y1="${ay + 0.6}" x2="${W - M - 4}" y2="${ay + 0.6}" stroke="${INK}" stroke-width="0.3"/>`;
    ay += 11;
  }
  wrap('Printing starts after this report is approved. Approval covers the artwork, sizes, folds, paper, colours and quantity listed here.', 44).forEach((ln, i) => { p2.s += T(AX, ay + 2 + i * 3.1, ln, 2.3, { color: MUTED }); });

  const pages = [p1.s, p2.s];
  return pages.map((g, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${g}${footer(i + 1, pages.length)}</svg>`);
}
