// Passport / visa photo specs, file-size targeting, checks, and the
// portrait cut-out helpers (lib/passportPhoto.ts, lib/portraitMatte.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHOTO_SPECS, COUNTRIES, PURPOSES, fitFileSize, checkFile, customSpec, outputSize, autoFit } from '../../lib/passportPhoto.ts';
import { boxBlur, guidedFilter, cleanRegions, decontaminate, headFromAlpha, bgDistance } from '../../lib/portraitMatte.ts';
import { jpegWithDpi } from '../../lib/pngDpi.ts';

test('every spec is complete and ids are unique', () => {
  const ids = new Set();
  for (const s of PHOTO_SPECS) {
    assert.ok(!ids.has(s.id), s.id); ids.add(s.id);
    assert.ok(s.w > 0 && s.h > 0 && s.head[0] < s.head[1] && s.head[1] < s.h, s.id);
    assert.ok(PURPOSES.some((p) => p.id === s.purpose), s.id);
    assert.match(s.bg, /^#[0-9A-F]{6}$/i);
    if (s.digital) {
      const d = s.digital;
      assert.ok(!d.minW || d.w >= d.minW, `${s.id} width ≥ min`);
      assert.ok(!d.maxW || d.w <= d.maxW, `${s.id} width ≤ max`);
      assert.ok(!d.minH || d.h >= d.minH, `${s.id} height ≥ min`);
      assert.ok(!d.maxH || d.h <= d.maxH, `${s.id} height ≤ max`);
      assert.ok(!d.square || d.w === d.h, `${s.id} square`);
      assert.ok(!d.minKB || !d.maxKB || d.minKB < d.maxKB);
    }
  }
  assert.ok(COUNTRIES.length >= 30);
  const ds160 = PHOTO_SPECS.find((s) => s.id === 'us-visa');
  assert.equal(ds160.digital.maxKB, 240);
  assert.deepEqual([ds160.digital.w, ds160.digital.h], [600, 600]);
});

// A fake JPEG encoder: bytes grow with pixels and quality.
const fakeEnc = (k = 1) => async (w, h, q) => Math.round(w * h * (0.05 + q * q * 0.5) * k);

test('file size lands inside the KB range by lowering quality', async () => {
  const d = { w: 600, h: 600, maxKB: 240, minKB: 10, format: 'jpeg', minW: 600, maxW: 1200, minH: 600, maxH: 1200, square: true };
  const r = await fitFileSize(d, fakeEnc());
  assert.ok(r.ok);
  assert.ok(r.bytes <= 240 * 1024 && r.bytes >= 10 * 1024, String(r.bytes));
  assert.equal(r.w, 600); assert.equal(r.h, 600);
});

test('file size shrinks pixels when quality alone is not enough (within limits)', async () => {
  const d = { w: 1000, h: 1000, minW: 350, minH: 350, maxW: 1000, maxH: 1000, minKB: 10, maxKB: 30, format: 'jpeg', square: true };
  const r = await fitFileSize(d, fakeEnc());
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.w < 1000 && r.w >= 350 && r.w === r.h);
});

test('too-small files go up in size when a minimum KB is required', async () => {
  const d = { w: 200, h: 230, minKB: 20, maxKB: 50, format: 'jpeg' };
  const r = await fitFileSize(d, fakeEnc(0.6));
  assert.ok(r.bytes >= 20 * 1024 && r.bytes <= 50 * 1024, JSON.stringify(r));
});

test('checklist flags wrong size and passes right size', () => {
  const s = PHOTO_SPECS.find((x) => x.id === 'cn-visa');
  const good = checkFile(s, { w: 354, h: 472, bytes: 80 * 1024, format: 'jpeg', dpi: 300 });
  assert.ok(good.every((c) => c.ok), JSON.stringify(good));
  const bad = checkFile(s, { w: 354, h: 472, bytes: 150 * 1024, format: 'jpeg', dpi: 300 });
  assert.equal(bad.find((c) => c.label === 'File size').ok, false);
});

test('custom size in pixels and mm', () => {
  const a = customSpec({ w: 200, h: 230, unit: 'px', dpi: 200, minKB: 20, maxKB: 50, bg: '#FFFFFF' });
  assert.deepEqual(outputSize(a), { w: 200, h: 230, dpi: 200 });
  const b = customSpec({ w: 35, h: 45, unit: 'mm', dpi: 300, bg: '#FFFFFF' });
  assert.deepEqual([outputSize(b).w, outputSize(b).h], [413, 531]);
});

test('auto fit with a detected head puts the head at the target height', () => {
  const s = PHOTO_SPECS.find((x) => x.id === 'uk');
  const W = 413, H = 531;
  const head = { top: 0.2, chin: 0.55, cx: 0.5 };
  const f = autoFit({ x: 0.1, y: 0.2, w: 0.8, h: 0.8 }, { w: 1000, h: 1000 }, s, W, H, head);
  const headPx = (head.chin - head.top) * 1000 * f.scale;
  const target = ((s.head[0] + s.head[1]) / 2 / s.h) * H;
  assert.ok(Math.abs(headPx - target) < 0.5);
  assert.ok(Math.abs(f.dx + 0.5 * 1000 * f.scale - W / 2) < 0.5, 'centred');
});

test('box blur and guided filter keep a flat image flat', () => {
  const w = 20, h = 10, a = new Float32Array(w * h).fill(0.4);
  assert.ok(boxBlur(a, w, h, 3).every((v) => Math.abs(v - 0.4) < 1e-6));
  const I = new Float32Array(w * h).fill(0.5);
  assert.ok(guidedFilter(I, a, w, h, 2, 1e-3).every((v) => Math.abs(v - 0.4) < 1e-4));
});

test('guided filter snaps a blurry mask to the image edge', () => {
  const w = 40, h = 1, I = new Float32Array(w), p = new Float32Array(w);
  for (let x = 0; x < w; x++) { I[x] = x < 20 ? 0 : 1; p[x] = Math.max(0, Math.min(1, (x - 14) / 12)); }
  const q = guidedFilter(I, p, w, h, 4, 1e-4);
  assert.ok(q[17] < 0.3 && q[22] > 0.7, `${q[17]} ${q[22]}`);
});

test('region clean-up drops specks and fills holes', () => {
  const w = 30, h = 30, m = new Uint8Array(w * h);
  for (let y = 5; y < 30; y++) for (let x = 5; x < 25; x++) m[y * w + x] = 1; // person
  for (let y = 15; y < 18; y++) for (let x = 12; x < 15; x++) m[y * w + x] = 0; // hole
  m[1 * w + 1] = 1; // speck
  const c = cleanRegions(m, w, h);
  assert.equal(c[16 * w + 13], 1, 'hole filled');
  assert.equal(c[1 * w + 1], 0, 'speck removed');
  assert.equal(c[0], 0, 'background stays');
});

test('colour clean-up removes the wall colour from edge pixels', () => {
  const w = 3, h = 1;
  // left: green wall, middle: 50/50 mix of skin and green, right: skin
  const rgba = new Uint8ClampedArray([127, 201, 106, 255, 164, 177, 113, 255, 201, 154, 120, 255]);
  const alpha = new Float32Array([0, 0.5, 1]);
  decontaminate(rgba, alpha, w, h, 2);
  assert.ok(Math.abs(rgba[4] - 201) < 3 && Math.abs(rgba[5] - 153) < 3, `${rgba[4]} ${rgba[5]}`);
});

test('wall-colour distance is low on the wall and high on the person', () => {
  const w = 4, h = 1, rgba = new Uint8ClampedArray([127, 201, 106, 255, 127, 201, 106, 255, 201, 154, 120, 255, 30, 20, 15, 255]);
  const d = bgDistance(rgba, new Uint8Array([1, 1, 0, 0]), w, h, 2);
  assert.ok(d[1] < 0.05 && d[2] > 0.6 && d[3] > 0.9);
});

test('head box from a head-and-shoulders silhouette', () => {
  const w = 100, h = 120, a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inHead = ((x - 50) / 20) ** 2 + ((y - 40) / 25) ** 2 <= 1;
    const inNeck = y >= 60 && y < 80 && Math.abs(x - 50) <= 8;
    const inBody = y >= 80 && Math.abs(x - 50) <= 45;
    a[y * w + x] = inHead || inNeck || inBody ? 1 : 0;
  }
  const hd = headFromAlpha(a, w, h);
  assert.ok(hd);
  assert.ok(Math.abs(hd.top - 15 / h) < 0.02, String(hd.top));
  assert.ok(Math.abs(hd.chin * h - 65) < 6, String(hd.chin * h));
  assert.ok(Math.abs(hd.cx - 0.5) < 0.02);
});

test('JPEG DPI is written into the JFIF header', () => {
  const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const out = jpegWithDpi(jfif, 300);
  assert.equal(out[13], 1); assert.equal((out[14] << 8) | out[15], 300); assert.equal((out[16] << 8) | out[17], 300);
  const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 2, 0xff, 0xd9]);
  const out2 = jpegWithDpi(bare, 600);
  assert.equal(out2[3], 0xe0); assert.equal((out2[14] << 8) | out2[15], 600);
  assert.equal(out2.length, bare.length + 18);
});
