import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contourFromRgba, dilate } from '../../lib/sticker.ts';

test('cut contour: one outer path around the art grown by the offset, holes not cut', () => {
  const w = 60, h = 40, px = new Uint8ClampedArray(w * h * 4);
  // a ring (hole in the middle) and a separate dot joined by the offset
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x - 20, y - 20);
    if ((r < 14 && r > 6) || Math.hypot(x - 40, y - 20) < 4) px[(y * w + x) * 4 + 3] = 255;
  }
  const c = contourFromRgba(px, w, h, 4);
  assert.equal(c.loops, 1, 'ring + dot become one sticker, the hole is not a cut');
  assert.match(c.d, /^M/);
  const m = new Uint8Array(25); m[12] = 1;
  assert.equal(dilate(m, 5, 5, 1).reduce((a, b) => a + b, 0), 5);
});
