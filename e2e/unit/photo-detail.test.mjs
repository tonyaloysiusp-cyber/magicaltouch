import test from 'node:test';
import assert from 'node:assert/strict';

// ImageData for node.
globalThis.ImageData = globalThis.ImageData || class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
const { applyAdjust, NO_ADJUST, lensCorrect, dehazePx, denoisePx } = await import('../../lib/photo/adjust.ts');

function img(w, h, f) { const d = new ImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); const i = (y * w + x) * 4; d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b; d.data[i + 3] = 255; } return d; }
const mean = (d, c) => { let s = 0; for (let i = c; i < d.data.length; i += 4) s += d.data[i]; return s / (d.data.length / 4); };
const contrast = (d) => { let mn = 255, mx = 0; for (let i = 0; i < d.data.length; i += 4) { const y = d.data[i + 1]; mn = Math.min(mn, y); mx = Math.max(mx, y); } return mx - mn; };

test('dehaze increases contrast of a hazy picture; negative adds haze', () => {
  const hazy = img(60, 40, (x) => { const v = 150 + (x % 10 < 5 ? 25 : -25); return [v, v, v + 10]; });
  const clear = applyAdjust(hazy, { ...NO_ADJUST, dehaze: 80 }, {});
  assert.ok(contrast(clear) > contrast(hazy) * 1.3, `${contrast(clear)} vs ${contrast(hazy)}`);
  const more = applyAdjust(hazy, { ...NO_ADJUST, dehaze: -80 }, {});
  assert.ok(contrast(more) < contrast(hazy));
});

test('noise reduction lowers noise in flat areas and keeps an edge', () => {
  let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const noisy = img(80, 80, (x) => { const base = x < 40 ? 60 : 200; const n = (rnd() - 0.5) * 60; return [base + n, base + n, base + n]; });
  const out = denoisePx(noisy.data, 80, 80, 1, 0);
  const sd = (px, x0, x1) => { const v = []; for (let y = 10; y < 70; y++) for (let x = x0; x < x1; x++) v.push(px[(y * 80 + x) * 4 + 1]); const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
  assert.ok(sd(out, 5, 30) < sd(noisy.data, 5, 30) * 0.7, 'flat area smoother');
  const left = out[(40 * 80 + 30) * 4 + 1], right = out[(40 * 80 + 50) * 4 + 1];
  assert.ok(right - left > 90, 'edge kept');
});

test('colour noise reduction leaves brightness alone', () => {
  let s = 3; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const noisy = img(40, 40, () => [128 + (rnd() - 0.5) * 80, 128, 128 + (rnd() - 0.5) * 80]);
  const out = { data: denoisePx(noisy.data, 40, 40, 0, 1) };
  assert.ok(Math.abs(mean(out, 1) - mean(noisy, 1)) < 12);
});

test('lens correction: distortion moves corners, chromatic aberration shifts red and blue apart', () => {
  const grid = img(100, 100, (x, y) => (x % 20 === 0 || y % 20 === 0 ? [0, 0, 0] : [255, 255, 255]));
  const fixed = lensCorrect(grid.data, 100, 100, 0.8, 0);
  assert.notDeepEqual(Array.from(fixed.slice(0, 400)), Array.from(grid.data.slice(0, 400)));
  const centre = (50 * 100 + 50) * 4;
  assert.equal(fixed[centre + 1], grid.data[centre + 1], 'centre unchanged');
  const ca = lensCorrect(grid.data, 100, 100, 0, 1);
  let diff = 0; for (let i = 0; i < ca.length; i += 4) diff += Math.abs(ca[i] - ca[i + 2]);
  assert.ok(diff > 0, 'red and blue sampled apart');
});

test('texture boosts fine detail; old projects without the new fields stay neutral', () => {
  const fine = img(60, 60, (x, y) => { const v = 128 + ((x + y) % 2 ? 10 : -10); return [v, v, v]; });
  assert.ok(contrast(applyAdjust(fine, { ...NO_ADJUST, texture: 100 }, {})) > contrast(fine));
  const { texture, dehaze, noiseLum, noiseColor, distortion, chroma, ...old } = NO_ADJUST;
  const same = applyAdjust(fine, old, {});
  assert.deepEqual(Array.from(same.data.slice(0, 40)), Array.from(fine.data.slice(0, 40)));
});

test('skin retouch: smooths skin, leaves non-skin alone, presets are not extreme', async () => {
  const { retouchSkin, skinMask, PORTRAIT_PRESETS } = await import('../../lib/photo/adjust.ts');
  let s = 11; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Left half skin tone with blotches, right half blue.
  const im = img(80, 60, (x) => (x < 40 ? [205 + (rnd() - 0.5) * 30, 150 + (rnd() - 0.5) * 20, 125 + (rnd() - 0.5) * 20] : [40, 70, 200]));
  const m = skinMask(im.data, 80, 60);
  assert.ok(m[30 * 80 + 10] > 0.6 && m[30 * 80 + 70] < 0.1, 'skin found, blue not skin');
  const out = retouchSkin(im.data, 80, 60, 0.8, 0.4, 0.5, 0);
  const sd = (px, x0, x1) => { const v = []; for (let y = 5; y < 55; y++) for (let x = x0; x < x1; x++) v.push(px[(y * 80 + x) * 4]); const mm = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - mm) ** 2, 0) / v.length); };
  assert.ok(sd(out, 5, 30) < sd(im.data, 5, 30) * 0.8, 'skin smoother');
  assert.equal(out[(30 * 80 + 70) * 4 + 2], im.data[(30 * 80 + 70) * 4 + 2], 'non-skin unchanged');
  assert.equal(PORTRAIT_PRESETS.filter((p) => p.group === 'Female portrait').length, 7);
  assert.equal(PORTRAIT_PRESETS.filter((p) => p.group === 'Male portrait').length, 7);
  assert.ok(PORTRAIT_PRESETS.every((p) => (p.adjust.skinSmooth ?? 0) <= 65 && (p.adjust.skinTexture ?? 60) >= 35), 'never extreme');
});
