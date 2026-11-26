// Live check: tools open without an account (no redirect to /login).
import { chromium } from 'playwright';
const BASE = 'https://magicaltouchdesign.com';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
for (const p of ['/editor?w=1080&h=1080', '/photo-studio', '/create', '/packaging-dieline', '/textile-studio', '/patterns', '/trace', '/remove-background', '/passport-photo-maker']) {
  const pg = await ctx.newPage(); const t = Date.now();
  try {
    await pg.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pg.waitForTimeout(9000);
    const url = pg.url().replace(BASE, '');
    const canvas = await pg.locator('canvas').count();
    console.log(`[guest] ${p} -> ${url} ${url.startsWith('/login') ? 'BLOCKED' : 'OPEN'} canvas=${canvas} ${Date.now() - t}ms`);
  } catch (e) { console.log(`[guest] ${p} ERROR ${String(e).slice(0, 120)}`); }
  await pg.close();
}
await b.close();
