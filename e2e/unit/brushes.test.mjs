import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStroke } from '../../lib/photo/brushes.ts';

function img(w, h, f) { const data = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4); return { width: w, height: h, data }; }
const at = (im, x, y) => Array.from(im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4));

test('enlarge grows a dark eye, shrink makes it smaller', () => {
  const eye = (x, y) => (Math.hypot(x - 50, y - 50) < 10 ? [0, 0, 0, 255] : [255, 255, 255, 255]);
  const big = img(100, 100, eye), small = img(100, 100, eye);
  for (let i = 0; i < 6; i++) { createStroke(big, 'bloat', { radius: 25, strength: 1, hardness: 0.3 }).to(50, 50); createStroke(small, 'pinch', { radius: 25, strength: 1, hardness: 0.3 }).to(50, 50); }
  assert.ok(at(big, 61, 50)[0] < 128, 'pixel just outside the old edge is now dark');
  assert.ok(at(small, 58, 50)[0] > 128, 'pixel just inside the old edge is now light');
});

test('hair recolour changes hue but keeps light and shade; whiten lifts yellow', () => {
  const hair = img(40, 40, (x) => (x < 20 ? [60, 40, 20, 255] : [120, 90, 50, 255]));
  const s = createStroke(hair, 'recolour', { radius: 30, strength: 1, hardness: 1, color: [180, 30, 40] });
  for (let i = 0; i < 8; i++) s.to(20 + (i % 2), 20);
  const [r1, g1, b1] = at(hair, 10, 20), [r2] = at(hair, 30, 20);
  assert.ok(r1 > g1 && r1 > b1, 'now reddish');
  assert.ok(r2 > r1, 'lighter strands stay lighter');
  const teeth = img(20, 20, () => [230, 210, 150, 255]);
  createStroke(teeth, 'whiten', { radius: 15, strength: 1, hardness: 1 }).to(10, 10);
  assert.ok(at(teeth, 10, 10)[2] > 150, 'less yellow');
});
