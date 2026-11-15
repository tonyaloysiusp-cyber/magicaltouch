// Tech pack for any garment from the Textile Studio: A4 pages (vector SVG)
// with the flat sketch, the measurements as typed, every piece with its size
// and cutting note, colours (HEX + CMYK), artwork list and notes. A
// technical document, so it carries Magical Touch Design branding in the
// footer only (never on the print files).

import type { Product } from '../garments.ts';
import { cmykOf } from '../garments.ts';

export interface TechPackData {
  project: string;
  garment: string;
  date: string;
  /** Flat sketch: SVG markup (no outer <svg>), its width and height in its own units. */
  sketch?: { inner: string; w: number; h: number } | null;
  product: Product;
  measurements: { label: string; value: string; style?: boolean }[];
  colours: { role: string; hex: string }[];
  artwork: { name: string; detail: string }[];
  order: { label: string; qty: number }[];
  print: { rollW: number; bleed: number; lengthMm?: number; pages?: number; textMode: string };
  embroidery?: { colours: { name: string; hex: string; stitches: number }[]; stitches: number; sizeMm: [number, number] } | null;
  notes: string[];
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const W = 210, H = 297, M = 14;

export function techPackPages(d: TechPackData): string[] {
  const pages: string[][] = [[]];
  let y = 0;
  const page = () => pages[pages.length - 1];
  const newPage = () => { pages.push([]); y = 22; };
  const need = (h: number) => { if (y + h > H - 22) newPage(); };
  const text = (x: number, s: string, size = 3.2, weight = 400, fill = '#111', anchor = 'start') => page().push(`<text x="${x}" y="${y}" font-family="Helvetica" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  const rule = () => page().push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="#CBD5E1" stroke-width="0.25"/>`);
  const heading = (s: string) => { need(16); y += 8; text(M, s, 4.2, 700); y += 2.5; rule(); y += 5; };
  const row = (cells: string[], xs: number[], bold = false, anchors: string[] = []) => { need(5.5); cells.forEach((c, i) => text(xs[i], c, 3.1, bold ? 700 : 400, '#111', anchors[i] || 'start')); y += 5; };

  y = 20;
  text(M, 'Tech pack', 6.5, 700); y += 7;
  text(M, `${d.project} · ${d.garment}`, 4, 400, '#334155'); y += 5.5;
  text(M, d.date, 3.2, 400, '#64748B'); y += 4;

  if (d.sketch && d.sketch.w > 0 && d.sketch.h > 0) {
    const boxW = W - 2 * M, boxH = 110;
    const k = Math.min(boxW / d.sketch.w, boxH / d.sketch.h);
    const ox = M + (boxW - d.sketch.w * k) / 2;
    page().push(`<rect x="${M}" y="${y}" width="${boxW}" height="${boxH}" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="0.25"/>`);
    page().push(`<g transform="translate(${ox.toFixed(2)} ${(y + (boxH - d.sketch.h * k) / 2).toFixed(2)}) scale(${k.toFixed(5)})">${d.sketch.inner}</g>`);
    y += boxH + 2;
    text(M, 'Flat sketch of the pieces at size (not to scale on this page). The print files are at real size.', 2.7, 400, '#64748B'); y += 2;
  }

  heading('Order');
  const total = d.order.reduce((s, x) => s + x.qty, 0);
  for (const o of d.order) row([o.label, String(o.qty)], [M, W - M], false, ['start', 'end']);
  row(['Total garments', String(total)], [M, W - M], true, ['start', 'end']);

  if (d.measurements.length) {
    heading('Measurements (cm, as typed)');
    for (const m of d.measurements) row([m.label + (m.style ? ' (style setting)' : ''), m.value], [M, W - M], false, ['start', 'end']);
  }

  heading('Pieces (mm, at the stitch line)');
  row(['Piece', 'Width × length', 'Cut'], [M, M + 95, W - M], true, ['start', 'start', 'end']);
  for (const p of d.product.pieces) row([p.label, `${Math.round(p.w)} × ${Math.round(p.h)}`, `${p.qty}${p.mirror ? ' (mirrored)' : ''}`], [M, M + 95, W - M], false, ['start', 'start', 'end']);

  heading('Colours');
  for (const c of d.colours) {
    need(6);
    page().push(`<rect x="${M}" y="${y - 3.4}" width="6" height="4" fill="${c.hex}" stroke="#94A3B8" stroke-width="0.2"/>`);
    text(M + 9, c.role, 3.1); text(M + 80, c.hex.toUpperCase(), 3.1); text(W - M, `CMYK ${cmykOf(c.hex)}`, 3.1, 400, '#111', 'end'); y += 5.5;
  }

  if (d.artwork.length) {
    heading('Artwork');
    for (const a of d.artwork) row([a.name, a.detail], [M, W - M], false, ['start', 'end']);
  }

  if (d.embroidery) {
    heading('Embroidery');
    row(['Design size', `${Math.round(d.embroidery.sizeMm[0])} × ${Math.round(d.embroidery.sizeMm[1])} mm`], [M, W - M], false, ['start', 'end']);
    row(['Stitches', d.embroidery.stitches.toLocaleString('en')], [M, W - M], false, ['start', 'end']);
    d.embroidery.colours.forEach((c, i) => {
      need(6);
      page().push(`<rect x="${M}" y="${y - 3.4}" width="6" height="4" fill="${c.hex}" stroke="#94A3B8" stroke-width="0.2"/>`);
      text(M + 9, `${i + 1}. ${c.name}`, 3.1); text(W - M, `${c.stitches.toLocaleString('en')} stitches`, 3.1, 400, '#111', 'end'); y += 5.5;
    });
  }

  heading('Print files');
  row(['Roll / fabric width', `${d.print.rollW} mm`], [M, W - M], false, ['start', 'end']);
  row(['Bleed', `${d.print.bleed} mm`], [M, W - M], false, ['start', 'end']);
  if (d.print.lengthMm) row(['Roll length', `${(d.print.lengthMm / 1000).toFixed(2)} m on ${d.print.pages} page${d.print.pages === 1 ? '' : 's'}`], [M, W - M], false, ['start', 'end']);
  row(['Text in the print file', d.print.textMode], [M, W - M], false, ['start', 'end']);

  if (d.notes.length) { heading('Notes'); for (const n of d.notes) { need(5); text(M, `• ${n}`, 3.1); y += 5; } }

  return pages.map((items, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${items.join('')}`
    + `<line x1="${M}" y1="${H - 14}" x2="${W - M}" y2="${H - 14}" stroke="#CBD5E1" stroke-width="0.25"/>`
    + `<text x="${M}" y="${H - 9}" font-family="Helvetica" font-size="3" font-weight="700" fill="#111">Magical Touch Design</text>`
    + `<text x="${M + 34}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569">www.magicaltouchdesign.com · ${esc(d.project)} · technical information, not a print file</text>`
    + `<text x="${W - M}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569" text-anchor="end">page ${i + 1} of ${pages.length}</text></svg>`);
}
