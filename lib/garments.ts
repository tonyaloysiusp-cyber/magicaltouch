// Garment cut pieces for sublimation printing (pure functions).
// Each piece is a flat sewing outline in millimetres (size M), drawn as an
// SVG path from its top-left corner. Sizes scale the pieces; the print
// layout nests them on a roll with bleed, and the markup sheet draws them
// as labelled line drawings (a simple tech pack).

export interface Piece { id: string; label: string; w: number; h: number; d: string; mirror?: boolean; qty: number }
export interface Product { id: string; label: string; pieces: Piece[]; note: string }

export const PRODUCTS: Product[] = [
  {
    id: 'jersey', label: 'Sports jersey (round neck)', note: 'Polyester sports jersey, short sleeves, rib collar band.',
    pieces: [
      { id: 'front', label: 'Front', w: 560, h: 740, qty: 1, d: 'M190 0C210 75 350 75 370 0L520 45C505 120 515 200 560 250L550 740L10 740L0 250C45 200 55 120 40 45Z' },
      { id: 'back', label: 'Back', w: 560, h: 760, qty: 1, d: 'M190 0C215 28 345 28 370 0L520 45C505 120 515 200 560 250L550 760L10 760L0 250C45 200 55 120 40 45Z' },
      { id: 'sleeve-l', label: 'Sleeve left', w: 440, h: 230, qty: 1, d: 'M0 110C80 22 160 0 220 0C280 0 360 22 440 110L400 230L40 230Z' },
      { id: 'sleeve-r', label: 'Sleeve right', w: 440, h: 230, qty: 1, mirror: true, d: 'M0 110C80 22 160 0 220 0C280 0 360 22 440 110L400 230L40 230Z' },
      { id: 'collar', label: 'Collar band', w: 470, h: 45, qty: 1, d: 'M0 0H470V45H0Z' },
    ],
  },
  {
    id: 'polo', label: 'Polo shirt', note: 'Polo with placket and folded collar.',
    pieces: [
      { id: 'front', label: 'Front', w: 560, h: 730, qty: 1, d: 'M195 0C205 40 230 70 250 80L250 230L310 230L310 80C330 70 355 40 365 0L520 45C505 120 515 200 560 250L550 730L10 730L0 250C45 200 55 120 40 45Z' },
      { id: 'back', label: 'Back', w: 560, h: 750, qty: 1, d: 'M190 0C215 25 345 25 370 0L520 45C505 120 515 200 560 250L550 750L10 750L0 250C45 200 55 120 40 45Z' },
      { id: 'sleeve-l', label: 'Sleeve left', w: 440, h: 230, qty: 1, d: 'M0 110C80 22 160 0 220 0C280 0 360 22 440 110L400 230L40 230Z' },
      { id: 'sleeve-r', label: 'Sleeve right', w: 440, h: 230, qty: 1, mirror: true, d: 'M0 110C80 22 160 0 220 0C280 0 360 22 440 110L400 230L40 230Z' },
      { id: 'collar', label: 'Collar', w: 440, h: 90, qty: 1, d: 'M0 20C110 0 330 0 440 20L420 90C300 80 140 80 20 90Z' },
      { id: 'placket', label: 'Placket', w: 60, h: 170, qty: 2, d: 'M0 0H60V170H0Z' },
    ],
  },
  {
    id: 'vest', label: 'Basketball vest (sleeveless)', note: 'Sleeveless basketball / running vest with deep armholes.',
    pieces: [
      { id: 'front', label: 'Front', w: 560, h: 760, qty: 1, d: 'M165 0C185 95 375 95 395 0L465 0C465 120 495 185 560 225L550 760L10 760L0 225C65 185 95 120 95 0Z' },
      { id: 'back', label: 'Back', w: 560, h: 770, qty: 1, d: 'M165 0C190 40 370 40 395 0L465 0C465 120 495 185 560 225L550 770L10 770L0 225C65 185 95 120 95 0Z' },
      { id: 'binding', label: 'Neck & armhole binding', w: 900, h: 40, qty: 1, d: 'M0 0H900V40H0Z' },
    ],
  },
  {
    id: 'shorts', label: 'Sports shorts', note: 'Elastic waist sports shorts, two-panel legs.',
    pieces: [
      { id: 'front-l', label: 'Front left', w: 330, h: 520, qty: 1, d: 'M40 0L310 0L330 520L0 520L0 330C25 320 40 300 40 260Z' },
      { id: 'front-r', label: 'Front right', w: 330, h: 520, qty: 1, mirror: true, d: 'M40 0L310 0L330 520L0 520L0 330C25 320 40 300 40 260Z' },
      { id: 'back-l', label: 'Back left', w: 350, h: 545, qty: 1, d: 'M70 0L330 0L350 545L0 545L0 355C40 345 70 305 70 250Z' },
      { id: 'back-r', label: 'Back right', w: 350, h: 545, qty: 1, mirror: true, d: 'M70 0L330 0L350 545L0 545L0 355C40 345 70 305 70 250Z' },
      { id: 'waist', label: 'Waistband', w: 760, h: 70, qty: 1, d: 'M0 0H760V70H0Z' },
    ],
  },
  {
    id: 'socks', label: 'Socks (crew)', note: 'Sublimated crew socks, one pair.',
    pieces: [
      { id: 'sock-l', label: 'Sock left', w: 200, h: 520, qty: 1, d: 'M20 0L180 0L180 330C180 400 200 420 200 470C200 505 175 520 140 520L40 520C20 520 8 505 8 480L20 330Z' },
      { id: 'sock-r', label: 'Sock right', w: 200, h: 520, qty: 1, mirror: true, d: 'M20 0L180 0L180 330C180 400 200 420 200 470C200 505 175 520 140 520L40 520C20 520 8 505 8 480L20 330Z' },
    ],
  },
  {
    id: 'cap', label: 'Cap (6 panels)', note: 'Six-panel cap crown and visor.',
    pieces: [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `panel-${i + 1}`, label: `Crown panel ${i + 1}`, w: 140, h: 190, qty: 1, d: 'M0 190C10 120 40 40 70 0C100 40 130 120 140 190Z' })),
      { id: 'visor', label: 'Visor', w: 240, h: 90, qty: 1, d: 'M0 30C60 0 180 0 240 30C220 75 170 90 120 90C70 90 20 75 0 30Z' },
    ],
  },
  {
    id: 'flag', label: 'Flag / banner', note: 'Single-sided flag with hem.',
    pieces: [{ id: 'flag', label: 'Flag', w: 1500, h: 900, qty: 1, d: 'M0 0H1500V900H0Z' }],
  },
];

export const SIZES: { id: string; label: string; k: number }[] = [
  { id: 'kids', label: 'Kids (8–10)', k: 0.78 }, { id: 'xs', label: 'XS', k: 0.9 }, { id: 's', label: 'S', k: 0.95 }, { id: 'm', label: 'M', k: 1 },
  { id: 'l', label: 'L', k: 1.05 }, { id: 'xl', label: 'XL', k: 1.1 }, { id: '2xl', label: '2XL', k: 1.16 }, { id: '3xl', label: '3XL', k: 1.22 },
];

export const ROLLS = [610, 914, 1118, 1600, 1620];

export interface Placed { piece: Piece; x: number; y: number; w: number; h: number; k: number; copy: number; size?: string; rot?: boolean; tooWide?: boolean }
export interface RunLine { label: string; k: number; qty: number }

/**
 * Shelf-packs pieces (plus bleed) across a roll width (mm). With a size run
 * every garment of every size is laid out — one print file for the order.
 */
export function layoutPieces(product: Product, sizeK: number, rollW: number, bleed = 10, gap = 15, run?: RunLine[]): { placed: Placed[]; height: number } {
  const items: { piece: Piece; w: number; h: number; copy: number; k: number; size?: string; rot?: boolean; tooWide?: boolean }[] = [];
  const lines: RunLine[] = run && run.some((r) => r.qty > 0) ? run.filter((r) => r.qty > 0) : [{ label: '', k: sizeK, qty: 1 }];
  for (const ln of lines) {
    const k = product.id === 'flag' ? 1 : ln.k;
    for (let g = 0; g < ln.qty; g++) for (const p of product.pieces) for (let c = 0; c < p.qty; c++) items.push({ piece: p, w: p.w * k, h: p.h * k, copy: c, k, size: ln.label || undefined });
  }
  // A piece wider than the roll is turned 90°; if it still does not fit it is flagged.
  const room = rollW - 2 * gap - 2 * bleed;
  for (const it of items) {
    if (it.w > room) {
      if (it.h <= room) { const t = it.w; it.w = it.h; it.h = t; it.rot = true; } else it.tooWide = true;
    }
  }
  items.sort((a, b) => b.h - a.h || b.w - a.w);
  const placed: Placed[] = [];
  let x = gap, y = gap, rowH = 0;
  for (const it of items) {
    const W = it.w + 2 * bleed, H = it.h + 2 * bleed;
    if (x + W + gap > rollW && x > gap) { x = gap; y += rowH + gap; rowH = 0; }
    placed.push({ piece: it.piece, x: x + bleed, y: y + bleed, w: it.w, h: it.h, k: it.k, copy: it.copy, size: it.size, rot: it.rot, tooWide: it.tooWide });
    x += W + gap; rowH = Math.max(rowH, H);
  }
  return { placed, height: Math.ceil(y + rowH + gap) };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// The pattern is filled in each piece's own (scaled) space, so one pattern
// per size scale keeps the repeat the same number of millimetres on every size.
const patId = (k: number) => `pat-${Math.round(k * 1000)}`;
function patternDefs(ks: number[], o: { tileInner: string; tileW: number; tileH: number; repeatMm: number }): string {
  return [...new Set(ks)].map((k) => {
    const s = o.repeatMm / o.tileW / k;
    return `<pattern id="${patId(k)}" patternUnits="userSpaceOnUse" width="${r4(o.tileW * s)}" height="${r4(o.tileH * s)}"><g transform="scale(${r4(s)})">${o.tileInner}</g></pattern>`;
  }).join('');
}

/** Transform that draws a piece path at its place (scaled, mirrored if needed). */
export function pieceTransform(pl: Placed): string {
  if (pl.rot) return `translate(${r1(pl.x + pl.w)} ${r1(pl.y)}) rotate(90)${pl.piece.mirror ? ` translate(${r1(pl.h)} 0) scale(${-pl.k} ${pl.k})` : ` scale(${pl.k})`}`;
  return pl.piece.mirror ? `translate(${r1(pl.x + pl.w)} ${r1(pl.y)}) scale(${-pl.k} ${pl.k})` : `translate(${r1(pl.x)} ${r1(pl.y)}) scale(${pl.k})`;
}


let bleedSeq = 0;
/** Pattern over the piece plus bleed: an undistorted pattern-filled box clipped to the outline grown by the bleed. */
function bleedFill(pl: Placed, transform: string, bleed: number, fill: string): string {
  const p = pl.piece, b = bleed / pl.k, id = `bl${++bleedSeq}`;
  const sx = (p.w + 2 * b) / p.w, sy = (p.h + 2 * b) / p.h;
  return `<g transform="${transform}"><clipPath id="${id}"><path d="${p.d}" transform="translate(${r1(p.w / 2)} ${r1(p.h / 2)}) scale(${Math.round(sx * 10000) / 10000} ${Math.round(sy * 10000) / 10000}) translate(${r1(-p.w / 2)} ${r1(-p.h / 2)})"/></clipPath><rect x="${r1(-b - 1)}" y="${r1(-b - 1)}" width="${r1(p.w + 2 * b + 2)}" height="${r1(p.h + 2 * b + 2)}" fill="${fill}" clip-path="url(#${id})"/></g>`;
}

/**
 * Print layout SVG in millimetres: every piece filled with the pattern
 * (pattern extends `bleed` mm past the cut line), cut lines on their own
 * layer, labels outside the pieces.
 */
export function printLayoutSvg(opts: { product: Product; sizeK: number; sizeLabel: string; rollW: number; bleed: number; tileInner: string; tileW: number; tileH: number; repeatMm: number; background: string; cutLines: boolean; name: string; run?: RunLine[]; mirror?: boolean }): { svg: string; height: number; placed: Placed[] } {
  const { product, sizeK, rollW, bleed } = opts;
  const { placed, height } = layoutPieces(product, sizeK, rollW, bleed, 15, opts.run);
  const flip = opts.mirror ? ` transform="translate(${rollW} 0) scale(-1 1)"` : '';
  const defs = [patternDefs(placed.map((pl) => pl.k), opts)];
  const body: string[] = [];
  placed.forEach((pl) => {
    const sw = (2 * bleed) / pl.k; // stroke in piece units = bleed on both sides
    body.push(`<g id="piece-${pl.piece.id}${pl.copy ? `-${pl.copy + 1}` : ''}"><path d="${pl.piece.d}" transform="${pieceTransform(pl)}" fill="${opts.background}" stroke="${opts.background}" stroke-width="${r1(sw)}" stroke-linejoin="round"/>${bleedFill(pl, pieceTransform(pl), bleed, `url(#${patId(pl.k)})`)}</g>`);
  });
  const cuts = opts.cutLines ? `<g id="cut-lines" fill="none" stroke="#EC008C" stroke-width="0.4">${placed.map((pl) => `<path d="${pl.piece.d}" transform="${pieceTransform(pl)}" vector-effect="non-scaling-stroke"/>`).join('')}</g>` : '';
  const labels = `<g id="labels" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#555">${placed.map((pl) => `<text x="${r1(opts.mirror ? rollW - pl.x - pl.w : pl.x)}" y="${r1(pl.y - bleed - 3)}">${esc(`${pl.piece.label}${pl.piece.qty > 1 ? ` (${pl.copy + 1})` : ''} · ${pl.size || opts.sizeLabel} · ${Math.round(pl.rot ? pl.h : pl.w)}×${Math.round(pl.rot ? pl.w : pl.h)} mm${pl.rot ? ' · turned 90°' : ''}${pl.tooWide ? ' · WIDER THAN ROLL' : ''}`)}</text>`).join('')}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${rollW}mm" height="${height}mm" viewBox="0 0 ${rollW} ${height}"><title>${esc(opts.name)} — ${esc(product.label)} ${esc(opts.sizeLabel)} print layout</title><defs>${defs.join('')}</defs><g id="print"${flip}>${body.join('')}</g>${cuts.replace('<g id="cut-lines"', `<g id="cut-lines"${flip}`)}${labels}</svg>`;
  return { svg, height, placed };
}

/** One piece at real size (mm) with bleed, for page-per-piece PDFs. */
export function pieceSvg(pl: Placed, opts: { bleed: number; tileInner: string; tileW: number; tileH: number; repeatMm: number; background: string; cutLines: boolean }): { svg: string; w: number; h: number } {
  const W = pl.w + 2 * opts.bleed, H = pl.h + 2 * opts.bleed;
  const local: Placed = { ...pl, x: opts.bleed, y: opts.bleed };
  const sw = (2 * opts.bleed) / pl.k;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r1(W)}mm" height="${r1(H)}mm" viewBox="0 0 ${r1(W)} ${r1(H)}"><defs>${patternDefs([pl.k], opts)}</defs><path d="${pl.piece.d}" transform="${pieceTransform(local)}" fill="${opts.background}" stroke="${opts.background}" stroke-width="${r1(sw)}" stroke-linejoin="round"/>${bleedFill(local, pieceTransform(local), opts.bleed, `url(#${patId(pl.k)})`)}${opts.cutLines ? `<path d="${pl.piece.d}" transform="${pieceTransform(local)}" fill="none" stroke="#EC008C" stroke-width="0.35" vector-effect="non-scaling-stroke"/>` : ''}</svg>`;
  return { svg, w: W, h: H };
}

/**
 * Markup / tech sheet (A3 landscape, mm): title block, line drawings of
 * every piece with labels and sizes, colour swatches and print notes.
 */
export function markupSvg(opts: { product: Product; sizeLabel: string; sizeK: number; name: string; colors: string[]; background: string; repeatMm: number; bleed: number; rollW: number; tileInner: string; tileW: number; tileH: number; sizeRun: Record<string, number>; date: string }): string {
  const W = 420, H = 297, M = 14;
  const k0 = opts.product.id === 'flag' ? 1 : opts.sizeK;
  const pieces = opts.product.pieces;
  // Fit the line drawings into the left area (W − 130 wide, H − 70 tall).
  const areaW = W - 2 * M - 120, areaH = H - 2 * M - 52;
  // Largest scale at which all line drawings (with their labels) fit the area.
  const LAB = 14, GAP = 10;
  const pack = (f: number) => {
    const out: { p: Piece; x: number; y: number; w: number; h: number; rowH: number }[] = [];
    let x = 0, y = 0, rowH = 0, row: typeof out = [];
    for (const p of pieces) {
      const w = p.w * k0 * f, h = p.h * k0 * f;
      if (x + w > areaW && x > 0) { row.forEach((r) => (r.rowH = rowH)); x = 0; y += rowH + LAB + GAP; rowH = 0; row = []; }
      const it = { p, x, y, w, h, rowH: 0 };
      out.push(it); row.push(it);
      x += w + GAP; rowH = Math.max(rowH, h);
    }
    row.forEach((r) => (r.rowH = rowH));
    return { out, height: y + rowH + LAB };
  };
  let fit = Math.min(areaW / Math.max(...pieces.map((p) => p.w * k0)), areaH / Math.max(...pieces.map((p) => p.h * k0)));
  let packed = pack(fit);
  while (packed.height > areaH && fit > 0.01) { fit *= 0.95; packed = pack(fit); }
  const draw: string[] = [];
  for (const it of packed.out) {
    const p = it.p, x = M + it.x, y = M + 30 + it.y, w = it.w, sc = k0 * fit;
    const tr = p.mirror ? `translate(${r1(x + w)} ${r1(y)}) scale(${-sc} ${sc})` : `translate(${r1(x)} ${r1(y)}) scale(${sc})`;
    draw.push(`<path d="${p.d}" transform="${tr}" fill="url(#mk)" fill-opacity="0.18" stroke="#111" stroke-width="0.5" vector-effect="non-scaling-stroke"/>`);
    draw.push(`<text x="${r1(x + w / 2)}" y="${r1(y + it.rowH + 5)}" text-anchor="middle" font-size="4.2" font-weight="700">${esc(p.label)}${p.qty > 1 ? ` ×${p.qty}` : ''}</text><text x="${r1(x + w / 2)}" y="${r1(y + it.rowH + 10)}" text-anchor="middle" font-size="3.4" fill="#666">${Math.round(p.w * k0)} × ${Math.round(p.h * k0)} mm</text>`);
  }
  const sx = W - M - 112;
  const sw = opts.colors.map((c, i) => `<rect x="${sx}" y="${r1(118 + i * 11)}" width="9" height="8" rx="1" fill="${c}" stroke="#ccc" stroke-width="0.2"/><text x="${sx + 12}" y="${r1(124 + i * 11)}" font-size="3.6">${c.toUpperCase()}  ${cmykOf(c)}</text>`).join('');
  const bgY = 118 + opts.colors.length * 11;
  const sizes = Object.entries(opts.sizeRun).filter(([, n]) => n > 0);
  const sizeRows = sizes.length ? sizes.map(([s, n], i) => `<text x="${sx}" y="${r1(bgY + 26 + i * 5)}" font-size="3.6">${esc(s)}</text><text x="${sx + 40}" y="${r1(bgY + 26 + i * 5)}" font-size="3.6">${n} pcs</text>`).join('') : `<text x="${sx}" y="${r1(bgY + 26)}" font-size="3.6" fill="#666">Size ${esc(opts.sizeLabel)}</text>`;
  const s = (opts.repeatMm / opts.tileW) * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif" fill="#111">
<defs><pattern id="mk" patternUnits="userSpaceOnUse" width="${r1(opts.tileW * s)}" height="${r1(opts.tileH * s)}"><g transform="scale(${s})">${opts.tileInner}</g></pattern>
<pattern id="sw" patternUnits="userSpaceOnUse" width="${r1(opts.tileW * s)}" height="${r1(opts.tileH * s)}"><rect width="100%" height="100%" fill="${opts.background}"/><g transform="scale(${s})">${opts.tileInner}</g></pattern></defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<rect x="${M - 4}" y="${M - 4}" width="${W - 2 * M + 8}" height="${H - 2 * M + 8}" fill="none" stroke="#111" stroke-width="0.4"/>
<text x="${M}" y="${M + 6}" font-size="8" font-weight="700">${esc(opts.name)}</text>
<text x="${M}" y="${M + 13}" font-size="4.4" fill="#555">${esc(opts.product.label)} · Size ${esc(opts.sizeLabel)} · Sublimation print markup · ${esc(opts.date)}</text>
<line x1="${M}" y1="${M + 18}" x2="${W - M}" y2="${M + 18}" stroke="#111" stroke-width="0.3"/>
${draw.join('\n')}
<line x1="${sx - 6}" y1="${M + 22}" x2="${sx - 6}" y2="${H - M}" stroke="#ddd" stroke-width="0.3"/>
<text x="${sx}" y="${M + 28}" font-size="4.6" font-weight="700">Pattern</text>
<rect x="${sx}" y="${M + 32}" width="70" height="44" fill="url(#sw)" stroke="#ccc" stroke-width="0.2"/>
<text x="${sx}" y="${M + 82}" font-size="3.6" fill="#555">Repeat ${opts.repeatMm} mm · background ${opts.background.toUpperCase()}</text>
<text x="${sx}" y="${110}" font-size="4.6" font-weight="700">Colours (approx. CMYK)</text>
${sw}
<text x="${sx}" y="${r1(bgY + 18)}" font-size="4.6" font-weight="700">Size run</text>
${sizeRows}
<text x="${sx}" y="${H - M - 30}" font-size="4.6" font-weight="700">Print notes</text>
<text x="${sx}" y="${H - M - 24}" font-size="3.4">· Print at 100% — do not scale.</text>
<text x="${sx}" y="${H - M - 19.5}" font-size="3.4">· Bleed ${opts.bleed} mm beyond the cut line.</text>
<text x="${sx}" y="${H - M - 15}" font-size="3.4">· Cut on the magenta line.</text>
<text x="${sx}" y="${H - M - 10.5}" font-size="3.4">· Roll width ${opts.rollW} mm · mirror if your paper needs it.</text>
<text x="${M}" y="${H - M + 2}" font-size="3.2" fill="#888">${esc(opts.product.note)} Made with Magical Touch Design · magicaltouchdesign.com</text>
</svg>`;
}

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/** Rough CMYK from hex (for the markup sheet; the printer's profile decides the final values). */
export function cmykOf(hex: string): string {
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return 'C0 M0 Y0 K100';
  const c = (1 - r - k) / (1 - k), m = (1 - g - k) / (1 - k), y = (1 - b - k) / (1 - k);
  return `C${Math.round(c * 100)} M${Math.round(m * 100)} Y${Math.round(y * 100)} K${Math.round(k * 100)}`;
}
