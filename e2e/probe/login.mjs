// Live login probe: loads /login, signs in with a made-up account, records what the page shows,
// console errors, failed requests and every request to Supabase or /sb.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'https://magicaltouchdesign.com';
const b = await chromium.launch();
for (const vp of [{ name: 'desktop', o: { viewport: { width: 1280, height: 800 } } }, { name: 'phone', o: { viewport: { width: 390, height: 844 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } }]) {
  const ctx = await b.newContext(vp.o); const p = await ctx.newPage();
  const log = (...a) => console.log(`[${vp.name}]`, ...a);
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log('console', m.type(), m.text().slice(0, 300)); });
  p.on('pageerror', (e) => log('PAGEERROR', String(e).slice(0, 400)));
  p.on('requestfailed', (r) => log('REQFAILED', r.method(), r.url().slice(0, 160), r.failure()?.errorText));
  p.on('response', (r) => { const u = r.url(); if (/supabase\.co|\/sb\/|\/auth\//.test(u)) log('RESP', r.status(), r.request().method(), u.slice(0, 160)); });
  const t0 = Date.now();
  const res = await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  log('login page', res?.status(), Date.now() - t0, 'ms');
  await p.waitForTimeout(3000);
  const inputs = await p.locator('input').evaluateAll((els) => els.map((e) => `${e.type}:${e.name || e.id || e.placeholder}`));
  log('inputs', inputs.join(', '));
  try {
    await p.locator('input[type=email]').first().fill('probe-' + Date.now() + '@example.com');
    await p.locator('input[type=password]').first().fill('WrongPassword123!');
    p.on('request', (r) => { if (!/\.(png|jpe?g|webp|svg|woff2?|css)(\?|$)/.test(r.url())) log('REQ', r.method(), r.url().slice(0, 200)); });
    const sw = await p.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope) : []));
    log('service workers', JSON.stringify(sw));
    const t1 = Date.now();
    await p.locator('form button[type=submit], form button:has-text("Log in"), button:has-text("Log in")').first().click();
    await p.waitForTimeout(12000);
    log('after submit', Date.now() - t1, 'ms; url', p.url());
    const errs = await p.locator('.text-red-500, [role=alert]').allInnerTexts();
    log('shown errors', JSON.stringify(errs));
  } catch (e) { log('submit failed', String(e).slice(0, 300)); }
  const btnTexts = await p.locator('button').allInnerTexts();
  log('buttons', JSON.stringify(btnTexts.slice(0, 12)));
  await p.screenshot({ path: `login-${vp.name}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
