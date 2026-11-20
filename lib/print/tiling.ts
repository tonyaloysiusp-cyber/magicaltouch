// Large-format tiling: splits one big page (a PDF page, kept vector, or a
// picture) into tiles that fit a printer's sheet, with overlap for gluing or
// taping, trim marks, alignment ticks and a row/column label on each tile,
// plus an assembly map. All sizes in millimetres.

export interface TileOptions {
  posterW: number; posterH: number;     // final printed size
  sheetW: number; sheetH: number;       // printer paper (portrait size)
  margin: number;                       // printer no-print edge per side
  overlap: number;                      // shared strip between neighbours
  landscape: 'auto' | boolean;
}
export interface Tile { row: number; col: number; label: string; x: number; y: number; w: number; h: number }
export interface TilePlan { tiles: Tile[]; rows: number; cols: number; sheetW: number; sheetH: number; areaW: number; areaH: number; sheets: number }

const lbl = (r: number, c: number) => `${String.fromCharCode(65 + (r % 26))}${r >= 26 ? Math.floor(r / 26) : ''}${c + 1}`;

/** Plans the tiles: each sheet prints an area (sheet − 2·margin); neighbours overlap by `overlap`. */
export function planTiles(o: TileOptions): TilePlan {
  const plan = (sw: number, sh: number): TilePlan => {
    const aw = sw - 2 * o.margin, ah = sh - 2 * o.margin;
    const stepW = Math.max(1, aw - o.overlap), stepH = Math.max(1, ah - o.overlap);
    const cols = Math.max(1, Math.ceil((o.posterW - o.overlap) / stepW)), rows = Math.max(1, Math.ceil((o.posterH - o.overlap) / stepH));
    const tiles: Tile[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * stepW, y = r * stepH;
      tiles.push({ row: r, col: c, label: lbl(r, c), x, y, w: Math.min(aw, o.posterW - x), h: Math.min(ah, o.posterH - y) });
    }
    return { tiles, rows, cols, sheetW: sw, sheetH: sh, areaW: aw, areaH: ah, sheets: rows * cols };
  };
  const p = plan(o.sheetW, o.sheetH), l = plan(o.sheetH, o.sheetW);
  if (o.landscape === true) return l;
  if (o.landscape === false) return p;
  return l.sheets < p.sheets ? l : p;
}

export const PAPERS = [
  { id: 'a4', name: 'A4', w: 210, h: 297 }, { id: 'a3', name: 'A3', w: 297, h: 420 }, { id: 'letter', name: 'US Letter', w: 215.9, h: 279.4 },
  { id: 'legal', name: 'US Legal', w: 215.9, h: 355.6 }, { id: 'tabloid', name: 'Tabloid 11×17', w: 279.4, h: 431.8 }, { id: 'a2', name: 'A2', w: 420, h: 594 },
  { id: 'roll610', name: 'Roll 610 mm (24")', w: 610, h: 1500 }, { id: 'roll914', name: 'Roll 914 mm (36")', w: 914, h: 1800 }, { id: 'roll1370', name: 'Roll 1370 mm (54")', w: 1370, h: 2500 },
];

/**
 * Tiled PDF. `source` is either a PDF (bytes + page index — embedded as a vector
 * form, cropped per tile) or an image (bytes + mime). The poster size scales the source.
 */
export async function tiledPdf(src: { pdf?: Uint8Array; page?: number; image?: Uint8Array; mime?: string }, o: TileOptions, opts: { marks: boolean; map: boolean; name: string }): Promise<{ bytes: Uint8Array; plan: TilePlan }> {
  const { PDFDocument, StandardFonts, rgb, cmyk, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = await import('pdf-lib');
  const PT = 72 / 25.4, plan = planTiles(o);
  const doc = await PDFDocument.create(); doc.setProducer(''); doc.setCreator(''); doc.setTitle(`${opts.name} — tiled ${plan.cols}×${plan.rows}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let srcW = 0, srcH = 0, embedPage: ((bb: { left: number; bottom: number; right: number; top: number }) => Promise<any>) | null = null, image: any = null;
  if (src.pdf) {
    const sdoc = await PDFDocument.load(src.pdf, { ignoreEncryption: true });
    const pg = sdoc.getPage(src.page ?? 0);
    const box = pg.getTrimBox ? pg.getTrimBox() : pg.getMediaBox();
    srcW = box.width; srcH = box.height;
    embedPage = (bb) => doc.embedPage(pg, bb);
    (embedPage as any).box = box;
  } else if (src.image) {
    image = /png/i.test(src.mime || '') ? await doc.embedPng(src.image) : await doc.embedJpg(src.image);
    srcW = image.width; srcH = image.height;
  }
  const sx = srcW / o.posterW, sy = srcH / o.posterH; // source units per mm
  for (const t of plan.tiles) {
    const page = doc.addPage([plan.sheetW * PT, plan.sheetH * PT]);
    const ox = o.margin, oy = o.margin; // tile area origin on the sheet (mm, from top-left)
    const X = (mm: number) => mm * PT, Y = (mm: number) => (plan.sheetH - mm) * PT;
    if (embedPage) {
      const b = (embedPage as any).box;
      const left = b.x + t.x * sx, right = b.x + (t.x + t.w) * sx, top = b.y + srcH - t.y * sy, bottom = b.y + srcH - (t.y + t.h) * sy;
      const form = await embedPage({ left, bottom, right, top });
      page.drawPage(form, { x: X(ox), y: Y(oy + t.h), width: t.w * PT, height: t.h * PT });
    } else if (image) {
      // draw the whole image scaled to the poster, clipped to this tile
      page.pushOperators(pushGraphicsState(), rectangle(X(ox), Y(oy + t.h), t.w * PT, t.h * PT), clip(), endPath());
      page.drawImage(image, { x: X(ox - t.x), y: Y(oy - t.y + o.posterH), width: o.posterW * PT, height: o.posterH * PT });
      page.pushOperators(popGraphicsState());
    }
    if (opts.marks) {
      const k = cmyk(0, 0, 0, 1), L = Math.min(5, o.margin * 0.8);
      const line = (x1: number, y1: number, x2: number, y2: number, dash?: number[]) => page.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: 0.3, color: k, dashArray: dash });
      // trim marks at the tile area corners
      for (const [cx, cy, dx, dy] of [[ox, oy, -1, -1], [ox + t.w, oy, 1, -1], [ox, oy + t.h, -1, 1], [ox + t.w, oy + t.h, 1, 1]] as const) { line(cx + dx * 0.5, cy, cx + dx * (L + 0.5), cy); line(cx, cy + dy * 0.5, cx, cy + dy * (L + 0.5)); }
      // overlap guides: where the neighbour starts (dashed, outside the image only)
      if (o.overlap > 0) {
        if (t.col > 0) { line(ox + o.overlap, oy - L, ox + o.overlap, oy - 0.5, [1.5, 1]); line(ox + o.overlap, oy + t.h + 0.5, ox + o.overlap, oy + t.h + L, [1.5, 1]); }
        if (t.row > 0) { line(ox - L, oy + o.overlap, ox - 0.5, oy + o.overlap, [1.5, 1]); line(ox + t.w + 0.5, oy + o.overlap, ox + t.w + L, oy + o.overlap, [1.5, 1]); }
      }
      const txt = `${t.label}  ·  row ${t.row + 1}/${plan.rows}  col ${t.col + 1}/${plan.cols}  ·  ${opts.name}  ·  overlap ${o.overlap} mm`;
      page.drawText(txt, { x: X(ox), y: Y(Math.max(2.5, o.margin * 0.45)), size: 6, font, color: rgb(0.35, 0.35, 0.4) });
    }
  }
  if (opts.map) {
    const page = doc.addPage([plan.sheetW * PT, plan.sheetH * PT]);
    const mW = plan.sheetW - 30, mH = plan.sheetH - 60, k = Math.min(mW / o.posterW, mH / o.posterH);
    const x0 = (plan.sheetW - o.posterW * k) / 2, y0 = 40;
    page.drawText(`Assembly map — ${opts.name}`, { x: 15 * PT, y: (plan.sheetH - 18) * PT, size: 12, font });
    page.drawText(`${o.posterW} × ${o.posterH} mm on ${plan.sheets} sheets (${plan.cols} × ${plan.rows}) · overlap ${o.overlap} mm · print at 100 %`, { x: 15 * PT, y: (plan.sheetH - 25) * PT, size: 8, font, color: rgb(0.35, 0.35, 0.4) });
    for (const t of plan.tiles) {
      const x = x0 + t.x * k, y = y0 + t.y * k;
      page.drawRectangle({ x: x * PT, y: (plan.sheetH - y - t.h * k) * PT, width: t.w * k * PT, height: t.h * k * PT, borderColor: rgb(0.2, 0.45, 0.77), borderWidth: 0.6, color: rgb(0.93, 0.96, 1), opacity: 0.5, borderOpacity: 1 });
      page.drawText(t.label, { x: (x + 2) * PT, y: (plan.sheetH - y - 6) * PT, size: Math.max(6, Math.min(14, t.w * k * 0.3)), font, color: rgb(0.1, 0.1, 0.15) });
    }
  }
  return { bytes: await doc.save({ useObjectStreams: false }), plan };
}
