// Unit tests for Image Trace (lib/trace.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trace, outlines, area, simplify, otsu, toSvg, toFabricPath, palette } from '../../lib/trace.ts';

function img(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a = 255] = fn(x, y); const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; }
  return { data, width: w, height: h };
}

test('a square becomes one loop with the right area', () => {
  const w = 10, h = 10, m = new Uint8Array(w * h);
  for (let y = 2; y < 6; y++) for (let x = 3; x < 8; x++) m[y * w + x] = 1;
  const loops = outlines(m, w, h);
  assert.equal(loops.length, 1);
  assert.equal(Math.abs(area(loops[0])), 20);
  assert.equal(simplify(loops[0], 0.5).length, 4);
});

test('a ring has an outer loop and a hole of opposite direction', () => {
  const w = 12, h = 12, m = new Uint8Array(w * h);
  for (let y = 1; y < 11; y++) for (let x = 1; x < 11; x++) m[y * w + x] = 1;
  for (let y = 4; y < 8; y++) for (let x = 4; x < 8; x++) m[y * w + x] = 0;
  const loops = outlines(m, w, h);
  assert.equal(loops.length, 2);
  const a = loops.map(area).sort((p, q) => Math.abs(q) - Math.abs(p));
  assert.equal(Math.abs(a[0]), 100); assert.equal(Math.abs(a[1]), 16);
  assert.ok(Math.sign(a[0]) !== Math.sign(a[1]));
});

test('diagonal pixels (pinch points) still close every loop', () => {
  const w = 4, h = 4, m = new Uint8Array(w * h);
  m[1 * w + 1] = 1; m[2 * w + 2] = 1;
  const loops = outlines(m, w, h);
  const total = loops.reduce((s, l) => s + Math.abs(area(l)), 0);
  assert.equal(total, 2);
});

test('colour trace finds the colours and draws layers', () => {
  const im = img(60, 40, (x, y) => (x < 30 ? [220, 40, 40] : y < 20 ? [30, 60, 200] : [250, 250, 250]));
  const pal = palette(im, 3).map((c) => c.join(','));
  assert.ok(pal.includes('220,40,40') && pal.includes('30,60,200'));
  const r = trace(im, { mode: 'colour', colors: 3, noise: 2 });
  assert.equal(r.layers.length, 3);
  assert.equal(r.width, 60); assert.equal(r.height, 40);
  const r2 = trace(im, { mode: 'colour', colors: 3, noise: 2, ignoreWhite: true });
  assert.equal(r2.layers.length, 2);
  const svg = toSvg(r2);
  assert.match(svg, /^<svg[^>]+viewBox="0 0 60 40"/);
  const cmds = toFabricPath(r2.layers[0].d);
  assert.equal(cmds[0][0], 'M');
  assert.equal(cmds[cmds.length - 1][0], 'Z');
});

test('black & white and line modes', () => {
  const im = img(50, 50, (x, y) => ((x - 25) ** 2 + (y - 25) ** 2 < 225 ? [10, 10, 10] : [245, 245, 245]));
  const bw = trace(im, { mode: 'bw', noise: 2 });
  assert.equal(bw.layers.length, 1);
  assert.ok(bw.layers[0].area > 600 && bw.layers[0].area < 800);
  const line = trace(im, { mode: 'line', noise: 2 });
  assert.equal(line.layers.length, 1);
  assert.ok(line.layers[0].area < bw.layers[0].area);
  const hist = new Array(256).fill(0); hist[20] = 100; hist[230] = 100;
  const t = otsu(hist); assert.ok(t >= 20 && t < 230);
});

test('large images are traced at the detail size and scaled back', () => {
  const im = img(400, 200, (x) => (x < 200 ? [0, 0, 0] : [255, 255, 255]));
  const r = trace(im, { mode: 'bw', detail: 100, noise: 1 });
  assert.equal(r.width, 400); assert.equal(r.scale, 4);
});
