// Brand frame for technical documents (never for print files): joins the
// pages of several generators into ONE document in the Magical Touch Design
// document style (lib/print/docStyle) — spectrum line, logo header with the
// document title, footer with the page pill — and numbers the pages across
// the whole document. Each generator's page is placed in the body area
// (its own old footer removed), so every technical file looks the same.

import { docDefs, docFooter, docHeader, type DocLogo } from './docStyle.ts';

export type Logo = DocLogo;

function size(svg: string): { w: number; h: number } {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 210, h: 297 };
}

/** The brand header and footer for one page (kept for callers that frame their own pages). */
export function brandChrome(w: number, h: number, o: { logo?: Logo; label: string; page: number; pages: number; margin?: number; title?: string; kind?: string }): string {
  return docHeader(w, { logo: o.logo, kind: o.kind || 'Technical document', title: o.title || o.label, margin: o.margin })
    + docFooter(w, h, { label: o.label, page: o.page, pages: o.pages, margin: o.margin });
}

/** Strips a generator's own footer block (the rule at H − 14 and the texts after it). */
function stripFooter(svg: string, h: number): string {
  const at = svg.lastIndexOf(`y1="${h - 14}"`);
  if (at < 0) return svg.replace(/<\/svg>\s*$/, '');
  const start = svg.lastIndexOf('<line', at);
  return svg.slice(0, start);
}

/** The page title a generator wrote (its largest bold text near the top), for the header. */
function pageTitle(inner: string): { t: string; raw: string } | null {
  let best: { s: number; t: string; raw: string } | null = null;
  const re = /<text[^>]*\by="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*font-weight="700"[^>]*>([^<]{2,80})<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) { const y = Number(m[1]), s = Number(m[2]); if (y < 40 && s >= 4.5 && (!best || s > best.s)) best = { s, t: m[3], raw: m[0] }; }
  return best ? { t: best.t.replace(/&amp;/g, '&'), raw: best.raw } : null;
}

/** One branded document from the page lists of several generators, numbered as one. */
export function brandDocument(parts: string[][], o: { logo?: Logo; label: string; kind?: string }): { svg: string; widthMm: number; heightMm: number }[] {
  const all = parts.flat();
  return all.map((svg, i) => {
    const { w, h } = size(svg);
    const body = stripFooter(svg, h);
    let inner = body.slice(body.indexOf('>') + 1);
    // The generator's own big page title moves into the brand header (not shown twice).
    const pt = pageTitle(inner);
    if (pt) inner = inner.replace(pt.raw, '');
    // Generator content sits between y ≈ 10 and h − 16; place that band under the header (y 27 … h − 15).
    const top = 10, bottom = h - 16, to = 27, toEnd = h - 15;
    const s = Math.min(1, (toEnd - to) / (bottom - top));
    const dx = (w - w * s) / 2, dy = to - top * s;
    const title = pt?.t || o.label;
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${docDefs()}<rect width="${w}" height="${h}" fill="#FFFFFF"/>`
        + `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${s.toFixed(5)})">${inner.replace(/<rect width="[\d.]+" height="[\d.]+" fill="#(?:FFFFFF|fff|FFF|ffffff)"\/>/, '')}</g>`
        + `<rect x="0" y="0" width="${w}" height="25" fill="#FFFFFF"/>`
        + brandChrome(w, h, { logo: o.logo, label: o.label, page: i + 1, pages: all.length, title, kind: o.kind || 'Technical production file' })
        + `</svg>`,
      widthMm: w, heightMm: h,
    };
  });
}
