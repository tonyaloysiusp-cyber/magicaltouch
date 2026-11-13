// SVG → vector PDF converter (lib/svgToPdf.ts) with a recording fake PDF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePath, parseTransform, renderSvgToPdf, parseXml, mul, invert } from '../../lib/svgToPdf.ts';
import { DEFAULT_KIT, playerPrintSvg } from '../../lib/teamKit.ts';
import { DEFAULT_PATTERN, sheetSvg } from '../../lib/patterns.ts';

function fakePdf() {
  const log = [];
  const rec = (name) => (...a) => { log.push([name, ...a]); };
  const pdf = { log };
  for (const n of ['moveTo', 'lineTo', 'curveTo', 'close', 'fill', 'fillEvenOdd', 'stroke', 'clip', 'clipEvenOdd', 'discardPath', 'setFillColor', 'setDrawColor', 'setLineWidth', 'setLineJoin', 'setLineCap', 'saveGraphicsState', 'restoreGraphicsState', 'addImage', 'text', 'setFontSize', 'setTextColor']) pdf[n] = rec(n);
  pdf.GState = function (o) { this.o = o; }; pdf.setGState = rec('setGState');
  return pdf;
}
const count = (log, n) => log.filter((l) => l[0] === n).length;

test('path parser handles relative, smooth, quadratic and arc commands', () => {
  const s = parsePath('m10 10 h20 v20 h-20 z');
  assert.deepEqual(s.map((x) => x[0]).join(''), 'MLLLZ');
  assert.deepEqual(s[2].slice(1), [30, 30]);
  const c = parsePath('M0 0 C10 0 20 10 20 20 S30 40 40 40 Q50 40 50 50 T60 60');
  assert.equal(c.filter((x) => x[0] === 'C').length, 4);
  const a = parsePath('M0 0 A10 10 0 0 1 20 0');
  const last = a[a.length - 1];
  assert.ok(Math.abs(last[5] - 20) < 1e-6 && Math.abs(last[6]) < 1e-6);
  assert.ok(a.length >= 3);
});

test('transforms compose and invert', () => {
  const m = parseTransform('translate(10 20) scale(2) rotate(90)');
  const p = [m[0] * 1 + m[2] * 0 + m[4], m[1] * 1 + m[3] * 0 + m[5]];
  assert.ok(Math.abs(p[0] - 10) < 1e-9 && Math.abs(p[1] - 22) < 1e-9);
  const id = mul(m, invert(m));
  assert.ok(Math.abs(id[0] - 1) < 1e-9 && Math.abs(id[4]) < 1e-9);
});

test('XML parser reads attributes, nesting and entities', () => {
  const r = parseXml('<svg a="1"><g id="x"><text>A &amp; B</text><path d="M0 0"/></g></svg>');
  const g = r.kids[0].kids[0];
  assert.equal(g.a.id, 'x'); assert.equal(g.kids[0].text, 'A & B'); assert.equal(g.kids[1].tag, 'path');
});

test('a team-kit print file becomes vector PDF drawing: fills, clips, no pictures', () => {
  const box = 'M-50 -20L50 -20L50 20L-50 20Z';
  const { svg } = playerPrintSvg(DEFAULT_KIT, { ...DEFAULT_PATTERN, motif: 'chevron' }, { name: 'Arun', number: '7', size: 'M' }, { ARUN: box, '7': box }, { rollW: 1600, bleed: 10, cutLines: true });
  const pdf = fakePdf();
  const st = renderSvgToPdf(pdf, svg, { scale: 1 });
  assert.ok(st.paths > 300, String(st.paths));
  assert.equal(st.images, 0);
  assert.ok(count(pdf.log, 'clip') >= 2, 'front and back clip their pattern');
  assert.equal(count(pdf.log, 'saveGraphicsState'), count(pdf.log, 'restoreGraphicsState'));
  assert.ok(count(pdf.log, 'curveTo') + count(pdf.log, 'lineTo') > 300);
});

test('<pattern> fills are tiled as vectors inside the shape', () => {
  const svg = sheetSvg({ ...DEFAULT_PATTERN, motif: 'heart' }, 300, 200);
  const pdf = fakePdf();
  const st = renderSvgToPdf(pdf, svg);
  assert.ok(st.paths > 20, String(st.paths));
  assert.ok(count(pdf.log, 'clip') >= 1);
  assert.equal(count(pdf.log, 'saveGraphicsState'), count(pdf.log, 'restoreGraphicsState'));
});

test('PNG images are placed; SVG pictures are drawn as vectors', () => {
  const inner = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#f00"/></svg>');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="data:image/png;base64,AAAA" x="0" y="0" width="10" height="10"/><image xlink:href="data:image/svg+xml,${inner}" x="20" y="20" width="40" height="40"/></svg>`;
  const pdf = fakePdf();
  const st = renderSvgToPdf(pdf, svg);
  assert.equal(st.images, 1);
  assert.ok(pdf.log.some((l) => l[0] === 'setFillColor' && l[1] === 255 && l[2] === 0));
});
