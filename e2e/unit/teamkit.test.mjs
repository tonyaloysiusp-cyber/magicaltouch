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
