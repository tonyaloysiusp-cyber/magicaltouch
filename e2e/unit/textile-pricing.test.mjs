import test from 'node:test';
import assert from 'node:assert/strict';
import { costOrder, EMPTY_PRICES } from '../../lib/textile/pricing.ts';
import { specSheetPages } from '../../lib/textile/specSheet.ts';

test('costing uses only the price table and the real roll metres', () => {
  const empty = costOrder(EMPTY_PRICES, { garments: 10, rollW: 1600, rollMm: 5000, fabric: 0, method: 0 });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.missing, ['fabric price per m²', 'printing price per m²']);
  const t = { ...EMPTY_PRICES, fabrics: [{ name: 'Poly', perM2: 10 }], methods: [{ name: 'Sub', perM2: 5, setup: 20 }], perGarment: [{ name: 'Sew', amount: 3 }], margin: 50, tax: 5, metresPerHour: 10, minutesPerGarment: 12, workers: 2 };
  const r = costOrder(t, { garments: 10, rollW: 1600, rollMm: 5000, fabric: 0, method: 0 });
  assert.equal(r.m2, 8);
  assert.equal(r.fabric, 80); assert.equal(r.print, 40); assert.equal(r.setup, 20); assert.equal(r.garmentCosts, 30);
  assert.equal(r.cost, 170); assert.equal(r.price, 255); assert.equal(r.tax, 12.75); assert.equal(r.total, 267.75);
  assert.equal(r.perGarment, 26.78);
  assert.equal(r.hours, 1.5); // 0.5 h printing + 10 × 12 min / 2 workers
  assert.deepEqual(r.missing, []);
});

test('production specification: A4 pages, data in, branding only in the footer', () => {
  const pages = specSheetPages({
    project: 'FC Test', garment: 'Football jersey', date: '15 Nov 2026', template: 'Standard template (unverified)',
    sizes: [{ size: 'M', count: 3, measures: [{ key: 'chest', label: 'Chest width (flat)', mm: 560, how: '' }] }, { size: 'XL', count: 2, measures: [{ key: 'chest', label: 'Chest width (flat)', mm: 616, how: '' }] }],
    panels: [{ panel: 'Front & back', bleed: 10, seam: 10, safe: 15 }],
    print: { rollW: 1600, lengthMm: 3610, pages: 1, use: 0.69, overlaps: 0, textMode: 'Live text', layout: 'Save fabric (hand-edited)', mirror: false },
  });
  assert.equal(pages.length, 1);
  assert.match(pages[0], /width="210mm" height="297mm"/);
  assert.match(pages[0], /61\.6/);
  assert.match(pages[0], /Magical Touch Design/);
  const body = pages[0].slice(0, pages[0].indexOf('y1="283"'));
  assert.doesNotMatch(body, /magicaltouchdesign\.com/, 'branding only in the footer');
});
