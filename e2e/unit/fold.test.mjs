import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFold, foldDiagramSvg, checkPdfForFold, FOLDS } from '../../lib/fold.ts';

const base = { w: 297, h: 210, caliper: 0.1, bleed: 3, safe: 5 };
test('every fold type gives panels that add up to the sheet, ordered folds and a folded size', () => {
  for (const f of FOLDS) {
    const r = calculateFold({ ...base, w: f.id === 'map' || f.id === 'accordion' || f.id === 'roll' ? 600 : 297, type: f.id, panels: 6 });
    const total = r.panels.reduce((a, p) => a + p.w, 0);
    assert.ok(Math.abs(total - r.flat.w) < 0.5, `${f.id} panels add up (${total})`);
    assert.ok(r.folds.length >= 1 && r.folds.every((x) => x.order >= 1), `${f.id} folds ordered`);
    assert.ok(r.sequence.length >= 1 && r.folded.w > 0 && r.folded.h > 0);
    assert.deepEqual(r.errors, [], `${f.id}: ${r.errors.join(' ')}`);
  }
});

test('tri-fold: tuck-in panel shorter by the allowance, folded size of one panel', () => {
  const r = calculateFold({ ...base, type: 'tri' });
  assert.equal(r.allowance, 1);
  assert.ok(r.panels[0].w < r.panels[1].w && Math.abs(r.panels[1].w - r.panels[0].w - 1) < 0.2, JSON.stringify(r.panels.map((p) => p.w)));
  assert.equal(r.folded.h, 210);
  assert.ok(Math.abs(r.folded.w - 99.3) < 0.2);
  assert.equal(r.panels[2].outside, 'Front cover');
});

test('roll fold: each inner panel shorter; gate fold flaps meet short of the middle', () => {
  const r = calculateFold({ ...base, w: 500, type: 'roll', panels: 5, caliper: 0.15 });
  const w = r.panels.map((p) => p.w);
  for (let i = 1; i < w.length; i++) assert.ok(w[i] > w[i - 1], 'widths grow towards the cover');
  const g = calculateFold({ ...base, type: 'gate' });
  assert.ok(g.panels[0].w + g.panels[2].w < g.panels[1].w);
});

test('cross and map folds halve the height; custom widths are checked', () => {
  assert.equal(calculateFold({ ...base, type: 'cross' }).folded.h, 105);
  assert.equal(calculateFold({ ...base, w: 600, type: 'map', panels: 6 }).folded.h, 105);
  const bad = calculateFold({ ...base, type: 'z', widths: [100, 100, 50] });
  assert.ok(bad.errors.some((e) => /add up/.test(e)));
  const narrow = calculateFold({ ...base, w: 150, type: 'accordion', panels: 8 });
  assert.ok(narrow.errors.some((e) => /30 mm/.test(e)));
});

test('diagram and PDF check', () => {
  const r = calculateFold({ ...base, type: 'tri' });
  const svg = foldDiagramSvg(r, 'outside', 3, 5);
  assert.match(svg, /Front cover/); assert.match(svg, /stroke-dasharray/);
  assert.ok(checkPdfForFold({ pages: [{ w: 303, h: 216, trim: { w: 297, h: 210 } }, { w: 303, h: 216, trim: { w: 297, h: 210 } }] }, r, 3).ok);
  const wrong = checkPdfForFold({ pages: [{ w: 210, h: 297 }] }, r, 3);
  assert.ok(!wrong.ok && wrong.issues.some((s) => /2 flat pages/.test(s)) && wrong.issues.some((s) => /turned 90/.test(s)));
});

test('job report: one branded 2-page document built from the calculation', async () => {
  const { jobReportPages, EMPTY_DETAILS } = await import('../../lib/print/jobReport.ts');
  const { foldPrintJob, sidePanels } = await import('../../lib/print/printJob.ts');
  const { calculateFold } = await import('../../lib/fold.ts');
  const fold = calculateFold({ type: 'accordion', w: 297, h: 210, panels: 4, caliper: 0.1, bleed: 3, safe: 7 });
  const job = foldPrintJob(fold, { title: 'Accordion', bleed: 3, safe: 7, paper: '150 gsm matt' });
  assert.equal(sidePanels(job, 1)[3].name, 'Inside 1');
  const pages = jobReportPages({ job, details: { ...EMPTY_DETAILS, jobName: 'Leaflet', client: 'Client A' }, date: '16 Nov 2026', previews: [], files: [], margin: 3, markType: 1, colour: 'CMYK' });
  assert.equal(pages.length, 2);
  const all = pages.join('');
  assert.match(all, /JOB REPORT/); assert.match(all, /297 × 210 mm/); assert.match(all, /74\.25 \/ 74\.25/);
  assert.match(all, /Client A/); assert.match(all, /150 gsm matt/);
  assert.match(all, /Cut marks — cut here/); assert.match(all, /FOLDING SEQUENCE/);
  assert.match(all, /magicaltouchdesign\.com/); assert.match(all, /02 \/ 02/); assert.match(all, /Approval/);
});

test('concertina and custom folds; mechanical bindings and signatures', async () => {
  const { calculateFold } = await import('../../lib/fold.ts');
  const c = calculateFold({ type: 'concertina', w: 297, h: 210, panels: 4, caliper: 0.1, bleed: 3, safe: 5 });
  assert.deepEqual(c.panels.map((p) => p.w), [74.25, 74.25, 74.25, 74.25]);
  const u = calculateFold({ type: 'custom', w: 300, h: 100, panels: 3, caliper: 0.1, bleed: 3, safe: 5, widths: [90, 100, 110], dirs: ['valley', 'valley'] });
  assert.deepEqual(u.panels.map((p) => p.w), [90, 100, 110]);
  assert.ok(u.folds.every((f) => f.dir === 'valley'));
  const { calculateBook } = await import('../../lib/binding.ts');
  const w = calculateBook({ trimW: 210, trimH: 297, pages: 100, sides: 'double', paperGsm: 100, paperProfile: 'uncoated', paperCaliperUm: 100, coverGsm: 300, coverProfile: 'board', coverCaliperUm: 300, binding: 'wire', punchMargin: 10 });
  assert.equal(w.leaves, 50);
  assert.equal(w.blockMm, 5.6); // 50 × 0.1 + 2 × 0.3
  assert.equal(w.mechanical.elementMm, 7.6);
  assert.equal(w.cover.widthMm, 216);
  const p = calculateBook({ trimW: 148, trimH: 210, pages: 120, sides: 'double', paperGsm: 80, paperProfile: 'uncoated', paperCaliperUm: 100, coverGsm: 300, coverProfile: 'board', coverCaliperUm: 300, binding: 'perfect', signaturePages: 16 });
  assert.deepEqual(p.signatures, { per: 16, count: 8, sheets: 32, blanks: 8 });
});
