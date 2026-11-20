import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import { planTiles, tiledPdf } from '../../lib/print/tiling.ts';
import { preflightPdf } from '../../lib/print/preflight.ts';

test('A1 poster on A4 with 10 mm overlap and 5 mm margins', () => {
  const p = planTiles({ posterW: 594, posterH: 841, sheetW: 210, sheetH: 297, margin: 5, overlap: 10, landscape: 'auto' });
  // area 200×287 portrait: step 190×277 → cols ceil(584/190)=4, rows ceil(831/277)=3 → 12; landscape 287×200: step 277×190 → 3 × 5 = 15
  assert.equal(p.sheets, 12); assert.equal(p.cols, 4); assert.equal(p.rows, 3);
  const last = p.tiles[p.tiles.length - 1];
  assert.ok(Math.abs(last.x + last.w - 594) < 1e-9 && Math.abs(last.y + last.h - 841) < 1e-9);
});

test('tiled PDF keeps the source vector (embedded page) and adds an assembly map', async () => {
  const src = await PDFDocument.create(); const pg = src.addPage([594 * 72 / 25.4, 841 * 72 / 25.4]); pg.drawRectangle({ x: 10, y: 10, width: 500, height: 500, color: rgb(0, 0, 1) });
  const { bytes, plan } = await tiledPdf({ pdf: await src.save() }, { posterW: 594, posterH: 841, sheetW: 210, sheetH: 297, margin: 5, overlap: 10, landscape: 'auto' }, { marks: true, map: true, name: 'Test' });
  const out = await PDFDocument.load(bytes);
  assert.equal(out.getPageCount(), plan.sheets + 1);
  const r = await preflightPdf(bytes, 'digital');
  assert.equal(r.pages.length, plan.sheets + 1);
  assert.equal(r.pages[0].images.length, 0, 'no rasterised images: the page stays vector');
});
