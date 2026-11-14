import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePdf, buildPdf, samplePdf } from '../../lib/impose/pdf.ts';
import { docFromSources, run, runAll } from '../../lib/impose/model.ts';

test('sample → analyse → n-up → booklet → reopen', async () => {
  const bytes = await samplePdf({ pages: 6, w: 148, h: 210, bleed: 3 });
  const rep = await analyzePdf(bytes, 'sample.pdf');
  assert.equal(rep.pageCount, 6);
  assert.deepEqual(rep.source.pages[0].trim, { x: 3, y: 3, w: 148, h: 210 });
  assert.ok(rep.fonts.length >= 1);
  const doc = docFromSources([rep.source]);
  assert.deepEqual(doc.sheets[0].bleed, { t: 3, r: 3, b: 3, l: 3 });
  const nup = run(doc, { type: 'nUp', sheetW: 320, sheetH: 450, cols: 2, rows: 2, gap: 4, margin: 10, order: 'rows', duplex: 'none', bleed: 3, marks: { crop: true, registration: true }, fit: 'none' });
  const out = await buildPdf(nup, [bytes], { variant: 'editable' });
  assert.equal(out.layers, true);
  const back = await analyzePdf(out.bytes, 'out.pdf');
  assert.equal(back.pageCount, 2);
  assert.equal(Math.round(back.pages[0].media.w), 320);
  const { PDFDocument, PDFName } = await import('pdf-lib');
  const re = await PDFDocument.load(out.bytes);
  assert.ok(re.catalog.get(PDFName.of('OCProperties')), 'has layers');
  assert.ok(re.getPage(0).getTrimBox().width > 0);
  const book = runAll(doc, [{ type: 'stickText', sel: 'all', text: '{n}', anchor: 'b', dx: 0, dy: 6, size: 9, color: '#000000' }, { type: 'booklet', sheet: { w: 297, h: 420 }, marks: { fold: true } }]);
  const b2 = await buildPdf(book, [bytes], { variant: 'front' });
  const rb = await analyzePdf(b2.bytes, 'b.pdf');
  assert.equal(rb.pageCount, 2); // 6 pages → 8 → 2 sheets, fronts only
});
