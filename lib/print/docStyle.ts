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
    + `<linearGradient id="mt-spectrum-v" x1="0" y1="0" x2="0" y2="1">${stops()}</linearGradient>`
    + `<linearGradient id="mt-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16161F"/><stop offset="1" stop-color="#2A2440"/></linearGradient>`
    + `</defs>`;
}

export const txt = (x: number, y: number, s: string, size = 2.8, o: { bold?: boolean; color?: string; anchor?: 'start' | 'middle' | 'end' } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${o.bold ? ' font-weight="700"' : ''} fill="${o.color || C.text}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;

/** Letter-spaced capitals (one text run with letter-spacing — selectable, searchable in the PDF). */
export function caps(x: number, y: number, s: string, size = 2.1, color: string = C.muted, track = 0.42, anchor: 'start' | 'end' | 'middle' = 'start'): string {
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}" font-weight="700" letter-spacing="${track}" fill="${color}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}>${esc(s.toUpperCase())}</text>`;
}

/** Page header: a hairline of the brand spectrum across the top edge, the logo on the left;
 *  document type, title and reference on the right; a short spectrum stroke leading into a hairline. */
export function docHeader(w: number, o: { logo?: DocLogo; kind: string; title: string; meta?: string; meta2?: string; margin?: number }): string {
  const M = o.margin ?? 14;
  SEC_NO = 0;
  // creative signature: a thin spectrum spine down the left edge, nothing else coloured
  let g = `<rect x="0" y="0" width="1.6" height="400" fill="url(#mt-spectrum-v)"/>`;
  if (o.logo) { const lh = 5.6, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${M}" y="9" width="${r2(lw)}" height="${lh}" href="${o.logo.src}"/>`; }
  else g += txt(M, 13.4, 'MAGICAL TOUCH DESIGN', 3.4, { bold: true, color: C.ink });
  // document type as a quiet outlined tag on the right
  const tw = Math.max(26, o.kind.length * 1.42 + 8);
  g += `<rect x="${r2(w - M - tw)}" y="8.6" width="${r2(tw)}" height="6" rx="3" fill="url(#mt-spectrum)"/><rect x="${r2(w - M - tw + 0.35)}" y="8.95" width="${r2(tw - 0.7)}" height="5.3" rx="2.65" fill="#FFFFFF"/>`
    + caps(w - M - tw / 2 + 0.2, 12.6, o.kind, 1.75, C.ink, 0.45, 'middle');
  g += txt(M, 25.5, o.title, 5.4, { bold: true, color: C.ink });
  const meta = [o.meta2, o.meta].filter(Boolean).join('   ·   ');
  if (meta) g += txt(M, 31, meta, 2.2, { color: C.muted });
  g += `<line x1="${M}" y1="34.5" x2="${w - M}" y2="34.5" stroke="${C.ink}" stroke-width="0.35"/>`;
  return g;
}

/** Page footer: hairline with a spectrum tick, company and site, document label, page counter. */
export function docFooter(w: number, h: number, o: { label: string; page: number; pages: number; margin?: number }): string {
  const M = o.margin ?? 14;
  const y = h - 7;
  return `<line x1="${M}" y1="${h - 12}" x2="${w - M}" y2="${h - 12}" stroke="${C.line}" stroke-width="0.25"/>`
    + txt(M, y, 'magicaltouchdesign.com', 2.1, { bold: true, color: C.ink })
    + txt(w / 2, y, `${o.label}  ·  technical document — not a print file`, 1.95, { color: C.faint, anchor: 'middle' })
    + txt(w - M, y, `${String(o.page).padStart(2, '0')} / ${String(o.pages).padStart(2, '0')}`, 2.6, { bold: true, color: C.ink, anchor: 'end' });
}

/** Section title: a small spectrum tick, letter-spaced capitals, a hairline. */
let SEC_NO = 0;
export function section(x: number, y: number, label: string, w?: number): string {
  SEC_NO += 1;
  return txt(x, y, String(SEC_NO).padStart(2, '0'), 2.3, { bold: true, color: C.accent })
    + caps(x + 6, y, label, 2.05, C.ink, 0.5)
    + (w ? `<line x1="${r2(x)}" y1="${r2(y + 2.2)}" x2="${r2(x + w)}" y2="${r2(y + 2.2)}" stroke="${C.line}" stroke-width="0.25"/>` : '');
}

/** A plain panel: hairline border, square-ish corners, white (or a very light grey) inside. */
export function card(x: number, y: number, w: number, h: number, fill: string = C.card): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="2" fill="${fill === C.card ? '#FFFFFF' : '#F7F7FA'}"${fill === C.card ? ` stroke="${C.line}" stroke-width="0.25"` : ''}/>`;
}

/** A row of key facts between two rules: [label, value][]. */
export function metaStrip(x: number, y: number, w: number, items: [string, string][]): string {
  // key figures: big values with tiny labels, no box — just two rules
  const n = Math.max(1, items.length), cw = w / n;
  let g = `<line x1="${r2(x)}" y1="${r2(y + 13.5)}" x2="${r2(x + w)}" y2="${r2(y + 13.5)}" stroke="${C.line}" stroke-width="0.25"/>`;
  items.forEach(([k, v], i) => {
    const cx = x + i * cw;
    if (i) g += `<line x1="${r2(cx - 2)}" y1="${r2(y + 1)}" x2="${r2(cx - 2)}" y2="${r2(y + 11)}" stroke="${C.line}" stroke-width="0.25"/>`;
    g += caps(cx, y + 3.4, k, 1.6, C.faint, 0.4);
    const max = Math.max(6, Math.floor((cw - 4) / 1.75));
    g += txt(cx, y + 9.8, v.length > max ? v.slice(0, max - 1) + '…' : v, 3.3, { bold: true, color: C.ink });
  });
  return g;
}

/** The one small ad: a quiet bordered note at the end of a document. */
export function promo(x: number, y: number, w: number): string {
  return `<rect x="${r2(x)}" y="${r2(y + 1.7)}" width="18" height="0.6" rx="0.3" fill="url(#mt-spectrum)"/>`
    + txt(x, y + 7, 'Made with Magical Touch Design — free design, print, packaging and textile tools.', 2.2, { color: C.muted })
    + txt(x, y + 10.6, 'magicaltouchdesign.com', 2.1, { bold: true, color: C.ink });
}

export const docPage = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${docDefs()}<rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`;
