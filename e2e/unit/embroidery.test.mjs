import test from 'node:test';
import assert from 'node:assert/strict';
const E = await import('../../lib/embroidery/stitch.ts');

const square = 'M0 0H20V20H0Z';
const obj = (o) => ({ id: 'a', name: 'A', d: square, type: 'fill', colour: '#AA0000', ...o });

test('fill covers the shape with rows at the set spacing and no stitch over the limit', () => {
  const st = E.stitchDesign([obj({ angle: 0, underlay: false })]);
  const s = st.filter((x) => x.cmd === 'stitch');
  const ys = new Set(s.map((p) => p.y.toFixed(2)));
  assert.ok(ys.size >= 48 && ys.size <= 51, `${ys.size} rows for 20 mm at 0.4 mm`);
  assert.ok(s.every((p) => p.x >= -0.01 && p.x <= 20.01 && p.y >= 0 && p.y <= 20), 'inside the shape');
  for (let i = 1; i < st.length; i++) if (st[i].cmd === 'stitch') assert.ok(Math.hypot(st[i].x - st[i - 1].x, st[i].y - st[i - 1].y) <= 7.0001);
});

test('a hole stays empty', () => {
  const st = E.stitchDesign([obj({ d: square + 'M6 6H14V14H6Z', angle: 0, underlay: false })]);
  const inside = st.filter((p) => p.cmd === 'stitch' && p.x > 7 && p.x < 13 && p.y > 7 && p.y < 13);
  assert.equal(inside.length, 0);
});

test('satin zig-zags across the line at the set width; running follows it', () => {
  const sat = E.satinStitches([[0, 0], [30, 0]], 4, 0.5, false);
  assert.ok(sat.length >= 59);
  assert.ok(sat.every((p) => Math.abs(Math.abs(p[1]) - 2) < 1e-9));
  const run = E.runningStitches([[0, 0], [10, 0]], 2.5, false);
  assert.deepEqual(run.map((p) => p[0]), [0, 2.5, 5, 7.5, 10]);
  assert.equal(E.runningStitches([[0, 0], [10, 0]], 2.5, false, true).length, 1 + 4 * 3);
});

test('colour changes and trims between objects; summary counts', () => {
  const objs = [obj({ id: 'a' }), obj({ id: 'b', d: 'M40 0H60V20H40Z', colour: '#0000AA', thread: 'Navy 1234' }), obj({ id: 'c', d: 'M80 0H90V10H80Z', colour: '#0000AA' })];
  const st = E.stitchDesign(objs);
  assert.equal(st.filter((s) => s.cmd === 'color').length, 1);
  assert.ok(st.filter((s) => s.cmd === 'trim').length >= 2);
  const sum = E.summarise(objs, st);
  assert.equal(sum.colours.length, 2);
  assert.equal(sum.colours[1].name, 'Navy 1234');
  assert.equal(sum.colours[0].stitches + sum.colours[1].stitches, sum.stitches);
  assert.ok(Math.abs(sum.sizeMm[0] - 90) < 1);
});

test('DST round trip keeps every stitch position (0.1 mm) and the header counts', () => {
  const objs = [obj({ id: 'a' }), obj({ id: 'b', d: 'M40 0H60V20H40Z', colour: '#0000AA', type: 'satin', width: 3 })];
  const st = E.stitchDesign(objs);
  const bytes = E.toDst(st, 'TEST');
  assert.equal((bytes.length - 512) % 3, 0);
  const back = E.readDst(bytes);
  assert.match(back.header, /^LA:TEST {12}\rST: *\d+\rCO:  1\r/);
  const want = st.filter((s) => s.cmd === 'stitch');
  const got = back.stitches.filter((s) => s.cmd === 'stitch');
  const ox = st.find((s) => s.cmd !== 'end');
  // Every original stitch appears in order (the decoder may contain extra split moves).
  let j = 0;
  for (const w of want) {
    const tx = Math.round(w.x * 10) - Math.round(ox.x * 10), ty = Math.round(w.y * 10) - Math.round(ox.y * 10);
    while (j < got.length && !(Math.round(got[j].x * 10) === tx && Math.round(got[j].y * 10) === ty)) j++;
    assert.ok(j < got.length, 'stitch found');
  }
  assert.equal(back.stitches.filter((s) => s.cmd === 'color').length, 1);
  assert.equal(back.stitches[back.stitches.length - 1].cmd, 'end');
});

test('EXP: two bytes per stitch with escapes', () => {
  const st = E.stitchDesign([obj({ underlay: false })]);
  const b = E.toExp(st);
  assert.ok(b.length >= st.filter((s) => s.cmd === 'stitch').length * 2);
});

test('preview SVG draws thread in each colour', () => {
  const objs = [obj({ id: 'a' }), obj({ id: 'b', d: 'M40 0H60V20H40Z', colour: '#0000AA' })];
  const p = E.previewSvg(objs, E.stitchDesign(objs));
  assert.match(p.svg, /stroke="#AA0000"/); assert.match(p.svg, /stroke="#0000AA"/);
});
