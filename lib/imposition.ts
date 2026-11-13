// Print imposition (pure maths, millimetres): many-up sheets for business
// cards, stickers, labels and photos, and saddle-stitch booklet page order.
// The PDF itself is assembled in the browser with pdf-lib, which places the
// customer's own PDF pages as vectors (nothing is turned into a picture).

export interface SheetSize { id: string; label: string; w: number; h: number }
export const SHEETS: SheetSize[] = [
  { id: 'a4', label: 'A4 · 210 × 297', w: 210, h: 297 },
  { id: 'a3', label: 'A3 · 297 × 420', w: 297, h: 420 },
  { id: 'sra3', label: 'SRA3 · 320 × 450', w: 320, h: 450 },
  { id: 'a5', label: 'A5 · 148 × 210', w: 148, h: 210 },
  { id: 'letter', label: 'US Letter · 216 × 279', w: 215.9, h: 279.4 },
  { id: 'tabloid', label: 'Tabloid · 279 × 432', w: 279.4, h: 431.8 },
  { id: '12x18', label: '12 × 18 in · 305 × 457', w: 304.8, h: 457.2 },
];
export const ITEM_PRESETS: { id: string; label: string; w: number; h: number }[] = [
  { id: 'card-eu', label: 'Business card 85 × 55 mm', w: 85, h: 55 },
  { id: 'card-us', label: 'Business card 3.5 × 2 in', w: 88.9, h: 50.8 },
  { id: 'card-uae', label: 'Business card 90 × 50 mm', w: 90, h: 50 },
  { id: 'passport', label: 'Passport photo 35 × 45 mm', w: 35, h: 45 },
  { id: 'sticker-50', label: 'Round / square sticker 50 × 50 mm', w: 50, h: 50 },
  { id: 'label-a', label: 'Label 99.1 × 38.1 mm', w: 99.1, h: 38.1 },
  { id: 'postcard', label: 'Postcard A6 148 × 105 mm', w: 148, h: 105 },
  { id: 'dl', label: 'DL flyer 99 × 210 mm', w: 99, h: 210 },
];

export interface NUpOptions { sheetW: number; sheetH: number; itemW: number; itemH: number; bleed: number; gap: number; margin: number; rotate?: 'auto' | 'no' | 'yes' }
export interface Slot { x: number; y: number; w: number; h: number; rotated: boolean } // trim box on the sheet (mm, from the top-left)
export interface NUpPlan { cols: number; rows: number; slots: Slot[]; rotated: boolean; usedW: number; usedH: number }

function grid(o: NUpOptions, iw: number, ih: number): { cols: number; rows: number } {
  const cell = (n: number, size: number) => n * (size + 2 * o.bleed) + (n - 1) * o.gap;
  let cols = 0, rows = 0;
  while (cell(cols + 1, iw) <= o.sheetW - 2 * o.margin + 1e-6) cols++;
  while (cell(rows + 1, ih) <= o.sheetH - 2 * o.margin + 1e-6) rows++;
  return { cols, rows };
}

/** As many items as fit on the sheet (each with its own bleed), centred. */
export function nUpPlan(o: NUpOptions): NUpPlan {
  const a = grid(o, o.itemW, o.itemH), b = grid(o, o.itemH, o.itemW);
  const rot = o.rotate === 'yes' ? true : o.rotate === 'no' ? false : b.cols * b.rows > a.cols * a.rows;
  const { cols, rows } = rot ? b : a;
  const iw = rot ? o.itemH : o.itemW, ih = rot ? o.itemW : o.itemH;
  const usedW = cols * (iw + 2 * o.bleed) + Math.max(0, cols - 1) * o.gap;
  const usedH = rows * (ih + 2 * o.bleed) + Math.max(0, rows - 1) * o.gap;
  const x0 = (o.sheetW - usedW) / 2, y0 = (o.sheetH - usedH) / 2;
  const slots: Slot[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    slots.push({ x: x0 + c * (iw + 2 * o.bleed + o.gap) + o.bleed, y: y0 + r * (ih + 2 * o.bleed + o.gap) + o.bleed, w: iw, h: ih, rotated: rot });
  }
  return { cols, rows, slots, rotated: rot, usedW, usedH };
}

/** Back side of a duplex sheet: the same slots mirrored left-to-right so fronts and backs line up. */
export function backSlots(plan: NUpPlan, sheetW: number): Slot[] {
  return plan.slots.map((s) => ({ ...s, x: sheetW - s.x - s.w }));
}

/** Crop marks (lines) at every trim corner, outside the bleed. */
export function cropMarks(slots: Slot[], bleed: number, len = 4, offset = 2): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const o = bleed + offset;
  for (const s of slots) {
    const xs = [s.x, s.x + s.w], ys = [s.y, s.y + s.h];
    for (const x of xs) for (const y of ys) {
      const dx = x === s.x ? -1 : 1, dy = y === s.y ? -1 : 1;
      out.push([x + dx * o, y, x + dx * (o + len), y]); // horizontal
      out.push([x, y + dy * o, x, y + dy * (o + len)]); // vertical
    }
  }
  return out;
}

/**
 * Saddle-stitch booklet: pages padded to a multiple of 4 (blank pages at the
 * end), then each sheet carries four pages — front: last+first, back:
 * second+second-last — so the folded, stacked sheets read in order.
 * Returns 0-based page numbers; -1 = blank.
 */
export function bookletOrder(pageCount: number): { sheets: { front: [number, number]; back: [number, number] }[]; total: number } {
  const total = Math.max(4, Math.ceil(pageCount / 4) * 4);
  const p = (i: number) => (i < pageCount ? i : -1);
  const sheets = [];
  for (let s = 0; s < total / 4; s++) {
    sheets.push({ front: [p(total - 1 - 2 * s), p(2 * s)] as [number, number], back: [p(2 * s + 1), p(total - 2 - 2 * s)] as [number, number] });
  }
  return { sheets, total };
}

export const MM_TO_PT = 72 / 25.4;
