import test from 'node:test';
import assert from 'node:assert/strict';

const F = await import('../../lib/photo/face.ts');
const { applyFaceEditPx, NO_FACE_EDIT, FACE_OVAL, EYE_R, EYE_L, LIPS_OUTER, LIPS_INNER, shapeWarps, isFaceNeutral, FACE_PRESETS } = F;

// A synthetic 200×240 "face": skin ellipse, two eyes (white with a dark iris),
// lips (red) with yellowish teeth inside. Landmarks are placed on the same shapes.
const W = 200, H = 240;
const ring = (cx, cy, rx, ry, n, a0 = 0) => Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos(a0 + (i / n) * 2 * Math.PI), y: cy + ry * Math.sin(a0 + (i / n) * 2 * Math.PI) }));
function landmarks() {
  const lm = Array.from({ length: 478 }, () => ({ x: 100, y: 120 }));
  const put = (ids, pts) => ids.forEach((id, i) => (lm[id] = pts[i]));
  put(FACE_OVAL, ring(100, 120, 70, 95, FACE_OVAL.length, -Math.PI / 2) /* starts at the forehead, clockwise like the real mesh */);
  put(EYE_R, ring(70, 95, 16, 7, EYE_R.length));
  put(EYE_L, ring(130, 95, 16, 7, EYE_L.length));
  put(LIPS_OUTER, ring(100, 170, 26, 12, LIPS_OUTER.length));
  put(LIPS_INNER, ring(100, 170, 18, 5, LIPS_INNER.length));
  put([468, 469, 470, 471, 472], [{ x: 70, y: 95 }, { x: 75, y: 95 }, { x: 70, y: 90 }, { x: 65, y: 95 }, { x: 70, y: 100 }]);
  put([473, 474, 475, 476, 477], [{ x: 130, y: 95 }, { x: 135, y: 95 }, { x: 130, y: 90 }, { x: 125, y: 95 }, { x: 130, y: 100 }]);
  lm[1] = { x: 100, y: 135 }; lm[129] = { x: 90, y: 130 }; lm[358] = { x: 110, y: 130 };
  return lm;
}
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function picture(irisRed = false) {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = [40, 60, 90]; // background
    if (inEll(x, y, 100, 120, 70, 95)) c = [205, 160, 135]; // skin
    for (const ex of [70, 130]) {
      if (inEll(x, y, ex, 95, 16, 7)) c = [200, 198, 190];
      if (inEll(x, y, ex, 95, 5, 5)) c = irisRed ? [210, 40, 40] : [90, 70, 50];
    }
    if (inEll(x, y, 100, 170, 26, 12)) c = [175, 85, 90];
    if (inEll(x, y, 100, 170, 17, 4.5)) c = [215, 200, 140];
    const k = (y * W + x) * 4; px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255;
  }
  return px;
}
const get = (px, x, y) => { const k = (y * W + x) * 4; return [px[k], px[k + 1], px[k + 2]]; };

test('a neutral edit changes nothing', () => {
  const px = picture();
  assert.ok(isFaceNeutral(NO_FACE_EDIT));
  assert.deepEqual(applyFaceEditPx(px, W, H, landmarks(), NO_FACE_EDIT), px);
});

test('teeth whitening takes out the yellow inside the mouth only', () => {
  const px = picture(), out = applyFaceEditPx(px, W, H, landmarks(), { ...NO_FACE_EDIT, teeth: 80 });
  const [r0, g0, b0] = get(px, 100, 170), [r1, g1, b1] = get(out, 100, 170);
  assert.ok(b1 - b0 > 25, `blue ${b0}→${b1}`);
  assert.ok((r1 + g1) / 2 - b1 < ((r0 + g0) / 2 - b0) * 0.6, 'less yellow');
  assert.deepEqual(get(out, 100, 60), get(px, 100, 60), 'forehead untouched');
  assert.deepEqual(get(out, 10, 10), get(px, 10, 10), 'background untouched');
});

test('eye whites get lighter, the iris and skin keep their colour', () => {
  const px = picture(), out = applyFaceEditPx(px, W, H, landmarks(), { ...NO_FACE_EDIT, eyeBright: 80 });
  const w0 = get(px, 60, 95), w1 = get(out, 60, 95);
  assert.ok(w1[2] > w0[2] + 10 && w1[0] >= w0[0], `${w0} → ${w1}`);
  const i0 = get(px, 70, 95), i1 = get(out, 70, 95);
  assert.ok(Math.abs(i1[0] - i0[0]) < 6, 'iris kept');
  assert.deepEqual(get(out, 100, 120), get(px, 100, 120), 'skin kept');
});

test('lip colour tints the lips, not the teeth', () => {
  const px = picture(), out = applyFaceEditPx(px, W, H, landmarks(), { ...NO_FACE_EDIT, lipColour: '#7A2A8C', lipAmount: 80 });
  const l0 = get(px, 100, 180), l1 = get(out, 100, 180);
  assert.ok(l1[2] > l0[2] + 15, `lip moves towards purple ${l0} → ${l1}`);
  const t0 = get(px, 100, 170), t1 = get(out, 100, 170);
  assert.ok(Math.abs(t1[2] - t0[2]) < 12, 'teeth kept');
});

test('red-eye fix removes the red from the pupils', () => {
  const px = picture(true), out = applyFaceEditPx(px, W, H, landmarks(), { ...NO_FACE_EDIT, redEye: true });
  const [r1, g1] = get(out, 70, 95);
  assert.ok(r1 < 90 && r1 < g1 * 1.6, `r ${r1}`);
});

test('eye size enlarges the eye a little, never a lot', () => {
  const lm = landmarks(), px = picture();
  const count = (p) => { let n = 0; for (let y = 80; y < 110; y++) for (let x = 50; x < 90; x++) { const [r, g, b] = get(p, x, y); if (g > 180 || r < 150) n++; } return n; };
  const big = count(applyFaceEditPx(px, W, H, lm, { ...NO_FACE_EDIT, eyeSize: 100 }));
  const base = count(px);
  assert.ok(big > base * 1.1 && big < base * 1.9, `${base} → ${big}`);
  const small = count(applyFaceEditPx(px, W, H, lm, { ...NO_FACE_EDIT, eyeSize: -100 }));
  assert.ok(small < base, 'negative makes it smaller');
});

test('slim face makes the face a few per cent narrower at the cheeks', () => {
  const lm = landmarks(), px = picture();
  const width = (p, y) => { let n = 0; for (let x = 0; x < W; x++) { const [r, , b] = get(p, x, y); if (r > 150 && b < 150) n++; } return n; };
  const y = 120, w0 = width(px, y), w1 = width(applyFaceEditPx(px, W, H, lm, { ...NO_FACE_EDIT, faceSlim: 100 }), y);
  assert.ok(w1 < w0 - 1 && w1 > w0 * 0.88, `${w0} → ${w1}`);
  assert.ok(shapeWarps(lm, NO_FACE_EDIT).length === 0);
});

test('presets stay gentle', () => {
  for (const p of FACE_PRESETS) for (const [k, v] of Object.entries(p.edit)) if (typeof v === 'number') assert.ok(Math.abs(v) <= 50, `${p.id} ${k}=${v}`);
});

test('new shape controls make warps and presets scale with strength', () => {
  const lm = Array.from({ length: 478 }, (_, i) => ({ x: 60 + (i % 20) * 4, y: 40 + Math.floor(i / 20) * 7 }));
  for (const key of ['eyeDistance', 'browLift', 'forehead', 'noseLength', 'lipFull', 'mouthWidth', 'smile']) {
    const ws = F.shapeWarps(lm, { ...F.NO_FACE_EDIT, [key]: 60 });
    assert.ok(ws.length > 0, key);
  }
  const p = F.FACE_PRESETS.find((x) => x.id === 's-v');
  const half = F.presetAt(p.edit, 50), full = F.presetAt(p.edit, 100);
  assert.equal(full.jaw, 45); assert.equal(half.jaw, 23);
  assert.equal(F.presetAt({ lipColour: '#112233', lipAmount: 40 }, 50).lipColour, '#112233');
});
