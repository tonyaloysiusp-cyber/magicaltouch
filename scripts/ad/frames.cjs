const { chromium } = require('playwright');
(async () => {
  const [mode, ...ts] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + process.cwd() + '/ad.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  if (mode === 'check') {
    for (const t of ts) { await p.evaluate((t) => render(+t), t); await p.screenshot({ path: `chk-${t}.jpg`, quality: 70, type: 'jpeg' }); }
  } else {
    const fps = 30, end = await p.evaluate(() => T_END);
    require('fs').mkdirSync('frames', { recursive: true });
    for (let i = 0; i <= end * fps; i++) { await p.evaluate((t) => render(t), i / fps); await p.screenshot({ path: `frames/f${String(i).padStart(5, '0')}.jpg`, quality: 92, type: 'jpeg' }); }
  }
  await b.close();
})();
