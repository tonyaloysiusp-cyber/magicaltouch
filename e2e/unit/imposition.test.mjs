import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nUpPlan, bookletOrder, backSlots, cropMarks } from '../../lib/imposition.ts';

test('business cards on A4: 10-up with 3 mm bleed, centred', () => {
  const p = nUpPlan({ sheetW: 210, sheetH: 297, itemW: 85, itemH: 55, bleed: 3, gap: 0, margin: 8 });
  assert.equal(p.cols * p.rows, p.slots.length);
  assert.ok(p.slots.length >= 8, `got ${p.slots.length}`);
  for (const s of p.slots) { assert.ok(s.x - 3 >= 8 - 1e-6 && s.x + s.w + 3 <= 202 + 1e-6); assert.ok(s.y - 3 >= 8 - 1e-6 && s.y + s.h + 3 <= 289 + 1e-6); }
  const b = backSlots(p, 210);
  assert.equal(b[0].x, 210 - p.slots[0].x - p.slots[0].w);
  assert.equal(cropMarks(p.slots.slice(0, 1), 3).length, 8);
});

test('passport photos 35×45 on A4 and rotation when it fits more', () => {
  const p = nUpPlan({ sheetW: 210, sheetH: 297, itemW: 35, itemH: 45, bleed: 0, gap: 2, margin: 10 });
  assert.equal(p.slots.length, 28); // turned: 4 × 7 beats 5 × 5
  assert.ok(p.rotated);
  const dl = nUpPlan({ sheetW: 297, sheetH: 210, itemW: 99, itemH: 210, bleed: 0, gap: 0, margin: 0 });
  assert.equal(dl.slots.length, 3);
});

test('saddle-stitch booklet order', () => {
  const b = bookletOrder(8);
  assert.deepEqual(b.sheets, [{ front: [7, 0], back: [1, 6] }, { front: [5, 2], back: [3, 4] }]);
  const c = bookletOrder(6);
  assert.equal(c.total, 8);
  assert.deepEqual(c.sheets[0], { front: [-1, 0], back: [1, -1] });
});
