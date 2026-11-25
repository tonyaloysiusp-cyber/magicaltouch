import { chromium } from 'playwright';
const r = await fetch('https://magicaltouchdesign.com/api/auth-status'); console.log('[status]', r.status, await r.text());
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('https://magicaltouchdesign.com/login', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
console.log('[status] notice:', (await p.locator('[role=status]').allInnerTexts()).join(' | '));
await b.close();
