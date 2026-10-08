// Drives the real editor in Chromium and writes screenshots plus a
// results.json into e2e-out/. Each scenario is independent.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const OUT = "e2e-out/shots"; fs.mkdirSync("e2e-out", { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const results = [];

const scenarios = (await import('./scenarios.mjs')).default;
const only = process.env.E2E_ONLY;

const browser = await chromium.launch();
for (const sc of scenarios) {
  if (only && !sc.name.includes(only)) continue;
  const ctx = await browser.newContext({ viewport: sc.viewport || { width: 1440, height: 900 }, hasTouch: !!sc.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`.slice(0, 400)); });
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`.slice(0, 600)));
  page.on('dialog', (d) => { logs.push(`dialog: ${d.message()}`); d.dismiss().catch(() => {}); });
  const checks = [];
  const t = {
    page, BASE,
    check(name, ok, detail) { checks.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 300) }); },
    async shot(name) { await page.screenshot({ path: `${OUT}/${sc.name}--${name}.png` }); },
    async editor(q = 'w=1080&h=1080') {
      await page.goto(`${BASE}/editor?${q}`);
      await page.waitForFunction(() => !!window.__fabricCanvas, null, { timeout: 30000 });
      await page.waitForTimeout(800);
    },
    eval: (fn, arg) => page.evaluate(fn, arg),
  };
  const started = Date.now();
  let error = null;
  try { await sc.run(t); } catch (e) { error = String(e && e.stack || e).slice(0, 1500); try { await t.shot('error'); } catch {} }
  results.push({ name: sc.name, ms: Date.now() - started, error, checks, logs: logs.slice(0, 40) });
  await ctx.close();
}
await browser.close();
fs.writeFileSync('e2e-out/results.json', JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.error || r.checks.some((c) => !c.ok));
console.log(`${results.length} scenarios, ${failed.length} with failures`);
