// Print sizes, bleed and resolution maths (pure functions).

export interface PaperSize { id: string; label: string; group: string; w: number; h: number } // mm

export const PAPER_SIZES: PaperSize[] = [
  { id: 'a0', label: 'A0', group: 'A sizes', w: 841, h: 1189 },
  { id: 'a1', label: 'A1', group: 'A sizes', w: 594, h: 841 },
  { id: 'a2', label: 'A2', group: 'A sizes', w: 420, h: 594 },
  { id: 'a3', label: 'A3', group: 'A sizes', w: 297, h: 420 },
  { id: 'a4', label: 'A4', group: 'A sizes', w: 210, h: 297 },
  { id: 'a5', label: 'A5', group: 'A sizes', w: 148, h: 210 },
  { id: 'a6', label: 'A6', group: 'A sizes', w: 105, h: 148 },
  { id: 'dl', label: 'DL (1/3 A4)', group: 'A sizes', w: 99, h: 210 },
  { id: 'b0', label: 'B0', group: 'B sizes', w: 1000, h: 1414 },
  { id: 'b1', label: 'B1', group: 'B sizes', w: 707, h: 1000 },
  { id: 'b2', label: 'B2', group: 'B sizes', w: 500, h: 707 },
  { id: 'b3', label: 'B3', group: 'B sizes', w: 353, h: 500 },
  { id: 'b4', label: 'B4', group: 'B sizes', w: 250, h: 353 },
  { id: 'b5', label: 'B5', group: 'B sizes', w: 176, h: 250 },
  { id: 'b6', label: 'B6', group: 'B sizes', w: 125, h: 176 },
  { id: 'sra0', label: 'SRA0', group: 'SRA press sheets', w: 900, h: 1280 },
  { id: 'sra1', label: 'SRA1', group: 'SRA press sheets', w: 640, h: 900 },
  { id: 'sra2', label: 'SRA2', group: 'SRA press sheets', w: 450, h: 640 },
  { id: 'sra3', label: 'SRA3', group: 'SRA press sheets', w: 320, h: 450 },
  { id: 'sra4', label: 'SRA4', group: 'SRA press sheets', w: 225, h: 320 },
  { id: 'royal', label: 'Royal book (156 × 234)', group: 'Book sizes', w: 156, h: 234 },
  { id: 'demy', label: 'Demy book (138 × 216)', group: 'Book sizes', w: 138, h: 216 },
  { id: 'crown4', label: 'Crown quarto (189 × 246)', group: 'Book sizes', w: 189, h: 246 },
  { id: 'trade6x9', label: 'US trade 6 × 9 in', group: 'Book sizes', w: 152.4, h: 228.6 },
  { id: 'digest', label: 'Digest 5.5 × 8.5 in', group: 'Book sizes', w: 139.7, h: 215.9 },
  { id: 'letter', label: 'US Letter', group: 'US sizes', w: 215.9, h: 279.4 },
  { id: 'legal', label: 'US Legal', group: 'US sizes', w: 215.9, h: 355.6 },
  { id: 'tabloid', label: 'Tabloid (11 × 17 in)', group: 'US sizes', w: 279.4, h: 431.8 },
  { id: 'bc-uk', label: 'Business card UK / EU (85 × 55 mm)', group: 'Cards', w: 85, h: 55 },
  { id: 'bc-in', label: 'Visiting card India (3.5 × 2 in)', group: 'Cards', w: 88.9, h: 50.8 },
  { id: 'bc-us', label: 'Business card US (3.5 × 2 in)', group: 'Cards', w: 88.9, h: 50.8 },
  { id: 'postcard', label: 'Postcard (6 × 4 in)', group: 'Cards', w: 152.4, h: 101.6 },
  { id: 'card57', label: 'Invitation / greeting card (5 × 7 in)', group: 'Cards', w: 127, h: 177.8 },
  { id: 'id-card', label: 'ID card (CR80, 85.6 × 54 mm)', group: 'Cards', w: 85.6, h: 54 },
  { id: 'poster1824', label: 'Poster 18 × 24 in', group: 'Posters & banners', w: 457.2, h: 609.6 },
  { id: 'poster2436', label: 'Poster 24 × 36 in', group: 'Posters & banners', w: 609.6, h: 914.4 },
  { id: 'rollup', label: 'Roll-up banner (85 × 200 cm)', group: 'Posters & banners', w: 850, h: 2000 },
  { id: 'flex', label: 'Flex banner (6 × 3 ft)', group: 'Posters & banners', w: 1828.8, h: 914.4 },
];

export const DPIS = [72, 96, 150, 300, 600];

export const pxFor = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);
export const inFor = (mm: number) => Math.round((mm / 25.4) * 100) / 100;
export const ptFor = (mm: number) => Math.round((mm / 25.4) * 72 * 10) / 10;

export interface PrintCalc {
  trimMm: [number, number]; bleedMm: [number, number]; safeMm: [number, number];
  trimPx: [number, number]; bleedPx: [number, number]; inches: [number, number]; points: [number, number];
  megapixels: number; editorPx: [number, number];
}

/** Everything a printer asks for, for one size. */
export function printCalc(w: number, h: number, dpi: number, bleed: number, safe: number): PrintCalc {
  const bw = w + 2 * bleed, bh = h + 2 * bleed;
  return {
    trimMm: [w, h], bleedMm: [r1(bw), r1(bh)], safeMm: [r1(w - 2 * safe), r1(h - 2 * safe)],
    trimPx: [pxFor(w, dpi), pxFor(h, dpi)], bleedPx: [pxFor(bw, dpi), pxFor(bh, dpi)],
    inches: [inFor(w), inFor(h)], points: [ptFor(w), ptFor(h)],
    megapixels: Math.round((pxFor(bw, dpi) * pxFor(bh, dpi)) / 1e5) / 10,
    editorPx: [pxFor(w, 96), pxFor(h, 96)], // the editor works at 96 px per inch for print sizes
  };
}
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Largest print size (mm) a photo gives at a DPI. */
export const maxPrintMm = (px: number, dpi: number) => Math.round((px / dpi) * 25.4);
