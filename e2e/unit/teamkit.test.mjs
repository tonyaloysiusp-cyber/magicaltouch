// Team kits: roster import and checks, and per-player vector print files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KIT, parseRoster, checkRoster, playerPrintSvg, kitPreviewSvg, glyphTexts, placedText, sizeId } from '../../lib/teamKit.ts';
import { DEFAULT_PATTERN } from '../../lib/patterns.ts';
import { pathBox } from '../../lib/pathFit.ts';

const pat = { ...DEFAULT_PATTERN, motif: 'chevron' };
const box = 'M-50 -20L50 -20L50 20L-50 20Z';

test('roster: CSV with header, plain lines, sizes', () => {
  const a = parseRoster('Player name,Back number,Size\nArun,07,S\n"Kumar, R",10,m\nDavid,11,L\nJohn,23,XL');
  assert.equal(a.length, 4);
  assert.deepEqual(a[1], { name: 'Kumar, R', number: '10', size: 'm' });
  assert.equal(sizeId('xl'), 'xl'); assert.equal(sizeId('Kids'), 'kids'); assert.equal(sizeId('XXL'), null);
  const b = parseRoster('Arun, 7, S');
  assert.deepEqual(b[0], { name: 'Arun', number: '7', size: 'S' });
});

test('roster checks catch missing and duplicate values', () => {
  const issues = checkRoster([{ name: '', number: '7', size: 'M' }, { name: 'Bo', number: '', size: 'M' }, { name: 'Cy', number: '7', size: 'Q' }]);
  assert.ok(issues.some((i) => i.row === 1 && /Name is missing/.test(i.message)));
  assert.ok(issues.some((i) => i.row === 2 && /Number is missing/.test(i.message)));
  assert.ok(issues.some((i) => i.row === 3 && /Size/.test(i.message)));
  assert.ok(issues.some((i) => i.row === 3 && i.level === 'warning' && /also on row 1/.test(i.message)));
  assert.equal(checkRoster([{ name: 'Arun', number: '7', size: 'S' }]).length, 0);
});

test('each player file is vector, sized for their size, with their name and number', () => {
  const glyphs = { ARUN: box, '7': box, JOHN: box, '23': box };
  const s = playerPrintSvg(DEFAULT_KIT, pat, { name: 'Arun', number: '7', size: 'S' }, glyphs, { rollW: 1600, bleed: 10, cutLines: true });
  const xl = playerPrintSvg(DEFAULT_KIT, pat, { name: 'John', number: '23', size: 'XL' }, glyphs, { rollW: 1600, bleed: 10, cutLines: true });
  assert.match(s.svg, /width="1600mm"/);
  assert.ok(!/<image/.test(s.svg), 'no pictures without logos');
  assert.ok((s.svg.match(/<path /g) || []).length > 100, 'pattern motifs are paths');
  assert.match(s.svg, /Arun #7 · size S/);
  assert.ok(s.placed[0].k < xl.placed[0].k, 'XL pieces are bigger');
  assert.ok(!/<text[^>]*>ARUN/.test(s.svg), 'name is outlines, not live text');
  assert.ok(s.svg.includes(`d="${box}"`));
});

test('master stays unchanged and missing outlines fall back to live text', () => {
  const kit = { ...DEFAULT_KIT };
  const before = JSON.stringify(kit);
  const out = kitPreviewSvg(kit, pat, { name: 'Kumar', number: '10', size: 'M' }, {});
  assert.match(out, />KUMAR<\/text>/);
  assert.equal(JSON.stringify(kit), before);
  assert.deepEqual(glyphTexts([{ name: 'Arun', number: '7', size: 'S' }], kit).sort(), ['7', 'ARUN']);
});

test('letters fit the height, or the width when long', () => {
  const long = 'M-50 -5L50 -5L50 5L-50 5Z';
  const a = placedText(box, 0, 0, 40, 1000); assert.ok(Math.abs(pathBox(box).h * a.s - 40) < 0.01);
  const b = placedText(long, 0, 0, 40, 300); assert.ok(Math.abs(pathBox(long).w * b.s - 300) < 0.01);
});

test('one print file for the whole roster: every piece, grouped by player, split into pages', async () => {
  const { rosterSheets, printList, kitFor, kitMockupSvg, graphicMarkup } = await import('../../lib/teamKit.ts');
  const glyphs = { ARUN: box, '7': box, JOHN: box, '23': box, KUMAR: box, '10': box };
  const roster = [{ name: 'Arun', number: '7', size: 'S' }, { name: 'John', number: '23', size: 'XL' }, { name: 'Kumar', number: '10', size: 'M' }];
  const r = rosterSheets(DEFAULT_KIT, pat, roster, glyphs, { rollW: 1600, bleed: 10, cutLines: true, pageMm: 5000 });
  assert.equal(r.pages.length, 1);
  assert.equal(r.pages[0].pieces, 15, '5 jersey pieces × 3 players');
  assert.match(r.pages[0].svg, /width="1600mm"/);
  assert.match(r.pages[0].svg, /1\. ARUN #7 · S · Back/);
  assert.match(r.pages[0].svg, /2\. JOHN #23 · XL · Front/);
  assert.match(r.pages[0].svg, /3 garments · page 1 of 1/);
  const small = rosterSheets(DEFAULT_KIT, pat, roster, glyphs, { rollW: 1600, bleed: 10, cutLines: true, pageMm: 1000 });
  assert.ok(small.pages.length > 1, 'long runs continue on more pages');
  assert.ok(small.pages.every((p) => p.height <= 1000 + 14));
  assert.equal(small.pages.reduce((a, p) => a + p.pieces, 0), 15);
  // Save fabric: compact nesting is shorter than player rows, never overlaps, and reports true fabric use.
  const big = Array.from({ length: 12 }, (_, i) => ({ name: 'Arun', number: '7', size: ['S', 'M', 'XL'][i % 3] }));
  const rows = rosterSheets(DEFAULT_KIT, pat, big, glyphs, { rollW: 1600, bleed: 10, cutLines: true, pageMm: 5000 });
  const fab = rosterSheets(DEFAULT_KIT, pat, big, glyphs, { rollW: 1600, bleed: 10, cutLines: true, pageMm: 5000, group: 'fabric' });
  assert.equal(fab.pages.reduce((a, p) => a + p.pieces, 0), 60);
  assert.equal(fab.overlaps, 0);
  assert.equal(rows.overlaps, 0);
  assert.ok(fab.totalMm < rows.totalMm, `nested ${fab.totalMm} < rows ${rows.totalMm}`);
  assert.ok(fab.utilisation > rows.utilisation && fab.utilisation < 1, `use ${fab.utilisation}`);
  assert.ok(fab.pages.every((p) => p.height <= 5000 + 14));
  // Not personalised: sizes × quantities, no names.
  const tee = kitFor('tshirt');
  const list = printList([{ name: '', number: '', size: 'M', qty: 3 }, { name: '', number: '', size: 'L', qty: 2 }], tee);
  assert.equal(list.length, 5);
  assert.deepEqual(checkRoster([{ name: '', number: '', size: 'M', qty: 3 }], false), []);
  assert.ok(checkRoster([{ name: '', number: '', size: 'M', qty: 0 }], false).length === 1);
  const t = rosterSheets(tee, pat, list, { MAGICAL: box }, { rollW: 1600, bleed: 10, cutLines: false });
  assert.equal(t.pages.reduce((a, p) => a + p.pieces, 0), 25);
  assert.ok(!/#undefined/.test(t.pages[0].svg));
  // Graphics and mockup render without errors.
  for (const g of ['sash', 'hoops', 'stripes', 'pinstripes', 'side-panels', 'chevron', 'yoke', 'split', 'band']) assert.ok(graphicMarkup({ ...DEFAULT_KIT, graphic: g }, 560, 740, 10, false).length > 20, g);
  assert.match(kitMockupSvg({ ...DEFAULT_KIT, graphic: 'sash' }, pat, roster[0], glyphs), /FRONT[\s\S]*BACK/);
});

test('V-neck front and garmentOf', async () => {
  const { kitProduct, garmentOf } = await import('../../lib/teamKit.ts');
  const v = kitProduct({ ...DEFAULT_KIT, neck: 'v' }).pieces.find((p) => p.id === 'front');
  assert.match(v.d, /^M190 0L280 175L370 0L/);
  const r = kitProduct(DEFAULT_KIT).pieces.find((p) => p.id === 'front');
  assert.match(r.d, /^M190 0C/);
  assert.equal(garmentOf('polo'), 'polo'); assert.equal(garmentOf('basketball'), 'jersey');
});

test('custom measured sizes scale from the size-M block and validate', async () => {
  const { kitFor, sizeInfo, blockMeasure, checkRoster } = await import('../../lib/teamKit.ts');
  const kit = { ...kitFor('polo'), customSizes: [{ label: '5XL', chestCm: 84 }] };
  const b = blockMeasure(kit);
  const s = sizeInfo(kit, '5xl');
  assert.ok(s && Math.abs(s.k - 84 / b.chestCm) < 1e-9);
  assert.equal(sizeInfo(kit, 'M').k, 1);
  assert.equal(sizeInfo(kit, 'nope'), null);
  const issues = checkRoster([{ name: '', number: '', size: '5XL', qty: 2 }], false, kit);
  assert.equal(issues.length, 0);
  assert.ok(checkRoster([{ name: '', number: '', size: '6XL', qty: 2 }], false, kit)[0].message.includes('5XL'));
});
