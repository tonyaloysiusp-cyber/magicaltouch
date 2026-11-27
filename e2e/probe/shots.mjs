// 2x screenshots: multilingual text in the editor; Photo Studio retouch panel.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://magicaltouchdesign.com';
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
const shot = async (pg, name) => { await pg.screenshot({ path: `shots/${name}.png` }); console.log('[shot]', name); };
const step = async (label, f) => { try { await f(); } catch (e) { console.log('[skip]', label, String(e).slice(0, 200)); } };
await step('languages', async () => {
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/editor?w=1080&h=1080', { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(7000);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(800);
  const rail = (t) => pg.locator('nav[aria-label="Editor panels"] button').filter({ hasText: t }).first();
  await rail(/^Text$/).click(); await pg.waitForTimeout(1500);
  const lines = ['வணக்கம்', 'नमस्ते', 'مرحبا', 'നമസ്കാരം', '你好', 'Hello'];
  for (let k = 0; k < lines.length; k++) {
    await pg.getByRole('button', { name: /Add a heading/ }).first().click(); await pg.waitForTimeout(900);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
    await pg.keyboard.press('Control+A'); await pg.keyboard.type(lines[k]); await pg.waitForTimeout(300);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
    // move it down a step
    for (let m = 0; m < k; m++) await pg.keyboard.press('Shift+ArrowDown').catch(() => {});
    for (let m = 0; m < k * 9; m++) await pg.keyboard.press('Shift+ArrowDown');
    await pg.waitForTimeout(200);
  }
  await pg.mouse.click(1300, 820); await pg.waitForTimeout(3000);
  await shot(pg, 'show-languages'); await pg.close();
});
await step('retouch', async () => {
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/photo-studio', { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(6000);
  await pg.locator('input[type=file]').first().setInputFiles('public/home/mockups/room-living.webp'); await pg.waitForTimeout(8000);
  await pg.getByRole('button', { name: 'Split', exact: true }).first().click().catch(() => {});
  await pg.getByRole('button', { name: 'Looks', exact: true }).first().click().catch(() => {}); await pg.waitForTimeout(1500);
  const looks = pg.locator('[role=tabpanel] button, aside button').filter({ hasText: /Warm|Golden|Film|Vivid|Cinema/ }).first();
  await looks.click().catch(() => {}); await pg.waitForTimeout(3500);
  await shot(pg, 'show-looks');
  const names = (await pg.locator('button').allInnerTexts()).map((t) => t.trim()).filter((t) => t && t.length < 26);
  console.log('[buttons]', JSON.stringify([...new Set(names)].slice(30, 110)));
  await pg.close();
});
await b.close();
