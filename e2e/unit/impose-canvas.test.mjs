import test from 'node:test';
import assert from 'node:assert/strict';
import { docFromSources, run, groupBounds } from '../../lib/impose/model.ts';

const src = (w, h) => ({ name: 'a.pdf', pages: [{ media: { x: 0, y: 0, w, h }, trim: { x: 0, y: 0, w, h }, bleedBox: { x: 0, y: 0, w, h }, rotate: 0 }] });
const sources = [src(90, 50)];
function sheetWithCard() {
  let d = docFromSources(sources);
  d = run(d, { type: 'newSheet', at: 1, w: 320, h: 450 }, sources);
  d = run(d, { type: 'placePage', sheet: 1, src: 0, page: 0, x: 20, y: 20, deg: 0, scale: 1, bleed: 0 }, sources);
  const grp = d.sheets[1].items.find((i) => i.k === 'page').grp;
  return { d, grp };
}
const pages = (s) => [...new Set(s.items.filter((i) => i.k === 'page').map((i) => i.grp))];

test('duplicate with a distance, repeated (Ctrl+D behaviour = same step again from the copy)', () => {
  const { d, grp } = sheetWithCard();
  const d1 = run(d, { type: 'duplicateGroup', sheet: 1, grp, dx: 100, dy: 0, newGrp: ['c1'] }, sources);
  const d2 = run(d1, { type: 'duplicateGroup', sheet: 1, grp: 'c1', dx: 100, dy: 0, newGrp: ['c2'] }, sources);
  const xs = pages(d2.sheets[1]).map((g) => Math.round(groupBounds(d2.sheets[1].items.filter((i) => i.grp === g)).x));
  assert.deepEqual(xs.sort((a, b) => a - b), [20, 120, 220]);
  const many = run(d, { type: 'duplicateGroup', sheet: 1, grp, dx: 0, dy: 60, times: 4 }, sources);
  assert.equal(pages(many.sheets[1]).length, 5);
});

test('rotate any angle, scale, absolute position, align, lock, delete, distribute', () => {
  const { d, grp } = sheetWithCard();
  const rotd = run(d, { type: 'transformGroup', sheet: 1, grp, dx: 0, dy: 0, deg: 90 }, sources);
  const b = groupBounds(rotd.sheets[1].items.filter((i) => i.grp === grp));
  assert.equal(Math.round(b.w), 50); assert.equal(Math.round(b.h), 90);
  const big = run(d, { type: 'transformGroup', sheet: 1, grp, dx: 0, dy: 0, scale: 2 }, sources);
  assert.equal(Math.round(groupBounds(big.sheets[1].items.filter((i) => i.grp === grp)).w), 180);
  const at = run(d, { type: 'placeGroupAt', sheet: 1, grp, x: 5, y: 7 }, sources);
  const ab = groupBounds(at.sheets[1].items.filter((i) => i.grp === grp)); assert.deepEqual([Math.round(ab.x), Math.round(ab.y)], [5, 7]);
  const c = run(d, { type: 'alignGroup', sheet: 1, grp, how: 'hcenter' }, sources);
  assert.equal(Math.round(groupBounds(c.sheets[1].items.filter((i) => i.grp === grp)).x), 115);
  const L = run(d, { type: 'lockGroup', sheet: 1, grp, locked: true }, sources);
  assert.deepEqual(run(L, { type: 'transformGroup', sheet: 1, grp, dx: 50, dy: 0 }, sources).sheets[1], L.sheets[1], 'locked pages do not move');
  assert.equal(pages(run(L, { type: 'deleteGroup', sheet: 1, grp }, sources).sheets[1]).length, 1, 'locked pages are not deleted');
  assert.equal(pages(run(d, { type: 'deleteGroup', sheet: 1, grp }, sources).sheets[1]).length, 0);
  let dd = run(d, { type: 'duplicateGroup', sheet: 1, grp, dx: 95, dy: 0, newGrp: ['a'] }, sources);
  dd = run(dd, { type: 'duplicateGroup', sheet: 1, grp: 'a', dx: 140, dy: 0, newGrp: ['b'] }, sources);
  const ev = run(dd, { type: 'distributeGroups', sheet: 1, grps: [grp, 'a', 'b'], axis: 'h' }, sources);
  const xs = [grp, 'a', 'b'].map((g) => groupBounds(ev.sheets[1].items.filter((i) => i.grp === g)).x).sort((p, q) => p - q);
  assert.ok(Math.abs((xs[1] - xs[0]) - (xs[2] - xs[1])) < 0.01, 'equal spacing');
});

test('crop marks: style controls, never over neighbouring artwork, centre marks', () => {
  const card = [src(90, 50)];
  let d = docFromSources(card);
  d = run(d, { type: 'nUp', sheetW: 320, sheetH: 450, cols: 2, rows: 2, gap: 0, margin: 10, order: 'rows', duplex: 'none', bleed: 3, marks: { crop: true, len: 8, weight: 0.3, offset: 4, color: '#00AEEF', centre: true }, fit: 'none' }, card);
  const s = d.sheets[0];
  const marks = s.items.filter((i) => i.tag === 'mark' && i.k === 'line');
  assert.ok(marks.length > 0);
  assert.ok(marks.every((m) => m.color === '#00AEEF'));
  const trims = s.items.filter((i) => i.k === 'page');
  const crop = marks.filter((m) => Math.abs(Math.hypot(m.x2 - m.x1, m.y2 - m.y1) - 8) < 0.01);
  assert.ok(crop.every((m) => m.width === 0.3));
  // No crop mark crosses another card's artwork (cards touch: gap 0).
  const art = trims.map((t) => { const b = groupBounds([t]); return { x: b.x - 3, y: b.y - 3, w: b.w + 6, h: b.h + 6 }; });
  const hits = crop.filter((m) => art.some((b) => Math.max(m.x1, m.x2) > b.x + 0.01 && Math.min(m.x1, m.x2) < b.x + b.w - 0.01 && Math.max(m.y1, m.y2) > b.y + 0.01 && Math.min(m.y1, m.y2) < b.y + b.h - 0.01));
  assert.equal(hits.length, 0);
  assert.ok(marks.filter((m) => Math.abs(Math.hypot(m.x2 - m.x1, m.y2 - m.y1) - 8) < 0.01).length >= 8, 'outer marks kept, plus centre marks');
});

test('mark styles, trim guides and die-cut guide: marks stay off the artwork; the die line sits on the trim', () => {
  for (const style of ['standard', 'corner', 'double']) {
    let d = docFromSources(sources);
    d = run(d, { type: 'stepRepeat', sheetW: 320, sheetH: 450, cols: 2, rows: 3, gap: 8, bleed: 3, marks: { crop: true, style, trimGuides: true, dieCut: true, dieRadius: 4, registration: true, regSize: 5 }, duplex: 'none' }, sources);
    const sh = d.sheets[0];
    const art = [];
    for (const it of sh.items.filter((i) => i.k === 'page')) { const b = groupBounds([it]); art.push(b); }
    const marks = sh.items.filter((i) => i.tag === 'mark' && i.k === 'line');
    const die = sh.items.filter((i) => i.tag === 'die');
    assert.ok(marks.length > 0, style);
    assert.ok(die.length >= 6 * 4, `${style}: a die line around every piece`);
    const inside = (x, y, b) => x > b.x + 0.01 && x < b.x + b.w - 0.01 && y > b.y + 0.01 && y < b.y + b.h - 0.01;
    for (const m of marks) for (let t = 0.05; t < 1; t += 0.1) { const x = m.x1 + (m.x2 - m.x1) * t, y = m.y1 + (m.y2 - m.y1) * t; assert.ok(!art.some((b) => inside(x, y, b)), `${style}: mark crosses artwork at ${x},${y}`); }
  }
});
