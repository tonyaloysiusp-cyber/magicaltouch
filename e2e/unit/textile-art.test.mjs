import test from 'node:test';
import assert from 'node:assert/strict';
import { boardLayout, pieceArt, renderArt, layoutText, fillVars, setShaper } from '../../lib/textile/art.ts';
import { PRODUCTS } from '../../lib/garments.ts';
import { DEFAULT_PATTERN } from '../../lib/patterns.ts';
import { kitFor, pieceMarkup, playerPrintSvg } from '../../lib/teamKit.ts';

// Fake shaper: every letter is a 0.6em box.
const shaper = (font, weight, italic, text, size) => ({ d: [...text].map((_, i) => `M${i * size * 0.6} 0h${size * 0.5}v${-size * 0.7}h${-size * 0.5}Z`).join(''), width: text.length * size * 0.6, ascender: size * 0.9, descender: -size * 0.2, capHeight: size * 0.7 });
const product = PRODUCTS.find((p) => p.id === 'jersey');

test('board puts front and back on top, sleeves and collar below', () => {
  const b = boardLayout(product);
  const ids = b.pieces.map((p) => p.piece.id);
  assert.deepEqual(ids.slice(0, 2), ['front', 'back']);
  const back = b.pieces[1];
  assert.equal(back.x, 560 + 60);
  assert.ok(b.pieces.find((p) => p.piece.id === 'sleeve-l').y > 700);
});

test('text: names from the roster, outline vs live, fit width', () => {
  assert.equal(fillVars('{NAME} #{NUMBER}', { name: 'Ali', number: '7' }, true), 'ALI #7');
  const el = { id: 't', kind: 'text', text: '{NAME}', font: 'Oswald', weight: 700, size: 50, fill: '#fff', upper: true, fitW: 120, m: [1, 0, 0, 1, 100, 100] };
  const L = layoutText(el, { shaper, vars: { name: 'Christopher' } });
  assert.ok(L.w <= 120.001 && L.sx < 1);
  const out = renderArt([el], [1, 0, 0, 1, 0, 0], { shaper, vars: { name: 'Ali' } });
  assert.match(out, /<path d="M0 0h25/);
  assert.doesNotMatch(out, /<text/);
  const live = renderArt([el], [1, 0, 0, 1, 0, 0], { shaper, vars: { name: 'Ali' }, textMode: 'live' });
  assert.match(live, /<text [^>]*font-family="'Oswald', sans-serif"[^>]*font-weight="700"[^>]*>ALI<\/text>/);
});

test('pieces get their slice of the board; mirrored sleeve art is pre-mirrored', () => {
  const b = boardLayout(product);
  const sr = b.pieces.find((p) => p.piece.id === 'sleeve-r');
  const el = { id: 'r', kind: 'rect', w: 20, h: 10, fill: '#f00', m: [1, 0, 0, 1, sr.x + 30, sr.y + 40] };
  const art = pieceArt([el], b, 'sleeve-r', {});
  assert.match(art, /matrix\(-1 0 0 1 410 40\)/);
  const front = pieceArt([{ ...el, m: [1, 0, 0, 1, 100, 200] }], b, 'front', {});
  assert.match(front, /matrix\(1 0 0 1 100 200\)/);
});

test('gradient and pattern fills stay vector', () => {
  const g = renderArt([{ id: 'g', kind: 'ellipse', rx: 40, ry: 20, fill: { type: 'linear', stops: [[0, '#000'], [1, '#fff']], angle: 0 }, m: [1, 0, 0, 1, 0, 0] }], [1, 0, 0, 1, 0, 0]);
  assert.match(g, /<linearGradient gradientUnits="userSpaceOnUse"[^>]*x1="-40"/);
  const p = renderArt([{ id: 'p', kind: 'rect', w: 200, h: 200, fill: { type: 'pattern', pattern: DEFAULT_PATTERN, tileMm: 40 }, m: [1, 0, 0, 1, 0, 0] }], [1, 0, 0, 1, 0, 0]);
  assert.match(p, /<clipPath id="[^"]+-c"/);
  assert.ok((p.match(/<path/g) || []).length > 4);
  assert.doesNotMatch(p, /<image/);
});

test('teamKit draws studio art on the print pieces and the print file', () => {
  setShaper(shaper);
  const kit = { ...kitFor('jersey'), studioOnly: true, art: [{ id: 'n', kind: 'text', text: '{NUMBER}', font: 'Oswald', weight: 700, size: 200, fill: '#ffcc00', m: [1, 0, 0, 1, 620 + 280, 400] }] };
  const back = product.pieces.find((p) => p.id === 'back');
  const svg = pieceMarkup(back, kit, DEFAULT_PATTERN, { name: 'Ali', number: '23', size: 'L' }, {}, 1, 3);
  assert.match(svg, /fill="#ffcc00"/);
  const live = playerPrintSvg(kit, DEFAULT_PATTERN, { name: 'Ali', number: '23', size: 'L' }, {}, { rollW: 1500, bleed: 3, cutLines: true, textMode: 'live' });
  assert.match(live.svg, />23<\/text>/);
  setShaper(null);
});
