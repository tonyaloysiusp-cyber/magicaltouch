// High-resolution (2x) screenshots of the live tools in use, for the site's tour.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://magicaltouchdesign.com';
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
const shot = async (pg, name) => { await pg.screenshot({ path: `shots/${name}.png` }); console.log('[shot]', name, pg.url().replace(BASE, '').slice(0, 90)); };
const open = async (path, wait = 6000) => { const pg = await ctx.newPage(); await pg.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(wait); return pg; };
const step = async (label, f) => { try { await f(); } catch (e) { console.log('[skip]', label, String(e).slice(0, 160)); } };
const closeDialogs = async (pg) => { for (const n of ['Close', 'Skip', 'Got it', 'Not now']) { const l = pg.getByRole('button', { name: n, exact: true }); if (await l.count()) await l.first().click({ timeout: 2000 }).catch(() => {}); } await pg.keyboard.press('Escape').catch(() => {}); };

await step('packaging', async () => {
  const pg = await open('/packaging-dieline');
  await pg.getByRole('button', { name: 'Customise' }).first().click();
  await pg.waitForURL(/\/editor/, { timeout: 30000 }); await pg.waitForTimeout(9000); await closeDialogs(pg);
  await pg.getByRole('button', { name: 'Pro', exact: true }).first().click().catch(() => {});
  await pg.waitForTimeout(2500); await shot(pg, 'tour-packaging'); await pg.close();
});
await step('textile', async () => {
  const pg = await open('/textile-studio');
  await pg.getByRole('button', { name: 'Customise' }).first().click().catch(async () => { await pg.getByRole('link', { name: 'Customise' }).first().click(); });
  await pg.waitForURL(/\/editor/, { timeout: 30000 }); await pg.waitForTimeout(10000); await closeDialogs(pg);
  await pg.getByRole('button', { name: 'Pro', exact: true }).first().click().catch(() => {});
  await pg.waitForTimeout(2500); await shot(pg, 'tour-textile'); await pg.close();
});
await step('patterns', async () => {
  const pg = await open('/patterns');
  await pg.getByRole('button', { name: 'Floral', exact: true }).click().catch(() => {});
  await pg.waitForTimeout(800);
  await pg.locator('[aria-label^="Pattern:"], button[title]').nth(3).click().catch(() => {});
  await pg.getByRole('button', { name: 'Mirror', exact: true }).click().catch(() => {});
  await pg.waitForTimeout(2500); await shot(pg, 'tour-patterns'); await pg.close();
});
await step('photo', async () => {
  const pg = await open('/photo-studio');
  await pg.locator('input[type=file]').first().setInputFiles('public/home/mockups/room-living.webp');
  await pg.waitForTimeout(9000); await closeDialogs(pg);
  await shot(pg, 'tour-photo');
  const btns = (await pg.locator('button').allInnerTexts()).map((t) => t.trim()).filter((t) => t && t.length < 30);
  console.log('[buttons] photo', JSON.stringify([...new Set(btns)].slice(0, 50)));
  for (const n of ['Filters', 'Filter', 'Looks']) { const l = pg.getByRole('button', { name: n, exact: true }); if (await l.count()) { await l.first().click(); break; } }
  await pg.waitForTimeout(2000);
  const firstLook = pg.locator('button:has(img), button:has(canvas)').nth(4); await firstLook.click().catch(() => {});
  await pg.waitForTimeout(3000); await shot(pg, 'tour-photo-filter'); await pg.close();
});
await step('trace', async () => {
  const pg = await open('/trace');
  await pg.locator('input[type=file]').first().setInputFiles('public/logo.png');
  await pg.waitForTimeout(8000);
  await pg.getByRole('button', { name: '4 colours', exact: true }).click().catch(() => {});
  await pg.waitForTimeout(6000); await shot(pg, 'tour-trace'); await pg.close();
});
await step('bg', async () => {
  const pg = await open('/remove-background');
  await pg.locator('input[type=file]').first().setInputFiles('public/home/mockups/tote.webp');
  await pg.waitForTimeout(45000); await shot(pg, 'tour-background'); await pg.close();
});
await step('print-size', async () => { const pg = await open('/print-size-calculator', 8000); await shot(pg, 'tour-print-size'); await pg.close(); });
await step('print-layout', async () => {
  const pg = await open('/print-layout');
  await pg.getByRole('button', { name: 'Create sample document' }).click().catch(() => {});
  await pg.waitForTimeout(5000);
  await pg.getByRole('button', { name: 'Create booklet' }).click().catch(() => {});
  await pg.waitForTimeout(4000); await shot(pg, 'tour-print-layout'); await pg.close();
});
await step('editor-text', async () => {
  const pg = await open('/editor?w=1080&h=1350');
  await pg.getByRole('button', { name: 'Instagram post' }).first().click().catch(() => {});
  await pg.waitForTimeout(2500); await closeDialogs(pg);
  await pg.locator('nav[aria-label="Editor panels"] button').filter({ hasText: /^Text$/ }).first().click().catch(() => {});
  await pg.waitForTimeout(2500); await shot(pg, 'tour-editor-text');
  await pg.locator('nav[aria-label="Editor panels"] button').filter({ hasText: 'Templates' }).first().click().catch(() => {});
  await pg.waitForTimeout(5000); await shot(pg, 'tour-editor-templates'); await pg.close();
});
await b.close();
