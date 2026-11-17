import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutPress, suggestSheet, maxUp, templateSvg, pressPdf, verifyPressPdf, DEFAULT_PRESS, SHEETS } from '../../lib/print/pressSheet.ts';
import { readySize, changedFrom, READY_SIZE_NAMES } from '../../lib/textile/sizes.ts';
import { KURTA_FIELDS, CHUDIDAR_FIELDS, TEE_FIELDS, missing, outOfRange, conflicts } from '../../lib/textile/draft.ts';

// A4 perfect-binding cover: 210 + 8.4 spine + 210 wide, 297 high, 3 mm bleed.
const cover = { name: 'Book', title: 'Perfect binding cover', trimW: 428.4, trimH: 297, bleed: 3, safe: 5,
  folds: [{ x: 210, label: 'SPINE 8.4 mm' }, { x: 218.4 }], panels: [{ x: 0, w: 210, name: 'BACK' }, { x: 210, w: 8.4, name: 'SPINE' }, { x: 218.4, w: 210, name: 'FRONT' }] };
const trifold = { name: 'Leaflet', title: 'Tri-fold', trimW: 297, trimH: 210, bleed: 3, folds: [{ x: 99 }, { x: 198 }] };
const A = (id) => SHEETS.find((s) => s.id === id);

test('A4 tri-fold does not fit A4 at actual size, fits A3, and Fit to print scales it into the printable area', () => {
  const onA4 = layoutPress(trifold, { ...DEFAULT_PRESS, sheet: A('a4'), rotate: true });
  assert.equal(onA4.fits, false);
  assert.match(onA4.warnings[0], /needs a sheet of at least/);
  const onA3 = layoutPress(trifold, { ...DEFAULT_PRESS, sheet: A('a3'), rotate: true });
  assert.equal(onA3.fits, true); assert.equal(onA3.scale, 1);
  const fit = layoutPress(trifold, { ...DEFAULT_PRESS, sheet: { ...A('a4'), w: 297, h: 210, name: 'A4 landscape' }, mode: 'fit' });
  assert.ok(fit.scale < 1 && fit.scale > 0.8, `scale ${fit.scale}`);
  // Everything (marks too) stays inside the 3 mm printer margin.
  for (const l of fit.lines) for (const x of [l.x1, l.x2]) assert.ok(x >= 3 - 0.01 && x <= 297 - 3 + 0.01);
  assert.match(fit.warnings[0], /Fit to print/);
  // Fold marks scaled with the job.
  const folds = fit.lines.filter((l) => l.kind === 'fold');
  assert.ok(Math.abs(folds[0].x1 - (fit.items[0].x + 99 * fit.scale)) < 0.02);
});

test('cover suggests 33 × 48 / SRA3-class sheet and puts fold marks at the spine edges with the spine label', () => {
  const s = suggestSheet(cover, DEFAULT_PRESS);
  assert.ok(s && s.w * s.h >= 320 * 450 - 1, s?.name);
  const l = layoutPress(cover, { ...DEFAULT_PRESS, sheet: A('33x48'), rotate: true });
  assert.equal(l.fits, true);
  const l2 = layoutPress(cover, { ...DEFAULT_PRESS, sheet: { w: 480, h: 330, name: '48 × 33' } });
  assert.equal(l2.fits, true);
  const folds = l2.lines.filter((x) => x.kind === 'fold');
  assert.equal(folds.length, 4);
  assert.ok(l2.labels.some((t) => t.text === 'SPINE 8.4 mm'));
  assert.ok(l2.labels.some((t) => /ACTUAL SIZE/.test(t.text)));
});

test('all four crop-mark types stay outside the bleed and type 1 marks every cut line', async () => {
  const card = { name: 'Cards', title: 'Business card', trimW: 85, trimH: 55, bleed: 3, folds: [] };
  for (const markType of [1, 2, 3, 4]) {
    const o = { ...DEFAULT_PRESS, sheet: A('a4'), cols: 2, rows: 4, gap: 6, markType };
    const l = layoutPress(card, o);
    assert.equal(l.items.length, 8);
    assert.ok(l.fits, `type ${markType} fits`);
    const pdf = await pressPdf(card, l, null);
    const v = await verifyPressPdf(pdf, l);
    assert.deepEqual(v.issues, [], `type ${markType}`);
    if (markType === 4) assert.ok(l.circles.length > 0);
    if (markType === 1) assert.equal(l.lines.filter((x) => x.kind === 'cut').length, 4 * 2 + 8 * 2);
  }
  const up = maxUp(card, { ...DEFAULT_PRESS, sheet: A('sra3'), gap: 6 });
  assert.ok(up.cols * up.rows >= 12);
  assert.match(templateSvg(card, layoutPress(card, { ...DEFAULT_PRESS, sheet: A('a4') }), DEFAULT_PRESS), /<svg/);
});

test('press preview has no instruction box; branded layout template; print PDF has trim and bleed boxes and embeds a PNG', async () => {
  const { layoutTemplatePages } = await import('../../lib/print/layoutTemplate.ts');
  const { bookPrintJob, calculateBook } = await import('../../lib/binding.ts');
  const l = layoutPress(cover, { ...DEFAULT_PRESS, sheet: { w: 480, h: 330, name: '48 × 33' } });
  const svg = templateSvg(cover, l, DEFAULT_PRESS);
  assert.doesNotMatch(svg, /working file/);
  const r = calculateBook({ trimW: 210, trimH: 297, pages: 120, sides: 'double', paperGsm: 100, paperProfile: 'uncoated', paperCaliperUm: 100, coverGsm: 300, coverProfile: 'board', coverCaliperUm: 300, binding: 'perfect', bleed: 3, safe: 5, hingeScore: 6 });
  const tpl = layoutTemplatePages(bookPrintJob(r), { name: 'Book' });
  assert.equal(tpl.length, 1);
  assert.match(tpl[0].svg, /LAYOUT TEMPLATE/); assert.match(tpl[0].svg, /magicaltouchdesign\.com/); assert.match(tpl[0].svg, /not a print file/);
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'));
  const pdf = await pressPdf(cover, l, { kind: 'png', bytes: png });
  const v = await verifyPressPdf(pdf, l);
  assert.deepEqual(v.issues, []);
  assert.ok(!/magicaltouch|Magical Touch/i.test(Buffer.from(pdf).toString('latin1')), 'print files carry no branding');
});

test('ready-made sizes: every size drafts cleanly and grades up; changes are detected', () => {
  const F = { kurta: KURTA_FIELDS, chudidar: CHUDIDAR_FIELDS, tee: TEE_FIELDS };
  for (const t of ['kurta', 'chudidar', 'tee']) {
    let prev = null;
    for (const s of READY_SIZE_NAMES) {
      const m = readySize(t, s);
      const req = F[t].filter((f) => !f.style);
      assert.deepEqual(missing(req, m).map((f) => f.key), [], `${t} ${s} missing`);
      assert.deepEqual(outOfRange(F[t], m).map((f) => f.key), [], `${t} ${s} range`);
      assert.deepEqual(conflicts(t, m), [], `${t} ${s} conflicts`);
      const key = t === 'tee' ? 'chest' : 'hip';
      if (prev) assert.ok(m[key] > prev[key]);
      prev = m;
    }
  }
  const m = { ...readySize('kurta', 'M'), hip: 105 };
  assert.deepEqual(changedFrom('kurta', 'M', m), ['hip']);
});

test('print set: A4 tri-fold → actual size on A3, fit to A4, normal with bleed, job report; both sides', async () => {
  const { makePrintSet, DEFAULT_PACKAGE, ALL_FILES } = await import('../../lib/print/printPackage.ts');
  const { encodePrintJob, decodePrintJob, sideFolds, printJobEditorUrl, foldPrintJob } = await import('../../lib/print/printJob.ts');
  const { EMPTY_DETAILS } = await import('../../lib/print/jobReport.ts');
  const { calculateFold } = await import('../../lib/fold.ts');
  const { PDFDocument } = await import('pdf-lib');
  const r = calculateFold({ type: 'tri', w: 297, h: 210, caliper: 0.1, bleed: 3, safe: 5 });
  const job = foldPrintJob(r, { title: 'Tri-fold', bleed: 3, safe: 5 });
  assert.deepEqual(decodePrintJob(encodePrintJob(job)), JSON.parse(JSON.stringify(job)));
  assert.match(printJobEditorUrl(job), /printJob=/);
  assert.deepEqual(sideFolds(job, 1).map((f) => f.x), job.folds.map((f) => Math.round((297 - f.x) * 100) / 100).sort((a, b) => a - b));
  const k = 72 / 25.4, art = await PDFDocument.create();
  for (let i = 0; i < 2; i++) art.addPage([303 * k, 216 * k]).drawRectangle({ x: 0, y: 0, width: 50, height: 50 });
  const bytes = await art.save();
  let reportPages = 0;
  const set = await makePrintSet({ job, base: 'Leaflet', options: DEFAULT_PACKAGE, files: ALL_FILES, arts: [0, 1].map((page) => ({ kind: 'pdf', bytes, page })), details: { ...EMPTY_DETAILS, jobName: 'Leaflet' }, date: '17 Nov 2026', colour: 'RGB',
    toPdf: async (pages) => { reportPages = pages.length; return new Uint8Array([37, 80, 68, 70]); } });
  assert.deepEqual(set.out.map((f) => f.name), ['Leaflet_PRINT_ACTUAL_SIZE_on_A3.pdf', `Leaflet_PRINT_FIT_TO_A4_${String(Math.round(set.fitLayout.scale * 1000) / 10).replace('.', '-')}pc.pdf`, 'Leaflet_PRINT_NORMAL_with_bleed.pdf', 'Leaflet_JOB_REPORT.pdf']);
  assert.equal(reportPages, 2);
  assert.match(set.actualLayout.sheet.name, /^A3/); assert.equal(set.actualLayout.scale, 1);
  assert.ok(set.fitLayout.scale < 1 && set.fitLayout.scale > 0.8);
  for (const f of set.out.slice(0, 3)) assert.equal((await PDFDocument.load(f.data)).getPageCount(), 2);
  const normal = await PDFDocument.load(set.out[2].data), p = normal.getPage(0);
  assert.ok(Math.abs(p.getMediaBox().width / k - 303) < 0.2 && Math.abs(p.getTrimBox().width / k - 297) < 0.2);
  // Without artwork only the report is made.
  const only = await makePrintSet({ job, base: 'L', options: DEFAULT_PACKAGE, files: ALL_FILES, arts: null, details: EMPTY_DETAILS, date: '', colour: '', toPdf: async () => new Uint8Array([1]) });
  assert.deepEqual(only.out.map((f) => f.name), ['L_JOB_REPORT.pdf']);
});
