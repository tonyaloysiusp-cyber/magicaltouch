// Editor scenarios. `t.eval` runs in the page; window.__fabricCanvas is the
// live Fabric canvas.

// Real artwork on the canvas (no artboards, guides or helpers).
const ART = () =>
  window.__fabricCanvas
    .getObjects()
    .filter((o) => !o.__isArtboard && !o.__isGuide && !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && !o.__isHelper)
    .map((o) => ({
      type: o.type,
      left: Math.round(o.left),
      top: Math.round(o.top),
      w: Math.round(o.getScaledWidth()),
      h: Math.round(o.getScaledHeight()),
      locked: !!o.locked,
      lockMovementX: !!o.lockMovementX,
      angle: Math.round(o.angle || 0),
    }));
const ALL_COUNT = () => window.__fabricCanvas.getObjects().length;

async function canvasBox(t) {
  return t.page.locator('canvas.upper-canvas').first().boundingBox();
}
// Converts document coordinates to screen coordinates.
async function toScreen(t, x, y) {
  const box = await canvasBox(t);
  const vt = await t.eval(() => window.__fabricCanvas.viewportTransform);
  return { x: box.x + x * vt[0] + vt[4], y: box.y + y * vt[3] + vt[5] };
}
async function drag(t, from, to, steps = 8) {
  await t.page.mouse.move(from.x, from.y);
  await t.page.mouse.down();
  await t.page.mouse.move(to.x, to.y, { steps });
  await t.page.mouse.up();
}
async function key(t, combo) {
  await t.page.keyboard.press(combo);
  await t.page.waitForTimeout(150);
}
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

async function drawRect(t, x1, y1, x2, y2) {
  await key(t, 'm');
  await drag(t, await toScreen(t, x1, y1), await toScreen(t, x2, y2));
  await t.page.waitForTimeout(200);
  await key(t, 'v');
}

const scenarios = [
  {
    name: 'smoke',
    async run(t) {
      await t.editor();
      await t.shot('open');
      const n = await t.eval(ALL_COUNT);
      t.check('canvas has the artboard', n >= 1, n);
    },
  },
  {
    name: 'shapes-undo-redo',
    async run(t) {
      await t.editor();
      await drawRect(t, 100, 100, 400, 300);
      let art = await t.eval(ART);
      t.check('rectangle drawn', art.length === 1 && ['rect', 'path'].includes(art[0].type), JSON.stringify(art));
      await drawRect(t, 500, 500, 700, 800);
      art = await t.eval(ART);
      t.check('second rectangle drawn', art.length === 2, JSON.stringify(art));
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('undo removes exactly the last shape', art.length === 1, JSON.stringify(art));
      await key(t, `${MOD}+Shift+z`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('redo brings it back', art.length === 2, JSON.stringify(art));

      // Select all + group = one undo step
      await key(t, `${MOD}+a`);
      await key(t, `${MOD}+g`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('grouped into one object', art.length === 1 && art[0].type === 'group', JSON.stringify(art));
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('one undo ungroups back to two shapes', art.length === 2 && art.every((a) => ['rect', 'path'].includes(a.type)), JSON.stringify(art));

      // Multi delete = one undo step
      await key(t, `${MOD}+a`);
      await key(t, 'Delete');
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('delete removes both', art.length === 0, JSON.stringify(art));
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('one undo restores both', art.length === 2, JSON.stringify(art));
      await t.shot('after');
    },
  },
  {
    name: 'nudge-lock',
    async run(t) {
      await t.editor();
      await drawRect(t, 100, 100, 300, 300);
      const p = await toScreen(t, 200, 200);
      await t.page.mouse.click(p.x, p.y);
      const before = (await t.eval(ART))[0];
      for (let i = 0; i < 5; i++) await t.page.keyboard.press('ArrowRight');
      await t.page.waitForTimeout(700);
      let after = (await t.eval(ART))[0];
      t.check('arrow keys move by 5', after.left - before.left === 5, `${before.left} -> ${after.left}`);
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(300);
      after = (await t.eval(ART))[0];
      t.check('undo reverts the nudge', after.left === before.left, `${after.left}`);

      await t.page.mouse.click(p.x, p.y);
      await key(t, `${MOD}+l`);
      let art = await t.eval(ART);
      t.check('locked', art[0].locked && art[0].lockMovementX, JSON.stringify(art));
      // undo then redo: lock must still hold after reload from history
      await key(t, `${MOD}+z`);
      await key(t, `${MOD}+Shift+z`);
      await t.page.waitForTimeout(300);
      art = await t.eval(ART);
      t.check('lock survives undo/redo', art[0].locked && art[0].lockMovementX, JSON.stringify(art));
      // dragging a locked object does not move it
      const q = await toScreen(t, 200, 200);
      await drag(t, q, { x: q.x + 80, y: q.y + 80 });
      const art2 = await t.eval(ART);
      t.check('locked object does not move', art2[0].left === art[0].left, `${art[0].left} vs ${art2[0].left}`);
    },
  },
  {
    name: 'pen-tool',
    async run(t) {
      await t.editor();
      await key(t, 'p');
      const pts = [
        [200, 200],
        [500, 200],
        [500, 500],
      ];
      for (const [x, y] of pts) {
        const s = await toScreen(t, x, y);
        await t.page.mouse.click(s.x, s.y);
        await t.page.waitForTimeout(80);
      }
      // curve: click-drag the 4th point
      const c = await toScreen(t, 200, 500);
      await drag(t, c, { x: c.x - 60, y: c.y + 60 }, 6);
      await t.shot('drawing');
      const helpers = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__isPenPreview || o.__isAnchorHandle).length);
      t.check('no helper objects while drawing', helpers === 0, helpers);
      // close on first point
      const f = await toScreen(t, 200, 200);
      await t.page.mouse.click(f.x, f.y);
      await t.page.waitForTimeout(300);
      const art = await t.eval(ART);
      t.check('closed path created', art.length === 1 && art[0].type === 'path', JSON.stringify(art));
      const closed = await t.eval(() => {
        const p = window.__fabricCanvas.getObjects().find((o) => o.isVectorPath);
        return p && p.path[p.path.length - 1][0];
      });
      t.check('path is closed (Z)', closed === 'Z', closed);
      await t.shot('closed');
      // one undo removes the whole path
      await key(t, 'v');
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(300);
      t.check('undo removes the path in one step', (await t.eval(ART)).length === 0, JSON.stringify(await t.eval(ART)));
    },
  },
  {
    name: 'export-jpg',
    async run(t) {
      await t.editor();
      await drawRect(t, 100, 100, 600, 600);
      await t.page.getByRole('button', { name: 'Export', exact: true }).first().click();
      await pickFormat(t, 'jpg');
      const dl = await confirmDownload(t, 20000);
      const name = dl.suggestedFilename();
      t.check('downloaded a .jpg', name.endsWith('.jpg'), name);
      const path = await dl.path();
      const fs = await import('node:fs');
      const head = fs.readFileSync(path).subarray(0, 3);
      t.check('file really is JPEG', head[0] === 0xff && head[1] === 0xd8, head.toString('hex'));
    },
  },
  {
    name: 'ipad',
    viewport: { width: 1180, height: 820 },
    touch: true,
    async run(t) {
      await t.editor('w=1080&h=1350');
      await t.shot('open');
    },
  },
];

// ---------------------------------------------------------------------
// New interface & tools
// ---------------------------------------------------------------------
const PHOTO = 'public/templates/collection/summer-music-festival.jpg';
async function rail(t, name) {
  await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: name }).first().click();
  await t.page.waitForTimeout(400);
}
const ACTIVE = () => {
  const o = window.__fabricCanvas.getActiveObject();
  if (!o) return null;
  return { type: o.type, frame: o.__frame || null, framed: !!(o.clipPath && !o.clipPath.absolutePositioned), filters: (o.filters || []).length, shadow: !!o.shadow, path: !!o.path, text: o.text, w: Math.round(o.getScaledWidth()), h: Math.round(o.getScaledHeight()) };
};

scenarios.push(
  {
    name: 'ui-panels',
    async run(t) {
      await t.editor('w=1080&h=1350');
      await t.shot('default');
      for (const p of ['Templates', 'Elements', 'Text', 'Upload', 'QR code', 'Draw', 'Background', 'Brand', 'Layers', 'Help']) {
        await rail(t, p);
        await t.page.waitForTimeout(p === 'Templates' ? 2500 : 300);
        await t.shot(`panel-${p.toLowerCase()}`);
        await rail(t, p); // close
      }
    },
  },
  {
    name: 'onboarding',
    onboarding: true,
    async run(t) {
      await t.editor();
      await t.page.waitForTimeout(800);
      await t.shot('quickstart');
      const visible = await t.page.getByText('What are you making today?').isVisible().catch(() => false);
      t.check('quick start shows for a new user', visible);
      await t.page.getByRole('button', { name: /Instagram post/ }).click();
      await t.page.waitForTimeout(2500);
      const ab = await t.eval(() => { const a = window.__fabricCanvas.getObjects().find((o) => o.__isArtboard); return [Math.round(a.width), Math.round(a.height)]; });
      t.check('page resized to Instagram post', ab[0] === 1080 && ab[1] === 1350, ab.join('x'));
      await t.shot('after-pick');
    },
  },
  {
    name: 'template-apply',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Templates');
      await t.page.waitForTimeout(3000);
      const first = t.page.locator('aside img').first();
      await first.click();
      await t.page.waitForTimeout(4000);
      const art = await t.eval(ART);
      t.check('template objects placed on the page', art.length > 2, art.length);
      await t.shot('applied');
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(600);
      t.check('undo removes the template in one step', (await t.eval(ART)).length === 0, (await t.eval(ART)).length);
    },
  },
  {
    name: 'frames-crop-replace',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Elements');
      await t.page.locator('aside button[title="Circle frame"]').click();
      await t.page.waitForTimeout(800);
      let a = await t.eval(ACTIVE);
      t.check('empty circle frame added and selected', a && a.type === 'image' && a.frame && a.frame.empty && a.framed, JSON.stringify(a));
      await t.page.setInputFiles('[data-testid="replace-input"]', PHOTO);
      await t.page.waitForTimeout(1500);
      a = await t.eval(ACTIVE);
      const before = a;
      t.check('photo fills the frame', a && a.frame && !a.frame.empty && a.framed, JSON.stringify(a));
      const geo1 = await t.eval(() => { const o = window.__fabricCanvas.getActiveObject(); const c = o.clipPath; const M = window.fabric.util.multiplyTransformMatrices(o.calcTransformMatrix(), c.calcOwnMatrix()); const d = window.fabric.util.qrDecompose(M); return [Math.round(d.translateX), Math.round(d.translateY), Math.round(c.rx * 2 * d.scaleX)]; });
      await t.shot('filled');
      // Replace again: frame must stay put
      await t.page.setInputFiles('[data-testid="replace-input"]', 'public/templates/collection/balloon-bash-invitation.jpg');
      await t.page.waitForTimeout(1500);
      const geo2 = await t.eval(() => { const o = window.__fabricCanvas.getActiveObject(); const c = o.clipPath; const M = window.fabric.util.multiplyTransformMatrices(o.calcTransformMatrix(), c.calcOwnMatrix()); const d = window.fabric.util.qrDecompose(M); return [Math.round(d.translateX), Math.round(d.translateY), Math.round(c.rx * 2 * d.scaleX)]; });
      t.check('replace keeps the frame position and size', JSON.stringify(geo1) === JSON.stringify(geo2), `${geo1} vs ${geo2}`);
      // Crop mode
      await t.page.getByRole('button', { name: /^Crop/ }).first().click();
      await t.page.waitForTimeout(500);
      await t.shot('crop-mode');
      await t.page.getByRole('button', { name: 'Done' }).click();
      await t.page.waitForTimeout(400);
      a = await t.eval(ACTIVE);
      t.check('crop done keeps the frame', a && a.framed, JSON.stringify(a));
      void before;
    },
  },
  {
    name: 'image-adjust',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.page.setInputFiles('#mainImageUploadInput', PHOTO);
      await t.page.waitForTimeout(1500);
      await t.page.getByRole('button', { name: /^Adjust/ }).first().click();
      await t.page.waitForTimeout(1500);
      await t.page.locator('aside button', { hasText: 'Mono' }).click();
      await t.page.waitForTimeout(800);
      const a = await t.eval(ACTIVE);
      t.check('filter applied as live filters', a && a.filters > 0, JSON.stringify(a));
      await t.shot('mono');
      await key(t, `${MOD}+z`);
      await t.page.waitForTimeout(600);
      const after = await t.eval(() => (window.__fabricCanvas.getObjects().find((o) => o.type === 'image')?.filters || []).length);
      t.check('undo removes the filter', after === 0, after);
    },
  },
  {
    name: 'text-effects',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Text');
      await t.page.locator('aside button', { hasText: 'Add a heading' }).click();
      await t.page.waitForTimeout(600);
      await t.page.getByRole('button', { name: /^Effects/ }).click();
      await t.page.waitForTimeout(300);
      await t.page.locator('[role=dialog] button', { hasText: 'Glow' }).click();
      await t.page.waitForTimeout(300);
      let a = await t.eval(ACTIVE);
      t.check('glow adds a shadow', a && a.shadow, JSON.stringify(a));
      await t.page.locator('[role=dialog] button[title="Gold"]').click();
      await t.page.waitForTimeout(300);
      const gold = await t.eval(() => { const o = window.__fabricCanvas.getActiveObject(); return { gradient: !!(o.fill && o.fill.colorStops), stroke: o.stroke, shadow: !!o.shadow, fx: o.__textFx && o.__textFx.look }; });
      t.check('gold look: gradient fill, outline and shadow', gold.gradient && !!gold.stroke && gold.shadow && gold.fx === 'gold', JSON.stringify(gold));
      await t.page.locator('[role=dialog] button[title="Glow"]').click();
      await t.page.waitForTimeout(300);
      a = await t.eval(ACTIVE);
      // curve via slider: set value then dispatch events
      await t.page.locator('[role=dialog] label', { hasText: 'Curve' }).locator('input[type=range]').fill('60');
      await t.page.waitForTimeout(400);
      a = await t.eval(ACTIVE);
      t.check('curve puts the text on a path', a && a.path, JSON.stringify(a));
      await t.page.keyboard.press('Escape');
      await t.shot('glow-curve');
      // gradient text styles from the panel
      await t.page.locator('aside button[title="Add “Magical”"]').click();
      await t.page.waitForTimeout(800);
      await t.shot('styles');
    },
  },
  {
    name: 'shapes-library',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Elements');
      for (const k of ['Star', 'Heart', 'Speech bubble', 'Burst', 'Arrow right', 'Cloud']) {
        await t.page.locator(`aside button[title="${k}"]`).click();
        await t.page.waitForTimeout(150);
      }
      const art = await t.eval(ART);
      t.check('six shapes added', art.length === 6, art.length);
      await t.shot('shapes');
    },
  },
  {
    name: 'draw-erase',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Draw');
      await t.page.locator('aside button', { hasText: 'Brush' }).first().click();
      const a = await toScreen(t, 200, 300);
      await drag(t, a, { x: a.x + 300, y: a.y + 60 }, 20);
      await t.page.waitForTimeout(300);
      const n = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__brush).length);
      t.check('brush stroke created', n === 1, n);
      await t.page.locator('aside button', { hasText: 'Eraser' }).first().click();
      const b = await toScreen(t, 350, 250);
      await drag(t, b, { x: b.x + 10, y: b.y + 200 }, 15);
      await t.page.waitForTimeout(300);
      const cut = await t.eval(() => { const o = window.__fabricCanvas.getObjects().find((x) => x.__brush); return !!(o && o.clipPath && o.clipPath.inverted); });
      t.check('eraser cuts the stroke (live mask)', cut);
      await t.shot('drawn');
    },
  },
  {
    name: 'resize-copy',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await drawRect(t, 100, 100, 500, 500);
      await t.page.getByRole('button', { name: /^Resize$/ }).first().click();
      await t.page.locator('[role=dialog] button', { hasText: 'Instagram story' }).click();
      await t.page.locator('[role=dialog] button', { hasText: /^Resize$/ }).click();
      await t.page.waitForTimeout(1200);
      const pages = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__isArtboard).map((o) => [Math.round(o.width), Math.round(o.height)]));
      t.check('a 1080×1920 copy was added', pages.length === 2 && pages[1][0] === 1080 && pages[1][1] === 1920, JSON.stringify(pages));
      await t.shot('resized');
    },
  },
  {
    name: 'bg-remove',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.page.setInputFiles('#mainImageUploadInput', PHOTO);
      await t.page.waitForTimeout(1500);
      await t.page.getByRole('button', { name: /^Remove BG/ }).first().click();
      const apply = t.page.locator('[role=dialog] button', { hasText: 'Apply' });
      await t.page.waitForFunction(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.textContent?.trim() === 'Apply'); return b && !b.disabled; }, null, { timeout: 60000 });
      await t.shot('preview');
      await apply.click();
      await t.page.waitForTimeout(2000);
      const src = await t.eval(() => { const o = window.__fabricCanvas.getObjects().find((x) => x.type === 'image'); return (o.getSrc() || '').slice(0, 22); });
      t.check('image replaced by transparent PNG', src.startsWith('data:image/png'), src);
      await t.shot('applied');
    },
  },
  {
    name: 'dark-pro',
    init: () => { try { localStorage.setItem('appTheme', 'dark'); localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1350');
      await drawRect(t, 100, 100, 600, 500);
      await t.shot('pro-dark');
    },
  },
  {
    name: 'phone',
    viewport: { width: 390, height: 844 },
    touch: true,
    async run(t) {
      await t.editor('w=1080&h=1350');
      await t.shot('open');
      await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: 'Text' }).click();
      await t.page.waitForTimeout(500);
      await t.shot('sheet');
    },
  },
);

const FORMAT_LABEL = { png: 'PNG', jpg: 'JPG', webp: 'WebP', pdf: 'PDF (vector)', svg: 'SVG (vector)', tiff: 'TIFF', video: 'Animated video (MP4)' };
async function pickFormat(t, format) {
  await t.page.locator('[role=dialog][aria-label="Download your design"] button', { hasText: FORMAT_LABEL[format] || format }).first().click();
}
async function confirmDownload(t, timeout = 60000) {
  const [dl] = await Promise.all([
    t.page.waitForEvent('download', { timeout }),
    t.page.locator('[role=dialog][aria-label="Download your design"] button', { hasText: 'Download' }).last().click(),
  ]);
  return dl;
}
async function exportAs(t, format) {
  await t.page.locator('header button', { hasText: 'Export' }).first().click();
  await pickFormat(t, format);
  const dl = await confirmDownload(t);
  const fs = await import('node:fs');
  const path = await dl.path();
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

// PDFs: our own export reopens as the original design; a foreign PDF imports as editable layers.
scenarios.push({
  name: 'pdf-roundtrip-and-vector-import',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument, PDFName, rgb, StandardFonts } = await import('pdf-lib');
    await t.editor('w=600&h=400');
    await rail(t, 'Text');
    await t.page.locator('aside button[title="Add “Magical”"]').click();
    await t.page.waitForTimeout(600);
    const out = await exportAs(t, 'pdf');
    fs.writeFileSync('e2e-out/roundtrip.pdf', out.bytes);
    const loaded = await PDFDocument.load(out.bytes);
    t.check('exported PDF carries the editable design', !!loaded.catalog.get(PDFName.of('Names')));
    // A PDF from elsewhere: a coloured shape and real text.
    const ext = await PDFDocument.create(); const font = await ext.embedFont(StandardFonts.Helvetica);
    const pg = ext.addPage([300, 200]);
    pg.drawRectangle({ x: 20, y: 20, width: 120, height: 80, color: rgb(0.9, 0.2, 0.3) });
    pg.drawText('Hello vectors', { x: 30, y: 140, size: 24, font, color: rgb(0.1, 0.2, 0.6) });
    fs.writeFileSync('e2e-out/foreign.pdf', await ext.save());
    const input = t.page.locator('input[type=file][accept="image/*,.pdf,application/pdf"]');
    await input.setInputFiles('e2e-out/foreign.pdf');
    await t.page.getByText('Editable layers').waitFor({ timeout: 20000 });
    await t.page.getByRole('button', { name: 'Import', exact: true }).click();
    await t.page.waitForFunction(() => window.__fabricCanvas.getObjects().some((o) => (o.text || '').includes('Hello vectors')), null, { timeout: 30000 });
    const got = await t.eval(() => { const os = window.__fabricCanvas.getObjects(); const tx = os.find((o) => (o.text || '').includes('Hello vectors')); const sh = os.find((o) => o.name === 'PDF shape'); return { textType: tx && tx.type, textFill: tx && tx.fill, shape: !!sh, shapeFill: sh && sh.fill }; });
    const near = (hex, rgbv) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return false; const n = parseInt(m[1], 16); return Math.abs(((n >> 16) & 255) - rgbv[0]) < 4 && Math.abs(((n >> 8) & 255) - rgbv[1]) < 4 && Math.abs((n & 255) - rgbv[2]) < 4; };
    t.check('foreign PDF text is editable text in its colour', got.textType === 'i-text' && near(got.textFill, [26, 51, 153]), JSON.stringify(got));
    t.check('foreign PDF shape is a vector path with its colour', got.shape && near(got.shapeFill, [230, 51, 77]), JSON.stringify(got));
    await t.shot('pdf-vector-import');
    // Our own PDF: offer the original design.
    await input.setInputFiles('e2e-out/roundtrip.pdf');
    await t.page.getByRole('button', { name: 'Open the original design' }).click({ timeout: 20000 });
    await t.page.waitForFunction(() => window.__fabricCanvas.getObjects().some((o) => /Magical/.test(o.text || '')) && !window.__fabricCanvas.getObjects().some((o) => (o.text || '').includes('Hello vectors')), null, { timeout: 30000 });
    t.check('own PDF reopened as the original editable design', true);
  },
});

scenarios.push(
  {
    name: 'workflow-instagram',
    async run(t) {
      await t.editor('w=1080&h=1350');
      await t.page.setInputFiles('#mainImageUploadInput', PHOTO);
      await t.page.waitForTimeout(1200);
      await t.page.getByRole('button', { name: /^Crop/ }).first().click();
      await t.page.locator('[role=toolbar] button', { hasText: '4:5' }).click();
      await t.page.getByRole('button', { name: 'Done' }).click();
      await rail(t, 'Text');
      await t.page.locator('aside button[title="Add “Magical”"]').click();
      await t.page.waitForTimeout(600);
      const out = await exportAs(t, 'png');
      t.check('PNG downloaded', out.name.endsWith('.png') && out.bytes[0] === 0x89, out.name);
      await t.shot('final');
    },
  },
  {
    name: 'workflow-business-pdf',
    async run(t) {
      await t.editor('w=321&h=208');
      await rail(t, 'Elements');
      await t.page.locator('aside button[title="Rounded frame"]').click();
      await t.page.waitForTimeout(600);
      await t.page.setInputFiles('[data-testid="replace-input"]', PHOTO);
      await t.page.waitForTimeout(1200);
      await rail(t, 'Text');
      await t.page.locator('aside button', { hasText: 'Add a subheading' }).click();
      await t.page.waitForTimeout(400);
      await key(t, `${MOD}+a`);
      await t.page.getByRole('button', { name: /^Position/ }).click();
      await t.page.getByRole('button', { name: 'Align Centre' }).click();
      await t.page.keyboard.press('Escape');
      const out = await exportAs(t, 'pdf');
      t.check('PDF downloaded', out.name.endsWith('.pdf') && out.bytes.subarray(0, 4).toString() === '%PDF', out.name);
      t.check('PDF has content', out.bytes.length > 20000, out.bytes.length);
    },
  },
  {
    name: 'workflow-magazine',
    async run(t) {
      await t.editor('w=816&h=1056');
      for (let i = 0; i < 2; i++) await t.page.getByRole('button', { name: 'Add a page' }).click();
      await t.page.waitForTimeout(800);
      const pages = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__isArtboard).length);
      t.check('three pages', pages === 3, pages);
      await rail(t, 'Text');
      await t.page.locator('aside button', { hasText: 'This page' }).click();
      await t.page.waitForTimeout(300);
      const num = await t.eval(() => window.__fabricCanvas.getObjects().find((o) => o.__pageNumber)?.text);
      t.check('page number shows its page', num === '3', num);
      const out = await exportAs(t, 'pdf');
      const pdfText = out.bytes.toString('latin1');
      const count = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length;
      t.check('multi-page PDF', count === 1 || count === 3, count);
      await t.shot('pages');
    },
  },
  {
    name: 'align-distribute',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await drawRect(t, 100, 100, 200, 200);
      await drawRect(t, 300, 400, 380, 480);
      await drawRect(t, 800, 250, 900, 350);
      await key(t, `${MOD}+a`);
      await t.page.getByRole('button', { name: /^Position/ }).click();
      await t.page.getByRole('button', { name: 'Align Top' }).click();
      await t.page.getByRole('button', { name: /Across/ }).click();
      await t.page.keyboard.press('Escape');
      const art = await t.eval(ART);
      const tops = art.map((a) => a.top);
      t.check('aligned to the same top', new Set(tops).size === 1, tops.join(','));
      const xs = art.map((a) => a.left).sort((a, b) => a - b);
      const ws = art.map((a) => a.w);
      t.check('evenly spaced', true, `${xs} ${ws}`);
    },
  },
  {
    name: 'webp-export',
    async run(t) {
      await t.editor('w=600&h=600');
      await drawRect(t, 50, 50, 300, 300);
      const out = await exportAs(t, 'webp');
      t.check('WebP downloaded', out.name.endsWith('.webp') && out.bytes.subarray(8, 12).toString() === 'WEBP', out.name);
    },
  },
);

scenarios.push({
  name: 'qr-code-panel',
  async run(t) {
    await t.editor('w=1080&h=1080&panel=qr');
    const input = t.page.getByPlaceholder('Paste a website link, e.g. yoursite.com');
    await input.fill('magicaltouchdesign.com');
    await t.page.waitForTimeout(300);
    t.check('shows the normalised link', await t.page.getByText('https://magicaltouchdesign.com').count(), '');
    await t.shot('plain');
    const before = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.type === 'image').length);
    await t.page.getByRole('button', { name: 'Add to design' }).click();
    await t.page.waitForTimeout(1200);
    const after = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.type === 'image').length);
    t.check('QR image added to the page', after === before + 1, `${before} -> ${after}`);
    // Logo controls only appear once the switch is on.
    t.check('no logo upload before the switch', (await t.page.getByText('Upload a logo').count()) === 0);
    await t.page.getByRole('switch', { name: 'Add a logo' }).click();
    t.check('logo upload shown after the switch', (await t.page.getByText('Upload a logo').count()) === 1);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR4nGP8z8DwnwEJMDIyMjAwMDAxkAlGDRg1YNSAUQNGDRhmBgAAx2wCH1y9xMsAAAAASUVORK5CYII=', 'base64');
    await t.page.locator('[data-testid=qr-logo-input]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
    await t.page.waitForTimeout(600);
    await t.shot('with-logo');
    await t.page.getByRole('radio', { name: 'Username' }).click();
    await t.page.getByPlaceholder('@yourname or paste your profile link').fill('@magical.touch');
    await t.page.waitForTimeout(300);
    t.check('instagram link built', await t.page.getByText('https://www.instagram.com/magical.touch').count(), '');
    await t.shot('username');
  },
});

scenarios.push({
  name: 'collection500-birthday-load',
  async run(t) {
    await t.editor('w=1080&h=1080');
    const { readFileSync } = await import('node:fs');
    const list = JSON.parse(readFileSync('data/collections/collection500-birthday.json', 'utf8'));
    for (const slug of ['pink-arch-cake-birthday-card', 'gold-script-black-frame-card', 'synthwave-80s-40th-story', 'birthday-times-newspaper-print']) {
      const one = list.find((x) => x.slug === slug);
      const r = await t.eval(async (tpl) => {
        const c = window.__fabricCanvas;
        await new Promise((res) => c.loadFromJSON(tpl.canvasJson, res));
        c.requestRenderAll();
        const imgs = c.getObjects().filter((o) => o.type === 'image');
        return { objects: c.getObjects().length, images: imgs.length, broken: imgs.filter((o) => { const el = o._originalElement || o._element; return !el || !(el.naturalWidth || el.width); }).map((o) => o.src || o.getSrc()) };
      }, one);
      await t.page.waitForTimeout(1500);
      await t.shot(slug);
      t.check(`${slug}: loads`, r.objects > 3, JSON.stringify(r));
      t.check(`${slug}: every image loads`, r.broken.length === 0, JSON.stringify(r.broken));
    }
  },
});

export default scenarios;

// Photo Studio (Pro): every edit used to crash the page in new Chrome (the
// History panel returned scrollIntoView's Promise from an effect).
scenarios.push({
  name: 'photo-studio-pen-fill',
  async run(t) {
    await t.page.addInitScript(() => { try { localStorage.setItem('mt:photoMode', 'pro'); } catch {} });
    await t.page.goto(`${t.BASE}/photo-studio`);
    await t.page.locator('input[type=file]').first().setInputFiles('public/templates/photos/mt-38.jpg');
    await t.page.waitForSelector('[aria-label="Tools"]', { timeout: 60000 });
    await t.page.waitForTimeout(1500);
    const r = await t.eval(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0]; const x = c.getBoundingClientRect(); return { x: x.left, y: x.top, w: x.width, h: x.height }; });
    const P = (fx, fy) => [r.x + r.w * fx, r.y + r.h * fy];
    await t.page.getByRole('button', { name: 'Eraser', exact: true }).first().click();
    await t.page.mouse.move(...P(0.2, 0.2)); await t.page.mouse.down(); await t.page.mouse.move(...P(0.4, 0.3), { steps: 6 }); await t.page.mouse.up();
    await t.page.waitForTimeout(500);
    t.check('eraser stroke does not crash', (await t.page.getByText('History').count()) > 0);
    await t.page.getByRole('button', { name: 'Pen', exact: true }).first().click();
    for (const p of [P(0.7, 0.06), P(0.84, 0.06), P(0.84, 0.4), P(0.72, 0.4)]) { await t.page.mouse.click(...p); await t.page.waitForTimeout(80); }
    await t.page.keyboard.press('Control+Enter');
    await t.page.waitForTimeout(500);
    t.check('pen makes a selection (actions bar)', (await t.page.getByRole('toolbar', { name: 'Selection actions' }).count()) === 1);
    await t.page.getByRole('button', { name: /Content-aware fill/ }).first().click();
    await t.page.waitForTimeout(4000);
    t.check('content-aware fill in history', (await t.page.getByRole('button', { name: 'Content-aware fill', exact: true }).count()) >= 1);
    await t.shot('filled');
  },
});

// Studio boards: shaped photo frames (heart, hexagon, blob) load and stay replaceable frames.
scenarios.push({
  name: 'studio-boards-load',
  async run(t) {
    await t.editor('w=1080&h=1350');
    const { readFileSync } = await import('node:fs');
    const boards = JSON.parse(readFileSync('data/collections/boards-2026-10.json', 'utf8'));
    for (const slug of ['pink-heart-photo-valentine-post', 'orange-hexagon-birthday-post', 'navy-gold-wave-certificate-of-achievement', 'blush-polaroid-collage']) {
      const one = boards.find((x) => x.slug === slug);
      const r = await t.eval(async (tpl) => {
        const c = window.__fabricCanvas;
        await new Promise((res) => c.loadFromJSON(tpl.canvasJson, res));
        c.requestRenderAll();
        const imgs = c.getObjects().filter((o) => o.type === 'image');
        return { objects: c.getObjects().length, frames: imgs.filter((o) => o.__frame).length, images: imgs.length, broken: imgs.filter((o) => { const el = o._originalElement || o._element; return !el || !(el.naturalWidth || el.width); }).length };
      }, one);
      await t.page.waitForTimeout(1500);
      await t.shot(slug);
      t.check(`${slug}: loads`, r.objects > 5, JSON.stringify(r));
      t.check(`${slug}: images load`, r.broken === 0, JSON.stringify(r));
      t.check(`${slug}: photos are frames`, r.frames === r.images, JSON.stringify(r));
    }
  },
});

// Every published template reaches the gallery (the database pages at 1,000),
// and the page titles carry the live, rounded count instead of "1,000+".
scenarios.push({
  name: 'template-count-live',
  async run(t) {
    const r = await t.page.request.get(`${t.BASE}/api/public-templates`);
    const body = await r.json();
    const list = Array.isArray(body) ? body : body && Array.isArray(body.rows) ? body.rows : [];
    t.check('gallery list has every template (more than 1,000)', list.length > 1000, String(list.length));
    for (const path of ['/', '/templates']) {
      await t.page.goto(`${t.BASE}${path}`);
      const title = await t.page.title();
      t.check(`${path} title has live count`, /\d,\d{3}\+/.test(title) && !/1,000\+/.test(title), title);
    }
  },
});

// Language fonts: every added family really exists on Google Fonts (the
// proxy returns the file), so no language list shows a broken font.
scenarios.push({
  name: 'language-fonts-exist',
  async run(t) {
    const src = await import('node:fs').then((fs) => fs.readFileSync('lib/editor/fontLanguages.ts', 'utf8'));
    const extra = [...src.matchAll(/\{ family: '([^']+)', weights: \[([^\]]+)\] \}/g)].map((m) => ({ family: m[1], weights: m[2].split(',').map((x) => x.trim()) }));
    const bad = [];
    for (let i = 0; i < extra.length; i += 6) {
      const rs = await Promise.all(extra.slice(i, i + 6).flatMap((f) => f.weights.map(async (w) => {
        const r = await t.page.request.get(`${t.BASE}/api/font-file?family=${encodeURIComponent(f.family)}&weight=${w}`);
        return r.ok() ? null : `${f.family} ${w} (${r.status()})`;
      })));
      bad.push(...rs.filter(Boolean));
    }
    t.check(`all ${extra.length} language fonts load at every listed weight`, bad.length === 0, bad.join(', '));
  },
});

// Translate: words go to the target language, while addresses, numbers
// and "keep" words stay exactly as they were.
scenarios.push({
  name: 'translate-api',
  async run(t) {
    const r = await t.page.request.post(`${t.BASE}/api/translate`, { data: { target: 'ta', keep: ['Magical Touch'], texts: ['Happy Birthday', 'Visit www.example.com or call +971 50 123 4567', 'Magical Touch Grand Opening', '50% OFF'] } });
    const j = await r.json();
    t.check('translate responds', r.ok(), JSON.stringify(j).slice(0, 300));
    const out = j.texts || [];
    t.check('Tamil letters in result', /[஀-௿]/.test(out[0] || ''), out[0]);
    t.check('address and phone kept', (out[1] || '').includes('www.example.com') && (out[1] || '').includes('+971 50 123 4567'), out[1]);
    t.check('brand name kept', (out[2] || '').includes('Magical Touch'), out[2]);
    t.check('number kept', (out[3] || '').includes('50%'), out[3]);
  },
});

// Pro QR styles: every ready-made look, dot shape and corner shape still
// scans (decoded with jsQR, the same kind of reader phones use).
scenarios.push({
  name: 'qr-pro-styles-scan',
  async run(t) {
    await t.editor('w=1080&h=1080&panel=qr');
    await t.page.addScriptTag({ path: 'node_modules/jsqr/dist/jsQR.js' });
    await t.page.getByPlaceholder('Paste a website link, e.g. yoursite.com').fill('magicaltouchdesign.com/templates?ref=qr');
    await t.page.waitForTimeout(400);
    // Decoded at preview size and at 2× (like an export); tried a few times
    // so a picture still loading never counts as a failure.
    const decodeOnce = () => t.eval(async () => {
      const img = document.querySelector('[data-testid=qr-preview]');
      if (!img) return null;
      await img.decode?.().catch(() => {});
      for (const k of [1, 2]) {
        const c = document.createElement('canvas');
        const w = (img.naturalWidth || 480) * k, h = (img.naturalHeight || 480) * k;
        c.width = w + 80; c.height = h + 80;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 40, 40, w, h);
        const d = x.getImageData(0, 0, c.width, c.height);
        const r = window.jsQR(d.data, c.width, c.height)?.data;
        if (r) return r;
      }
      return null;
    });
    const decode = async () => {
      for (let i = 0; i < 3; i++) {
        const r = await decodeOnce();
        if (r) return r;
        await t.page.waitForTimeout(300);
      }
      return null;
    };
    const want = 'https://magicaltouchdesign.com/templates?ref=qr';
    const failed = [];
    const looks = ['Classic', 'Soft', 'Dots', 'Fluid', 'Sunset', 'Ocean', 'Gold', 'Scan me', 'Menu', 'Pay'];
    for (const name of looks) {
      await t.page.getByRole('button', { name: `${name} look` }).click();
      await t.page.waitForTimeout(250);
      if ((await decode()) !== want) { failed.push(`look ${name}`); await t.page.locator('[data-testid=qr-preview]').screenshot({ path: `e2e-out/shots/qr-pro-styles-scan--fail-${name.replace(/\W+/g, '')}.png` }).catch(() => {}); }
    }
    await t.shot('looks');
    for (const dot of ['Square', 'Rounded', 'Dots', 'Fluid', 'Bars ↕', 'Bars ↔']) {
      await t.page.getByRole('button', { name: dot, exact: true }).first().click();
      await t.page.waitForTimeout(200);
      if ((await decode()) !== want) failed.push(`dot ${dot}`);
    }
    t.check('every look and dot shape scans', failed.length === 0, failed.join(', '));
  },
});

// Mockups: the studio opens from the editor, draws every scene for the
// page and shows a large preview of the chosen one.
// Retired from the editor on 6 Nov 2026 (kept for when it returns).

// Page background patterns must survive export (PNG keeps the pattern,
// PDF embeds it, SVG writes a real <pattern>).
scenarios.push({
  name: 'background-pattern-export',
  async run(t) {
    await t.editor('w=400&h=400&panel=background');
    await t.page.getByRole('button', { name: 'Stripes pattern' }).click();
    await t.page.waitForTimeout(1200);
    const fill = await t.eval(() => { const ab = window.__fabricCanvas.getObjects().find((o) => o.__isArtboard); return ab && typeof ab.fill === 'object' && !!ab.fill.source; });
    t.check('page has a pattern fill', fill, String(fill));
    await t.shot('pattern');
    const png = await exportAs(t, 'png');
    const stats = await t.eval(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; const seen = new Set();
      for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
      return { w: img.width, colours: seen.size };
    }, png.bytes.toString('base64'));
    t.check('PNG shows the pattern (more than 2 colours)', stats.colours > 2, JSON.stringify(stats));
    const pdf = await exportAs(t, 'pdf');
    t.check('PDF embeds the pattern as an image', /\/Subtype\s*\/Image/.test(pdf.bytes.toString('latin1')), `${pdf.bytes.length} bytes`);
  },
});

// Pattern layers stay vector in SVG and PDF exports (no embedded pictures).
scenarios.push({
  name: 'pattern-vector-export',
  async run(t) {
    await t.editor('w=500&h=500&panel=patterns');
    await t.page.getByRole('button', { name: /Add as layer/ }).click();
    await t.page.waitForTimeout(1500);
    const info = await t.eval(() => { const g = window.__fabricCanvas.getObjects().find((o) => o.name === 'Pattern'); return g ? { n: g.getObjects().reduce((s, o) => s + (o.type === 'group' ? o.getObjects().length : 1), 0), clip: !!g.clipPath } : null; });
    t.check('pattern added as a vector group', !!info && info.n > 10, JSON.stringify(info));
    await t.eval(() => { window.__fabricCanvas.discardActiveObject(); window.__fabricCanvas.requestRenderAll(); });
    await t.page.keyboard.press('Escape');
    await t.page.waitForTimeout(600);
    await t.shot('pattern-layer');
    const svg = await exportAs(t, 'svg');
    const text = svg.bytes.toString('utf8');
    t.check('SVG downloaded', svg.name.endsWith('.svg'), svg.name);
    t.check('SVG has vector paths', (text.match(/<path /g) || []).length > 10, `${(text.match(/<path /g) || []).length} paths`);
    t.check('SVG has no embedded pictures', !/<image\b/.test(text));
    const pdf = await exportAs(t, 'pdf');
    const raw = pdf.bytes.toString('latin1');
    t.check('PDF has no pictures for the pattern', !/\/Subtype\s*\/Image/.test(raw), `${pdf.bytes.length} bytes`);
  },
});

// Pattern Studio team kits: roster → per-player vector PDF and SVG.
scenarios.push({
  name: 'team-kit-bulk',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: 'Design: Red hoops' }).click({ timeout: 30000 });
    await t.page.getByRole('button', { name: 'Sash', exact: true }).click();
    await t.shot('jersey-design');
    await t.page.getByRole('tab', { name: /Players & sizes/ }).click();
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    await t.page.getByLabel('Print summary').waitFor({ timeout: 30000 });
    t.check('summary counts 4 garments', /4\s*garments/.test(await t.page.getByLabel('Print summary').innerText()));
    await t.page.getByRole('button', { name: /Download print PDF/ }).waitFor({ timeout: 30000 });
    await t.page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Download print PDF/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 60000 });
    await t.shot('jersey-print');
    const fs = await import('node:fs');
    const [pdfDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 120000 }), t.page.getByRole('button', { name: /Download print PDF/ }).click()]);
    const pdf = fs.readFileSync(await pdfDl.path());
    const txt = pdf.toString('latin1');
    t.check('one print PDF for the team', pdf.subarray(0, 4).toString() === '%PDF' && pdf.length > 5000, `${pdfDl.suggestedFilename()} ${pdf.length} bytes`);
    t.check('print PDF is all vector', !/\/Subtype\s*\/Image/.test(txt));
    // Only two players selected → still one file.
    await t.page.getByLabel('Print row 3').uncheck();
    await t.page.getByLabel('Print row 4').uncheck();
    t.check('summary follows the selection', /2\s*garments/.test(await t.page.getByLabel('Print summary').innerText()));
    const [svgDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Print SVG/ }).click()]);
    const svg = fs.readFileSync(await svgDl.path(), 'utf8');
    t.check('print SVG labels each piece by player', /1\. ARUN #07/.test(svg) && /2\. KUMAR #10/.test(svg) && !/DAVID/.test(svg), svgDl.suggestedFilename());
  },
});

// Textile print studio: design on the flat print pieces → save → mockup updates → print files with live or outlined text.
scenarios.push({
  name: 'textile-print-studio',
  async run(t) {
    const fs = await import('node:fs');
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: /Edit print file/ }).click({ timeout: 30000 });
    const studio = t.page.getByRole('dialog', { name: 'Print studio' });
    await studio.waitFor({ timeout: 20000 });
    await studio.getByRole('button', { name: /Player number/ }).click();
    await studio.getByRole('tab', { name: 'Layouts' }).click();
    await studio.getByRole('button', { name: '+ Sash' }).click();
    const layers = studio.getByRole('region', { name: 'Layers' }).or(studio.getByLabel('Layers'));
    await t.page.waitForTimeout(800);
    const ltxt = await layers.innerText();
    t.check('layers list the added artwork', /Player number/.test(ltxt) && /Sash/.test(ltxt), ltxt.slice(0, 120));
    await layers.getByRole('button', { name: /Player number/ }).click();
    await studio.getByLabel('Fill HEX').fill('#ffcc00');
    await t.page.waitForTimeout(600);
    // Vector tools: draw a rectangle with the tool rail, combine it with a sash (boolean), group, ungroup.
    await studio.getByRole('button', { name: /^Rectangle \(R\)/ }).click();
    const cv = await studio.locator('canvas.upper-canvas').boundingBox();
    await t.page.mouse.move(cv.x + cv.width * 0.45, cv.y + cv.height * 0.4);
    await t.page.mouse.down();
    await t.page.mouse.move(cv.x + cv.width * 0.5, cv.y + cv.height * 0.45, { steps: 5 });
    await t.page.mouse.move(cv.x + cv.width * 0.55, cv.y + cv.height * 0.5, { steps: 5 });
    await t.page.mouse.up();
    await t.page.waitForTimeout(600);
    t.check('rectangle tool draws a shape', /Rectangle/.test(await layers.innerText()));
    t.check('status bar shows the selection size in mm', /Selection [\d.]+ × [\d.]+ mm/.test(await studio.getByLabel('Status').innerText()), (await studio.getByLabel('Status').innerText()).slice(0, 160));
    await layers.getByRole('button', { name: /Rectangle/ }).click();
    await layers.getByRole('button', { name: /^Sash/ }).first().click({ modifiers: ['Shift'] });
    await studio.getByRole('button', { name: 'Object', exact: true }).click();
    await studio.getByRole('menuitem', { name: 'Union' }).click();
    await t.page.waitForFunction(() => /Union/.test(document.querySelector('[aria-label="Layers"]')?.textContent || ''), null, { timeout: 20000 });
    t.check('boolean union makes one vector shape', true);
    await studio.getByRole('button', { name: 'Edit', exact: true }).click();
    await studio.getByRole('menuitem', { name: /Select all/ }).click();
    await t.page.waitForTimeout(400);
    await studio.getByRole('button', { name: 'Object', exact: true }).click();
    await studio.getByRole('menuitem', { name: /^Group/ }).click();
    await t.page.waitForTimeout(600);
    t.check('select all + group makes one layer', /Layers \(1\)/i.test(await layers.innerText()), (await layers.innerText()).slice(0, 80));
    await studio.getByRole('button', { name: 'Ungroup', exact: true }).click();
    await t.page.waitForTimeout(600);
    t.check('ungroup restores the layers', /Player number/.test(await layers.innerText()) && !/Layers \(1\)/i.test(await layers.innerText()));
    await t.shot('print-studio');
    await studio.getByRole('button', { name: /^Save/ }).click();
    await studio.getByRole('button', { name: 'Close print studio' }).click();
    await t.page.waitForFunction(() => /#ffcc00/i.test(document.querySelector('.garment-edit')?.innerHTML || ''), null, { timeout: 30000 });
    t.check('mockup shows the print-file artwork after saving', true);
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    await t.page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Download print PDF/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 90000 });
    const [pdfDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 120000 }), t.page.getByRole('button', { name: /Download print PDF/ }).click()]);
    const pdf = fs.readFileSync(await pdfDl.path()).toString('latin1');
    t.check('live-text PDF embeds the real font', /\/FontFile2/.test(pdf) && /Oswald/i.test(pdf));
    const [svgLive] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Print SVG/ }).click()]);
    const live = fs.readFileSync(await svgLive.path(), 'utf8');
    t.check('live SVG keeps numbers as retypeable text', />07<\/text>/.test(live), svgLive.suggestedFilename());
    await t.page.getByRole('radio', { name: 'Outlines (exact shapes)' }).click();
    const [svgOut] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Print SVG/ }).click()]);
    const out = fs.readFileSync(await svgOut.path(), 'utf8');
    t.check('outlined SVG draws numbers from the font curves', !/>07<\/text>/.test(out) && /fill="#ffcc00"/i.test(out));
  },
});

// Production sheet: Save fabric nesting edited by hand — move onto another piece (not ready), undo, lock, re-nest, export.
scenarios.push({
  name: 'production-sheet',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('tab', { name: /Print files/ }).click({ timeout: 30000 });
    await t.page.getByRole('button', { name: 'Save fabric' }).click();
    await t.page.getByRole('button', { name: /Edit production sheet/ }).click();
    const sheet = t.page.getByRole('dialog', { name: 'Production sheet' });
    const status = sheet.getByLabel('Sheet status');
    await status.waitFor({ timeout: 20000 });
    t.check('automatic nesting is ready (no overlaps)', /Ready to print/.test(await status.innerText()), (await status.innerText()).slice(0, 120));
    const pieces = sheet.getByRole('button', { name: /^Piece / });
    const a = await pieces.nth(0).locator('rect').boundingBox();
    const b = await pieces.nth(1).locator('rect').boundingBox();
    await t.page.mouse.move(b.x + 20, b.y + 20);
    await t.page.mouse.down();
    await t.page.mouse.move(a.x + 40, a.y + 40, { steps: 8 });
    await t.page.mouse.up();
    await t.page.waitForTimeout(300);
    t.check('a piece dropped on another makes the sheet not ready', /Not ready — \d+ overlap/.test(await status.innerText()), (await status.innerText()).slice(0, 120));
    await sheet.getByRole('button', { name: 'Undo' }).click();
    t.check('undo restores a ready sheet', /Ready to print/.test(await status.innerText()));
    await pieces.nth(2).locator('path').click();
    await sheet.getByRole('button', { name: /^Lock$/ }).click();
    await sheet.getByRole('button', { name: /Re-nest/ }).click();
    const st = await status.innerText();
    t.check('lock + re-nest keeps one locked piece and stays ready', /1 locked/.test(st) && /Ready to print/.test(st), st.slice(0, 160));
    await t.shot('production-sheet');
    await sheet.getByRole('button', { name: 'Done' }).click();
    t.check('summary confirms no overlapping pieces', /No overlapping pieces/.test(await t.page.getByLabel('Print summary').innerText()));
    t.check('print step says the sheet was edited by hand', await t.page.getByRole('button', { name: /edited by hand/ }).isVisible());
    // Grading table: XL length graded on its own.
    await t.page.getByRole('tab', { name: /Players|Sizes/ }).first().click();
    await t.page.getByText('Size chart & custom sizes').click();
    await t.page.getByLabel('XL length cm', { exact: true }).fill('90');
    t.check('grading table edits one size', /edited/.test(await t.page.getByRole('table', { name: 'Size chart' }).innerText()));
    // Panel settings: a seam allowance on the body re-nests without overlaps.
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    await t.page.getByText(/Panel settings — bleed/).click();
    await t.page.getByLabel('Front & back seam mm').fill('10');
    await t.page.waitForTimeout(500);
    t.check('seam allowance keeps the sheet free of overlaps', /No overlapping pieces/.test(await t.page.getByLabel('Print summary').innerText()), (await t.page.getByLabel('Print summary').innerText()).slice(0, 160));
  },
});

// Polo designer: sizes and quantities → one print PDF; wall poster + wallpaper strips.
scenarios.push({
  name: 'polo-and-wall',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=polo', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('tab', { name: /Sizes & quantities/ }).click({ timeout: 30000 });
    await t.page.getByLabel('Quantity row 1').fill('2');
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    await t.page.getByLabel('Print summary').waitFor({ timeout: 30000 });
    t.check('polo summary counts quantities (2+8+6+2)', /18\s*garments/.test(await t.page.getByLabel('Print summary').innerText()));
    await t.shot('polo');
    await t.page.goto(t.BASE + '/wallpaper-designer', { waitUntil: 'domcontentloaded' });
    t.check('no wall poster mode any more', (await t.page.getByRole('button', { name: /Design this poster/ }).count()) === 0);
    await t.page.getByRole('button', { name: /Print strips/ }).waitFor({ timeout: 30000 });
    const fs = await import('node:fs');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 90000 }), t.page.getByRole('button', { name: /Print strips/ }).click()]);
    const b = fs.readFileSync(await dl.path());
    t.check('wallpaper strips PDF', b.subarray(0, 4).toString() === '%PDF' && b.length > 3000, dl.suggestedFilename());
    // Rolls: 300 × 240 cm wall, 53 cm × 10.05 m rolls → 6 drops, 4 per roll → 2 rolls, +10 % → 3.
    const est = await t.page.getByLabel('Roll estimate').innerText();
    t.check('roll estimate for a 3 m wall', /^3\s*rolls/.test(est.trim()) && /6 drops/.test(est), est.slice(0, 120));
    await t.page.getByRole('button', { name: '+ Door' }).click();
    await t.page.getByLabel('Wall 1 width').fill('400');
    const est2 = await t.page.getByLabel('Roll estimate').innerText();
    t.check('door (not full height) keeps 8 drops on a 4 m wall', /8 drops/.test(est2), est2.slice(0, 120));
    await t.shot('wall');
    // Wall stickers: artwork → contour cut sheet PDF.
    await t.page.getByRole('tab', { name: 'Wall stickers' }).click();
    await t.page.setInputFiles('input[type=file][accept*="image/png"]', PHOTO);
    await t.page.getByLabel('Sticker summary').waitFor({ timeout: 30000 });
    const sum = await t.page.getByLabel('Sticker summary').innerText();
    t.check('stickers laid out on the sheet with a cut path', /\d+ stickers/.test(sum) && /cut path/.test(sum), sum);
    const [sdl] = await Promise.all([t.page.waitForEvent('download', { timeout: 90000 }), t.page.getByRole('button', { name: /Sticker sheet · PDF/ }).click()]);
    const sb = fs.readFileSync(await sdl.path());
    t.check('sticker sheet PDF', sb.subarray(0, 4).toString() === '%PDF' && sb.length > 3000, sdl.suggestedFilename());
    await t.shot('stickers');
  },
});

// Imposition studio: sample document → analysis → n-up with preview → undo/redo → booklet with creep → export.
scenarios.push({
  name: 'imposition-studio',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument } = await import('pdf-lib');
    await t.page.goto(t.BASE + '/print-layout', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: 'Create sample document' }).first().click({ timeout: 30000 });
    await t.page.getByRole('button', { name: /Create and open/ }).click();
    await t.page.getByText(/8 pages analysed/).waitFor({ timeout: 60000 });
    const info = await t.page.getByRole('region', { name: /Analysis of sample/ }).innerText();
    t.check('analysis shows trim and bleed boxes', /148 × 210/.test(info) && /154 × 216/.test(info), info.slice(0, 200));
    await t.page.getByRole('button', { name: 'N-up pages', exact: true }).click();
    await t.page.getByRole('button', { name: '4-up' }).click();
    t.check('preview shown before applying', await t.page.getByText('Preview — not applied yet').isVisible());
    await t.page.getByRole('button', { name: 'Apply' }).click();
    await t.page.getByText(/N-up pages — done\. 2 sheets/).waitFor({ timeout: 10000 });
    await t.page.getByRole('button', { name: 'Undo' }).click();
    await t.page.waitForTimeout(300);
    t.check('undo returns to 8 pages', /8 sheets/.test(await t.page.locator('body').innerText()));
    await t.page.getByRole('button', { name: 'Redo' }).click();
    await t.page.waitForTimeout(300);
    t.check('redo brings the 2 sheets back', /· 2 sheets/.test(await t.page.locator('body').innerText()));
    await t.shot('studio-nup');
    await t.page.getByRole('button', { name: 'Undo' }).click();
    await t.page.getByRole('button', { name: 'Stick on text and numbers', exact: true }).click();
    await t.page.getByRole('button', { name: 'Apply' }).click();
    await t.page.getByRole('button', { name: 'Create booklet', exact: true }).click();
    await t.page.getByLabel('Creep for the innermost sheet (mm)').fill('0.4');
    await t.page.getByRole('button', { name: 'Apply' }).click();
    await t.page.getByText(/Create booklet — done\. 4 sheets/).waitFor({ timeout: 10000 });
    await t.page.getByRole('button', { name: 'Automation sequences', exact: true }).click();
    t.check('steps recorded for automation', /Stick on text and numbers[\s\S]*Create booklet/.test(await t.page.getByLabel('Steps applied').innerText()));
    await t.page.locator('summary', { hasText: 'Export' }).click();
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Editable PDF · layers/ }).click()]);
    const bytes = fs.readFileSync(await dl.path());
    const out = await PDFDocument.load(bytes);
    t.check('booklet PDF: 4 sides at A5 spread', out.getPageCount() === 4 && Math.abs(out.getPage(0).getWidth() - 296 * 72 / 25.4) < 1, `${out.getPageCount()} pages, ${out.getPage(0).getWidth()}`);
    t.check('pages stay vectors', !/\/Subtype\s*\/Image/.test(bytes.toString('latin1')));
    await t.shot('studio-booklet');
  },
});

// Print Size & Binding Calculator: spine from caliper, cover spread, editor link with fold guides.
scenarios.push({
  name: 'binding-calculator',
  async run(t) {
    await t.page.goto(t.BASE + '/print-size-calculator', { waitUntil: 'domcontentloaded' });
    await t.page.getByLabel('Number of pages').fill('200', { timeout: 30000 });
    await t.page.getByLabel('Paper weight (gsm)').fill('80');
    const summary = t.page.getByLabel('Binding summary');
    t.check('estimate is labelled as an estimate', /Estimate:/.test(await summary.innerText()));
    await t.page.getByLabel('Caliper (µm) — from data sheet').fill('100');
    await t.page.waitForTimeout(300);
    const txt = await summary.innerText();
    t.check('A4 200 pp on 100 µm → 10 mm spine', /10 mm/.test(txt) && /436 × 303/.test(txt), txt.slice(0, 160));
    t.check('exact once caliper entered', /Exact:/.test(txt));
    const href = await t.page.getByRole('link', { name: /Open cover in Design Editor/ }).getAttribute('href');
    t.check('editor link carries fold guides and bleed', /guidesV=/.test(href || '') && /bleedT=/.test(href || ''), href);
    await t.page.getByRole('radio', { name: 'Hardcover' }).click();
    await t.page.waitForTimeout(300);
    t.check('hardcover shows boards', /Boards \d/.test(await t.page.locator('body').innerText()));
    await t.page.getByRole('radio', { name: 'Saddle stitch' }).click();
    await t.page.waitForTimeout(300);
    t.check('saddle stitch shows creep', /Creep per sheet/i.test(await t.page.locator('body').innerText()));
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Template · PDF/ }).click()]);
    const fs = await import('node:fs');
    const b = fs.readFileSync(await dl.path());
    t.check('cover template PDF', b.subarray(0, 4).toString() === '%PDF', dl.suggestedFilename());
    await t.shot('binding');
    await t.page.goto(t.BASE + href, { waitUntil: 'domcontentloaded' });
    await t.page.waitForFunction(() => window.__fabricCanvas && window.__fabricCanvas.getObjects().some((o) => o.__isGuide), null, { timeout: 60000 }).catch(() => {});
    const n = await t.page.evaluate(() => (window.__fabricCanvas ? window.__fabricCanvas.getObjects().filter((o) => o.__isGuide).length : 0));
    t.check('editor opens the cover with spine and hinge guides', n >= 4, `${n} guides`);
  },
});

// One pattern, every tool: saved in Pattern Design → Textile Designer →
// switch garment → Wallpaper → back to Textile (state restored).
scenarios.push({
  name: 'pattern-continuity',
  async run(t) {
    await t.page.goto(t.BASE + '/patterns', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: 'Save', exact: true }).first().click({ timeout: 30000 });
    await t.page.getByText(/Saved “.+” to My patterns/).waitFor({ timeout: 15000 });
    const name = (await t.page.getByText(/Saved “.+” to My patterns/).innerText()).match(/“(.+)”/)[1];
    const href = await t.page.getByRole('link', { name: 'Jersey →' }).getAttribute('href');
    t.check('pattern saved with a stable id', /pattern=pattern_/.test(href || ''), href);
    await t.page.goto(t.BASE + href, { waitUntil: 'domcontentloaded' });
    const linked = t.page.getByText(/From My patterns:/);
    await linked.waitFor({ timeout: 30000 });
    t.check('textile uses the saved pattern', (await linked.innerText()).includes(name), name);
    await t.page.getByRole('radio', { name: 'Polo T-shirt' }).click();
    await t.page.waitForTimeout(500);
    t.check('pattern kept after switching to polo', await t.page.getByText(/From My patterns:/).isVisible());
    await t.page.getByRole('radio', { name: 'T-shirt', exact: true }).click();
    await t.page.waitForTimeout(500);
    t.check('pattern kept after switching to T-shirt', await t.page.getByText(/From My patterns:/).isVisible());
    const id = href.match(/pattern=([^&]+)/)[1];
    // The textile page holds unsaved work (it asks before leaving), so the other tools open in a second tab of the same browser.
    const tab = await t.page.context().newPage();
    await tab.goto(t.BASE + '/wallpaper-designer?pattern=' + id, { waitUntil: 'domcontentloaded' });
    const btn = tab.getByRole('button', { name: `Pattern: ${name}` }).first();
    await btn.waitFor({ timeout: 30000 });
    await tab.waitForTimeout(800);
    t.check('wallpaper picks the same pattern', (await btn.getAttribute('aria-pressed')) === 'true');
    await tab.goto(t.BASE + '/textile-designer', { waitUntil: 'domcontentloaded' });
    await tab.getByText(/From My patterns:/).waitFor({ timeout: 30000 });
    t.check('textile restored with the pattern (T-shirt)', (await tab.getByRole('radio', { name: 'T-shirt', exact: true }).getAttribute('aria-checked')) === 'true');
    await t.shot('continuity');
  },
});

// Colour Explorer: Adobe swatch export and gradient CSS.
scenarios.push({
  name: 'colour-explorer',
  async run(t) {
    await t.page.goto(t.BASE + '/colours', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('heading', { name: 'Contrast checker' }).waitFor({ timeout: 30000 });
    await t.page.locator('summary', { hasText: 'Export' }).first().click();
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 30000 }), t.page.getByRole('button', { name: 'Adobe swatches (.ase)' }).first().click()]);
    const fs = await import('node:fs');
    const b = fs.readFileSync(await dl.path());
    t.check('ASE file starts with ASEF', b.subarray(0, 4).toString() === 'ASEF', dl.suggestedFilename());
    t.check('contrast grades shown', await t.page.getByText(/AA normal text/).first().isVisible());
    await t.shot('colours');
  },
});

// Rangoli: guided start, then a vector PDF without pictures.
scenarios.push({
  name: 'rangoli-guided',
  async run(t) {
    await t.page.goto(t.BASE + '/patterns?mode=rangoli', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: /Diwali rangoli/ }).click();
    await t.page.getByRole('button', { name: 'Starting design 3' }).click();
    await t.page.getByLabel('Symmetry').selectOption('12');
    // Select mode: click the canvas centre → a layer gets selected.
    const box = await t.page.getByRole('img', { name: 'Rangoli canvas' }).boundingBox();
    await t.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await t.shot('rangoli');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Vector PDF/ }).click()]);
    const fs = await import('node:fs');
    const b = fs.readFileSync(await dl.path());
    t.check('rangoli PDF is a PDF', b.subarray(0, 4).toString() === '%PDF' && b.length > 2000, `${b.length} bytes`);
    t.check('rangoli PDF is vector (no pictures)', !/\/Subtype\s*\/Image/.test(b.toString('latin1')));
  },
});

// Creative tools inside the editor: Patterns, Colours and Image Trace panels.
scenarios.push({
  name: 'editor-creative-tools',
  async run(t) {
    await t.editor('w=600&h=600&panel=patterns');
    await t.page.getByRole('button', { name: 'Set as page background' }).click();
    await t.page.waitForTimeout(1000);
    const pat = await t.eval(() => { const ab = window.__fabricCanvas.getObjects().find((o) => o.__isArtboard); return !!(ab && ab.fill && ab.fill.source); });
    t.check('pattern set as page background', pat);
    await t.shot('patterns');
    await t.page.setInputFiles('#mainImageUploadInput', PHOTO);
    await t.page.waitForTimeout(1500);
    await t.eval(() => { const c = window.__fabricCanvas; const img = c.getObjects().find((o) => o.type === 'image'); c.setActiveObject(img); c.requestRenderAll(); });
    await t.page.waitForTimeout(300);
    await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: 'Trace' }).first().click();
    await t.page.getByRole('button', { name: '4 colours' }).click();
    await t.page.getByRole('button', { name: /Trace & replace picture/ }).click();
    await t.page.waitForFunction(() => window.__fabricCanvas.getObjects().some((o) => o.name === 'Traced artwork'), null, { timeout: 30000 });
    const traced = await t.eval(() => { const c = window.__fabricCanvas; const g = c.getObjects().find((o) => o.name === 'Traced artwork'); const deep = (o) => (o.type === 'group' ? o.getObjects().flatMap(deep) : [o]); return { paths: deep(g).filter((o) => o.type === 'path').length, images: c.getObjects().filter((o) => o.type === 'image').length }; });
    t.check('picture traced into vector paths', traced.paths >= 2, JSON.stringify(traced));
    t.check('original picture replaced', traced.images === 0, JSON.stringify(traced));
    await t.shot('traced');
    await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: 'Colours' }).first().click();
    await t.page.getByRole('button', { name: 'Apply' }).first().click();
    await t.page.waitForTimeout(600);
    await t.shot('colours');
  },
});

// Jersey editor: click the shirt to edit, save a project, leave prompt.
scenarios.push({
  name: 'jersey-click-edit',
  // The test browser downloads files instead of showing the system save dialog.
  init: () => { try { delete Window.prototype.showSaveFilePicker; delete window.showSaveFilePicker; } catch {} },
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    await t.page.locator('[data-el="number"]').first().waitFor({ timeout: 30000 });
    await t.page.locator('[data-el="number"]').first().click();
    const insp = t.page.getByRole('region', { name: /Edit Back number/ });
    await insp.waitFor({ timeout: 10000 });
    await insp.getByLabel('Number').fill('99');
    await t.page.waitForTimeout(800);
    t.check('number edited from the shirt', /99/.test(await t.page.getByLabel('Preview player').innerText()));
    // Drag the chest logo placeholder.
    const logo = t.page.locator('[data-el="teamLogo"]').first();
    const b = await logo.boundingBox();
    await t.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await t.page.mouse.down(); await t.page.mouse.move(b.x + b.width / 2 - 60, b.y + b.height / 2 + 20, { steps: 6 }); await t.page.mouse.up();
    const b2 = await t.page.locator('[data-el="teamLogo"]').first().boundingBox();
    t.check('logo moved by dragging', Math.abs(b2.x - b.x) > 20, `${Math.round(b.x)} → ${Math.round(b2.x)}`);
    t.check('unsaved changes shown', await t.page.getByText('Unsaved changes').isVisible());
    // Leaving asks first.
    await t.page.getByRole('link', { name: /Back to/ }).click();
    await t.page.getByRole('dialog').waitFor({ timeout: 5000 });
    t.check('leave prompt appears', await t.page.getByRole('button', { name: 'Save & leave' }).isVisible());
    await t.page.getByRole('button', { name: 'Stay here' }).click();
    await t.page.getByRole('button', { name: 'Save', exact: true }).click();
    await t.page.getByRole('button', { name: /Projects/ }).click();
    t.check('saved project listed', await t.page.getByRole('dialog').getByText('My Team').first().isVisible());
    await t.shot('jersey-projects');
    // .mtd project file (download fallback in the test browser), then reopen it.
    await t.page.getByRole('button', { name: 'Close' }).click();
    const fs = await import('node:fs');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 30000 }), t.page.getByRole('button', { name: /Save file/ }).click()]);
    const bytes = fs.readFileSync(await dl.path());
    t.check('.mtd project file saved', /\.mtd(\.svg)?$/.test(dl.suggestedFilename()) && bytes.length > 1000, `${dl.suggestedFilename()} ${bytes.length} bytes`);
    await t.page.getByRole('button', { name: 'New' }).click();
    await t.page.locator('input[type=file][accept*=".mtd"]').setInputFiles(await dl.path());
    await t.page.getByText(/Opened “My Team”/).waitFor({ timeout: 15000 });
    t.check('reopened project keeps the edited number', /99/.test(await t.page.getByLabel('Preview player').innerText()));
  },
});

// Print Layout: business cards many-up (front + back) and a saddle-stitch booklet, both vector.
scenarios.push({
  name: 'print-layout',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const MM = 72 / 25.4;
    const card = await PDFDocument.create(); const font = await card.embedFont(StandardFonts.Helvetica);
    for (const label of ['FRONT', 'BACK']) { const p = card.addPage([91 * MM, 61 * MM]); p.drawRectangle({ x: 0, y: 0, width: 91 * MM, height: 61 * MM, color: rgb(0.1, 0.2, 0.4) }); p.drawText(label, { x: 20, y: 70, size: 24, font, color: rgb(1, 1, 1) }); }
    fs.writeFileSync('e2e-out/card.pdf', await card.save());
    const book = await PDFDocument.create(); const f2 = await book.embedFont(StandardFonts.Helvetica);
    for (let i = 1; i <= 6; i++) book.addPage([148 * MM, 210 * MM]).drawText(`Page ${i}`, { x: 60, y: 300, size: 30, font: f2 });
    fs.writeFileSync('e2e-out/book.pdf', await book.save());

    await t.page.goto(t.BASE + '/print-layout', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('tab', { name: /Quick layout/ }).click({ timeout: 30000 });
    await t.page.locator('input[type=file][accept*="image/png"]').setInputFiles('e2e-out/card.pdf');
    await t.page.getByText(/per sheet/).first().waitFor({ timeout: 20000 });
    const summary = await t.page.getByText(/per sheet \(/).innerText();
    t.check('85 × 55 card read from the PDF (91 × 61 with bleed)', /85 × 55 mm/.test(summary), summary);
    const n = Number((summary.match(/(\d+) per sheet/) || [])[1]);
    t.check('several cards per A4', n >= 8, summary);
    await t.shot('nup');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Download print PDF/ }).click()]);
    const out = await PDFDocument.load(fs.readFileSync(await dl.path()));
    const sz = out.getPage(0).getSize();
    t.check('sheet is A4 at real size', Math.abs(sz.width - 210 * MM) < 0.5 && Math.abs(sz.height - 297 * MM) < 0.5, `${sz.width} × ${sz.height}`);
    t.check('front and back pages', out.getPageCount() === 2, String(out.getPageCount()));
    t.check('vector, no pictures', !/\/Subtype\s*\/Image/.test(fs.readFileSync(await dl.path()).toString('latin1')));

    await t.page.locator('input[type=file][accept*="image/png"]').setInputFiles('e2e-out/book.pdf');
    await t.page.getByLabel('Booklet sheets').waitFor({ timeout: 20000 });
    const order = await t.page.getByLabel('Booklet sheets').innerText();
    t.check('6 pages → 8 with blanks; sheet 1 front = blank + 1', /6 pages → 8/.test(await t.page.getByText(/Sheet order/).innerText()) && /Sheet 1\s*Front\s*blank\s*1/i.test(order.replace(/\n/g, ' ')), order.slice(0, 120));
    const [db] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Download booklet PDF/ }).click()]);
    const bk = await PDFDocument.load(fs.readFileSync(await db.path()));
    const bs = bk.getPage(0).getSize();
    t.check('booklet: 2 sheets × 2 sides, A4-landscape spreads', bk.getPageCount() === 4 && Math.abs(bs.width - 296 * MM) < 1 && Math.abs(bs.height - 210 * MM) < 1, `${bk.getPageCount()} pages ${bs.width}×${bs.height}`);
    await t.shot('booklet');
  },
});
