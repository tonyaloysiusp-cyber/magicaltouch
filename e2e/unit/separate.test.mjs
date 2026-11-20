import test from 'node:test';
import assert from 'node:assert/strict';
import { quantize, spotPlates, halftone, underbase, coverage, cmykPlanes, dotsPath, filmSvg } from '../../lib/print/separate.ts';

test('quantize finds the inks of a 3-colour image, deterministically', () => {
  const w = 30, h = 10, px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const x = i % w; const c = x < 10 ? [220, 20, 30] : x < 20 ? [20, 40, 200] : [250, 250, 250]; px.set([...c, 255], i * 4); }
  const a = quantize(px, 3), b = quantize(px, 3);
  assert.deepEqual(a.palette, b.palette);
  const sorted = a.palette.map((c) => c.join(',')).sort();
  assert.deepEqual(sorted, ['20,40,200', '220,20,30', '250,250,250'].sort());
  const plates = spotPlates(a, a.palette.findIndex((c) => c[0] === 250));
  assert.equal(plates.length, 2);
  assert.equal(plates[0].plane.filter((v) => v === 255).length, 100);
});

test('square halftone dot area matches the ink coverage', () => {
  const w = 100, h = 100, plane = new Uint8Array(w * h).fill(Math.round(0.4 * 255));
  const { dots, cell } = halftone(plane, w, h, { widthMm: 50, heightMm: 50, lpi: 60, angle: 0, shape: 'square', minDot: 0.01, maxDot: 0.99 });
  const inside = dots.filter((d) => d.x > 5 && d.x < 45 && d.y > 5 && d.y < 45);
  const area = inside.reduce((s, d) => s + (2 * d.r) ** 2, 0) / (inside.length * cell * cell);
  assert.ok(Math.abs(area - 0.4) < 0.01, String(area));
  assert.ok(dotsPath(inside.slice(0, 3), 'square').startsWith('M'));
  assert.match(filmSvg({ widthMm: 50, heightMm: 50, label: 'K 45°', body: '<path d="M0 0"/>', mirror: true }), /scale\(-1 1\)/);
});

test('underbase is choked inside the design; coverage reports the ink limit', () => {
  const w = 20, h = 20, p = new Uint8Array(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) p[y * w + x] = 255;
  assert.equal(underbase([p], w, h, 2).filter((v) => v).length, 36);
  const cm = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]);
  const c = coverage(cm, 300);
  assert.equal(c.maxPct, 400); assert.equal(c.overShare, 0.5);
  assert.equal(cmykPlanes(cm)[3][1], 255);
});
