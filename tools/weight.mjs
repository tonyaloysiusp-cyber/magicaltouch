import { chromium, devices } from 'playwright';
const B = 'https://www.magicaltouchdesign.com';
const browser = await chromium.launch();
for (const [label, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  for (const path of ['/', '/templates', '/tutorials']) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const rows = [];
    page.on('response', async (r) => {
      try { const b = await r.body(); rows.push({ url: r.url(), type: r.request().resourceType(), bytes: b.length }); } catch {}
    });
    await page.goto(B + path, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(8000);
    const total = rows.reduce((a, r) => a + r.bytes, 0);
    const byType = {};
    for (const r of rows) byType[r.type] = (byType[r.type] || 0) + r.bytes;
    console.log(`\n== ${label} ${path}: ${rows.length} requests, ${(total / 1e6).toFixed(2)} MB (initial, no scroll)`);
    console.log('  by type:', Object.entries(byType).map(([k, v]) => `${k} ${(v / 1e3).toFixed(0)}K`).join(', '));
    rows.sort((a, b) => b.bytes - a.bytes).slice(0, 10).forEach((r) => console.log(`  ${(r.bytes / 1e3).toFixed(0).padStart(6)}K ${r.type} ${r.url.replace(B, '').slice(0, 110)}`));
    // scroll to the bottom
    for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(250); }
    await page.waitForTimeout(3000);
    const t2 = rows.reduce((a, r) => a + r.bytes, 0);
    console.log(`  after scrolling: ${rows.length} requests, ${(t2 / 1e6).toFixed(2)} MB`);
    await ctx.close();
  }
}
await browser.close();
