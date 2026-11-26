// High-resolution screenshots of the live tools for the site's tour (2x).
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://magicaltouchdesign.com';
fs.mkdirSync('shots', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
const shot = async (pg, name) => { await pg.screenshot({ path: `shots/${name}.png` }); console.log('[shot]', name, pg.url().replace(BASE, '')); };
const page = async (path, wait = 7000) => { const pg = await ctx.newPage(); await pg.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(wait); return pg; };
const tryStep = async (label, f) => { try { await f(); } catch (e) { console.log('[skip]', label, String(e).slice(0, 140)); } };

for (const [path, name] of [['/editor?w=1080&h=1350', 'editor-blank'], ['/packaging-dieline', 'packaging-hub'], ['/textile-studio', 'textile-hub'], ['/patterns', 'patterns'], ['/photo-studio', 'photo-entry'], ['/trace', 'trace-entry'], ['/remove-background', 'bg-entry'], ['/print-layout', 'print-layout'], ['/print-size-calculator', 'print-size'], ['/passport-photo-maker', 'passport-entry'], ['/tools', 'tools'], ['/', 'home']]) {
  await tryStep(name, async () => { const pg = await page(path); await shot(pg, name); 
    const btns = (await pg.locator('button, a').allInnerTexts()).map((t) => t.trim()).filter((t) => t && t.length < 40);
    console.log('[buttons]', name, JSON.stringify([...new Set(btns)].slice(0, 40)));
    await pg.close(); });
}
await b.close();
