// Pattern Studio motif library: enough original vector shapes, valid paths, unique ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_MOTIFS, MOTIF_CATEGORIES } from '../../lib/patternMotifs.ts';

test('at least 100 vector motifs across every category', () => {
  assert.ok(PATTERN_MOTIFS.length >= 100, `only ${PATTERN_MOTIFS.length}`);
  for (const c of MOTIF_CATEGORIES) assert.ok(PATTERN_MOTIFS.some((m) => m.cat === c), c);
});

test('ids are unique and paths are clean SVG path data inside the box', () => {
  const ids = new Set();
  for (const m of PATTERN_MOTIFS) {
    assert.ok(!ids.has(m.id), `duplicate ${m.id}`); ids.add(m.id);
    assert.match(m.d, /^M[-\d. MLCQAHVSZ]+$/, m.id);
    assert.ok(!/NaN|undefined/.test(m.d), m.id);
    const nums = (m.d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    assert.ok(nums.every((n) => Math.abs(n) <= 90), `${m.id} leaves the box`);
  }
});
