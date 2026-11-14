import test from 'node:test';
import assert from 'node:assert/strict';
import { attachProject, readProjectFromPdf } from '../../lib/editor/pdfProject.ts';

test('our PDFs carry the editable project and give it back', async () => {
  const { PDFDocument } = await import('pdf-lib');
  const d = await PDFDocument.create(); d.addPage([200, 200]);
  const plain = await d.save();
  assert.equal(await readProjectFromPdf(plain), null);
  const payload = new TextEncoder().encode('{"hello":"design"}'.repeat(50));
  const withProj = await attachProject(plain, new Blob([payload]));
  const back = await readProjectFromPdf(withProj);
  assert.ok(back);
  assert.equal(new TextDecoder().decode(back), new TextDecoder().decode(payload));
  const re = await PDFDocument.load(withProj);
  assert.equal(re.getPageCount(), 1);
});
