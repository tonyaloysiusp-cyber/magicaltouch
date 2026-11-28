import { chromium } from 'playwright';
const B = 'https://magicaltouchdesign.com';
const pages = ['/', '/templates', '/templates/category/flyers', '/templates/category/greeting-cards', '/create', '/editor?w=1080&h=1080', '/photo-studio', '/packaging-dieline', '/tutorials', '/about'];
const b = await chromium.launch();
for (const run of [1, 2]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  for (const u of pages) {
    const t0 = Date.now();
    try {
      await pg.goto(B + u, { waitUntil: 'load', timeout: 60000 });
      const nav = await pg.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const lcp = performance.getEntriesByType('largest-contentful-paint').pop(); return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), bytes: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) }; });
      console.log('[check]', `run${run}`, u.padEnd(36), `ttfb ${nav.ttfb}ms · DOM ${nav.dcl}ms · load ${nav.load}ms · ${nav.bytes} KB · total ${Date.now() - t0}ms`);
    } catch (e) { console.log('[check]', u, 'FAIL', String(e.message).slice(0, 80)); }
  }
  await ctx.close();
}
await b.close();
