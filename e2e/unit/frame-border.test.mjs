import test from 'node:test';
import assert from 'node:assert/strict';
import { frameOutlineD, imagePageScale, setFrameBorder } from '../../lib/editor/frames.ts';

const img = (clip, m = [2, 0, 0, 2, 100, 100]) => ({ clipPath: clip, calcTransformMatrix: () => m });
test('frame border follows the frame shape and is sized in page pixels', () => {
  const rect = { type: 'rect', width: 100, height: 60, rx: 0, calcOwnMatrix: () => [1, 0, 0, 1, 0, 0] };
  assert.equal(frameOutlineD(img(rect)).d, 'M-50 -30H50V30H-50Z');
  const round = frameOutlineD(img({ ...rect, rx: 10 })).d;
  assert.match(round, /A10 10 0 0 1/);
  const path = { type: 'path', path: [['M', 10, 10], ['L', 30, 10], ['L', 20, 30], ['Z']], pathOffset: { x: 20, y: 20 }, calcOwnMatrix: () => [1, 0, 0, 1, 0, 0] };
  assert.equal(frameOutlineD(img(path)).d, 'M-10 -10L10 -10L0 10Z');
  assert.equal(imagePageScale(img(rect)), 2);
  assert.equal(frameOutlineD(img({ ...rect, absolutePositioned: true })), null, 'page masks are not frames');
  const o = img(rect); setFrameBorder(o, { width: 8, color: '#fff' }); assert.deepEqual(o.frameBorder, { width: 8, color: '#fff' });
  setFrameBorder(o, { width: 0, color: '#fff' }); assert.equal(o.frameBorder, null);
});

test('the frame border is exported as a vector outline', async () => {
  const { exportArtboardToSVG } = await import('../../lib/editor/svgExport.ts');
  const F = { util: { multiplyTransformMatrices: (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]] } };
  const clip = { type: 'rect', width: 100, height: 100, calcOwnMatrix: () => [1, 0, 0, 1, 0, 0] };
  const img = { type: 'image', width: 100, height: 100, clipPath: clip, frameBorder: { width: 8, color: '#ff0000' }, _element: { src: 'data:image/png;base64,AAAA' }, calcTransformMatrix: () => [2, 0, 0, 2, 150, 150] };
  const svg = exportArtboardToSVG({ getObjects: () => [img] }, F, { x: 0, y: 0, width: 300, height: 300 });
  assert.match(svg, /<path d="M-50 -50H50V50H-50Z" fill="none" stroke="#ff0000" stroke-width="4"/);
});
