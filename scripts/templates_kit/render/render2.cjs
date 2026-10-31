const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [src, outDir, only] = process.argv.slice(2);
  const all = JSON.parse(fs.readFileSync(src, 'utf8'));
  const list = only ? all.filter((t) => only.split(',').includes(t.slug)) : all;
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8766/' + (process.env.PAGE || 'render.html'));
  for (const t of list) {
    const r = await p.evaluate(async (t) => await window.renderOne(t), t);
    fs.writeFileSync(`${outDir}/${t.slug}.jpg`, Buffer.from(r.thumb.split(',')[1], 'base64'));
    fs.writeFileSync(`${outDir}/${t.slug}-preview.jpg`, Buffer.from(r.preview.split(',')[1], 'base64'));
  }
  console.log('rendered', list.length, [...new Set(errs)].slice(0, 5));
  await b.close();
})();
