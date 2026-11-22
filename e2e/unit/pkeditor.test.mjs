import test from 'node:test';
import assert from 'node:assert/strict';
import { newDoc, innerSize, outerSize, regenerate, withBoard, pathLength, ruleTotals, reorder, objBounds, defaultBox, readDoc } from '../../lib/packaging/editorModel.ts';

test('box from a 50 mm cube on 350 gsm SBS: 2 mm gap, board added outside', () => {
  const b = defaultBox();
  assert.deepEqual(innerSize(b), { L: 52, W: 52, D: 52 });
  const o = outerSize(b);
  assert.ok(o.L > 52.8 && o.L < 53.2, `outer ${o.L}`); // 52 + 2 × 0.43 mm caliper
});

test('regenerate keeps your own objects and replaces the generated dieline', () => {
  let d = newDoc();
  const gen = d.objects.filter((o) => o.gen).length;
  assert.ok(gen > 10);
  d = { ...d, objects: [...d.objects, { id: 'mine', name: 'Window', layer: 'structure', kind: 'rect', x: 10, y: 10, w: 20, h: 10, line: 'cut' }] };
  d = regenerate({ ...d, box: { ...d.box, style: 'tray' } });
  assert.ok(d.objects.find((o) => o.id === 'mine'));
  assert.ok(d.objects.filter((o) => o.gen).length > 4);
});

test('changing board family resets gap and glue', () => {
  const b = withBoard(defaultBox(), 'bflute', 0);
  assert.equal(b.t, 3);
  assert.deepEqual(b.clearance, { L: 4, W: 4, H: 4 });
});

test('lengths and totals', () => {
  assert.equal(pathLength('M0 0 L30 40'), 50);
  assert.equal(pathLength('M0 0 L10 0 L10 10 Z'), 10 + 10 + Math.hypot(10, 10));
  const d = { ...newDoc(), objects: [{ id: 'a', name: 'a', layer: 'structure', kind: 'rect', x: 0, y: 0, w: 10, h: 5, line: 'perf' }] };
  assert.equal(ruleTotals(d).perf, 30);
});

test('reorder up/down/top', () => {
  const o = (id) => ({ id, name: id, layer: 'artwork', kind: 'rect', x: 0, y: 0, w: 1, h: 1, line: 'art' });
  const a = [o('1'), o('2'), o('3')];
  assert.deepEqual(reorder(a, ['1'], 'up').map((x) => x.id), ['2', '1', '3']);
  assert.deepEqual(reorder(a, ['3'], 'down').map((x) => x.id), ['1', '3', '2']);
  assert.deepEqual(reorder(a, ['1'], 'top').map((x) => x.id), ['2', '3', '1']);
});

test('bounds of a moved path', () => {
  assert.deepEqual(objBounds({ id: 'p', name: '', layer: 'x', kind: 'path', d: 'M0 0 L10 20', x: 5, y: 5, w: 0, h: 0, line: 'cut' }), { x: 5, y: 5, w: 10, h: 20 });
});

test('opening rejects other files', () => {
  assert.throws(() => readDoc({ foo: 1 }));
  assert.ok(readDoc(newDoc()));
});

test('editor PDF: spot plates, trim box, outlined text, template header', async () => {
  const { editorPdf, shapePath, pathToPdf } = await import('../../lib/packaging/editorPdf.ts');
  const { PDFDocument } = await import('pdf-lib');
  const d = newDoc('Test box');
  d.objects.push({ id: 't1', name: 'Title', layer: 'artwork', kind: 'text', x: 20, y: 80, w: 40, h: 10, line: 'art', fill: '#C8102E', text: 'Hi' });
  d.objects.push({ id: 'r1', name: 'Band', layer: 'artwork', kind: 'rect', x: 0, y: 60, w: 50, h: 20, line: 'art', fill: '#0055aa' });
  for (const mode of ['print', 'template']) {
    const bytes = await editorPdf({ doc: d, mode, textPaths: { t1: 'M20 80 L30 80 L30 90 Z' } });
    const raw = Buffer.from(bytes).toString('latin1');
    assert.match(raw, /CutContour/); assert.match(raw, /Crease/);
    const p = (await PDFDocument.load(bytes)).getPage(0);
    assert.ok(p.getTrimBox().width > 100);
  }
  assert.equal(shapePath({ kind: 'path', d: 'M0 0 L10 0', x: 5, y: 2 }).replace(/\s+/g, ' ').trim(), 'M5 2 L15 2');
  assert.match(pathToPdf('M0 0 h10 v10 z', (x, y) => [x, y]), /10 0 l\n10 10 l\nh/);
});

test('die layer is added to an artwork PDF as overprinting spot colours with a trim box', async () => {
  const { appendDieLayer, specDieline, pageSizePx } = await import('../../lib/packaging/editorBridge.ts');
  const { PDFDocument, rgb } = await import('pdf-lib');
  const src = await PDFDocument.create();
  const p = src.addPage([300, 300]); p.drawRectangle({ x: 10, y: 10, width: 100, height: 100, color: rgb(1, 0, 0) });
  const out = await appendDieLayer(await src.save(), [{ kind: 'cut', d: 'M10 10 L90 10 L90 90 L10 90 Z' }, { kind: 'crease', d: 'M50 10 L50 90' }]);
  const raw = Buffer.from(out).toString('latin1');
  assert.match(raw, /CutContour/); assert.match(raw, /Crease/);
  const pg = (await PDFDocument.load(out)).getPage(0);
  const tb = pg.getTrimBox();
  assert.ok(Math.abs(tb.width - 80 * 72 / 25.4) < 0.5);
  const d = specDieline({ style: 'rte', product: { L: 50, W: 50, H: 50 }, clearance: { L: 2, W: 2, H: 2 }, grade: 'sbs', gsm: 350, t: 0.43, glue: 14, tuck: 15, lidDepth: 30 });
  assert.ok(pageSizePx(d).width > d.w * 3.7);
});

test('templates: 24 designs, scenes and previews build', async () => {
  const { PACK_TEMPLATES, templateScene, templateFlatSvg, templateMockupSvg } = await import('../../lib/packaging/templates.ts');
  assert.ok(PACK_TEMPLATES.length >= 24);
  for (const t of PACK_TEMPLATES) {
    const sc = templateScene(t);
    assert.ok(sc.some((i) => i.k === 'text' && i.name === 'Brand name'), t.id);
    assert.ok(templateFlatSvg(t).startsWith('<svg'));
    assert.ok(!/NaN/.test(templateMockupSvg(t)), t.id);
  }
});

test('size modes: product + gap, inside, outside', async () => {
  const { specInner } = await import('../../lib/packaging/editorBridge.ts');
  const base = { style: 'rte', product: { L: 50, W: 40, H: 30 }, clearance: { L: 2, W: 2, H: 2 }, grade: 'sbs', gsm: 350, t: 0.5, glue: 14, tuck: 15, lidDepth: 30 };
  assert.deepEqual(specInner(base), { L: 52, W: 42, D: 32 });
  assert.deepEqual(specInner({ ...base, mode: 'inside' }), { L: 50, W: 40, D: 30 });
  assert.deepEqual(specInner({ ...base, mode: 'outside' }), { L: 49, W: 39, D: 29 });
});

test('panel mapping: artwork stays on its panel when the box grows', async () => {
  const { remapBox, specDieline } = await import('../../lib/packaging/editorBridge.ts');
  const base = { style: 'rte', product: { L: 50, W: 40, H: 80 }, clearance: { L: 0, W: 0, H: 0 }, grade: 'sbs', gsm: 350, t: 0.5, glue: 14, tuck: 15, lidDepth: 30 };
  const a = specDieline(base), b = specDieline({ ...base, product: { L: 100, W: 40, H: 80 } });
  const fa = a.panels.find((p) => p.name === 'Front'), fb = b.panels.find((p) => p.name === 'Front');
  // a logo in the middle of the front panel
  const logo = { x: fa.x + fa.w / 2 - 5, y: fa.y + fa.h / 2 - 5, w: 10, h: 10 };
  const r = remapBox(logo, a, b);
  assert.ok(Math.abs(r.cx - (fb.x + fb.w / 2)) < 0.01 && Math.abs(r.cy - (fb.y + fb.h / 2)) < 0.01);
  assert.equal(r.fx, r.fy); // keeps its shape
  // a band filling the front panel width stretches with it
  const band = { x: fa.x, y: fa.y + 10, w: fa.w, h: 8 };
  const rb = remapBox(band, a, b);
  assert.ok(Math.abs(rb.fx - fb.w / fa.w) < 1e-9);
  // the background covering everything maps to the whole blank
  const bg = remapBox({ x: -3, y: -3, w: a.w + 6, h: a.h + 6 }, a, b);
  assert.ok(Math.abs(bg.fx - b.w / a.w) < 1e-9);
});

test('login helpers retry server hiccups and explain them', async () => {
  const { withAuthRetry, isTransientAuthError, friendlyAuthError } = await import('../../lib/authErrors.ts');
  assert.ok(isTransientAuthError({ status: 504, message: 'context deadline exceeded' }));
  assert.ok(!isTransientAuthError({ status: 400, message: 'Invalid login credentials' }));
  let n = 0;
  const r = await withAuthRetry(async () => (++n < 2 ? { error: { status: 500, message: 'error finding user: context canceled' } } : { error: null }));
  assert.equal(r.error, null); assert.equal(n, 2);
  assert.match(friendlyAuthError('500: error finding user: timeout: context canceled'), /busy/);
});
