import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFactorySvg, pieceIdFor } from '../../lib/textile/factory.ts';
import { kitProduct, DEFAULT_KIT, fabricLayout } from '../../lib/teamKit.ts';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200cm" height="100cm" viewBox="0 0 2000 1000">
  <path id="Front_body" d="M100 100H680V900H100Z"/>
  <path id="Back" d="M800 100H1380V920H800Z"/>
  <polygon inkscape:label="Sleeve L" points="1500,100 1900,100 1850,400 1550,400"/>
  <polygon id="sleeve_R" points="1500,500 1900,500 1850,800 1550,800"/>
  <rect id="notch" x="10" y="10" width="4" height="4"/>
  <path id="grain" d="M0 0L50 50"/>
</svg>`;

test('factory SVG: closed outlines become real-size pieces named by their ids', () => {
  const r = parseFactorySvg(svg);
  assert.deepEqual(r.pieces.map((p) => p.id), ['front', 'back', 'sleeve-l', 'sleeve-r']);
  const f = r.pieces[0];
  assert.deepEqual([f.w, f.h], [580, 800]);
  assert.match(f.d, /^M0 0/);
  assert.equal(r.warnings.length, 0);
  assert.throws(() => parseFactorySvg('<svg viewBox="0 0 10 10"><path d="M0 0L5 5"/></svg>'), /No closed piece/);
  assert.equal(pieceIdFor('Collar rib', new Set()), 'collar');
});

test('factory pieces replace the template; long sleeves', () => {
  const r = parseFactorySvg(svg);
  const kit = { ...DEFAULT_KIT, factoryPieces: r.pieces, factoryName: 'Acme' };
  const p = kitProduct(kit);
  assert.match(p.label, /Acme/);
  assert.equal(p.pieces.length, 4);
  const L = fabricLayout(kit, [{ name: 'A', number: '1', size: 'M' }], { rollW: 1600, bleed: 10 });
  assert.equal(L.boxes.length, 4);
  assert.deepEqual(L.overlaps, []);
  const long = kitProduct({ ...DEFAULT_KIT, sleeves: 'long' });
  assert.equal(long.pieces.find((x) => x.id === 'sleeve-l').h, 600);
  assert.ok(long.pieces.find((x) => x.id === 'sleeve-r').mirror);
  // Without front and back the import is not used.
  assert.doesNotMatch(kitProduct({ ...DEFAULT_KIT, factoryPieces: r.pieces.slice(2) }).label, /imported/);
});

test('garment measurements come from the pieces and follow the grade', async () => {
  const { measureGarment, fmtLen } = await import('../../lib/textile/measure.ts');
  const jersey = kitProduct(DEFAULT_KIT).pieces;
  const m = Object.fromEntries(measureGarment(jersey).map((x) => [x.key, x.mm]));
  assert.ok(Math.abs(m.chest - 560) < 1 && m.length === 740 && Math.abs(m.neckW - 179.4) < 1 && Math.abs(m.neckF - 56) < 1 && m.sleeveL === 230);
  const xl = Object.fromEntries(measureGarment(jersey, 1.1, 1.05).map((x) => [x.key, x.mm]));
  assert.ok(Math.abs(xl.chest - 616) < 1.5 && Math.abs(xl.length - 777) < 1);
  assert.equal(fmtLen(254, 'in'), '10.00″');
  assert.equal(fmtLen(254, 'cm'), '25.4 cm');
});
