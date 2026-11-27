import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });
const B = 'https://magicaltouchdesign.com';
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })).newPage();
const log = (...a) => console.log('[check]', ...a);
const step = async (n, f) => { try { await f(); log('ok', n); } catch (e) { log('FAIL', n, String(e.message).split('\n')[0].slice(0, 150)); } };
const shot = (n) => pg.screenshot({ path: `shots/${n}.png` });
// Photo Studio: every tool in the left bar (Pro) and the right panel tabs
await pg.goto(B + '/photo-studio', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pg.locator('input[type=file]').first().waitFor({ state: 'attached', timeout: 60000 });
await pg.locator('input[type=file]').first().setInputFiles('e2e/probe/assets/portrait.jpg'); await pg.waitForTimeout(5000);
await step('simple tabs', async () => {
  const bar = pg.locator('button:visible');
  for (const t of ['Looks', 'Crop', 'Background', 'Retouch', 'Resize', 'Export', 'Passport', 'Enhance']) {
    const l = bar.filter({ hasText: new RegExp(`^\\s*${t}\\s*$`) }).first();
    if (await l.count()) { await l.click({ timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(1500); await shot(`ps-simple-${t.toLowerCase()}`); }
  }
});
await step('pro', async () => { await pg.getByText('Pro', { exact: true }).first().click(); await pg.waitForTimeout(2500); });
for (const t of ['Properties', 'Colour', 'Filters', 'Looks']) await step(`pro tab ${t}`, async () => { await pg.locator('[role=tab]:visible, button:visible').filter({ hasText: new RegExp(`^\\s*${t}\\s*$`) }).last().click({ timeout: 3000 }); await pg.waitForTimeout(1500); await shot(`ps-pro-${t.toLowerCase()}`); });
const keys = [['v', 'move'], ['m', 'marquee'], ['l', 'lasso'], ['p', 'pen'], ['c', 'crop'], ['j', 'heal'], ['b', 'brush'], ['g', 'gradient'], ['t', 'type'], ['u', 'shape'], ['k', 'bucket'], ['i', 'eyedropper']];
for (const [k, n] of keys) await step(`key ${n}`, async () => { await pg.mouse.click(700, 40); await pg.keyboard.press(k); await pg.waitForTimeout(1200); await shot(`ps-tool-${n}`); });
await step('ps move dialog', async () => { await pg.keyboard.press('v'); await pg.waitForTimeout(400); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000); await shot('ps-move-dialog'); await pg.keyboard.press('Escape'); });
for (const m of ['File', 'Image', 'Layer', 'Select', 'Filter']) await step(`menu ${m}`, async () => { await pg.getByText(m, { exact: true }).first().click({ timeout: 3000 }); await pg.waitForTimeout(800); await shot(`ps-menu-${m.toLowerCase()}`); await pg.keyboard.press('Escape'); });
// Editor Move dialog
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_ANON_KEY;
const t = (await (await fetch(`${U}/rest/v1/templates?select=id,width,height&status=eq.published&is_featured=eq.true&name=ilike.*flyer*&limit=1`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json())[0];
await pg.goto(`${B}/editor?w=${t.width}&h=${t.height}&templateId=${t.id}`, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(15000);
await step('ed move', async () => { await pg.mouse.click(733, 540); await pg.waitForTimeout(500); await pg.keyboard.press('Escape'); await pg.mouse.click(733, 540); await pg.waitForTimeout(500); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000); const i = pg.locator('[role=dialog][aria-label="Move"] input').first(); await i.fill('20', { timeout: 5000 }); await pg.waitForTimeout(800); await shot('ed-move'); await pg.keyboard.press('Escape'); });
await step('ed packaging', async () => { await pg.locator('button:visible').filter({ hasText: /Packaging/ }).first().click({ timeout: 4000 }); await pg.waitForTimeout(3000); const d = pg.getByRole('button', { name: "Don't save" }); if (await d.count()) await d.click(); await pg.waitForTimeout(7000); await shot('ed-packaging'); });
await b.close();
