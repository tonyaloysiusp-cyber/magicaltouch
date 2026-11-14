import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBook, coverTemplateSvg, specText, coverEditorUrl, estimateCaliper } from '../../lib/binding.ts';

const base = { trimW: 210, trimH: 297, pages: 200, sides: 'double', paperGsm: 80, paperProfile: 'uncoated', coverGsm: 300, coverProfile: 'board', binding: 'perfect' };

test('perfect binding spine from entered caliper', () => {
  const r = calculateBook({ ...base, paperCaliperUm: 100 });
  assert.equal(r.leaves, 100);
  assert.equal(r.spineMm, 10);
  assert.equal(r.caliperSource.text, 'entered');
  assert.equal(r.cover.widthMm, 2 * 210 + 10 + 6);
  assert.equal(r.cover.heightMm, 303);
  const spineFolds = r.cover.folds.filter((f) => f.kind === 'spine').map((f) => f.x);
  assert.deepEqual(spineFolds, [213, 223]);
});

test('estimated caliper is flagged, not presented as exact', () => {
  const r = calculateBook(base);
  assert.equal(r.caliperSource.text, 'estimated');
  assert.equal(r.textCaliperUm, estimateCaliper(80, 'uncoated'));
  assert.ok(r.assumptions.some((a) => /estimated/.test(a)));
});

test('odd page count gets a blank page; single-sided counts one page per leaf', () => {
  assert.equal(calculateBook({ ...base, pages: 201 }).blanksAdded, 1);
  assert.equal(calculateBook({ ...base, pages: 50, sides: 'single', paperCaliperUm: 100 }).leaves, 50);
});

test('saddle stitch: multiple of 4, sheets and creep', () => {
  const r = calculateBook({ ...base, binding: 'saddle', pages: 30, paperCaliperUm: 100, selfCover: true });
  assert.equal(r.pagesUsed, 32);
  assert.equal(r.sheets, 8);
  assert.equal(r.creep.shiftsMm.length, 8);
  assert.equal(r.creep.shiftsMm[0], 0);
  assert.equal(r.creep.totalMm, 0.7);
  assert.equal(r.cover.widthMm, 426);
});

test('hardcover case: boards, joints and turn-ins add up', () => {
  const r = calculateBook({ ...base, binding: 'hardcover', paperCaliperUm: 100, endpaperCaliperUm: 150, boardMm: 2.5, squareMm: 3, jointMm: 7, turnInMm: 15 });
  assert.equal(r.blockMm, 10.3);
  assert.equal(r.hardcover.spineBoardW, 15.3);
  assert.equal(r.hardcover.boardW, 213);
  assert.equal(r.cover.widthMm, 2 * 15 + 2 * 213 + 2 * 7 + 15.3);
  assert.equal(r.cover.heightMm, 303 + 30);
  assert.equal(r.cover.folds.length, 6);
});

test('outputs: SVG template, spec text and editor link', () => {
  const r = calculateBook({ ...base, paperCaliperUm: 100 });
  const svg = coverTemplateSvg(r);
  assert.match(svg, /Spine · 10 mm/);
  assert.match(specText(base, r), /Spine: 10 mm/);
  const u = new URL('http://x' + coverEditorUrl(r));
  assert.equal(u.searchParams.get('guidesV').split(',').length, r.cover.folds.length);
});
