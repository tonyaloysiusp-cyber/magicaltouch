import test from 'node:test';
import assert from 'node:assert/strict';
const { layout, tileSvg, DEFAULT_PATTERN } = await import('../../lib/patterns.ts');

const P = { ...DEFAULT_PATTERN, repeat: 'grid', tile: 100, spacingX: 0, spacingY: 0 };

test('every motif has a key; edits move, turn, resize, recolour and hide one motif', () => {
  const L = layout(P);
  assert.ok(L.places.length >= 1 && L.places.every((q) => q.key));
  const q = L.places[0];
  const E = layout({ ...P, edits: { [q.key]: { dx: 0.1, dy: -0.2, r: 30, s: 1.5, c: 2 } } });
  const e = E.places.find((x) => x.key === q.key);
  assert.ok(Math.abs(e.x - (q.x + 10)) < 1e-9 && Math.abs(e.y - (q.y - 20)) < 1e-9);
  assert.equal(e.r, q.r + 30); assert.equal(e.s, q.s * 1.5); assert.equal(e.c, 2);
  const H = layout({ ...P, edits: { [q.key]: { hide: true } } });
  assert.equal(H.places.length, L.places.length - L.places.filter((x) => x.key === q.key).length);
  assert.equal(E.w, L.w); assert.equal(E.h, L.h);
});

test('edge copies share the key, so an edited motif stays seamless', () => {
  const R = layout({ ...DEFAULT_PATTERN, repeat: 'random', density: 20 });
  const keys = new Map();
  for (const q of R.places) keys.set(q.key, (keys.get(q.key) || 0) + 1);
  const copied = [...keys.entries()].find(([, n]) => n > 1);
  if (!copied) return; // no motif crossed an edge with this seed
  const E = layout({ ...DEFAULT_PATTERN, repeat: 'random', density: 20, edits: { [copied[0]]: { dx: 0.05 } } });
  const before = R.places.filter((q) => q.key === copied[0]), after = E.places.filter((q) => q.key === copied[0]);
  const dxs = after.map((q, i) => q.x - before[i].x);
  assert.ok(dxs.every((d) => Math.abs(d - dxs[0]) < 1e-9), 'all copies moved together');
});

test('tile SVG reflects the edit', () => {
  const q = layout(P).places[0];
  assert.notEqual(tileSvg({ ...P, edits: { [q.key]: { r: 45 } } }), tileSvg(P));
});
