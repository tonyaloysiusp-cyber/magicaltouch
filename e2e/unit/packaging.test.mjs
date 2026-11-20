import test from 'node:test';
import assert from 'node:assert/strict';
import { BOX_STYLES, DEFAULT_DIE, makeDieline, ruleLength, dielineSvg } from '../../lib/packaging/dieline.ts';
import { dielinePdf } from '../../lib/packaging/diePdf.ts';

test('every box style makes a closed net with cut and crease lines', () => {
  for (const s of BOX_STYLES) {
    const d = makeDieline({ ...DEFAULT_DIE, style: s.id });
    assert.ok(d.w > 0 && d.h > 0, s.id);
    assert.ok(ruleLength(d, 'cut') > 2 * (d.w + d.h) * 0.9, `${s.id} knife length`);
    assert.ok(ruleLength(d, 'crease') > 0, `${s.id} creases`);
    // every coordinate inside the blank
    for (const l of d.lines) for (const v of (l.d.match(/-?\d*\.?\d+/g) || []).map(Number)) assert.ok(v >= -0.01 && v <= Math.max(d.w, d.h) + 0.01, `${s.id} ${v}`);
    assert.match(dielineSvg(d), /id="CUT"/);
  }
});

test('reverse tuck end: panel widths add board thickness, blank width = glue + 2(L+W) + 4t', () => {
  const d = makeDieline({ ...DEFAULT_DIE, style: 'rte', L: 80, W: 40, D: 120, t: 0.5, glue: 14 });
  assert.equal(Math.round(d.w * 10) / 10, 14 + 2 * (80.5 + 40.5));
  const front = d.panels.find((p) => p.name === 'Front');
  assert.equal(front.w, 80.5); assert.equal(front.h, 121);
});

test('dieline PDF: spot colours CutContour + Crease, overprint, trim box', async () => {
  const d = makeDieline({ ...DEFAULT_DIE, style: 'ste' });
  const bytes = await dielinePdf(d, { template: true });
  const s = Buffer.from(bytes).toString('latin1');
  assert.match(s, /\/CutContour/); assert.match(s, /\/Crease/);
  assert.match(s, /\/OP true/); assert.match(s, /\/TrimBox/);
});
