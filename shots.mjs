import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE || 'https://www.magicaltouchdesign.com';
const out = 'shots'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const jobs = JSON.parse(fs.readFileSync('jobs.json', 'utf8'));
for (const j of jobs) {
  const ctx = await browser.newContext({ ...devices[j.device || 'iPhone 13'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('mt:onboarded', '1'); } catch {} });
  const page = await ctx.newPage();
  try {
    await page.goto(base + j.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(j.wait || 9000);
    let n = 0;
    await page.screenshot({ path: `${out}/${j.name}-${n++}.png` });
    for (const s of j.steps || []) {
      try {
        if (s.tap) await page.mouse.click(s.tap[0], s.tap[1]);
        if (s.text) await page.getByText(s.text, { exact: s.exact ?? false }).first().click({ timeout: 5000 });
        if (s.rail) await page.locator('nav[aria-label="Editor panels"] button', { hasText: s.rail }).first().click({ timeout: 5000 });
        if (s.close) await page.getByRole('button', { name: 'Close' }).last().click({ timeout: 5000 });
        if (s.js) await page.evaluate(s.js);
        if (s.label) await page.getByLabel(s.label).first().click({ timeout: 5000 });
        await page.waitForTimeout(s.wait || 1500);
        await page.screenshot({ path: `${out}/${j.name}-${n++}.png` });
      } catch (e) { console.log(j.name, 'step failed', JSON.stringify(s), String(e).slice(0, 120)); }
    }
  } catch (e) { console.log(j.name, 'failed', String(e).slice(0, 200)); }
  await ctx.close();
}
await browser.close();
