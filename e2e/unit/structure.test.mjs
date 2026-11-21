import test from 'node:test';
import assert from 'node:assert/strict';
import { checkStructure } from '../../lib/packaging/validate.ts';
import { caliperFor, creaseSetup, gradeById } from '../../lib/packaging/board.ts';
import { DEFAULT_DIE } from '../../lib/packaging/dieline.ts';
import { foldability } from '../../lib/fold.ts';

test('calipers interpolate from the mill tables', () => {
  assert.equal(caliperFor(gradeById('fbb'), 250), 0.45);
  assert.equal(caliperFor(gradeById('fbb'), 242.5), 0.438);
  assert.equal(caliperFor(gradeById('sbs'), 400), 0.45);
  assert.equal(caliperFor(gradeById('sbs'), 900), 0.45); // clamped
});

test('crease set-up follows the published formula and table', () => {
  const s = creaseSetup('sbs', 0.45);
  assert.equal(s.ruleWidth, 0.71);
  assert.equal(s.channelWidth, 1.39); // Fedrigoni 400 g/m² table: 1.4
  assert.equal(s.ruleHeight, 23.35);  // table: 23.35
  assert.equal(s.confidence, 'published');
  const c = creaseSetup('corrugated', 3, { compressed: 1.2 });
  assert.equal(c.channelWidth, +(3 * 2 + c.ruleWidth).toFixed(2));
  assert.equal(c.channelDepth, 1.2);
});

test('default carton closes', () => {
  const r = checkStructure(DEFAULT_DIE, 'fbb');
  assert.equal(r.closes, true);
});

test('tuck deeper than the box cannot close', () => {
  const r = checkStructure({ ...DEFAULT_DIE, D: 20, tuck: 25 }, 'fbb');
  assert.equal(r.closes, false);
  assert.ok(r.checks.find((c) => c.id === 'tuck' && c.level === 'error' && c.fix));
});

test('tray corner flaps overlapping the end wall is an error', () => {
  const bad = checkStructure({ ...DEFAULT_DIE, style: 'tray', L: 200, W: 60, D: 50, t: 1.5 }, 'rigid');
  assert.equal(bad.checks.find((c) => c.id === 'corner').level, 'error');
  const ok = checkStructure({ ...DEFAULT_DIE, style: 'tray', L: 200, W: 120, D: 50, t: 1.5 }, 'rigid');
  assert.equal(ok.checks.find((c) => c.id === 'corner').level, 'ok');
});

test('glue flap wider than its panel is an error', () => {
  const r = checkStructure({ ...DEFAULT_DIE, glue: 200 }, 'fbb');
  assert.equal(r.checks.find((c) => c.id === 'glue').level, 'error');
});

test('paper fold check', () => {
  assert.equal(foldability({ gsm: 115, caliper: 0.1, coated: true, grain: 'parallel', type: 'tri', layers: 3 }).method, 'fold');
  const heavy = foldability({ gsm: 300, caliper: 0.33, coated: true, grain: 'across', type: 'cross', layers: 4 });
  assert.equal(heavy.method, 'crease');
  assert.equal(heavy.level, 'error');
  assert.equal(heavy.crease.channelWidth, 1.21);
});
