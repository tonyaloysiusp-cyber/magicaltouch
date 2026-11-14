import test from 'node:test';
import assert from 'node:assert/strict';
import { nest, findOverlaps, polyArea } from '../../lib/textile/nest.ts';

test('nesting never overlaps and stays inside the roll', () => {
  const items = [];
  for (let i = 0; i < 40; i++) items.push({ id: 'p' + i, w: 120 + ((i * 37) % 300), h: 150 + ((i * 53) % 420) });
  const r = nest(items, { rollW: 1600, gap: 10 });
  assert.equal(r.placed.length, 40);
  assert.deepEqual(findOverlaps(r.placed, 10 - 1e-3), []);
  assert.deepEqual(r.overlaps, []);
  for (const p of r.placed) { assert.ok(p.x >= 10 - 1e-6 && p.x + p.w <= 1590 + 1e-6, `inside roll ${p.id}`); assert.ok(p.y >= 10 - 1e-6); }
  assert.ok(r.utilisation > 0.6, `utilisation ${r.utilisation}`);
});

test('nesting beats rows of pieces and turns pieces to fit', () => {
  // 4 pieces of 700 × 300 on a 1000 mm roll: upright only one per row (4 rows, ~1250 mm); turned they fit 3 across.
  const items = Array.from({ length: 4 }, (_, i) => ({ id: 'a' + i, w: 700, h: 300 }));
  const r = nest(items, { rollW: 1000, gap: 10 });
  assert.ok(r.placed.some((p) => p.rot));
  assert.ok(r.length < 1100, `length ${r.length}`);
  const fixedR = nest(items.map((x) => ({ ...x, canRotate: false })), { rollW: 1000, gap: 10 });
  assert.ok(fixedR.length > r.length);
});

test('locked pieces keep their place; too-wide pieces are flagged, not overlapped', () => {
  const r = nest([{ id: 'L', w: 200, h: 200, fixed: { x: 400, y: 10 } }, { id: 'a', w: 300, h: 100 }, { id: 'W', w: 2000, h: 2000 }], { rollW: 1000, gap: 10 });
  const L = r.placed.find((p) => p.id === 'L');
  assert.deepEqual([L.x, L.y], [400, 10]);
  assert.deepEqual(r.tooWide, ['W']);
  assert.deepEqual(findOverlaps(r.placed), []);
});

test('polygon area', () => {
  assert.equal(polyArea([[0, 0], [10, 0], [10, 10], [0, 10]]), 100);
});
