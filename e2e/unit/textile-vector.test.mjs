import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, segsToD, nodes, moveNode, insertNode, deleteNode, setNodeType, penPath, polygonPath, starPath, centred, bbox, flatten, regionOf, booleanOp, polysToD } from '../../lib/textile/vector.ts';

let hasClipper = true;
try { await import('polygon-clipping'); } catch { hasClipper = false; }

test('normalise, nodes, move, insert, delete', () => {
  const s = normalize('M0 0 L100 0 L100 100 Z');
  assert.equal(nodes(s).filter((n) => n.kind === 'anchor').length, 3);
  const m = moveNode(s, { seg: 1, kind: 'anchor' }, 120, 10);
  assert.match(segsToD(m), /L120 10/);
  const ins = insertNode(s, 1);
  assert.match(segsToD(ins), /L50 0L100 0/);
  const del = deleteNode(ins, 1);
  assert.equal(segsToD(del), segsToD(s));
  const smooth = setNodeType(s, 1, 'smooth');
  assert.ok(smooth.some((q) => q[0] === 'C'));
});

test('curve split keeps the shape', () => {
  const s = normalize('M0 0C0 100 100 100 100 0');
  const two = insertNode(s, 1);
  assert.equal(two.length, 3);
  assert.deepEqual(two[1].slice(5).map((v) => Math.round(v)), [50, 75]);
});

test('pen, shapes, centring, bbox', () => {
  assert.equal(penPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], true), 'M0 0L10 0L10 10L0 0Z');
  assert.match(penPath([{ x: 0, y: 0, hx: 5, hy: 5 }, { x: 20, y: 0 }], false), /^M0 0C5 5 20 0 20 0$/);
  assert.equal(polygonPath(6).split('L').length, 6);
  assert.equal(starPath(5).split('L').length, 10);
  const c = centred('M10 10L30 10L30 50Z');
  assert.equal(c.cx, 20); assert.equal(c.cy, 30);
  const b = bbox(normalize(c.d));
  assert.ok(Math.abs(b.x + 10) < 1e-6 && Math.abs(b.w - 20) < 1e-6);
  assert.ok(flatten(normalize('M0 0C0 100 100 100 100 0'))[0].pts.length > 10);
});

test('booleans: union, subtract, intersect; letter holes kept', { skip: !hasClipper && 'polygon-clipping not installed here (runs in CI)' }, async () => {
  const a = await regionOf(normalize('M0 0H100V100H0Z'));
  const b = await regionOf(normalize('M50 50H150V150H50Z'));
  const area = (d) => { const s = normalize(d); let t = 0; for (const r of flatten(s)) { const p = r.pts; for (let i = 0, j = p.length - 1; i < p.length; j = i++) t += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); } return Math.abs(t / 2); };
  assert.ok(Math.abs(area(polysToD(await booleanOp('union', [a, b]))) - 17500) < 1);
  assert.ok(Math.abs(area(polysToD(await booleanOp('subtract', [a, b]))) - 7500) < 1);
  assert.ok(Math.abs(area(polysToD(await booleanOp('intersect', [a, b]))) - 2500) < 1);
  // An "O": outer clockwise, inner counter-clockwise (non-zero) → a ring.
  const o = await regionOf(normalize('M0 0H100V100H0Z M25 25V75H75V25Z'), 'nonzero');
  assert.equal(o.length, 1); assert.equal(o[0].length, 2);
});
