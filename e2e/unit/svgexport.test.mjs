// Editor SVG export keeps vectors: groups, SVG pictures and SVG pattern
// tiles are written as real vector elements with xlink links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportArtboardToSVG, parseSvgDataUrl, withXlink } from '../../lib/editor/svgExport.ts';
import { DEFAULT_PATTERN, tileSvg, svgDataUrl } from '../../lib/patterns.ts';

const F = { util: { multiplyTransformMatrices: (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]] } };
const M = (x, y) => () => [1, 0, 0, 1, x, y];
const rect = (x, y, fill) => ({ type: 'rect', width: 10, height: 10, fill, calcTransformMatrix: M(x, y) });

test('groups are exported with all children', () => {
  const g = { type: 'group', getObjects: () => [rect(10, 10, '#f00'), rect(30, 10, '#0f0')], calcTransformMatrix: M(20, 10) };
  const svg = exportArtboardToSVG({ getObjects: () => [g] }, F, { x: 0, y: 0, width: 100, height: 100 });
  assert.match(svg, /fill="#f00"/); assert.match(svg, /fill="#0f0"/);
});

test('an SVG picture is written as vectors, not an embedded image', () => {
  const tile = tileSvg({ ...DEFAULT_PATTERN, motif: 'heart' });
  const url = svgDataUrl(tile);
  const img = { type: 'image', width: 200, height: 200, _originalElement: { src: url, naturalWidth: 200, naturalHeight: 200 }, calcTransformMatrix: M(100, 100) };
  const svg = exportArtboardToSVG({ getObjects: () => [img] }, F, { x: 0, y: 0, width: 300, height: 300 });
  assert.ok(!/<image\b/.test(svg), 'no embedded picture');
  assert.match(svg, /<path d="/);
  assert.match(svg, /xlink:href="#i\d+-m0"/);
  assert.match(svg, /xmlns:xlink=/);
});

test('an SVG pattern fill becomes a vector <pattern>', () => {
  const url = svgDataUrl(tileSvg({ ...DEFAULT_PATTERN, motif: 'star' }));
  const r = { type: 'rect', width: 100, height: 100, fill: { source: { src: url, naturalWidth: 80, naturalHeight: 80 }, repeat: 'repeat' }, calcTransformMatrix: M(50, 50) };
  const svg = exportArtboardToSVG({ getObjects: () => [r] }, F, { x: 0, y: 0, width: 100, height: 100 });
  assert.match(svg, /<pattern id="mtpat\d+"[^>]*><g transform=/);
  assert.ok(!/<image\b/.test(svg));
});

test('helpers', () => {
  assert.equal(parseSvgDataUrl('data:image/png;base64,AAAA'), null);
  const p = parseSvgDataUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect id="a" width="5" height="5"/></svg>'));
  assert.deepEqual(p.vb, [0, 0, 20, 10]);
  assert.match(p.inner, /id="i\d+-a"/);
  assert.equal(withXlink('<use href="#x"/><image href="a.png"/>'), '<use xlink:href="#x"/><image xlink:href="a.png"/>');
});
