// Textile production specification — the technical information file of an
// order (A4, vector). Unlike the print files it carries Magical Touch Design
// branding, in the footer only.

import type { Measure } from './measure.ts';
import type { CostResult, PriceTable } from './pricing.ts';

export interface SpecData {
  project: string;
  garment: string;
  date: string;
  template: string; // standard template (unverified) / factory pattern
  sizes: { size: string; count: number; measures: Measure[] }[];
  panels: { panel: string; bleed: number; seam: number; safe: number }[];
  print: { rollW: number; lengthMm: number; pages: number; use: number; overlaps: number; textMode: string; layout: string; mirror: boolean };
  cost?: { prices: PriceTable; result: CostResult; fabric: string; method: string } | null;
  notes?: string[];
}

import { C, metaStrip, section } from '../print/docStyle.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const W = 210, H = 297, M = 14;

export function specSheetPages(d: SpecData): string[] {
  const pages: string[][] = [[]];
  let y = 0;
  const page = () => pages[pages.length - 1];
  const newPage = () => { pages.push([]); y = 26; };
  const need = (h: number) => { if (y + h > H - 22) newPage(); };
  const text = (x: number, s: string, size = 3.2, weight = 400, fill = '#111', anchor = 'start') => page().push(`<text x="${x}" y="${y}" font-family="Helvetica" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  const rule = () => page().push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="#CBD5E1" stroke-width="0.25"/>`);
  // Document style: spectrum-tab section labels, soft header rows, light zebra rows.
  let zebra = 0;
  const heading = (s: string) => { need(16); y += 9; page().push(section(M, y, s, W - 2 * M)); y += 7.5; zebra = 0; };
  const row = (cells: string[], xs: number[], bold = false) => {
    need(5.5);
    if (bold) page().push(`<rect x="${M}" y="${y - 3.6}" width="${W - 2 * M}" height="5.2" rx="1.2" fill="${C.soft}"/>`);
    else if (zebra++ % 2) page().push(`<rect x="${M}" y="${y - 3.6}" width="${W - 2 * M}" height="5.2" fill="#FAFAFC"/>`);
    cells.forEach((c, i) => text(xs[i] + (i === 0 ? 1.5 : 0) - (i > 0 && xs[i] > M + 60 && xs[i] >= W - M - 0.1 ? 1.5 : 0), c, 3.1, bold ? 700 : 400, bold ? C.ink : C.text, i > 0 && xs[i] > M + 60 ? 'end' : 'start'));
    y += 5.2;
  };

  // Title block
  y = 22;
  text(M, 'Textile production specification', 6.5, 700); y += 7;
  text(M, `${d.project} · ${d.garment}`, 4, 400, '#334155'); y += 5.5;
  text(M, `${d.date} · ${d.template}`, 3.2, 400, '#64748B'); y += 5;
  const garments = d.sizes.reduce((a, x) => a + x.count, 0);
  page().push(metaStrip(M, y, W - 2 * M, [['Garments', String(garments)], ['Sizes', d.sizes.map((x) => x.size).join(' · ') || '—'], ['Roll', `${(d.print.lengthMm / 1000).toFixed(2)} m × ${d.print.rollW} mm`], ['Fabric use', `${Math.round(d.print.use * 100)} %`]]));
  y += 12;

  heading('Order');
  const total = d.sizes.reduce((s, x) => s + x.count, 0);
  row(['Size', 'Garments'], [M, W - M], true);
  for (const s of d.sizes) row([s.size, String(s.count)], [M, W - M]);
  row(['Total', String(total)], [M, W - M], true);

  heading('Measurements (cm, flat)');
  const keys = d.sizes[0]?.measures.map((m) => m.key) || [];
  const labels = d.sizes[0]?.measures.map((m) => m.label.replace(/ \(.*\)/, '')) || [];
  const cols = d.sizes.length;
  const colW = Math.min(22, (W - 2 * M - 70) / Math.max(1, cols));
  const xs = [M, ...d.sizes.map((_, i) => M + 70 + colW * (i + 1))];
  row(['', ...d.sizes.map((s) => s.size)], xs, true);
  keys.forEach((k, ki) => row([labels[ki], ...d.sizes.map((s) => { const m = s.measures.find((x) => x.key === k); return m ? (m.mm / 10).toFixed(1) : '—'; })], xs));

  heading('Panels (mm)');
  const px = [M, M + 90, M + 120, M + 150];
  row(['Panel', 'Bleed', 'Seam', 'Safe area'], [M, px[1] + 8, px[2] + 8, px[3] + 14], true);
  for (const p of d.panels) row([p.panel, String(p.bleed), String(p.seam), String(p.safe)], [M, px[1] + 8, px[2] + 8, px[3] + 14]);

  heading('Print files');
  const kv = (k: string, v: string) => row([k, v], [M, W - M]);
  kv('Roll width', `${d.print.rollW} mm`);
  kv('Roll length', `${(d.print.lengthMm / 1000).toFixed(2)} m on ${d.print.pages} page${d.print.pages === 1 ? '' : 's'}`);
  kv('Fabric use (true piece shapes)', `${Math.round(d.print.use * 100)} %`);
  kv('Layout', d.print.layout);
  kv('Overlapping pieces', d.print.overlaps ? `${d.print.overlaps} — NOT READY` : 'none');
  kv('Text', d.print.textMode);
  kv('Mirrored for transfer paper', d.print.mirror ? 'yes' : 'no');

  if (d.cost) {
    const c = d.cost.result, cur = d.cost.prices.currency;
    const money = (n: number) => `${cur} ${n.toFixed(2)}`;
    heading('Cost');
    kv(`Fabric — ${d.cost.fabric} (${c.m2} m²)`, money(c.fabric));
    kv(`Printing — ${d.cost.method}`, money(c.print));
    if (c.setup) kv('Set-up', money(c.setup));
    kv('Per-garment costs', money(c.garmentCosts));
    if (c.colourCosts) kv('Colour costs', money(c.colourCosts));
    kv('Cost', money(c.cost));
    kv(`Price (margin ${d.cost.prices.margin} %)`, money(c.price));
    if (c.tax) kv(`Tax (${d.cost.prices.tax} %)`, money(c.tax));
    row(['Total', money(c.total)], [M, W - M], true);
    kv('Per garment', money(c.perGarment));
    if (c.hours != null) kv('Estimated production time', `${c.hours} h`);
    if (c.missing.length) kv('Missing prices', c.missing.join(', '));
  }
  if (d.notes?.length) { heading('Notes'); for (const n of d.notes) { need(5); text(M, `• ${n}`, 3.1); y += 5; } }

  return pages.map((items, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${items.join('')}`
    + `<line x1="${M}" y1="${H - 14}" x2="${W - M}" y2="${H - 14}" stroke="#CBD5E1" stroke-width="0.25"/>`
    + `<text x="${M}" y="${H - 9}" font-family="Helvetica" font-size="3" font-weight="700" fill="#111">Magical Touch Design</text>`
    + `<text x="${M + 34}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569">www.magicaltouchdesign.com · ${esc(d.project)} · technical information, not a print file</text>`
    + `<text x="${W - M}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569" text-anchor="end">page ${i + 1} of ${pages.length}</text></svg>`);
}
