// Live check: a real self-opening file opened from disk (file://) in Chrome.
import { chromium } from 'playwright';
import fs from 'node:fs';
import zlib from 'node:zlib';
const B = 'https://www.magicaltouchdesign.com';
const doc = { format: 'magical-touch-design', formatVersion: 1, document: { name: 'Live Test Card', width: 1050, height: 600, editor: 'design' }, canvas: { version: '5.1.0', objects: [{ type: 'textbox', text: 'Hello', left: 100, top: 100, width: 400, fontSize: 60 }] }, assets: {} };
const b64 = zlib.gzipSync(JSON.stringify(doc)).toString('base64');
const html = `<!doctype html><html><body><form id="mtd-open" method="post" action="${B}/api/open-file" enctype="multipart/form-data"><textarea name="mtd" hidden>${b64}</textarea><button>Open</button></form><script>setTimeout(function(){document.getElementById('mtd-open').submit()},500)</script></body></html>`;
fs.writeFileSync('/tmp/Live Test Card.mtd.html', html);
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto('file:///tmp/Live%20Test%20Card.mtd.html');
await page.waitForTimeout(9000);
console.log('after double-click, page is:', page.url());
for (const p of ['/tutorials', '/tutorials/beginner-design-basics', '/open', '/mockups']) {
  const r = await page.goto(B + p, { waitUntil: 'domcontentloaded' });
  console.log(r.status(), p, '->', page.url().replace(B, ''), (await page.title()).slice(0, 60));
}
for (const p of ['/templates/collection/collection.json', '/templates/collection/summer-music-festival.jpg', '/og-image.png']) {
  const r = await fetch(B + p); console.log(r.status, p);
}
await browser.close();
