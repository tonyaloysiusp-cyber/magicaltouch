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
    + `<linearGradient id="mt-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16161F"/><stop offset="1" stop-color="#2A2440"/></linearGradient>`
    + `</defs>`;
}

export const txt = (x: number, y: number, s: string, size = 2.8, o: { bold?: boolean; color?: string; anchor?: 'start' | 'middle' | 'end' } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${o.bold ? ' font-weight="700"' : ''} fill="${o.color || C.text}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;

/** Letter-spaced capitals (one text run with letter-spacing — selectable, searchable in the PDF). */
export function caps(x: number, y: number, s: string, size = 2.1, color: string = C.muted, track = 0.42, anchor: 'start' | 'end' = 'start'): string {
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}" font-weight="700" letter-spacing="${track}" fill="${color}"${anchor === 'end' ? ' text-anchor="end"' : ''}>${esc(s.toUpperCase())}</text>`;
}

/** Page header: spectrum line, logo, document type, title, and up to two right-hand meta lines. */
export function docHeader(w: number, o: { logo?: DocLogo; kind: string; title: string; meta?: string; meta2?: string; margin?: number }): string {
  const M = o.margin ?? 14;
  let g = `<rect x="0" y="0" width="${w}" height="2" fill="url(#mt-spectrum)"/>`;
  g += `<rect x="0" y="2" width="${w}" height="22" fill="url(#mt-wash)"/>`;
  if (o.logo) { const lh = 6.4, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${M}" y="7" width="${r2(lw)}" height="${lh}" href="${o.logo.src}"/>`; }
  else g += txt(M, 12, 'MAGICAL TOUCH DESIGN', 3.4, { bold: true, color: C.ink });
  g += caps(w - M, 9.2, o.kind, 2, C.violet, 0.45, 'end');
  g += txt(w - M, 15.4, o.title, 4.2, { bold: true, color: C.ink, anchor: 'end' });
  if (o.meta) g += txt(w - M, 20.2, o.meta, 2.3, { color: C.muted, anchor: 'end' });
  if (o.meta2) g += txt(M, 20.2, o.meta2, 2.3, { color: C.muted });
  g += `<line x1="0" y1="24" x2="${w}" y2="24" stroke="${C.line}" stroke-width="0.3"/>`;
  return g;
}

/** Page footer: brand line, site, document label and page pill. */
export function docFooter(w: number, h: number, o: { label: string; page: number; pages: number; margin?: number }): string {
  const M = o.margin ?? 14;
  const y = h - 7;
  return `<line x1="${M}" y1="${h - 12.5}" x2="${w - M}" y2="${h - 12.5}" stroke="${C.line}" stroke-width="0.25"/>`
    + `<rect x="${M}" y="${r2(y - 2.6)}" width="3.2" height="3.2" rx="0.9" fill="url(#mt-spectrum)"/>`
    + txt(M + 5, y, 'Magical Touch Design', 2.3, { bold: true, color: C.ink })
    + txt(M + 33, y, 'www.magicaltouchdesign.com', 2.3, { color: C.accent })
    + txt(w / 2 + 18, y, `${o.label} · technical document, not a print file`, 2.1, { color: C.faint, anchor: 'middle' })
    + `<rect x="${r2(w - M - 17)}" y="${r2(y - 3.1)}" width="17" height="4.4" rx="2.2" fill="${C.soft}"/>`
    + txt(w - M - 8.5, y, `Page ${o.page} of ${o.pages}`, 1.95, { bold: true, color: C.muted, anchor: 'middle' })
    + `<rect x="0" y="${h - 1.2}" width="${w}" height="1.2" fill="url(#mt-spectrum)"/>`;
}

/** Section title: a small spectrum tab and a letter-spaced label. */
export function section(x: number, y: number, label: string, w?: number): string {
  return `<rect x="${r2(x)}" y="${r2(y - 2.5)}" width="1.1" height="3" rx="0.55" fill="url(#mt-spectrum)"/>` + caps(x + 2.8, y, label, 2.1, C.ink, 0.42)
    + (w ? `<line x1="${r2(x)}" y1="${r2(y + 2)}" x2="${r2(x + w)}" y2="${r2(y + 2)}" stroke="${C.line}" stroke-width="0.2"/>` : '');
}

export function card(x: number, y: number, w: number, h: number, fill: string = C.card): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="2.2" fill="${fill}" stroke="${C.line}" stroke-width="0.25"/>`;
}

/** A row of key facts in a soft strip: [label, value][]. */
export function metaStrip(x: number, y: number, w: number, items: [string, string][]): string {
  const n = Math.max(1, items.length), cw = w / n;
  let g = `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="12" rx="2.2" fill="${C.soft}"/>`;
  items.forEach(([k, v], i) => {
    const cx = x + i * cw + 4;
    if (i) g += `<line x1="${r2(x + i * cw)}" y1="${r2(y + 2.5)}" x2="${r2(x + i * cw)}" y2="${r2(y + 9.5)}" stroke="${C.line}" stroke-width="0.25"/>`;
    g += caps(cx, y + 4.6, k, 1.75, C.faint, 0.32);
    const max = Math.max(6, Math.floor((cw - 6) / 1.45));
    g += txt(cx, y + 9.3, v.length > max ? v.slice(0, max - 1) + '…' : v, 2.75, { bold: true, color: C.ink });
  });
  return g;
}

/** The one small ad: compact, quiet, at the end of a document. */
export function promo(x: number, y: number, w: number): string {
  const h = 15;
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${h}" rx="2.4" fill="url(#mt-wash)" stroke="${C.line}" stroke-width="0.25"/>`
    + `<rect x="${r2(x)}" y="${r2(y)}" width="1.4" height="${h}" rx="0.7" fill="url(#mt-spectrum)"/>`
    + txt(x + 5, y + 5.4, 'Design it, print it, wear it — free with Magical Touch Design', 2.45, { bold: true, color: C.ink })
    + txt(x + 5, y + 9.2, 'Design editor · Print & binding · Textile studio · Photo studio', 2.05, { color: C.muted })
    + txt(x + 5, y + 12.6, 'magicaltouchdesign.com', 2.15, { bold: true, color: C.accent });
}

export const docPage = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${docDefs()}<rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`;
