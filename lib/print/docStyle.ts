// Magical Touch Design document style — one look for every technical
// document (job report, layout template, textile technical file, tech pack,
// embroidery sheet). Never used on print files.
//
// Clean white pages, the brand spectrum as a thin gradient line, the logo,
// small letter-spaced section labels, soft cards and one small ad.
// Everything is plain vector SVG in millimetres (svgToPdf draws the
// gradients as vector bands), Helvetica text so the PDF needs no fonts.

export type DocLogo = { src: string; w: number; h: number } | null | undefined;

export const C = {
  ink: '#0B0B12', text: '#1F1F29', muted: '#5D5D6E', faint: '#9C9CAD', line: '#E6E6EE', soft: '#F6F6FA', card: '#FFFFFF',
  accent: '#3B82C4', violet: '#7C6BD6',
};
/** The brand spectrum (logo colours), left to right. */
export const SPECTRUM = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];

const r2 = (n: number) => Math.round(n * 100) / 100;
export const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

/** Gradient definitions every page uses (ids are page-local). */
export function docDefs(): string {
  const stops = (op = 1) => SPECTRUM.map((c, i) => `<stop offset="${r2(i / (SPECTRUM.length - 1))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`).join('');
  return `<defs>`
    + `<linearGradient id="mt-spectrum" x1="0" y1="0" x2="1" y2="0">${stops()}</linearGradient>`
    + `<linearGradient id="mt-wash" x1="0" y1="0" x2="1" y2="0">${stops(0.1)}</linearGradient>`
    + `<linearGradient id="mt-soft" x1="0" y1="0" x2="1" y2="0">${stops(0.35)}</linearGradient>`
    + `<linearGradient id="mt-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16161F"/><stop offset="1" stop-color="#2A2440"/></linearGradient>`
    + `</defs>`;
}

export const txt = (x: number, y: number, s: string, size = 2.8, o: { bold?: boolean; color?: string; anchor?: 'start' | 'middle' | 'end' } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${o.bold ? ' font-weight="700"' : ''} fill="${o.color || C.text}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;

/** Letter-spaced capitals (one text run with letter-spacing — selectable, searchable in the PDF). */
export function caps(x: number, y: number, s: string, size = 2.1, color: string = C.muted, track = 0.42, anchor: 'start' | 'end' = 'start'): string {
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}" font-weight="700" letter-spacing="${track}" fill="${color}"${anchor === 'end' ? ' text-anchor="end"' : ''}>${esc(s.toUpperCase())}</text>`;
}

/** Page header: a hairline of the brand spectrum across the top edge, the logo on the left;
 *  document type, title and reference on the right; a short spectrum stroke leading into a hairline. */
export function docHeader(w: number, o: { logo?: DocLogo; kind: string; title: string; meta?: string; meta2?: string; margin?: number }): string {
  const M = o.margin ?? 14;
  let g = `<rect x="0" y="0" width="${w}" height="1.2" fill="url(#mt-spectrum)"/><rect x="0" y="1.2" width="${w}" height="5" fill="url(#mt-wash)"/>`;
  if (o.logo) { const lh = 6.4, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${M}" y="8.4" width="${r2(lw)}" height="${lh}" href="${o.logo.src}"/>`; }
  else g += txt(M, 13.4, 'MAGICAL TOUCH DESIGN', 3.4, { bold: true, color: C.ink });
  if (o.meta2) g += txt(M, 20.4, o.meta2, 2.3, { color: C.muted });
  g += caps(w - M, 10, o.kind, 1.85, C.accent, 0.55, 'end');
  g += txt(w - M, 15.6, o.title, 4.1, { bold: true, color: C.ink, anchor: 'end' });
  if (o.meta) g += txt(w - M, 20.4, o.meta, 2.3, { color: C.muted, anchor: 'end' });
  g += `<rect x="${M}" y="23.6" width="26" height="0.6" rx="0.3" fill="url(#mt-spectrum)"/>`
    + `<line x1="${M + 27.5}" y1="23.9" x2="${w - M}" y2="23.9" stroke="${C.line}" stroke-width="0.3"/>`;
  return g;
}

/** Page footer: hairline with a spectrum tick, company and site, document label, page counter. */
export function docFooter(w: number, h: number, o: { label: string; page: number; pages: number; margin?: number }): string {
  const M = o.margin ?? 14;
  const y = h - 6.8;
  const pg = `${String(o.page).padStart(2, '0')} / ${String(o.pages).padStart(2, '0')}`;
  return `<line x1="${M}" y1="${h - 12}" x2="${w - M}" y2="${h - 12}" stroke="${C.line}" stroke-width="0.3"/>`
    + `<rect x="${M}" y="${h - 12.3}" width="10" height="0.6" rx="0.3" fill="url(#mt-spectrum)"/>`
    + txt(M, y, 'Magical Touch Design', 2.2, { bold: true, color: C.ink })
    + txt(M + 30, y, 'magicaltouchdesign.com', 2.2, { color: C.muted })
    + txt(w / 2 + 12, y, `${o.label} · technical document, not a print file`, 2, { color: C.faint, anchor: 'middle' })
    + `<rect x="${r2(w - M - 15)}" y="${r2(y - 3)}" width="15" height="4.4" rx="2.2" fill="${C.soft}" stroke="${C.line}" stroke-width="0.25"/>`
    + txt(w - M - 7.5, y, pg, 2.1, { bold: true, color: C.ink, anchor: 'middle' });
}

/** Section title: a small spectrum tick, letter-spaced capitals, a hairline. */
export function section(x: number, y: number, label: string, w?: number): string {
  return `<rect x="${r2(x)}" y="${r2(y - 2.1)}" width="0.9" height="2.6" rx="0.3" fill="url(#mt-spectrum)"/>`
    + caps(x + 2.2, y, label, 2.1, C.ink, 0.45)
    + (w ? `<line x1="${r2(x)}" y1="${r2(y + 2)}" x2="${r2(x + w)}" y2="${r2(y + 2)}" stroke="${C.line}" stroke-width="0.25"/>` : '');
}

/** A plain panel: hairline border, square-ish corners, white (or a very light grey) inside. */
export function card(x: number, y: number, w: number, h: number, fill: string = C.card): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="1.4" fill="${fill === C.soft ? '#FAFAFC' : fill}" stroke="${C.line}" stroke-width="0.3"/>`;
}

/** A row of key facts between two rules: [label, value][]. */
export function metaStrip(x: number, y: number, w: number, items: [string, string][]): string {
  const n = Math.max(1, items.length), cw = w / n;
  let g = `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="12" rx="1.4" fill="#FAFAFC" stroke="${C.line}" stroke-width="0.3"/>`;
  items.forEach(([k, v], i) => {
    const cx = x + i * cw + 3.5;
    if (i) g += `<line x1="${r2(x + i * cw)}" y1="${r2(y + 2.5)}" x2="${r2(x + i * cw)}" y2="${r2(y + 9.5)}" stroke="${C.line}" stroke-width="0.25"/>`;
    g += caps(cx, y + 4.6, k, 1.7, C.faint, 0.35);
    const max = Math.max(6, Math.floor((cw - 6) / 1.45));
    g += txt(cx, y + 9.4, v.length > max ? v.slice(0, max - 1) + '…' : v, 2.7, { bold: true, color: C.ink });
  });
  return g;
}

/** The one small ad: a quiet bordered note at the end of a document. */
export function promo(x: number, y: number, w: number): string {
  const h = 14;
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${h}" rx="1.4" fill="url(#mt-wash)" stroke="${C.line}" stroke-width="0.3"/>`
    + txt(x + 4, y + 5.2, 'Design it, print it, wear it — free with Magical Touch Design', 2.35, { bold: true, color: C.ink })
    + txt(x + 4, y + 8.9, 'Design editor · Print & binding · Textile studio · Photo studio', 2, { color: C.muted })
    + txt(x + 4, y + 12, 'magicaltouchdesign.com', 2.05, { color: C.accent });
}

export const docPage = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${docDefs()}<rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`;
