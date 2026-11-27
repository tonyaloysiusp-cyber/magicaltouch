import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });
const B = 'https://magicaltouchdesign.com';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const go = async (u, w = 5000) => { await pg.goto(B + u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(w); };
await go('/?nocache=1', 6000);
console.log('[check] hero:', (await pg.locator('h1').first().innerText()).replace(/\n/g, ' '));
console.log('[check] AI mentions on home:', ((await pg.locator('body').innerText()).match(/\bAI\b/g) || []).length);
await pg.screenshot({ path: 'shots/home-hero.png' });
await go('/templates?nocache=1', 6000);
await pg.screenshot({ path: 'shots/templates-hero.png' });
await go('/about?nocache=1', 4000);
const sv = pg.locator('text=What we do').first(); await sv.scrollIntoViewIfNeeded().catch(() => {}); await pg.waitForTimeout(1000);
await pg.screenshot({ path: 'shots/about-services.png' });
for (const u of ['/ai-studio', '/guides/photo-studio-guide.pdf', '/promo/promo-reel-9x16.mp4', '/admin/storage']) { const r = await fetch(B + u, { redirect: 'manual' }); console.log('[check]', u, r.status, r.headers.get('content-length')); }
// Editor: Move dialog with Enter
await go('/editor?w=1080&h=1080&nocache=1', 9000);
await pg.keyboard.press('Escape');
const cv = pg.locator('canvas.upper-canvas').first();
await pg.keyboard.press('t'); await pg.waitForTimeout(400);
const box = await cv.boundingBox();
if (box) { await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await pg.waitForTimeout(600); await pg.keyboard.press('Escape'); await pg.waitForTimeout(400); await pg.keyboard.press('v'); await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await pg.waitForTimeout(500); }
await pg.keyboard.press('Enter'); await pg.waitForTimeout(800);
console.log('[check] move dialog:', await pg.locator('[role=dialog][aria-label="Move"]').count());
await pg.screenshot({ path: 'shots/editor-move.png' });
console.log('[check] page errors:', errs.slice(0, 5).join(' | '));
await b.close();
