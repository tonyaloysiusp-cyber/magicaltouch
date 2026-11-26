import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const [p, n] of [['/about?nocache=1', 'about'], ['/tutorials?nocache=1', 'tutorials']]) {
  const pg = await ctx.newPage(); await pg.goto('https://magicaltouchdesign.com' + p, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(3000);
  const tour = pg.locator('#tour'); console.log('[about]', n, 'tour:', await tour.count(), 'text:', (await pg.locator('h1').first().innerText().catch(() => '')).slice(0, 80));
  if (await tour.count()) { await tour.scrollIntoViewIfNeeded(); await pg.waitForTimeout(1500); }
  await pg.screenshot({ path: `shots/${n}.png`, fullPage: true });
}
await b.close();
