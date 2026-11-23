// CPU profile of live pages (4× CPU slow-down, like Lighthouse mobile): long tasks and the
// functions / scripts that take the most main-thread time while the page loads.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://magicaltouchdesign.com';
const paths = (process.env.PATHS || '/ /templates').split(/\s+/).filter(Boolean);
const b = await chromium.launch();
for (const p of paths) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, userAgent: 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 mt-perf' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch {} });
  const t0 = Date.now();
  await page.goto(BASE + p, { waitUntil: 'load', timeout: 90000 }).catch((e) => console.log('goto', e.message));
  await page.waitForTimeout(9000);
  const { profile } = await cdp.send('Profiler.stop');
  const lt = await page.evaluate(() => window.__lt);
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => [r.name.replace(location.origin, ''), Math.round(r.transferSize / 1024), Math.round(r.duration)]).sort((a, b) => b[1] - a[1]).slice(0, 12));
  const lcp = await page.evaluate(() => new Promise((r) => { try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); r(e ? [Math.round(e.startTime), e.element ? e.element.tagName + '.' + String(e.element.className).slice(0, 60) : '', e.url || ''] : null); }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => r(null), 500); } catch { r(null); } }));
  // self time per function and per script
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map(); const dt = profile.timeDeltas; let i = 0;
  for (const s of profile.samples) { self.set(s, (self.get(s) || 0) + (dt[i++] || 0)); }
  const fn = new Map(), scr = new Map();
  for (const [id, us] of self) {
    const n = byId.get(id); const cf = n.callFrame;
    if (['(idle)', '(program)', '(root)'].includes(cf.functionName)) continue;
    const url = (cf.url || '').replace(/^https?:\/\/[^/]+/, '').slice(-60);
    const k = `${cf.functionName || '(anon)'} @ ${url}:${cf.lineNumber}`;
    fn.set(k, (fn.get(k) || 0) + us); scr.set(url || cf.functionName, (scr.get(url || cf.functionName) || 0) + us);
  }
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, us]) => `   ${String(Math.round(us / 1000)).padStart(6)} ms  ${n}`).join('\n');
  const total = lt.reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
  console.log(`\n===== ${p}  (wall ${Date.now() - t0} ms)  long tasks ${lt.length}, blocking ${total} ms  LCP ${JSON.stringify(lcp)}`);
  console.log('  long tasks [start, ms]:', JSON.stringify(lt.slice(0, 25)));
  console.log('  biggest downloads [path, KB, ms]:'); res.forEach((r) => console.log('   ', JSON.stringify(r)));
  console.log('  scripts by self time:\n' + top(scr, 10));
  console.log('  functions by self time:\n' + top(fn, 25));
  await ctx.close();
}
await b.close();
