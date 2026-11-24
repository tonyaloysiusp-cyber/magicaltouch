// Live site probe: page speed and page-cache state (twice each), then a login attempt.
import { chromium } from 'playwright';
const BASE = 'https://magicaltouchdesign.com';
const paths = ['/', '/templates', '/tools', '/free-design-tools', '/photo-studio', '/login'];
for (let round = 1; round <= 2; round++) for (const p of paths) {
  const t = Date.now();
  try { const r = await fetch(BASE + p, { redirect: 'manual' }); await r.arrayBuffer(); console.log(`[r${round}] ${p} ${r.status} ${Date.now() - t}ms cache=${r.headers.get('x-mt-page-cache')}`); }
  catch (e) { console.log(`[r${round}] ${p} FAIL ${Date.now() - t}ms ${e}`); }
}
const b = await chromium.launch(); const pg = await b.newPage();
pg.on('response', (r) => { if (/supabase\.co\/auth|\/sb\/auth/.test(r.url())) console.log('[login] RESP', r.status(), r.url().slice(0, 100)); });
await pg.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
await pg.locator('input[type=email]').fill('probe-' + Date.now() + '@example.com');
await pg.locator('input[type=password]').fill('WrongPassword123!');
const t = Date.now();
await pg.locator('button:has-text("Log in")').first().click();
for (let i = 0; i < 40; i++) { const e = (await pg.locator('[role=alert]').allInnerTexts()).join(' '); if (e) { console.log(`[login] ${Date.now() - t}ms shown: ${e}`); break; } await pg.waitForTimeout(1000); }
console.log('[login] status text:', (await pg.locator('[role=status]').allInnerTexts()).join(' '));
await b.close();
