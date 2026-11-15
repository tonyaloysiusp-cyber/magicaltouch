import test from 'node:test';
import assert from 'node:assert/strict';
const D = await import('../../lib/textile/draft.ts');
const { flatten, normalize } = await import('../../lib/textile/vector.ts');

const K = { bust: 92, waist: 78, hip: 100, shoulder: 38, length: 105, waistLength: 40, armhole: 44, frontNeck: 18, backNeck: 6, sleeveLength: 48, bicep: 30, sleeveOpening: 24 };
const box = (d) => { const pts = flatten(normalize(d), 0.5).flatMap((r) => r.pts); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
const widthAt = (d, y) => { const xs = []; for (const r of flatten(normalize(d), 0.5)) { const p = r.pts; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [x1, y1] = p[j], [x2, y2] = p[i]; if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1)); } } xs.sort((a, b) => a - b); return xs[xs.length - 1] - xs[0]; };

test('nothing is drafted without the body measurements', () => {
  const miss = D.missing(D.KURTA_FIELDS, {}).map((f) => f.key);
  assert.ok(miss.includes('bust') && miss.includes('length') && !miss.includes('ease'), 'style settings are not required');
  assert.equal(D.missing(D.KURTA_FIELDS, K).length, 0);
  assert.equal(D.missing(D.CHUDIDAR_FIELDS, {}).length, D.CHUDIDAR_FIELDS.filter((f) => !f.style).length);
});

test('kurta pieces follow the measurements', () => {
  const p = D.draftKurta(K, 'round', 'elbow');
  const ids = p.pieces.map((x) => x.id);
  assert.deepEqual(ids, ['front', 'back', 'sleeve-l', 'sleeve-r', 'facing']);
  const f = p.pieces[0];
  assert.equal(f.h, 1050);
  const b = box(f.d);
  assert.ok(b.x0 >= 0 && b.x1 <= f.w + 0.5 && b.y1 <= f.h + 0.5, 'outline inside its box');
  const bustW = widthAt(f.d, 222); // armhole depth = 44/2 cm
  assert.ok(Math.abs(bustW - (920 + 60) / 2) < 6, `bust width ${bustW}`);
  const waistW = widthAt(f.d, 399);
  assert.ok(Math.abs(waistW - (780 + 60) / 2) < 8, `waist width ${waistW}`);
  assert.ok(widthAt(f.d, 5) > 0);
  const s = p.pieces[2];
  assert.equal(s.h, 480); assert.equal(s.w, 350);
  assert.equal(D.draftKurta(K, 'v', 'sleeveless').pieces.filter((x) => x.id.startsWith('sleeve')).length, 0);
});

test('neck styles change only the front neckline', () => {
  const r = D.draftKurta(K, 'round', 'short'), v = D.draftKurta(K, 'v', 'short');
  assert.notEqual(r.pieces[0].d, v.pieces[0].d);
  assert.equal(r.pieces[1].d, v.pieces[1].d);
  assert.match(v.pieces[0].d, /^M[\d.]+ 0L[\d.]+ 180L/);
});

test('chudidar legs: hip at the top, ankle at the bottom with gathers', () => {
  const C = { waist: 72, hip: 98, crotch: 28, thigh: 56, knee: 38, calf: 34, ankle: 24, length: 100, kneeLength: 58 };
  assert.deepEqual(D.conflicts('chudidar', C), []);
  const p = D.draftChudidar(C);
  const leg = p.pieces[0];
  assert.equal(leg.h, 1300); // length + 30 cm gathers
  assert.ok(Math.abs(widthAt(leg.d, leg.h - 1) - 255) < 3, 'ankle + 1.5 cm');
  assert.ok(widthAt(leg.d, 1) > (980 + 60) / 2, 'top wider than half hip');
  assert.ok(p.pieces[1].mirror);
});

test('conflicting measurements are reported', () => {
  assert.ok(D.conflicts('kurta', { ...K, waistLength: 120 }).length > 0);
  assert.ok(D.outOfRange(D.KURTA_FIELDS, { bust: 920 }).length === 1, 'mm typed instead of cm');
});

test('dupatta and fabric are exact rectangles', () => {
  const p = D.draftRect('dupatta', { width: 90, length: 225 });
  assert.equal(p.pieces[0].w, 900); assert.equal(p.pieces[0].h, 2250);
});

test('tech pack: branded footer, measurements and pieces listed', async () => {
  const { techPackPages } = await import('../../lib/textile/techPack.ts');
  const product = D.draftKurta(K, 'round', 'elbow');
  const pages = techPackPages({ project: 'Bridal kurta', garment: product.label, date: '15 November 2026', product, measurements: [{ label: 'Bust', value: '92' }], colours: [{ role: 'Body', hex: '#7A1F3D' }], artwork: [], order: [{ label: 'Made to measure', qty: 2 }], print: { rollW: 1600, bleed: 10, textMode: 'outlines' }, embroidery: { colours: [{ name: 'Gold', hex: '#C9A86A', stitches: 1200 }], stitches: 1200, sizeMm: [80, 40] }, notes: ['Test garment first'] });
  const all = pages.join('');
  assert.ok(pages.length >= 1);
  assert.match(all, /Magical Touch Design/);
  assert.match(all, /Sleeve left/); assert.match(all, /Bust/); assert.match(all, /1,200 stitches/);
  assert.match(all, /CMYK/);
});
