import test from 'node:test';
import assert from 'node:assert/strict';
import { docFromSources, run, runAll, apply, parseRange, bookletPairs, groupBounds, clipLocal } from '../../lib/impose/model.ts';

// A 4-page A5 PDF with 3 mm bleed (media = trim + 6 mm), trim at (3,3).
const page = { media: { x: 0, y: 0, w: 154, h: 216 }, trim: { x: 3, y: 3, w: 148, h: 210 }, bleedBox: { x: 0, y: 0, w: 154, h: 216 }, rotate: 0 };
const src = [{ name: 'a5.pdf', pages: [page, page, page, page, page] }];
const labels = (d) => d.sheets.map((s) => s.items.find((i) => i.k === 'page')?.page ?? -1);

test('start: one sheet per page with detected bleed', () => {
  const d = docFromSources(src);
  assert.equal(d.sheets.length, 5);
  assert.deepEqual(d.sheets[0].bleed, { t: 3, r: 3, b: 3, l: 3 });
  assert.equal(d.sheets[0].w, 148);
  assert.deepEqual(clipLocal(d.sheets[0].items[0]), { x: -3, y: -3, w: 154, h: 216 });
});

test('page order commands', () => {
  const d = docFromSources(src);
  assert.deepEqual(labels(run(d, { type: 'reverse' })), [4, 3, 2, 1, 0]);
  assert.deepEqual(labels(run(d, { type: 'shuffleEvenOdd', mode: 'odds-then-evens' })), [0, 2, 4, 1, 3]);
  assert.deepEqual(labels(run(d, { type: 'shuffleEvenOdd', mode: 'interleave-halves' })), [0, 3, 1, 4, 2]);
  assert.deepEqual(labels(run(d, { type: 'shuffleForImposing', perSheet: 2 })), [0, 3, 1, 4, 2, -1]);
  assert.deepEqual(labels(run(d, { type: 'insertBlank', at: 1, count: 2 })), [0, -1, -1, 1, 2, 3, 4]);
  assert.deepEqual(labels(run(d, { type: 'deletePages', sel: [1, 2] })), [0, 3, 4]);
  assert.deepEqual(labels(run(d, { type: 'movePages', sel: [4], to: 0 })), [4, 0, 1, 2, 3]);
  assert.deepEqual(parseRange('1-2, 5, 4-', 6), [0, 1, 3, 4, 5]);
});

test('rotate clockwise keeps the page on the sheet', () => {
  const d = run(docFromSources(src), { type: 'rotatePages', sel: [0], deg: 90 });
  const s = d.sheets[0];
  assert.equal(s.w, 210); assert.equal(s.h, 148);
  const b = groupBounds(s.items);
  assert.ok(Math.abs(b.x + 3) < 1e-6 && Math.abs(b.y + 3) < 1e-6 && Math.abs(b.w - 216) < 1e-6, JSON.stringify(b));
});

test('n-up 2 on A4 landscape with duplex and crop marks', () => {
  const d = run(docFromSources(src), { type: 'nUp', sheetW: 297, sheetH: 210, cols: 2, rows: 1, gap: 0, margin: 0, order: 'rows', duplex: 'long', bleed: 0, marks: { crop: true }, fit: 'none' });
  assert.equal(d.sheets.length, 3);
  assert.equal(d.sheets[0].side, 'front');
  assert.equal(d.sheets[1].side, 'back');
  const pages = d.sheets[0].items.filter((i) => i.k === 'page');
  assert.equal(pages.length, 2);
  assert.ok(d.sheets[0].items.some((i) => i.tag === 'mark'));
  // Back side mirrored: page 3 (index 2) sits in the left cell of the front mirror → right.
  const back = d.sheets[1].items.filter((i) => i.k === 'page');
  const xOf = (it) => apply(it.m, 0, 0).x;
  assert.ok(xOf(back[0]) > xOf(back[1]));
  // Bleed 0 → clip equals the trim.
  assert.deepEqual(pages[0].clip, { x: 3, y: 3, w: 148, h: 210 });
});

test('booklet pairs and creep', () => {
  assert.deepEqual(bookletPairs(8)[0], { front: [7, 0], back: [1, 6] });
  const d = run(docFromSources({ ...src }.length ? src : src), { type: 'booklet', sheet: 'spread', marks: { fold: true }, creepMm: 1 });
  assert.equal(d.sheets.length, 4); // 5 pages → 8 → 2 sheets × front/back
  const crept = run(docFromSources([{ name: 'x', pages: Array(8).fill(page) }]), { type: 'creep', totalMm: 1 });
  const dx = (s) => apply(s.items[0].m, 0, 0).x;
  assert.equal(dx(crept.sheets[0]), 0);
  assert.equal(dx(crept.sheets[3]), 1); // innermost left-hand page moves right
  assert.equal(dx(crept.sheets[4]), -1);
});

test('stick-ons, tape, peel off, tile and step & repeat', () => {
  let d = runAll(docFromSources(src), [
    { type: 'stickText', sel: 'all', text: '{n}/{N}', anchor: 'b', dx: 0, dy: 5, size: 9, color: '#000000' },
    { type: 'maskTape', sel: [0], box: { x: 0, y: 0, w: 20, h: 20 } },
  ]);
  assert.equal(d.sheets[4].items.find((i) => i.k === 'text').text, '5/5');
  assert.ok(d.sheets[0].items.some((i) => i.tag === 'tape'));
  d = run(d, { type: 'peelOff', sel: 'all', what: 'stuck' });
  assert.ok(!d.sheets.some((s) => s.items.some((i) => i.tag === 'stuck')));
  const t = run(docFromSources(src, { src: 0, pages: [0] }), { type: 'tile', tileW: 100, tileH: 120, overlap: 10, marks: {} });
  assert.equal(t.sheets.length, 4);
  const sr = run(docFromSources(src, { src: 0, pages: [0] }), { type: 'stepRepeat', sheetW: 320, sheetH: 450, cols: 2, rows: 2, gap: 0, bleed: 3, marks: { crop: true }, duplex: 'none' });
  assert.equal(sr.sheets[0].items.filter((i) => i.k === 'page').length, 4);
});

test('adjust size fit and join two pages', () => {
  const d = run(docFromSources(src), { type: 'adjustSize', sel: [0], w: 210, h: 297, fit: 'fit', anchor: 'c' });
  assert.equal(d.sheets[0].w, 210);
  const b = groupBounds(d.sheets[0].items.map((i) => ({ ...i, clip: i.srcTrim })));
  assert.ok(Math.abs(b.h - 297) < 0.01 && b.w <= 210, JSON.stringify(b));
  const j = run(docFromSources(src), { type: 'joinPages', layout: 'side', gap: 0 });
  assert.equal(j.sheets.length, 3);
  assert.equal(j.sheets[0].w, 296);
});
