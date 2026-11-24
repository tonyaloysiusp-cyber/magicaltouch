// TECHNICAL DOCUMENT — one branded job / production sheet for every export
// (design, packaging, textile, print & cut, photo). A4 portrait, vector SVG
// pages in the Magical Touch Design document style (lib/print/docStyle):
// spectrum hairlines, logo header, job reference, specification tables, a
// preview, line legends, checks and the approval sign-off. Never a print
// file: the print files themselves carry no branding.
//
// Callers describe the job as data (TechDocSpec); this file lays it out and
// paginates it. Text is Helvetica so the PDF needs no embedded fonts.

import { C, caps, card, docFooter, docHeader, docPage, esc, metaStrip, promo, section, txt, type DocLogo } from './docStyle.ts';

export type TechRow = [string, string];
export type TechBlock =
  | { type: 'kv'; title: string; rows: TechRow[]; cols?: 1 | 2 }
  | { type: 'table'; title: string; head: string[]; rows: string[][]; widths?: number[]; align?: ('l' | 'r')[] }
  | { type: 'legend'; title: string; items: { colour: string; label: string; note?: string; dash?: string }[] }
  | { type: 'notes'; title: string; items: string[] }
  | { type: 'checks'; title: string; items: string[] }
  | { type: 'image'; title: string; src: string; w: number; h: number; maxH?: number; caption?: string }
  | { type: 'signoff'; title?: string; roles?: string[] };

export interface TechDocSpec {
  /** Document type shown above the title, e.g. "Packaging specification". */
  kind: string;
  title: string;
  /** Short line under the logo (client, product, file name…). */
  subtitle?: string;
  date?: string;
  /** Job reference; made from the title and date when left out. */
  ref?: string;
  /** Up to 5 key facts in the strip under the header. */
  summary?: TechRow[];
  /** Main preview with an optional caption; shown beside `spec`. */
  preview?: { src: string; w: number; h: number; caption?: string } | null;
  /** Specification rows beside the preview. */
  spec?: TechRow[];
  blocks: TechBlock[];
  /** Footer label (defaults to the job reference). */
  label?: string;
}

const W = 210, H = 297, M = 14, CW = W - 2 * M;
const TOP = 30, BOTTOM = H - 18;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Rough Helvetica width (mm) of a string at a font size (mm). */
const textW = (s: string, size: number) => s.length * size * 0.5;
export function wrapText(s: string, maxMm: number, size: number): string[] {
  const max = Math.max(4, Math.floor(maxMm / (size * 0.5)));
  const out: string[] = [];
  for (const para of String(s ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && (line + ' ' + word).length > max) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
      while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max); }
    }
    out.push(line);
  }
  return out.length ? out : [''];
}
const clip = (s: string, maxMm: number, size: number) => {
  const max = Math.max(3, Math.floor(maxMm / (size * 0.5)));
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
};

/** Stable job reference from the title and date. */
export function techRef(title: string, date: string): string {
  let h = 0; for (const ch of `${title}|${date}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `MTD-${(h % 900000 + 100000)}`;
}

// ── block measuring and drawing ─────────────────────────────────────────────
const KV_LINE = 3.3, KEY_SIZE = 2.3, VAL_SIZE = 2.55;

function kvLayout(rows: TechRow[], w: number) {
  const keyW = Math.min(36, w * 0.4);
  return rows.map(([k, v]) => ({ k, lines: wrapText(v || '—', w - keyW - 2, VAL_SIZE), keyW }));
}
function kvHeight(rows: TechRow[], w: number) { return kvLayout(rows, w).reduce((a, r) => a + r.lines.length * KV_LINE + 1.6, 0); }
function drawKv(x: number, y: number, w: number, rows: TechRow[]): string {
  let g = '';
  for (const r of kvLayout(rows, w)) {
    g += txt(x, y + 2.6, clip(r.k, r.keyW - 2, KEY_SIZE), KEY_SIZE, { color: C.muted });
    r.lines.forEach((ln, i) => { g += txt(x + r.keyW, y + 2.6 + i * KV_LINE, ln, VAL_SIZE, { color: C.ink }); });
    y += r.lines.length * KV_LINE + 1.6;
    g += `<line x1="${r2(x)}" y1="${r2(y - 0.2)}" x2="${r2(x + w)}" y2="${r2(y - 0.2)}" stroke="${C.line}" stroke-width="0.18"/>`;
  }
  return g;
}

const SEC_H = 7; // section title + gap
const ROW_H = 5.2;

function colWidths(b: Extract<TechBlock, { type: 'table' }>): number[] {
  const n = b.head.length;
  if (b.widths && b.widths.length === n) { const t = b.widths.reduce((a, c) => a + c, 0); return b.widths.map((c) => (c / t) * CW); }
  // proportional to the longest cell, with a floor
  const len = b.head.map((h, i) => Math.max(h.length, ...b.rows.map((r) => String(r[i] ?? '').length), 4));
  const t = len.reduce((a, c) => a + c, 0);
  return len.map((l) => (l / t) * CW);
}

function blockHeight(b: TechBlock): number {
  switch (b.type) {
    case 'kv': {
      if ((b.cols ?? 2) === 2 && b.rows.length > 3) { const half = Math.ceil(b.rows.length / 2), cw = (CW - 8) / 2; return SEC_H + Math.max(kvHeight(b.rows.slice(0, half), cw), kvHeight(b.rows.slice(half), cw)) + 4; }
      return SEC_H + kvHeight(b.rows, CW) + 4;
    }
    case 'table': return SEC_H + ROW_H + 1 + b.rows.length * ROW_H + 4;
    case 'legend': return SEC_H + Math.ceil(b.items.length / 2) * 7 + 3;
    case 'notes': case 'checks': return SEC_H + b.items.reduce((a, s) => a + wrapText(s, CW - 8, 2.5).length * 3.3 + 1.4, 0) + 3;
    case 'image': { const mh = b.maxH ?? 110; const k = Math.min(CW / b.w, mh / b.h); return SEC_H + b.h * k + (b.caption ? 5 : 0) + 5; }
    case 'signoff': return SEC_H + 22 + 4;
  }
}

function drawBlock(b: TechBlock, y: number): string {
  let g = '';
  if (b.type !== 'signoff' || b.title) g += section(M, y + 3, b.title || '', CW);
  else g += section(M, y + 3, 'Approval', CW);
  let yy = y + SEC_H;
  switch (b.type) {
    case 'kv': {
      if ((b.cols ?? 2) === 2 && b.rows.length > 3) {
        const half = Math.ceil(b.rows.length / 2), cw = (CW - 8) / 2;
        g += drawKv(M, yy, cw, b.rows.slice(0, half)) + drawKv(M + cw + 8, yy, cw, b.rows.slice(half));
      } else g += drawKv(M, yy, CW, b.rows);
      break;
    }
    case 'table': {
      const ws = colWidths(b);
      g += `<rect x="${M}" y="${r2(yy)}" width="${CW}" height="${ROW_H}" rx="1" fill="${C.soft}"/>`;
      let x = M;
      b.head.forEach((h, i) => {
        const right = b.align?.[i] === 'r';
        g += caps(right ? x + ws[i] - 2 : x + 2, yy + 3.5, clip(h, ws[i] - 3, 1.9), 1.75, C.muted, 0.3, right ? 'end' : 'start');
        x += ws[i];
      });
      yy += ROW_H + 1;
      b.rows.forEach((row, ri) => {
        if (ri % 2 === 1) g += `<rect x="${M}" y="${r2(yy)}" width="${CW}" height="${ROW_H}" fill="#FBFBFD"/>`;
        let cx = M;
        row.forEach((cell, i) => {
          const right = b.align?.[i] === 'r';
          g += txt(right ? cx + ws[i] - 2 : cx + 2, yy + 3.6, clip(String(cell ?? ''), ws[i] - 3, 2.45), 2.45, { color: i === 0 ? C.ink : C.text, bold: i === 0, anchor: right ? 'end' : 'start' });
          cx += ws[i];
        });
        yy += ROW_H;
        g += `<line x1="${M}" y1="${r2(yy)}" x2="${M + CW}" y2="${r2(yy)}" stroke="${C.line}" stroke-width="0.15"/>`;
      });
      break;
    }
    case 'legend': {
      const cw = (CW - 8) / 2;
      b.items.forEach((it, i) => {
        const x = M + (i % 2) * (cw + 8), ly = yy + Math.floor(i / 2) * 7;
        g += `<line x1="${r2(x)}" y1="${r2(ly + 2)}" x2="${r2(x + 10)}" y2="${r2(ly + 2)}" stroke="${it.colour}" stroke-width="0.7"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>`;
        g += txt(x + 13, ly + 2.8, it.label, 2.5, { bold: true, color: C.ink });
        if (it.note) g += txt(x + 13, ly + 5.8, clip(it.note, cw - 14, 2.1), 2.1, { color: C.muted });
      });
      break;
    }
    case 'notes': case 'checks': {
      b.items.forEach((s, i) => {
        const lines = wrapText(s, CW - 8, 2.5);
        if (b.type === 'checks') g += `<rect x="${M}" y="${r2(yy + 0.6)}" width="2.6" height="2.6" rx="0.5" fill="none" stroke="${C.faint}" stroke-width="0.25"/>`;
        else g += txt(M + 1, yy + 2.8, String(i + 1).padStart(2, '0'), 2.2, { bold: true, color: C.accent });
        lines.forEach((ln, li) => { g += txt(M + 7, yy + 2.8 + li * 3.3, ln, 2.5, { color: C.text }); });
        yy += lines.length * 3.3 + 1.4;
      });
      break;
    }
    case 'image': {
      const mh = b.maxH ?? 110; const k = Math.min(CW / b.w, mh / b.h); const iw = b.w * k, ih = b.h * k, ix = M + (CW - iw) / 2;
      g += card(M, yy - 1, CW, ih + 2 + (b.caption ? 5 : 0), C.soft);
      g += `<image x="${r2(ix)}" y="${r2(yy)}" width="${r2(iw)}" height="${r2(ih)}" href="${b.src}"/>`;
      if (b.caption) g += txt(M + CW / 2, yy + ih + 4, b.caption, 2.2, { color: C.muted, anchor: 'middle' });
      break;
    }
    case 'signoff': {
      const roles = b.roles?.length ? b.roles : ['Prepared by', 'Checked by', 'Approved by (client)'];
      const cw = (CW - (roles.length - 1) * 5) / roles.length;
      roles.forEach((r, i) => {
        const x = M + i * (cw + 5);
        g += card(x, yy, cw, 22);
        g += caps(x + 3, yy + 4.5, r, 1.75, C.muted, 0.3);
        g += `<line x1="${r2(x + 3)}" y1="${r2(yy + 13)}" x2="${r2(x + cw - 3)}" y2="${r2(yy + 13)}" stroke="${C.line}" stroke-width="0.25"/>`;
        g += txt(x + 3, yy + 16, 'Name and signature', 1.9, { color: C.faint });
        g += txt(x + 3, yy + 19.6, 'Date', 1.9, { color: C.faint });
      });
      break;
    }
  }
  return g;
}

/** Lays the document out on A4 pages (SVG, mm). */
export function techDocPages(spec: TechDocSpec, logo?: DocLogo): { svg: string; widthMm: number; heightMm: number }[] {
  const date = spec.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const ref = spec.ref || techRef(spec.title, date);
  const bodies: string[] = [];
  let g = '', y = TOP;

  // Key facts strip
  const summary = (spec.summary || []).slice(0, 5);
  if (summary.length) { g += metaStrip(M, y, CW, summary); y += 17; }

  // Preview + specification
  if (spec.preview || spec.spec?.length) {
    const hasPv = !!spec.preview, rows = spec.spec || [];
    const pvW = hasPv ? (rows.length ? CW * 0.55 : CW) : 0;
    const sw = hasPv ? CW - pvW - 7 : CW;
    const specH = rows.length ? SEC_H + kvHeight(rows, sw) : 0;
    let boxH = Math.max(specH, 0);
    if (hasPv) {
      const p = spec.preview!; const maxH = 120;
      const k = Math.min((pvW - 8) / p.w, maxH / p.h); const iw = p.w * k, ih = p.h * k;
      const ph = ih + 14 + (p.caption ? 4 : 0);
      boxH = Math.max(boxH, ph);
      g += section(M, y + 3, 'Preview', pvW);
      g += card(M, y + 7, pvW, boxH - 7, C.soft);
      const ix = M + (pvW - iw) / 2, iy = y + 11;
      g += `<image x="${r2(ix)}" y="${r2(iy)}" width="${r2(iw)}" height="${r2(ih)}" href="${p.src}"/>`;
      g += `<rect x="${r2(ix)}" y="${r2(iy)}" width="${r2(iw)}" height="${r2(ih)}" fill="none" stroke="${C.line}" stroke-width="0.25"/>`;
      if (p.caption) g += txt(M + pvW / 2, iy + ih + 4.4, clip(p.caption, pvW - 6, 2.2), 2.2, { color: C.muted, anchor: 'middle' });
    }
    if (rows.length) {
      const sx = hasPv ? M + pvW + 7 : M;
      g += section(sx, y + 3, 'Specification', sw) + drawKv(sx, y + SEC_H, sw, rows);
    }
    y += boxH + 6;
  }

  const blocks = [...spec.blocks];
  for (const b of blocks) {
    const h = blockHeight(b);
    if (y + h > BOTTOM && y > TOP + 1) { bodies.push(g); g = ''; y = TOP; }
    g += drawBlock(b, y); y += h;
  }
  // the one small note about the site, if it fits on the last page
  if (y + 16 <= BOTTOM) g += promo(M, BOTTOM - 14, CW);
  bodies.push(g);

  const label = spec.label || `Job ${ref}`;
  return bodies.map((body, i) => ({
    svg: docPage(W, H, docHeader(W, { logo, kind: spec.kind, title: clipTitle(spec.title), meta: `${ref} · ${date} · Rev A`, meta2: spec.subtitle, margin: M }) + body + docFooter(W, H, { label, page: i + 1, pages: bodies.length, margin: M })),
    widthMm: W, heightMm: H,
  }));
}
const clipTitle = (t: string) => (textW(t, 4.1) > 120 ? t.slice(0, 56) + '…' : t);

/** Builds the technical document and saves it as a PDF (on this device). */
export async function downloadTechDoc(spec: TechDocSpec, fileName: string): Promise<void> {
  const { loadImage, svgPagesToPdf, saveBytes } = await import('./printDownload.ts');
  const logo = await loadImage('/logo.png');
  const bytes = await svgPagesToPdf(techDocPages(spec, logo));
  saveBytes(bytes, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/** A canvas or image as a compact preview for the document (JPEG on white, longest side ≤ max px). */
export function previewFromCanvas(src: HTMLCanvasElement, max = 1400): { src: string; w: number; h: number } {
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/jpeg', 0.86), w: c.width, h: c.height };
}
export async function previewFromDataUrl(url: string, max = 1400): Promise<{ src: string; w: number; h: number }> {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d')!.drawImage(img, 0, 0);
  return previewFromCanvas(c, max);
}

/** Standard line legend for die / pattern lines. */
export const LINE_LEGEND = {
  cut: { colour: '#E30613', label: 'Cut', note: 'Through-cut, solid' },
  crease: { colour: '#00A651', label: 'Crease / fold', note: 'Scored fold line', dash: '1.6 1' },
  perf: { colour: '#F39200', label: 'Perforation', note: 'Tear line', dash: '0.6 0.8' },
  glue: { colour: '#1D71B8', label: 'Glue area', note: 'Adhesive zone' },
  bleed: { colour: '#3B9BD8', label: 'Bleed', note: 'Artwork extends to here' },
  safe: { colour: '#2F9E7A', label: 'Safe area', note: 'Keep text inside', dash: '1 1' },
  stitch: { colour: '#7C6BD6', label: 'Stitch line', note: 'Seam allowance inside the cut', dash: '1.2 0.8' },
  grain: { colour: '#5D5D6E', label: 'Grain line', note: 'Align with the fabric warp' },
} as const;

export { esc };
