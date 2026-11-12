// New creative tools: passport photo layout, rangoli maker, print sizes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHOTO_SPECS, SHEETS, sheetLayout, mmToPx, autoFit } from '../../lib/passportPhoto.ts';
import { surprise, mandalaSvg } from '../../lib/mandala.ts';

test('passport photo sizes and print sheets', () => {
  const p = PHOTO_SPECS.find((s) => s.id === 'in-35x45');
  assert.equal(mmToPx(35), 413); assert.equal(mmToPx(45), 531);
  const four = sheetLayout(p, SHEETS.find((s) => s.id === '4x6'));
  assert.equal(four.spots.length, 6); // 2 × 3 on 4×6 in
  const a4 = sheetLayout(p, SHEETS.find((s) => s.id === 'a4'));
  assert.ok(a4.spots.length >= 25, String(a4.spots.length));
  for (const s of a4.spots) { assert.ok(s.x >= 0 && s.x + 35 <= 210); assert.ok(s.y >= 0 && s.y + 45 <= 297); }
  const f = autoFit({ x: 0.2, y: 0.1, w: 0.6, h: 0.9 }, { w: 1000, h: 1200 }, p, 413, 531);
  assert.ok(f.scale > 0 && Number.isFinite(f.dx) && Number.isFinite(f.dy));
});

test('surprise rangoli is a valid symmetric vector', () => {
  const m = surprise(42);
  assert.ok(m.layers.length >= 5);
  const svg = mandalaSvg(m);
  assert.match(svg, /^<svg[^>]+viewBox="0 0 1000 1000"/);
  assert.ok(!/NaN|undefined/.test(svg));
  assert.deepEqual(surprise(42), m, 'same seed, same design');
});
