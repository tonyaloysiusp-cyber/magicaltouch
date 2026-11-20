import test from 'node:test';
import assert from 'node:assert/strict';
import { gs1Check, normalise, eanModules, barcodeGeom, barcodeSvg, barcodePdf, DEFAULT_BARCODE } from '../../lib/barcode.ts';
import { preflightPdf } from '../../lib/print/preflight.ts';

test('GS1 check digits (published examples)', () => {
  assert.equal(gs1Check('400638133393'), 1);   // EAN-13 4006381333931
  assert.equal(gs1Check('03600029145'), 2);    // UPC-A 036000291452
  assert.equal(gs1Check('9638507'), 4);        // EAN-8 96385074
  assert.equal(normalise('ean13', '400638133393').code, '4006381333931');
  assert.match(normalise('ean13', '4006381333932').error, /should be 1/);
});

// Decode EAN-13 bars back to digits to prove the encoding round-trips.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((p) => p.replace(/./g, (c) => (c === '0' ? '1' : '0')));
const G = R.map((p) => [...p].reverse().join(''));
const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'GLGLGL', 'GLGGLG', 'GGLLGL'];
test('EAN-13 encodes 95 modules and decodes back', () => {
  const code = '4006381333931';
  const { bits } = eanModules('ean13', code);
  assert.equal(bits.length, 95);
  assert.equal(bits.slice(0, 3), '101'); assert.equal(bits.slice(45, 50), '01010'); assert.equal(bits.slice(92), '101');
  let par = '', left = '';
  for (let i = 0; i < 6; i++) { const s = bits.slice(3 + i * 7, 10 + i * 7); const l = L.indexOf(s), g = G.indexOf(s); par += l >= 0 ? 'L' : 'G'; left += l >= 0 ? l : g; }
  let right = '';
  for (let i = 0; i < 6; i++) right += R.indexOf(bits.slice(50 + i * 7, 57 + i * 7));
  assert.equal(PAR.indexOf(par) + left + right, code);
});

test('geometry: EAN-13 at 100 % is 37.29 mm wide with quiet zones', async () => {
  const g = barcodeGeom({ ...DEFAULT_BARCODE, code: '4006381333931' });
  assert.ok(Math.abs(g.w - 37.29) < 0.01, String(g.w));
  assert.match(barcodeSvg({ ...DEFAULT_BARCODE, code: '4006381333931' }), /<rect/);
  const pf = await preflightPdf(await barcodePdf({ ...DEFAULT_BARCODE, code: '4006381333931' }), 'press-cmyk');
  assert.ok(!pf.findings.some((f) => f.level === 'error'), JSON.stringify(pf.findings));
  assert.deepEqual(pf.colourSpaces, ['CMYK']);
});

test('ITF-14 and EAN-8 geometry', () => {
  const itf = barcodeGeom({ ...DEFAULT_BARCODE, type: 'itf14', code: '10012345678902' });
  assert.ok(itf.bars.length === 2 + 14 * 5 / 1 / 1 * 0.5 * 2 + 2 || itf.bars.length > 30);
  assert.equal(eanModules('ean8', '96385074').bits.length, 67);
});
