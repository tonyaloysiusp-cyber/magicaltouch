// Unit tests for the self-opening design file (lib/mtd/format.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMtd, readMtd, unwrapSelfOpening, fileNameFor, nameFromFileName, bytesToBase64, base64ToBytes } from '../../lib/mtd/format.ts';

const doc = { name: 'Café <Card> "A"', width: 1050, height: 600, editor: 'design' };
const canvas = { version: '5.1.0', objects: [{ type: 'textbox', text: 'Hello', fontFamily: 'Inter' }] };

test('file names use .mtd.html and read back cleanly', () => {
  assert.equal(fileNameFor('Business Card'), 'Business Card.mtd.html');
  assert.equal(fileNameFor('Old.mtd'), 'Old.mtd.html');
  assert.equal(fileNameFor('a/b:c'), 'a-b-c.mtd.html');
  assert.equal(nameFromFileName('Business Card.mtd.html'), 'Business Card');
  assert.equal(nameFromFileName('Business Card.mtd'), 'Business Card');
  assert.equal(nameFromFileName('Business Card.html'), 'Business Card');
});

test('base64 round trip', () => {
  const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
  assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
});

test('saved file is an HTML page that posts to the site and opens again', async () => {
  const { blob } = await buildMtd({ canvas, document: doc, thumbnail: 'data:image/png;base64,AAAA' });
  assert.equal(blob.type, 'text/html');
  const html = await blob.text();
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /action="https:\/\/www\.magicaltouchdesign\.com\/api\/open-file"/);
  assert.ok(!html.includes('<Card>'), 'name is escaped');
  assert.ok(unwrapSelfOpening(html));
  const opened = await readMtd(blob);
  assert.equal(opened.document.name, doc.name);
  assert.equal(opened.document.width, 1050);
  assert.equal(opened.canvas.objects[0].text, 'Hello');
  assert.deepEqual(opened.fonts, ['Inter']);
});

test('old .mtd (plain gzip) files still open', async () => {
  const json = JSON.stringify({ format: 'magical-touch-design', formatVersion: 1, document: doc, canvas, assets: {} });
  const gz = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const opened = await readMtd(gz);
  assert.equal(opened.document.height, 600);
});

test('random HTML is rejected', async () => {
  await assert.rejects(readMtd(new Blob(['<html><body>hi</body></html>'])));
});
