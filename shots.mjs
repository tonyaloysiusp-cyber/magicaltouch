import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE || 'https://www.magicaltouchdesign.com';
const out = 'shots'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const jobs = JSON.parse(fs.readFileSync('jobs.json', 'utf8'));
for (const j of jobs) {
  const ctx = await browser.newContext(j.device === 'desktop' ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } : j.device === 'ipad' ? { ...devices['iPad Pro 11 landscape'] } : { ...devices[j.device || 'iPhone 13'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('mt:onboarded', '1'); } catch {} });
  const page = await ctx.newPage();
  try {
    await page.goto(base + j.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(j.wait || 9000);
    let n = 0;
    await page.screenshot({ path: `${out}/${j.name}-${n++}.png`, fullPage: !!j.full });
    for (const s of j.steps || []) {
      try {
        if (s.tap) await page.mouse.click(s.tap[0], s.tap[1]);
        if (s.text) await page.getByText(s.text, { exact: s.exact ?? false }).first().click({ timeout: 5000 });
        if (s.rail) await page.locator('nav[aria-label="Editor panels"] button', { hasText: s.rail }).first().click({ timeout: 5000 });
        if (s.close) await page.getByRole('button', { name: 'Close' }).last().click({ timeout: 5000 });
        if (s.js) await page.evaluate(s.js);
        if (s.upload) await page.setInputFiles(s.sel || 'input[type=file]', s.upload);
        if (s.click) await page.locator(s.click).first().click({ timeout: 8000 });
        if (s.download) { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator(s.download).nth(s.nth || 0).click()]); await dl.saveAs(`${out}/${s.as}`); }
        if (s.waitFor) await page.locator(s.waitFor).first().waitFor({ timeout: 120000 });
        if (s.label) await page.getByLabel(s.label).first().click({ timeout: 5000 });
        if (s.key) await page.keyboard.press(s.key);
        if (s.drag) { const [a, b, c, d] = s.drag; await page.mouse.move(a, b); await page.mouse.down(); for (let k = 1; k <= 12; k++) await page.mouse.move(a + (c - a) * k / 12, b + (d - b) * k / 12); await page.mouse.up(); }
        if (s.goto) await page.goto(base + s.goto, { waitUntil: 'domcontentloaded' });
        if (s.back) await page.goBack({ waitUntil: 'domcontentloaded' });
        if (s.url) console.log(j.name, 'URL', page.url());
        await page.waitForTimeout(s.wait || 1500);
        await page.screenshot({ path: `${out}/${j.name}-${n++}.png` });
      } catch (e) { console.log(j.name, 'step failed', JSON.stringify(s), String(e).slice(0, 120)); }
    }
  } catch (e) { console.log(j.name, 'failed', String(e).slice(0, 200)); }
  await ctx.close();
}
await browser.close();
console.log('SHOTS_DONE');
