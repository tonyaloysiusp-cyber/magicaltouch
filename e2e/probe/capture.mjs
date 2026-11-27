// Captures real screenshots of every tool on the live site (for the guides
// and the home film), plus real Photo Studio face-edit results.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });
const B = 'https://magicaltouchdesign.com';
const ONLY = (process.env.ONLY || globalThis.__ONLY || '').split(',').filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const pg = await ctx.newPage();
pg.on('dialog', (d) => d.dismiss().catch(() => {}));
const log = (...a) => console.log('[check]', ...a);
const step = async (name, fn) => { try { await fn(); log('ok', name); } catch (e) { log('FAIL', name, String(e.message).split('\n')[0].slice(0, 160)); } };
const shot = (n, loc) => (loc || pg).screenshot({ path: `shots/${n}.png` });
const go = async (u, w = 5000) => { await pg.goto(B + u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForTimeout(w); await closePopups(); };
const closePopups = async () => { for (const n of ['Close', 'Dismiss', 'Skip', 'Got it', 'No thanks']) { const l = pg.getByRole('button', { name: n, exact: true }); if (await l.count().catch(() => 0)) await l.first().click({ timeout: 800 }).catch(() => {}); } await pg.keyboard.press('Escape').catch(() => {}); };
const click = async (name, opts = {}) => { const l = pg.getByRole(opts.role || 'button', { name, exact: !!opts.exact }).first(); await l.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); await l.click({ timeout: 6000 }); await pg.waitForTimeout(opts.wait ?? 900); };
const clickText = async (t, wait = 900) => { await pg.getByText(t, { exact: true }).first().click({ timeout: 6000 }); await pg.waitForTimeout(wait); };
const upload = async (file, sel = 'input[type=file]') => { await pg.locator(sel).first().setInputFiles(file); };
const saveCanvas = async (selector, name) => { const d = await pg.evaluate((s) => { const c = document.querySelector(s); return c ? c.toDataURL('image/jpeg', 0.92) : null; }, selector); if (d) fs.writeFileSync(`shots/${name}.jpg`, Buffer.from(d.split(',')[1], 'base64')); return !!d; };

// ---------------- Photo Studio + real face edits
if (want('photo')) {
  await go('/photo-studio', 3000);
  await pg.locator('input[type=file]').first().waitFor({ state: 'attached', timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  await step('ps start', () => shot('ps-start'));
  await step('ps upload', async () => { await upload('e2e/probe/assets/portrait.jpg'); await pg.waitForTimeout(4000); await closePopups(); await shot('ps-simple'); });
  await step('ps pro', async () => { await pg.getByText('Pro', { exact: true }).first().click({ timeout: 5000 }); await pg.waitForTimeout(2500); await shot('ps-pro'); });
  for (const t of ['Adjust', 'Colour', 'Filters', 'Looks', 'Crop', 'Background', 'Retouch', 'Resize', 'Export']) {
    await step(`ps tab ${t}`, async () => { await pg.getByRole('button', { name: t, exact: true }).first().click({ timeout: 4000 }); await pg.waitForTimeout(1500); await shot(`ps-tab-${t.toLowerCase()}`); });
  }
  await step('ps face find', async () => {
    await pg.getByRole('button', { name: 'Adjust', exact: true }).first().click({ timeout: 4000 }).catch(() => {});
    await pg.waitForTimeout(800);
    const f = pg.getByRole('button', { name: 'Find face' }).first();
    await f.scrollIntoViewIfNeeded(); await f.click();
    await pg.getByText('Face found.').first().waitFor({ timeout: 60000 });
    await pg.waitForTimeout(1500);
    await shot('ps-face-ready');
  });
  const looks = [['V-line face', 'face-vline'], ['Rose lips', 'face-lips'], ['Big bright eyes', 'face-eyes'], ['Soft glam', 'face-glam']];
  for (const [name, file] of looks) {
    await step(`ps face ${name}`, async () => {
      await pg.getByRole('button', { name, exact: true }).first().click({ timeout: 5000 });
      const s = pg.getByLabel('Preset strength'); if (await s.count()) { await s.fill('120').catch(() => {}); }
      await pg.waitForTimeout(2500);
      await shot(`ps-${file}`);
      await saveCanvas('canvas[aria-label="Original"]', 'face-original');
      await saveCanvas('canvas[aria-label="Face preview"]', file);
    });
  }
  await step('ps face after mode', async () => { await pg.getByRole('radio', { name: /after/i }).first().click({ timeout: 3000 }); await pg.waitForTimeout(1200); await saveCanvas('canvas[aria-label="Face preview"]', 'face-glam-after'); });
}

// ---------------- Design editor with a real template
if (want('editor')) {
  await step('open template', async () => {
    await go('/templates', 9000);
    const card = pg.locator('a[href^="/templates/"]:not([href*="/category/"]):not([href*="/tag/"])').filter({ has: pg.locator('img') });
    log('cards', await card.count());
    await card.nth(2).click({ timeout: 8000 }); await pg.waitForTimeout(5000);
    await shot('tpl-detail');
    await pg.getByText(/Use this template/).first().click({ timeout: 8000 });
    await pg.waitForTimeout(14000); await closePopups();
  });
  await step('ed workspace', () => shot('ed-workspace'));
  for (const r of ['Templates', 'Elements', 'Text', 'Upload', 'Print & cut', 'QR & barcode', 'Draw', 'Background', 'Patterns', 'Colours', 'Trace', 'Brand', 'Layers']) {
    await step(`ed rail ${r}`, async () => { await pg.getByRole('button', { name: r, exact: true }).first().click({ timeout: 4000 }); await pg.waitForTimeout(1500); await shot(`ed-rail-${r.toLowerCase().replace(/[^a-z]+/g, '-')}`); await pg.getByRole('button', { name: r, exact: true }).first().click({ timeout: 2000 }).catch(() => {}); await pg.waitForTimeout(400); });
  }
  await step('ed select text', async () => {
    const cv = pg.locator('canvas.upper-canvas').first(); const bx = await cv.boundingBox();
    await pg.mouse.click(bx.x + bx.width * 0.3, bx.y + bx.height * 0.3); await pg.waitForTimeout(1000); await shot('ed-selected');
  });
  for (const t of ['Effects', 'Translate', 'Write', 'Position', 'Text frame']) {
    await step(`ed tool ${t}`, async () => { await pg.getByText(t, { exact: true }).first().click({ timeout: 4000 }); await pg.waitForTimeout(1500); await shot(`ed-tool-${t.toLowerCase().replace(/ /g, '-')}`); await pg.keyboard.press('Escape'); await pg.waitForTimeout(500); });
  }
  await step('ed move dialog', async () => {
    const cv = pg.locator('canvas.upper-canvas').first(); const bx = await cv.boundingBox();
    await pg.keyboard.press('v'); await pg.mouse.click(bx.x + bx.width * 0.3, bx.y + bx.height * 0.3); await pg.waitForTimeout(600);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(1000);
    await pg.locator('[role=dialog][aria-label="Move"] input').first().fill('40'); await pg.waitForTimeout(800);
    await shot('ed-move'); await pg.keyboard.press('Escape');
  });
  await step('ed resize', async () => { await click('Resize', { wait: 1500 }); await shot('ed-resize'); await pg.keyboard.press('Escape'); });
  await step('ed export', async () => { await click('Export', { exact: true, wait: 1800 }); await shot('ed-export'); const d = pg.locator('[role=dialog]').last(); await d.evaluate((e) => e.scrollTo?.(0, 9999)).catch(() => {}); await pg.waitForTimeout(500); await shot('ed-export-2'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(600); });
  await step('ed pro', async () => { await pg.getByText('Pro', { exact: true }).first().click({ timeout: 5000 }); await pg.waitForTimeout(2500); await shot('ed-pro'); });
  await step('ed pro menus', async () => { for (const m of ['File', 'Edit', 'Object', 'Type', 'View']) { const l = pg.getByRole('button', { name: m, exact: true }).first(); if (await l.count()) { await l.click({ timeout: 2500 }); await pg.waitForTimeout(700); await shot(`ed-menu-${m.toLowerCase()}`); await pg.keyboard.press('Escape'); } } });
  await step('ed packaging', async () => { await pg.getByText('Packaging', { exact: true }).first().click({ timeout: 5000 }); await pg.waitForTimeout(6000); await closePopups(); await shot('ed-packaging'); });
  await step('ed textile', async () => { await pg.getByText('Textile', { exact: true }).first().click({ timeout: 5000 }); await pg.waitForTimeout(6000); await closePopups(); await shot('ed-textile'); });
}

// ---------------- Other tools
const tools = [
  ['templates', '/templates', 6000], ['create', '/create', 4000], ['packaging', '/packaging-dieline', 6000], ['textile', '/textile-studio', 6000],
  ['patterns', '/patterns', 6000], ['trace', '/trace', 4000], ['remover', '/remove-background', 4000], ['print-layout', '/print-layout', 5000],
  ['print-size', '/print-size-calculator', 5000], ['passport', '/passport-photo-maker', 5000], ['wallpaper', '/wallpaper-designer', 6000], ['mockups', '/mockups', 6000], ['tutorials', '/tutorials', 4000],
];
for (const [k, u, w] of tools) {
  if (!want(k) && !want('tools')) continue;
  await go(u, w);
  await step(`tool ${k}`, () => shot(`tool-${k}`));
  if (k === 'trace') await step('trace run', async () => { await upload('public/logo.png'); await pg.waitForTimeout(7000); await shot('tool-trace-result'); });
  if (k === 'remover') await step('remover run', async () => { await upload('public/templates/photos/pro/x_man2.jpg'); await pg.waitForTimeout(35000); await shot('tool-remover-result'); });
  if (k === 'passport') await step('passport run', async () => { await upload('public/templates/photos/pro/x_man2.jpg'); await pg.waitForTimeout(12000); await shot('tool-passport-result'); });
  if (k === 'packaging') await step('packaging open', async () => { await pg.getByRole('button', { name: /Customi[sz]e/ }).first().click({ timeout: 5000 }); await pg.waitForTimeout(9000); await shot('tool-packaging-editor'); });
  if (k === 'textile') await step('textile open', async () => { await pg.getByRole('button', { name: /Customi[sz]e/ }).first().click({ timeout: 5000 }); await pg.waitForTimeout(9000); await shot('tool-textile-editor'); });
  if (k === 'print-layout') await step('print layout pro', async () => { await pg.getByRole('button', { name: /Booklet/ }).first().click({ timeout: 3000 }); await pg.waitForTimeout(1500); await shot('tool-print-layout-booklet'); });
}
await b.close();
