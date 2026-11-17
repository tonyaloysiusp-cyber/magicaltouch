// Print PDFs become CMYK: colour operators, pictures and the FOGRA39 output intent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cmykify, rewriteColours } from '../../lib/print/cmykPdf.ts';
import { makeCmykMapper, rgbaToCmyk } from '../../lib/color/cmyk.ts';

const lut = new Uint8Array(readFileSync(new URL('../../public/color/srgb-to-fogra39.bin', import.meta.url)));
const icc = new Uint8Array(readFileSync(new URL('../../public/color/FOGRA39L_coated.icc', import.meta.url)));
const toCmyk = makeCmykMapper(lut);

test('colour operators: rgb → k/K, grey → K only, strings untouched', () => {
  const rep = { colours: 0, images: 0, skipped: [] };
  const out = rewriteColours('1 0 0 rg 0 0 1 RG 0.5 g (1 0 0 rg) Tj', toCmyk, rep);
  assert.match(out, /^[\d.]+ [\d.]+ [\d.]+ [\d.]+ k [\d.]+ [\d.]+ [\d.]+ [\d.]+ K 0 0 0 0\.5 k \(1 0 0 rg\) Tj$/);
  assert.equal(rep.colours, 3);
});

test('a whole PDF with vector colour and an RGB picture becomes CMYK with an output intent', async () => {
  const { PDFDocument, rgb, PDFName } = await import('pdf-lib');
  const d = await PDFDocument.create();
  const p = d.addPage([200, 200]);
  p.drawRectangle({ x: 10, y: 10, width: 80, height: 80, color: rgb(0.9, 0.1, 0.2) });
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'));
  const img = await d.embedPng(png);
  p.drawImage(img, { x: 100, y: 100, width: 50, height: 50 });
  // Embedded artwork (a form XObject) must be converted too.
  const src = await PDFDocument.create(); src.addPage([50, 50]).drawRectangle({ x: 0, y: 0, width: 50, height: 50, color: rgb(0, 0.5, 0.2) });
  const [ep] = await d.embedPdf(await src.save()); p.drawPage(ep, { x: 0, y: 120 });
  const { bytes, report } = await cmykify(await d.save(), { toCmyk, pixels: (rgba) => rgbaToCmyk(rgba, lut), icc });
  assert.ok(report.colours >= 2, JSON.stringify(report)); assert.equal(report.images, 1); assert.deepEqual(report.skipped, []);
  const back = await PDFDocument.load(bytes);
  assert.ok(back.catalog.get(PDFName.of('OutputIntents')));
  const s = Buffer.from(bytes).toString('latin1');
  assert.match(s, /\/DeviceCMYK/);
  assert.doesNotMatch(s, /\/ColorSpace \/DeviceRGB/);
});
