// Live check: brand logos load cross-origin, SEO titles, logo renders in a canvas from the bare domain.
import { chromium } from 'playwright';
for (const u of ['https://magicaltouchdesign.com/brand/logo.png', 'https://www.magicaltouchdesign.com/logo.png']) {
  const r = await fetch(u, { headers: { Origin: 'https://magicaltouchdesign.com' } });
  console.log(u, r.status, 'ACAO=', r.headers.get('access-control-allow-origin'));
}
const b = await chromium.launch(); const p = await b.newPage();
for (const path of ['/packaging-dieline', '/remove-background', '/free-instagram-post-maker']) {
  await p.goto('https://magicaltouchdesign.com' + path, { waitUntil: 'domcontentloaded' });
  console.log(path, '|', await p.title(), '|', await p.locator('h1').first().innerText());
}
await p.goto('https://magicaltouchdesign.com/about');
const ok = await p.evaluate(() => new Promise((res) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => { const c = document.createElement('canvas'); c.width = 10; c.height = 10; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 10, 10); try { c.toDataURL(); res('canvas ok ' + i.naturalWidth); } catch (e) { res('tainted'); } }; i.onerror = () => res('error'); i.src = 'https://www.magicaltouchdesign.com/brand/logo.png?x=' + Date.now(); }));
console.log('cross-origin www logo from apex:', ok);
await b.close();
