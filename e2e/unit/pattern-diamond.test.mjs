import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PATTERN, layout, tileSvg, REPEATS } from '../../lib/patterns.ts';

test('diamond repeat: motifs on a diamond lattice turned 45°, seamless tile', () => {
  assert.ok(REPEATS.some((r) => r.id === 'diamond'));
  const L = layout({ ...DEFAULT_PATTERN, repeat: 'diamond' });
  assert.equal(L.places.length, 5);
  assert.ok(L.places.every((q) => Math.round(q.r) % 45 === 0 && Math.round(q.r) % 90 !== 0));
  const corners = L.places.filter((q) => (q.x === 0 || q.x === L.w) && (q.y === 0 || q.y === L.h));
  assert.equal(corners.length, 4, 'corner motifs meet the neighbouring tiles');
  assert.match(tileSvg({ ...DEFAULT_PATTERN, repeat: 'diamond' }), /<svg/);
});
