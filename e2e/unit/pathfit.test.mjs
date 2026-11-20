import test from 'node:test';
import assert from 'node:assert/strict';
import { fitPath, pathBox } from '../../lib/pathFit.ts';

test('fitPath keeps numbers separate in compact path data (minus as separator)', () => {
  // opentype.js writes compact data like this; fitting must not glue numbers together.
  const d = 'M10.5-20.3L30-40Q50-10 70 0Z';
  const f = fitPath(d, pathBox(d));
  const nums = (f.match(/-?\d*\.?\d+/g) || []).map(Number);
  assert.equal(nums.length, 8, f);
  const b = pathBox(f);
  assert.ok(Math.abs(Math.max(b.w, b.h) - 100) < 0.5, JSON.stringify(b));
  assert.ok(Math.abs(b.x + b.w / 2) < 0.5 && Math.abs(b.y + b.h / 2) < 0.5, 'centred');
});
