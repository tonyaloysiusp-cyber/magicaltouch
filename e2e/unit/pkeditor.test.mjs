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
