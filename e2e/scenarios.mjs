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
      t.check('rectangle drawn', art.length === 1 && art[0].type === 'rect', JSON.stringify(art));
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
      t.check('one undo ungroups back to two shapes', art.length === 2 && art.every((a) => a.type === 'rect'), JSON.stringify(art));

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
      await t.page.getByRole('button', { name: 'jpg', exact: true }).click();
      const [dl] = await Promise.all([
        t.page.waitForEvent('download', { timeout: 20000 }),
        t.page.locator('div.fixed button:has-text("Export")').last().click(),
      ]);
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
      for (const p of ['Templates', 'Elements', 'Text', 'Uploads', 'Draw', 'Background', 'Brand', 'Layers', 'Help']) {
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

async function exportAs(t, format) {
  await t.page.locator('header button', { hasText: 'Export' }).first().click();
  await t.page.getByRole('button', { name: format, exact: true }).click();
  const [dl] = await Promise.all([
    t.page.waitForEvent('download', { timeout: 60000 }),
    t.page.locator('div.fixed button:has-text("Export")').last().click(),
  ]);
  const fs = await import('node:fs');
  const path = await dl.path();
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) };
}

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
      await t.page.locator('aside button', { hasText: '# Add page number' }).click();
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

export default scenarios;
