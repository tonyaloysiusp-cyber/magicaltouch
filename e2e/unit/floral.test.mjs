import test from 'node:test';
import assert from 'node:assert/strict';
const F = await import('../../lib/textile/floral.ts');
const { flatten, normalize, bbox } = await import('../../lib/textile/vector.ts');

const ok = (d) => { assert.match(d, /^M/); assert.ok(!/NaN|undefined/.test(d)); assert.ok(flatten(normalize(d), 0.5).length > 0); };

test('flower: petal count, layers, centre, leaves and stem are separate editable parts', () => {
  const parts = F.flower({ ...F.DEFAULT_FLOWER, petals: 7, layers: 3, leaves: 2 });
  assert.deepEqual(parts.map((p) => p.role), ['stem', 'leaf', 'petal', 'petal2', 'petal', 'centre']);
  parts.forEach((p) => ok(p.d));
  const outer = parts.find((p) => p.name === 'Petals 1');
  assert.equal((outer.d.match(/M/g) || []).length, 7, 'one subpath per petal');
  const b = bbox(normalize(outer.d));
  assert.ok(Math.abs(b.h - 2 * F.DEFAULT_FLOWER.length) < F.DEFAULT_FLOWER.length * 0.3, 'petal length sets the size');
});

test('every petal and leaf shape, centre style and ornament gives clean paths', () => {
  for (const shape of ['round', 'pointed', 'heart', 'teardrop', 'spatula', 'lotus']) ok(F.petal(shape, 30, 15));
  for (const sh of ['oval', 'pointed', 'serrated', 'fern']) ok(F.leaf(sh, 30, 12));
  for (const c of ['disc', 'dots', 'star', 'spiral']) F.flower({ ...F.DEFAULT_FLOWER, centre: c }).forEach((p) => ok(p.d));
  [F.paisley(80), F.mandala(120, 3, 12), F.damask(100), F.border(300, 40, 'floral'), F.border(300, 40, 'paisley'), F.border(300, 40, 'leaf'), F.border(300, 40, 'geometric'), F.neckline(180, 120, 'v', 25), F.vine(300, 25, 6, 3)].flat().forEach((p) => ok(p.d));
});

test('border length and neckline size follow the settings', () => {
  const b = bbox(normalize(F.border(400, 40, 'floral')[0].d));
  assert.ok(Math.abs(b.w - 400) < 0.5 && Math.abs(b.h - 40) < 0.5);
  const n = bbox(normalize(F.neckline(200, 120, 'u', 20).map((p) => p.d).join('')));
  assert.ok(n.w > 190 && n.w < 230 && n.h > 110 && n.h < 150, JSON.stringify(n));
});
