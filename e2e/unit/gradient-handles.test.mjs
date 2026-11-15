import test from 'node:test';
import assert from 'node:assert/strict';
const { toScreen, fromScreen, snapAngle, mul, inv } = await import('../../lib/editor/gradientHandles.ts');

const rot = (deg) => { const a = (deg * Math.PI) / 180; return [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]; };

test('a gradient point maps to the screen and back, through rotation, scale and zoom', () => {
  const obj = { width: 300, height: 120, matrix: mul([1, 0, 0, 1, 400, 250], mul(rot(30), [1.5, 0, 0, 0.8, 0, 0])) };
  const vpt = [0.5, 0, 0, 0.5, 40, 20];
  for (const [fx, fy] of [[0, 0], [1, 0.5], [0.25, 0.9]]) {
    const s = toScreen(obj, vpt, fx, fy);
    const back = fromScreen(obj, vpt, s);
    assert.ok(Math.abs(back.x - fx) < 1e-9 && Math.abs(back.y - fy) < 1e-9);
  }
  // Centre of the box is the object's position on screen.
  const c = toScreen(obj, vpt, 0.5, 0.5);
  assert.ok(Math.abs(c.x - (400 * 0.5 + 40)) < 1e-9 && Math.abs(c.y - (250 * 0.5 + 20)) < 1e-9);
});

test('inverse matrix', () => {
  const m = [2, 0.3, -0.4, 1.2, 10, -5], i = mul(m, inv(m));
  [1, 0, 0, 1, 0, 0].forEach((v, k) => assert.ok(Math.abs(i[k] - v) < 1e-9));
});

test('shift snaps to 15° steps and keeps the length', () => {
  const p = snapAngle({ x: 0, y: 0 }, { x: 100, y: 8 });
  assert.ok(Math.abs(p.y) < 1e-9 && Math.abs(p.x - Math.hypot(100, 8)) < 1e-9);
  const q = snapAngle({ x: 0, y: 0 }, { x: 50, y: 52 });
  assert.ok(Math.abs(q.x - q.y) < 1e-9);
});
