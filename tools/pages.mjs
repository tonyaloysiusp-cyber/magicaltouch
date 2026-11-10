// Visits key live pages in Chromium (desktop + phone): status, title, h1,
// error screens, console errors, broken images, horizontal overflow.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const B = 'https://www.magicaltouchdesign.com';
const PAGES = ['/', '/templates', '/templates?q=birthday%20invitation', '/templates/category/wedding', '/templates/category/wedding/invitation', '/templates/tag/happydiwali',
  '/create', '/editor?w=1080&h=1080', '/photo-studio', '/free-design-tools', '/remove-background', '/tutorials', '/about', '/contact', '/showcase', '/ai-studio',
  '/login', '/signup', '/privacy', '/terms', '/dashboard', '/admin', '/free-wedding-invitation-templates', '/this-page-does-not-exist-xyz'];
fs.mkdirSync('out/shots', { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['iPhone 13']]]) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(() => { try { localStorage.setItem('mt:onboarded', '1'); } catch {} });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
    let status = 0, title = '', h1 = '', bad = '', broken = 0, overflow = false, ms = 0;
    try {
      const t0 = Date.now();
      const r = await page.goto(B + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
      status = r ? r.status() : 0;
      await page.waitForTimeout(p.startsWith('/editor') || p.startsWith('/photo') ? 6000 : 3500);
      ms = Date.now() - t0;
      title = await page.title();
      h1 = (await page.locator('h1').first().textContent({ timeout: 1500 }).catch(() => '')) || '';
      const body = await page.locator('body').innerText().catch(() => '');
      if (/Application error|Something went wrong|Unhandled Runtime Error|500 Internal/i.test(body)) bad = 'error screen';
      broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).length);
      overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      if (dev === 'phone' || ['/', '/templates', '/editor?w=1080&h=1080'].includes(p)) await page.screenshot({ path: `out/shots/${dev}-${p.replace(/[^a-z0-9]+/gi, '_').slice(0, 50) || 'home'}.png` });
    } catch (e) { bad = 'load failed: ' + e.message.slice(0, 120); }
    const noise = errs.filter((e) => !/favicon|google|gtag|analytics|Failed to load resource: the server responded with a status of 404/.test(e));
    rows.push({ dev, p, status, ms, title: title.slice(0, 70), h1: h1.trim().slice(0, 60), bad, broken, overflow, errors: noise.slice(0, 3) });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync('out/pages.json', JSON.stringify(rows, null, 1));
for (const r of rows) {
  const flags = [r.bad, r.broken ? `${r.broken} broken img` : '', r.overflow ? 'sideways scroll' : '', r.errors.length ? `${r.errors.length} console err` : ''].filter(Boolean).join('; ');
  console.log(`${r.dev.padEnd(7)} ${String(r.status).padEnd(4)} ${String(r.ms).padStart(6)}ms ${r.p.padEnd(42)} ${flags ? 'ISSUE: ' + flags : 'ok'}  | ${r.h1 || r.title}`);
  r.errors.forEach((e) => console.log('           ' + e));
}
