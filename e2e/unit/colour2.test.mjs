// Colour Explorer additions: collections, contrast grades, gradients, palette files, wheel maths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTIONS, PALETTES, contrastGrades, gradientCss, gradientSvg, paletteAse, paletteCss, paletteGpl, paletteJson, wheelToHs, hsToWheel, normHex } from '../../lib/colour.ts';

test('every collection has palettes with valid colours', () => {
  for (const c of COLLECTIONS) {
    const list = PALETTES.filter((p) => p.c === c.id);
    assert.ok(list.length >= 2, c.id);
    for (const p of list) for (const x of p.colors) assert.ok(normHex(x), `${p.name} ${x}`);
  }
});

test('contrast grades follow WCAG thresholds', () => {
  const bw = contrastGrades('#000000', '#FFFFFF');
  assert.ok(Math.abs(bw.ratio - 21) < 0.01 && bw.aaaNormal);
  const mid = contrastGrades('#767676', '#FFFFFF'); // ≈4.54
  assert.ok(mid.aaNormal && !mid.aaaNormal);
  const low = contrastGrades('#999999', '#FFFFFF'); // ≈2.85
  assert.ok(!low.aaLarge);
});

test('gradients as CSS and SVG', () => {
  const s = [{ color: '#FF0000', at: 100 }, { color: '#0000FF', at: 0 }];
  assert.equal(gradientCss(s, 90), 'linear-gradient(90deg, #0000FF 0%, #FF0000 100%)');
  const svg = gradientSvg(s, 90, 100, 50);
  assert.match(svg, /x1="0\.0000" y1="0\.5000" x2="1\.0000" y2="0\.5000"/);
  assert.match(gradientCss(s, 0, 'radial'), /^radial-gradient\(circle/);
});

test('palette files', () => {
  const cols = ['#FF0000', '#00FF00'];
  assert.match(paletteCss(cols, 'My Brand'), /--my-brand-1: #FF0000;/);
  assert.equal(JSON.parse(paletteJson(cols)).colors[1].cmyk.join(','), '100,0,100,0');
  assert.match(paletteGpl(cols), /^GIMP Palette\n/);
  const ase = paletteAse(cols, 'P');
  assert.equal(String.fromCharCode(...ase.slice(0, 4)), 'ASEF');
  const dv = new DataView(ase.buffer);
  assert.equal(dv.getUint32(8), 4); // group start + 2 colours + group end
});

test('colour wheel maths round-trips', () => {
  for (const [h, s] of [[0, 100], [90, 50], [200, 80], [300, 20]]) {
    const p = hsToWheel(h, s); const b = wheelToHs(p.x, p.y);
    assert.ok(Math.abs(b.h - h) < 1e-6 && Math.abs(b.s - s) < 1e-6, `${h},${s}`);
  }
});
