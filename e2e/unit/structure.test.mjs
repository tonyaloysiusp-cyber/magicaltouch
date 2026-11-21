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

test('tray corner flaps are capped so they never overlap on the end wall', async () => {
  const { makeDieline } = await import('../../lib/packaging/dieline.ts');
  for (const [L, W, D] of [[200, 60, 50], [80, 40, 120], [300, 300, 20], [50, 20, 80]]) {
    const d = makeDieline({ ...DEFAULT_DIE, style: 'tray', L, W, D, t: 1.5 });
    const Wb = W + 3, Db = D;
    // corner flaps start at the base corner (x = D) and run left; their far edge must stay within half the end wall
    const xs = d.lines.filter((l) => l.kind === 'cut').flatMap((l) => (l.d.match(/-?\d*\.?\d+/g) || []).map(Number).filter((_, i) => i % 2 === 0));
    const minFlapX = Math.min(...xs.filter((x) => x > 0 && x < Db));
    assert.ok(Db - minFlapX <= Wb / 2, `${L}x${W}x${D}: flap ${Db - minFlapX} > ${Wb / 2}`);
  }
  const weak = checkStructure({ ...DEFAULT_DIE, style: 'tray', L: 200, W: 30, D: 80, t: 1.5 }, 'rigid');
  assert.equal(weak.checks.find((c) => c.id === 'corner').level, 'warn');
  assert.equal(weak.closes, true);
});

test('FEFCO 0203 flaps are the full width; tray and sleeve fits the tray', async () => {
  const { makeDieline } = await import('../../lib/packaging/dieline.ts');
  const rsc = makeDieline({ ...DEFAULT_DIE, style: 'rsc', L: 300, W: 200, D: 150, t: 3, glue: 30 });
  const fol = makeDieline({ ...DEFAULT_DIE, style: 'fol', L: 300, W: 200, D: 150, t: 3, glue: 30 });
  assert.ok(Math.abs((fol.h - rsc.h) - 2 * ((200 + 6) - ((200 + 6) / 2 + 3))) < 0.01);
  const mb = makeDieline({ ...DEFAULT_DIE, style: 'matchbox', L: 100, W: 60, D: 25, t: 1.5, glue: 14 });
  const top = mb.panels.find((p) => p.name === 'Sleeve top');
  assert.ok(Math.abs(top.w - (100 + 3 + 3 + 1)) < 0.01); // tray outside + 1 mm play
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
