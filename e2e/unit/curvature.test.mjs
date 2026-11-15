import test from 'node:test';
import assert from 'node:assert/strict';
const { curvatureHandles } = await import('../../lib/editor/curvature.ts');

test('curvature: the curve passes through every point with smooth (collinear) handles', () => {
  const pts = [{ x: 0, y: 0 }, { x: 100, y: -60 }, { x: 200, y: 0 }, { x: 300, y: 50 }];
  const a = curvatureHandles(pts, false);
  assert.equal(a[0].handleIn, undefined);
  assert.equal(a[3].handleOut, undefined);
  for (const p of a.slice(1, 3)) {
    const cross = (p.handleIn.x - p.x) * (p.handleOut.y - p.y) - (p.handleIn.y - p.y) * (p.handleOut.x - p.x);
    assert.ok(Math.abs(cross) < 1e-9, 'collinear');
    assert.ok(Math.hypot(p.handleOut.x - p.x, p.handleOut.y - p.y) > 10, 'real handles');
  }
  a.forEach((p, i) => { assert.equal(p.x, pts[i].x); assert.equal(p.y, pts[i].y); });
});

test('corner points stay sharp; closed curves wrap round', () => {
  const a = curvatureHandles([{ x: 0, y: 0 }, { x: 50, y: 50, corner: true }, { x: 100, y: 0 }], false);
  assert.equal(a[1].handleIn, undefined); assert.equal(a[1].handleOut, undefined);
  const c = curvatureHandles([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }], true);
  assert.ok(c.every((p) => p.handleIn && p.handleOut));
});
