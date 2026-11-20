import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, rgb, cmyk, PDFName } from 'pdf-lib';
import { preflightPdf } from '../../lib/print/preflight.ts';
import { makeDieline, DEFAULT_DIE } from '../../lib/packaging/dieline.ts';
import { dielinePdf } from '../../lib/packaging/diePdf.ts';

const MM = 72 / 25.4;
async function sample({ trim = true, bleed = 3, rgbFill = true, tiny = 4, lowImg = true } = {}) {
  const doc = await PDFDocument.create();
  const W = 210 * MM, H = 297 * MM, b = bleed * MM;
  const page = doc.addPage([W + 2 * b, H + 2 * b]);
  if (trim) { page.setTrimBox(b, b, W, H); page.setBleedBox(0, 0, W + 2 * b, H + 2 * b); }
  page.drawRectangle({ x: 0, y: 0, width: W + 2 * b, height: 100, color: rgbFill ? rgb(1, 0, 0) : cmyk(0, 1, 1, 0) });
  const font = await doc.embedFont(StandardFonts.Helvetica); // standard 14: not embedded
  page.drawText('Tiny legal line', { x: 50, y: 300, size: tiny, font, color: rgbFill ? rgb(0, 0, 0) : cmyk(0, 0, 0, 1) });
  if (lowImg) {
    // 100 × 100 px RGB image placed at 100 mm → ~25 ppi
    const px = new Uint8Array(100 * 100 * 3).fill(128);
    const img = doc.context.flateStream(px, { Type: 'XObject', Subtype: 'Image', Width: 100, Height: 100, ColorSpace: 'DeviceRGB', BitsPerComponent: 8 });
    const ref = doc.context.register(img);
    const name = page.node.newXObject('Im', ref);
    const { pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = await import('pdf-lib');
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(100 * MM, 0, 0, 100 * MM, 60, 400), drawObject(name), popGraphicsState());
  }
  return doc.save();
}

test('preflight flags RGB, missing font embedding, low-res image, tiny text', async () => {
  const r = await preflightPdf(await sample(), 'press-cmyk');
  const by = (c) => r.findings.filter((f) => f.check === c);
  assert.equal(r.status, 'error');
  assert.ok(by('Fonts').some((f) => f.level === 'error' && /Helvetica/.test(f.message)));
  assert.ok(by('Colour').some((f) => f.level === 'error'));
  const im = r.pages[0].images[0];
  assert.ok(im.ppi >= 24 && im.ppi <= 27, `ppi ${im.ppi}`);
  assert.ok(by('Image resolution').some((f) => f.level === 'error'));
  assert.ok(by('Small text').some((f) => f.level === 'warn'));
  assert.equal(r.pages[0].bleedMm, 3);
  assert.deepEqual(r.pages[0].trimMm, [210, 297]);
});

test('preflight: missing TrimBox and bleed are reported', async () => {
  const r = await preflightPdf(await sample({ trim: false, rgbFill: false, lowImg: false, tiny: 9 }), 'press-cmyk');
  assert.ok(r.findings.some((f) => f.check === 'Page boxes' && f.level === 'warn'));
  assert.ok(r.findings.some((f) => f.check === 'Colour' && f.level === 'ok'));
});

test('preflight reads our own dieline: spots, overprint, trim', async () => {
  const r = await preflightPdf(await dielinePdf(makeDieline(DEFAULT_DIE)), 'press-cmyk');
  assert.ok(r.spots.includes('CutContour') && r.spots.includes('Crease'), r.spots.join());
  assert.equal(r.overprint, true);
  assert.ok(r.pages[0].trimMm);
});
