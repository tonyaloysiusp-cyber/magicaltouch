// Brand frame for technical documents (never for print files): joins the
// pages of several generators into ONE document, replaces each old footer
// with the Magical Touch Design logo footer, adds the brand colour line at
// the top and numbers the pages across the whole document.

export type Logo = { src: string; w: number; h: number } | null | undefined;
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const COLS = ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80', '#FACC15'];

function size(svg: string): { w: number; h: number } {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 210, h: 297 };
}

/** The brand footer (logo, site, document name, page x of n) and top colour line. */
export function brandChrome(w: number, h: number, o: { logo?: Logo; label: string; page: number; pages: number; margin?: number }): string {
  const M = o.margin ?? 14;
  let g = COLS.map((c, i) => `<rect x="${(w / COLS.length) * i}" y="0" width="${w / COLS.length + 0.2}" height="1.2" fill="${c}"/>`).join('');
  g += `<line x1="${M}" y1="${h - 14}" x2="${w - M}" y2="${h - 14}" stroke="#E4E4E7" stroke-width="0.25"/>`;
  let x = M;
  if (o.logo) { const lh = 4.6, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${M}" y="${h - 11.6}" width="${(lw).toFixed(2)}" height="${lh}" href="${o.logo.src}"/>`; x = M + lw + 4; }
  else { g += `<text x="${M}" y="${h - 8.6}" font-family="Helvetica" font-size="3" font-weight="700" fill="#09090B">Magical Touch Design</text>`; x = M + 36; }
  g += `<text x="${x}" y="${h - 8.6}" font-family="Helvetica" font-size="2.6" fill="#52525B">www.magicaltouchdesign.com · ${esc(o.label)} · technical document, not a print file</text>`;
  g += `<text x="${w - M}" y="${h - 8.6}" font-family="Helvetica" font-size="2.6" fill="#52525B" text-anchor="end">Page ${o.page} of ${o.pages}</text>`;
  return g;
}

/** Strips a generator's own footer block (the rule at H − 14 and the texts after it). */
function stripFooter(svg: string, h: number): string {
  const at = svg.lastIndexOf(`y1="${h - 14}"`);
  if (at < 0) return svg.replace(/<\/svg>\s*$/, '');
  const start = svg.lastIndexOf('<line', at);
  return svg.slice(0, start);
}

/** One branded document from the page lists of several generators, numbered as one. */
export function brandDocument(parts: string[][], o: { logo?: Logo; label: string }): { svg: string; widthMm: number; heightMm: number }[] {
  const all = parts.flat();
  return all.map((svg, i) => {
    const { w, h } = size(svg);
    return { svg: `${stripFooter(svg, h)}${brandChrome(w, h, { logo: o.logo, label: o.label, page: i + 1, pages: all.length })}</svg>`, widthMm: w, heightMm: h };
  });
}
