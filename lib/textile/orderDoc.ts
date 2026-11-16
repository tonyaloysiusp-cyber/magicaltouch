// Order summary for a production run: every garment line (customer,
// product, size, name, number, quantity), totals per size and per
// customer. A4 vector pages; a technical document, so the Magical Touch
// Design footer is allowed (never on the print files).

import type { Player } from '../teamKit.ts';

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const W = 210, H = 297, M = 14;

export function orderSummaryPages(o: { project: string; product: string; date: string; lines: Player[]; sizeLabel: (s: string) => string; files: string[] }): string[] {
  const pages: string[][] = [[]];
  let y = 0;
  const page = () => pages[pages.length - 1];
  const T = (x: number, s: string, size = 3, weight = 400, anchor = 'start', fill = '#111') => page().push(`<text x="${x}" y="${y}" font-family="Helvetica" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`);
  const rule = () => page().push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="#CBD5E1" stroke-width="0.25"/>`);
  const need = (h: number) => { if (y + h > H - 22) { pages.push([]); y = 20; head(); } };
  const cols = [M, M + 46, M + 96, M + 118, M + 158, W - M];
  const head = () => { ['Customer', 'Product', 'Size', 'Name', 'Number', 'Qty'].forEach((h, i) => T(cols[i], h, 2.8, 700, i === 5 ? 'end' : 'start')); y += 2; rule(); y += 4.5; };
  y = 20;
  T(M, 'Order — production summary', 6.2, 700); y += 7;
  T(M, `${o.project} · ${o.product}`, 3.8, 400, 'start', '#334155'); y += 5;
  T(M, o.date, 3, 400, 'start', '#64748B'); y += 9;
  head();
  const lines = o.lines.map((l) => ({ ...l, qty: l.qty ?? 1, customer: (l.customer || '').trim() || '—' }));
  lines.sort((a, b) => a.customer.localeCompare(b.customer) || a.size.localeCompare(b.size));
  for (const l of lines) {
    need(5.5);
    T(cols[0], l.customer.slice(0, 26), 2.9); T(cols[1], o.product.slice(0, 28), 2.9); T(cols[2], o.sizeLabel(l.size), 2.9); T(cols[3], l.name || '—', 2.9); T(cols[4], l.number || '—', 2.9); T(cols[5], String(l.qty), 2.9, 400, 'end');
    y += 5;
  }
  need(30); y += 2; rule(); y += 7;
  const total = lines.reduce((a, l) => a + l.qty, 0);
  T(M, `Total garments: ${total}`, 3.6, 700); y += 7;
  const bySize = new Map<string, number>(); lines.forEach((l) => bySize.set(o.sizeLabel(l.size), (bySize.get(o.sizeLabel(l.size)) || 0) + l.qty));
  T(M, 'By size', 3.4, 700); y += 5;
  T(M, [...bySize.entries()].map(([k, v]) => `${k}: ${v}`).join('    '), 3); y += 8;
  const byCust = new Map<string, number>(); lines.forEach((l) => byCust.set(l.customer, (byCust.get(l.customer) || 0) + l.qty));
  T(M, 'By customer', 3.4, 700); y += 5;
  for (const [k, v] of byCust) { need(5); T(M, `${k}: ${v}`, 3); y += 4.6; }
  if (o.files.length) { need(14); y += 4; T(M, 'Files in this package', 3.4, 700); y += 5; for (const f of o.files) { need(5); T(M, `• ${f}`, 3); y += 4.6; } }
  return pages.map((items, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${items.join('')}`
    + `<line x1="${M}" y1="${H - 14}" x2="${W - M}" y2="${H - 14}" stroke="#CBD5E1" stroke-width="0.25"/>`
    + `<text x="${M}" y="${H - 9}" font-family="Helvetica" font-size="3" font-weight="700" fill="#111">Magical Touch Design</text>`
    + `<text x="${M + 34}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569">www.magicaltouchdesign.com · ${esc(o.project)} · order summary</text>`
    + `<text x="${W - M}" y="${H - 9}" font-family="Helvetica" font-size="3" fill="#475569" text-anchor="end">page ${i + 1} of ${pages.length}</text></svg>`);
}
