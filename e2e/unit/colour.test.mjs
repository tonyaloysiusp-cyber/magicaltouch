// Unit tests for colour maths (lib/colour.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normHex, hexToRgb, rgbToHex, rgbToCmyk, harmony, deltaE, contrast, readableOn, moodOf, HARMONIES } from '../../lib/colour.ts';

test('hex parsing and round trip', () => {
  assert.equal(normHex('fff'), '#FFFFFF');
  assert.equal(normHex('#3b82c4'), '#3B82C4');
  assert.equal(normHex('nope'), null);
  assert.equal(rgbToHex(hexToRgb('#1E3A5F')), '#1E3A5F');
});
test('cmyk', () => {
  assert.deepEqual(rgbToCmyk([0, 0, 0]), [0, 0, 0, 100]);
  assert.deepEqual(rgbToCmyk([255, 0, 0]), [0, 100, 100, 0]);
});
test('harmonies give five valid colours', () => {
  for (const h of HARMONIES) {
    const out = harmony('#3B82C4', h.id);
    assert.equal(out.length, 5);
    out.forEach((c) => assert.match(c, /^#[0-9A-F]{6}$/));
  }
  // complementary of pure red contains a cyan-ish colour
  assert.ok(harmony('#FF0000', 'complementary').some((c) => deltaE(c, '#00FFFF') < 20));
});
test('distance and contrast', () => {
  assert.ok(deltaE('#FF0000', '#FE0101') < 2);
  assert.ok(deltaE('#FF0000', '#0000FF') > 100);
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.equal(readableOn('#FFFFFF'), '#000000');
  assert.equal(readableOn('#0B1220'), '#FFFFFF');
});
test('moods', () => {
  assert.ok(moodOf('#FF2FC8').includes('neon'));
  assert.ok(moodOf('#F7C6D0').includes('pastel'));
  assert.ok(moodOf('#1E3A5F').includes('cool'));
});
