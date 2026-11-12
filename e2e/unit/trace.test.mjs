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

// ---- Advanced tracing (Nov 2026) ----
import { trace as trace2, loopPath, despeckle } from '../../lib/trace.ts';

function canvasOf(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = paint(x, y); const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return { data, width: w, height: h };
}

test('square corners stay sharp, circles become curves', () => {
  const sq = loopPath([[0, 0], [10, 0], [10, 10], [0, 10]], 1, true, 60);
  assert.ok(!sq.includes('C'), sq);
  const ring = Array.from({ length: 24 }, (_, i) => [10 + 8 * Math.cos(i / 24 * Math.PI * 2), 10 + 8 * Math.sin(i / 24 * Math.PI * 2)]);
  assert.ok(loopPath(ring, 1, true, 60).includes('C'));
});

test('split gives one shape per region, holes stay with their shape', () => {
  // two separate black rings on white
  const img = canvasOf(80, 40, (x, y) => {
    const d1 = Math.hypot(x - 20, y - 20), d2 = Math.hypot(x - 60, y - 20);
    return (d1 < 15 && d1 > 7) || (d2 < 15 && d2 > 7) ? [0, 0, 0] : [255, 255, 255];
  });
  const r = trace2(img, { mode: 'bw', split: true, ignoreWhite: true, detail: 80 });
  assert.equal(r.layers.length, 1);
  assert.equal(r.layers[0].shapes.length, 2);
  for (const s of r.layers[0].shapes) assert.equal((s.match(/M/g) || []).length, 2); // outline + hole
});

test('shades of grey mode makes grey layers', () => {
  const img = canvasOf(60, 20, (x) => (x < 20 ? [20, 20, 20] : x < 40 ? [128, 128, 128] : [240, 240, 240]).map((v) => v));
  const r = trace2(img, { mode: 'gray', colors: 3, detail: 60 });
  assert.equal(r.layers.length, 3);
  for (const l of r.layers) assert.match(l.color, /^#([0-9A-F]{2})\1\1$/);
});

test('despeckle removes single stray pixels', () => {
  const w = 9, h = 9; const L = new Int16Array(w * h).fill(0); L[4 * w + 4] = 1;
  assert.equal(despeckle(L, w, h, 1)[4 * w + 4], 0);
});
