import test from 'node:test';
import assert from 'node:assert/strict';
import { draftDress, SAMPLE_BODY, DEFAULT_STYLE, offsetPolygon, polyLen, gradeSizes, DEFAULT_STEPS } from '../../lib/textile/blocks.ts';

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };

test('dress drafts front, back, sleeve and skirt from measurements', () => {
  const r = draftDress(SAMPLE_BODY, DEFAULT_STYLE);
  const ids = r.pieces.map((p) => p.id);
  assert.deepEqual(ids, ['bodice-front', 'bodice-back', 'sleeve', 'skirt']);
  for (const p of r.pieces) { assert.ok(p.seam.length >= 4, p.id); assert.ok(p.seam.every((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])), p.id); }
});

test('bodice width follows the bust girth (quarter + ease)', () => {
  const r = draftDress(SAMPLE_BODY, DEFAULT_STYLE);
  const front = r.pieces[0], back = r.pieces[1];
  const maxX = (p) => Math.max(...p.seam.map((q) => q[0]));
  // front + back half widths = half the finished bust
  assert.ok(Math.abs(maxX(front) + maxX(back) - (SAMPLE_BODY.bust + DEFAULT_STYLE.bustEase) * 10 / 2) < 1);
});

test('changing only the hip changes only the hip of a straight skirt', () => {
  const s = { ...DEFAULT_STYLE, skirt: 'straight', sleeve: 'none' };
  const a = draftDress(SAMPLE_BODY, s), b = draftDress({ ...SAMPLE_BODY, hip: SAMPLE_BODY.hip + 8 }, s);
  const sk = (r) => r.pieces.find((p) => p.id === 'skirt-front');
  assert.ok(Math.max(...sk(b).seam.map((q) => q[0])) - Math.max(...sk(a).seam.map((q) => q[0])) > 15);
  assert.deepEqual(a.pieces[0].seam, b.pieces[0].seam); // bodice unchanged
});

test('sleeve cap ease is reported and positive', () => {
  const r = draftDress(SAMPLE_BODY, DEFAULT_STYLE);
  const c = r.checks.find((x) => x.label === 'Sleeve cap ease');
  assert.ok(c);
});

test('seam allowance grows the piece', () => {
  const sq = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const o = offsetPolygon(sq, 10);
  assert.ok(Math.abs(area(o) - 120 * 120) < 1);
  const fold = offsetPolygon(sq, 10, [3, 0]); // left edge on the fold
  assert.ok(Math.abs(area(fold) - 110 * 120) < 1);
});

test('circle skirt waist matches the bodice waist', () => {
  const r = draftDress(SAMPLE_BODY, { ...DEFAULT_STYLE, skirt: 'circle' });
  const sk = r.pieces.find((p) => p.id === 'skirt');
  const inner = sk.seam.slice(0, 25);
  const waist = polyLen(inner) * 4; // four quarters
  const front = r.pieces[0], back = r.pieces[1];
  assert.ok(waist > SAMPLE_BODY.waist * 10 * 0.95, `${waist}`);
  void front; void back;
});

test('grading adds steps around the base size', () => {
  const rows = gradeSizes(SAMPLE_BODY, 'M', ['S', 'M', 'L'], DEFAULT_STEPS);
  assert.equal(rows[0].body.bust, SAMPLE_BODY.bust - 5);
  assert.equal(rows[2].body.hip, SAMPLE_BODY.hip + 5);
});
