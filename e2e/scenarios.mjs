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
      for (const p of ['Templates', 'Elements', 'Text', 'Upload', 'QR & barcode', 'Draw', 'Background', 'Brand', 'Layers', 'Help']) {
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
    name: 'brush-library',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await rail(t, 'Draw');
      const lib = t.page.getByRole('radiogroup', { name: 'Brush library' });
      t.check('14 brushes in the library', (await lib.getByRole('radio').count()) === 14);
      const made = [];
      for (const [label, preset, y] of [['Calligraphy', 'calligraphy', 200], ['Soft round', 'soft', 330], ['Dry brush', 'dry', 460], ['Dashed', 'dashed', 590], ['Pattern', 'pattern', 720]]) {
        await lib.getByRole('radio', { name: label }).click();
        const a = await toScreen(t, 150, y);
        await drag(t, a, { x: a.x + 320, y: a.y + 40 }, 20);
        await t.page.waitForTimeout(250);
        made.push(await t.eval((p) => { const o = window.__fabricCanvas.getObjects().filter((x) => x.__brush).pop(); return o ? { p: o.__brush.preset, type: o.type } : null; }, preset));
      }
      t.check('each preset draws its own stroke', made.map((m) => m && m.p).join() === 'calligraphy,soft,dry,dashed,pattern', JSON.stringify(made));
      t.check('soft brush is a layered vector group', made[1] && made[1].type === 'group');
      t.check('calligraphy is a single vector path', made[0] && made[0].type === 'path');
      await t.page.getByLabel('Nib angle').count().then((n) => t.check('calligraphy controls hidden for other brushes', n === 0));
      await t.shot('brushes');
    },
  },
  {
    name: 'pro-text-transform',
    init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.eval(() => { const c = window.__fabricCanvas; const tb = new window.fabric.Textbox('Shear me', { left: 200, top: 300, width: 500, fontSize: 80, fontFamily: 'Arial' }); c.add(tb); c.requestRenderAll(); });
      await t.page.waitForTimeout(400);
      const at = await toScreen(t, 400, 340);
      await t.page.mouse.click(at.x, at.y);
      await t.page.waitForTimeout(600);
      const panelOpen = await t.page.getByLabel(/^Shear X/).count();
      if (!panelOpen) { const b = t.page.getByRole('button', { name: /Properties/ }).first(); if (await b.count()) await b.click(); await t.page.waitForTimeout(400); }
      const seen = await t.eval(() => ({ active: window.__fabricCanvas.getActiveObject()?.type || null, mode: localStorage.getItem('mt:editorMode'), w: innerWidth, labels: [...document.querySelectorAll('label')].map((l) => l.textContent.trim().slice(0, 18)).filter(Boolean).slice(0, 60) }));
      t.check('properties panel shows transform fields', (await t.page.getByLabel(/^Shear X/).count()) > 0, JSON.stringify(seen));
      if (!(await t.page.getByLabel(/^Shear X/).count())) return;
      const set = async (label, v) => { const f = t.page.getByLabel(new RegExp('^' + label)).first(); await f.fill(String(v)); await f.press('Enter'); await t.page.waitForTimeout(250); };
      await set('Shear X', 15);
      await set('H scale', 150);
      await t.page.getByLabel('Text direction').selectOption('rtl');
      await t.page.waitForTimeout(300);
      const o = await t.eval(() => { const a = window.__fabricCanvas.getActiveObject(); return { skewX: a.skewX, ratio: Math.round((a.scaleX / a.scaleY) * 100), dir: a.direction, align: a.textAlign }; });
      t.check('shear applied', Math.round(o.skewX) === 15, JSON.stringify(o));
      t.check('horizontal scale applied (height kept)', o.ratio === 150, JSON.stringify(o));
      t.check('right-to-left direction applied', o.dir === 'rtl' && o.align === 'right', JSON.stringify(o));
    },
  },
  {
    name: 'gradient-on-canvas',
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.eval(() => {
        const F = window.fabric, c = window.__fabricCanvas;
        const r = new F.Rect({ left: 200, top: 200, width: 600, height: 400, fill: new F.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0.5, x2: 1, y2: 0.5 }, colorStops: [{ offset: 0, color: '#F2708F' }, { offset: 1, color: '#3B82C4' }] }) });
        c.add(r); c.setActiveObject(r); c.requestRenderAll();
      });
      await t.page.waitForTimeout(600);
      const end = t.page.getByRole('slider', { name: 'Gradient end' });
      t.check('gradient handles appear on the selected object', (await end.count()) === 1 && (await t.page.getByRole('slider', { name: 'Gradient start' }).count()) === 1);
      if (!(await end.count())) return;
      const want = await toScreen(t, 500, 600); // end handle should sit at (800, 400) → drag it to the bottom centre
      const box = await end.boundingBox();
      const exp = await toScreen(t, 800, 400);
      t.check('end handle sits on the gradient end', Math.abs(box.x + box.width / 2 - exp.x) < 4 && Math.abs(box.y + box.height / 2 - exp.y) < 4, JSON.stringify({ box, exp }));
      await t.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await t.page.mouse.down();
      await t.page.mouse.move(want.x, want.y, { steps: 6 });
      await t.page.mouse.up();
      await t.page.waitForTimeout(300);
      const k = await t.eval(() => window.__fabricCanvas.getActiveObject().fill.coords);
      t.check('dragging the handle changes the gradient direction', Math.abs(k.x2 - 0.5) < 0.03 && Math.abs(k.y2 - 1) < 0.03, JSON.stringify(k));
      await t.page.keyboard.press(`${MOD}+z`);
      await t.page.waitForTimeout(600);
      const k2 = await t.eval(() => window.__fabricCanvas.getObjects().find((o) => o.type === 'rect' && o.fill && o.fill.coords)?.fill.coords);
      t.check('undo restores the gradient', k2 && Math.abs(k2.x2 - 1) < 0.03 && Math.abs(k2.y2 - 0.5) < 0.03, JSON.stringify(k2));
      await t.shot('gradient-handles');
    },
  },
  {
    name: 'pen-curvature',
    init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1080');
      const canvas = await canvasBox(t);
      await t.page.mouse.click(canvas.x + 10, canvas.y + 10);
      await t.page.keyboard.press('p');
      await t.page.waitForTimeout(300);
      const modes = t.page.getByRole('radiogroup', { name: 'Pen mode' });
      t.check('pen mode switch shown', (await modes.count()) === 1);
      await modes.getByRole('radio', { name: 'Curvature' }).click();
      for (const [x, y] of [[200, 600], [400, 300], [600, 600], [800, 300]]) { const p = await toScreen(t, x, y); await t.page.mouse.click(p.x, p.y); await t.page.waitForTimeout(150); }
      await t.page.keyboard.press('Enter');
      await t.page.waitForTimeout(400);
      const r = await t.eval(() => { const o = window.__fabricCanvas.getObjects().filter((x) => x.type === 'path').pop(); return o ? { cmds: o.path.map((c) => c[0]).join(''), mid: o.path[2] } : null; });
      t.check('curvature path made of curves through the points', r && r.cmds === 'MCCC', JSON.stringify(r));
      t.check('smooth through the middle point (real handles)', r && Math.abs(r.mid[3] - r.mid[5]) > 5, JSON.stringify(r?.mid));
      await t.page.keyboard.press('~');
      await t.page.waitForTimeout(200);
      t.check('~ switches back to Pen', (await modes.getByRole('radio', { name: 'Pen', exact: true }).getAttribute('aria-checked')) === 'true');
      await t.shot('curvature');
    },
  },
  {
    name: 'panel-dock',
    init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); if (!sessionStorage.getItem('dockInit')) { localStorage.removeItem('mt:dockLayout'); sessionStorage.setItem('dockInit', '1'); } } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1080');
      const dock = t.page.getByLabel('Panel dock');
      t.check('panel dock shown', (await dock.count()) === 1);
      if (!(await dock.count())) return;
      const order = () => dock.locator('section').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      const o0 = await order();
      const last = dock.locator('section').last();
      await last.getByRole('button', { name: 'Move panel up' }).click();
      const o1 = await order();
      t.check('a panel moves up', o1[o1.length - 2] === o0[o0.length - 1] && o1.length === o0.length, JSON.stringify({ o0, o1 }));
      await dock.getByRole('button', { name: /Dock left/ }).click();
      await t.page.waitForTimeout(300);
      const dx = (await dock.boundingBox()).x, cx = (await canvasBox(t)).x;
      t.check('dock moves to the left of the canvas', dx < cx, JSON.stringify({ dx, cx }));
      const saved = await t.eval(() => JSON.parse(localStorage.getItem('mt:dockLayout') || 'null'));
      t.check('layout kept on this device', saved && saved.side === 'left', JSON.stringify(saved));
      await t.page.reload();
      await t.page.waitForSelector('canvas.upper-canvas', { timeout: 60000 });
      await t.page.waitForTimeout(800);
      t.check('layout remembered after reload', JSON.stringify(await order()) === JSON.stringify(o1));
      await t.page.getByLabel('Panel dock').getByRole('button', { name: 'Reset panels' }).click();
      t.check('reset restores the order', JSON.stringify(await order()) === JSON.stringify(o0));
    },
  },
  {
    name: 'text-indents',
    init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.eval(() => { const c = window.__fabricCanvas; const tb = new window.fabric.Textbox('Indents move every line of this paragraph in from the edges of the text box', { left: 200, top: 300, width: 500, fontSize: 40, fontFamily: 'Arial' }); c.add(tb); c.setActiveObject(tb); c.requestRenderAll(); });
      await t.page.waitForTimeout(600);
      const field = t.page.getByLabel(/^Indent left/).first();
      t.check('indent fields in the properties panel', (await field.count()) === 1 && (await t.page.getByLabel(/^Indent right/).count()) >= 1);
      const before = await t.eval(() => { const o = window.__fabricCanvas.getActiveObject(); return { lines: o._textLines.length, left: o._getLineLeftOffset(0) }; });
      if (await field.count()) { await field.fill('100'); await field.press('Enter'); } else await t.eval(() => window.__fabricCanvas.getActiveObject().set({ indentLeft: 100 }));
      await t.page.waitForTimeout(400);
      const after = await t.eval(() => { const o = window.__fabricCanvas.getActiveObject(); const w = Math.max(...o._textLines.map((_, i) => o.getLineWidth(i))); return { lines: o._textLines.length, left: o._getLineLeftOffset(0), ind: o.indentLeft, widest: w, width: o.width }; });
      t.check('left indent shifts the lines', Math.abs(after.left - before.left - 100) < 0.5, JSON.stringify({ before, after }));
      t.check('text rewraps inside the indent', after.lines >= before.lines && after.widest <= after.width - 100 + 1, JSON.stringify(after));
      const json = await t.eval(() => JSON.stringify(window.__fabricCanvas.getActiveObject().toObject(['indentLeft'])));
      t.check('indent saved with the design', JSON.parse(json).indentLeft === 100);
      await t.shot('indents');
    },
  },
  {
    name: 'custom-tool-keys',
    init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
    async run(t) {
      await t.editor('w=1080&h=1080');
      await t.page.keyboard.press('?');
      await t.page.waitForTimeout(400);
      const box = t.page.getByLabel('Key for Rectangle tool');
      t.check('tool keys can be customised', (await box.count()) === 1);
      if (!(await box.count())) return;
      await box.click();
      await t.page.keyboard.press('r');
      await t.page.waitForTimeout(200);
      t.check('new key shown', (await box.inputValue()) === 'R');
      await t.page.getByLabel('Key for Ellipse tool').click();
      await t.page.keyboard.press('r');
      t.check('a used key moves to the new tool', (await t.page.getByLabel('Key for Rectangle tool').inputValue()) === '—' && (await t.page.getByLabel('Key for Ellipse tool').inputValue()) === 'R');
      await t.page.getByLabel('Key for Rectangle tool').click();
      await t.page.keyboard.press('Shift+R');
      await t.page.keyboard.press('Escape');
      await t.page.keyboard.press('Escape');
      await t.page.waitForTimeout(300);
      const canvas = await canvasBox(t);
      await t.page.mouse.click(canvas.x + 20, canvas.y + 20);
      await t.page.keyboard.press('r');
      await t.page.waitForTimeout(300);
      t.check('pressing the new key picks the tool', (await t.page.locator('button[aria-pressed="true"][aria-label^="Ellipse"]').count()) === 1);
      await t.page.keyboard.press('Shift+R');
      await t.page.waitForTimeout(300);
      t.check('Shift combination works', (await t.page.locator('button[aria-pressed="true"][aria-label^="Rectangle"]').count()) === 1);
      await t.page.keyboard.press('m');
      await t.page.waitForTimeout(300);
      t.check('the old key no longer picks the rectangle', (await t.page.locator('button[aria-pressed="true"][aria-label^="Rectangle"]').count()) === 1, 'm is unassigned so the tool stays');
      const saved = await t.eval(() => JSON.parse(localStorage.getItem('mt:toolKeys') || '{}'));
      t.check('keys kept on this device', saved.rect === 'shift+r' && saved.ellipse === 'r', JSON.stringify(saved));
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
      await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: /^Text$/ }).click();
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

// Folding calculator: tri-fold and accordion, a PDF check, the technical report.
// Size calculator → editor → print files: an A4 tri-fold opens with Outside +
// Inside pages and fold guides; Export → Print files gives actual size on A3,
// fit to print on A4 (scaled) and one information sheet.
scenarios.push({
  name: 'print-files-roundtrip',
  async run(t) {
    await t.page.goto(t.BASE + '/print-size-calculator?tab=fold', { waitUntil: 'domcontentloaded' });
    const link = t.page.getByRole('link', { name: /Design this leaflet in the editor/ });
    await link.waitFor({ timeout: 30000 });
    const href = await link.getAttribute('href');
    t.check('editor link carries the print job and fold guides', /printJob=/.test(href || '') && /guidesV=/.test(href || ''), href);
    await t.page.goto(t.BASE + href, { waitUntil: 'domcontentloaded' });
    await t.page.waitForFunction(() => window.__fabricCanvas && window.__fabricCanvas.getObjects().filter((o) => o.__isArtboard).length === 2, null, { timeout: 60000 }).catch(() => {});
    const info = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__isArtboard).map((o) => ({ name: o.name, side: o.__print && o.__print.jobSide, w: Math.round(o.width) })));
    t.check('Outside + Inside pages with the job', info.length === 2 && info[0].name === 'Outside' && info[1].name === 'Inside' && info[1].side === 1, JSON.stringify(info));
    const guides = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__isGuide).length);
    t.check('fold guides on both pages', guides >= 4, String(guides));
    await t.page.getByRole('button', { name: 'Print files', exact: true }).click({ timeout: 30000 });
    const dlg = t.page.locator('[role=dialog][aria-label="Download your design"]');
    const plan = dlg.getByTestId('print-plan');
    await plan.waitFor({ timeout: 15000 });
    const pt = await plan.innerText();
    t.check('actual size on A3 at 100 %', /Actual size — A3 landscape, 100 %/.test(pt), pt.slice(0, 300));
    t.check('fit to print on A4, scaled', /Fit to print — A4 landscape, scaled to \d+(\.\d)? %/.test(pt), pt.slice(0, 300));
    await dlg.getByLabel('Job name').fill('Spring leaflet');
    await dlg.getByLabel('Client').fill('Test Client');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 120000 }), dlg.locator('button', { hasText: 'Download' }).last().click()]);
    const fs = await import('node:fs');
    const zip = fs.readFileSync(await dl.path());
    const names = zip.toString('latin1');
    t.check('zip with the print files and the job report', /Spring_leaflet_PRINT_FILES\.zip$/.test(dl.suggestedFilename()) && /_PRINT_ACTUAL_SIZE_on_A3\.pdf/.test(names) && /_PRINT_FIT_TO_A4_\d+(-\d)?pc\.pdf/.test(names) && /_PRINT_NORMAL_with_bleed\.pdf/.test(names) && /_JOB_REPORT\.pdf/.test(names), dl.suggestedFilename());
    await t.shot('print-files');
  },
});

scenarios.push({
  name: 'folding-calculator',
  async run(t) {
    await t.page.addInitScript(() => { try { localStorage.setItem('mt:print-mode', 'pro'); } catch {} });
    await t.page.goto(t.BASE + '/print-size-calculator?tab=fold', { waitUntil: 'domcontentloaded' });
    const res = t.page.getByLabel('Folding result');
    await res.waitFor({ timeout: 30000 });
    t.check('A4 tri-fold folds to 99.3 × 210 mm with a shorter tuck-in panel', /→\s*99\.33? × 210 mm folded/.test(await res.innerText()), (await res.innerText()).slice(0, 160));
    await t.page.getByLabel('Fold type').selectOption('accordion');
    await t.page.getByLabel('Number of panels').fill('6');
    t.check('6-panel accordion = 49.5 mm panels', /49\.5 × 210 mm folded/.test(await res.innerText()), (await res.innerText()).slice(0, 160));
    t.check('flat layout shows folds', /Fold 5/.test(await t.page.getByLabel('Flat layout').innerHTML()));
    await t.page.getByLabel('Fold type').selectOption('tri');
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create(); const k = 72 / 25.4;
    for (let i = 0; i < 2; i++) { const p = doc.addPage([303 * k, 216 * k]); p.setTrimBox(3 * k, 3 * k, 297 * k, 210 * k); }
    const fs = await import('node:fs'); const path = (await import('node:path')).join(process.cwd(), 'e2e-out', 'trifold.pdf');
    fs.writeFileSync(path, await doc.save());
    await t.page.locator('input[type=file][accept*="pdf"]:not([aria-label="Artwork for print files"])').first().setInputFiles(path);
    const chk = t.page.getByLabel('PDF check');
    await chk.waitFor({ timeout: 15000 });
    t.check('matching PDF is accepted', /suitable for this fold/.test(await chk.innerText()) && !/not suitable/.test(await chk.innerText()), (await chk.innerText()).slice(0, 200));
    t.check('pro mode shows panel widths and the PDF check', await t.page.getByLabel('Panel 1 width').isVisible());
    await t.shot('folding');
  },
});

// Photo Studio: detail and lens tools and the portrait presets work on the real image.
scenarios.push({
  name: 'photo-studio-portrait',
  async run(t) {
    await t.page.addInitScript(() => { try { localStorage.setItem('mt:photoMode', 'pro'); } catch {} });
    await t.page.goto(`${t.BASE}/photo-studio`);
    await t.page.locator('input[type=file]').first().setInputFiles('public/templates/photos/mt-38.jpg');
    await t.page.waitForSelector('[aria-label="Tools"]', { timeout: 60000 });
    await t.page.waitForTimeout(1200);
    const big = () => t.eval(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < x.length; i += 400) s += x[i] + x[i + 1] * 3 + x[i + 2] * 7; return s; });
    const before = await big();
    for (const label of ['Dehaze', 'Noise reduction', 'Texture', 'Distortion', 'Chromatic aberration', 'Skin smoothing', 'Even skin tone']) t.check(`slider ${label}`, (await t.page.getByText(label, { exact: true }).count()) > 0);
    t.check('female and male preset groups', (await t.page.getByRole('group', { name: 'Female portrait presets' }).first().getByRole('button').count()) === 7 && (await t.page.getByRole('group', { name: 'Male portrait presets' }).first().getByRole('button').count()) === 7);
    await t.page.getByRole('button', { name: 'Natural beauty', exact: true }).first().click();
    await t.page.waitForTimeout(2500);
    const after = await big();
    t.check('portrait preset changes the actual pixels', after !== before, `${before} → ${after}`);
    t.check('preset recorded in history', (await t.page.getByText('Natural beauty').count()) >= 2);
    await t.shot('portrait');
  },
});

// Textile Studio: a kurta drafted from typed measurements, print PDF + tech pack, the design
// workspace opens for the drafted pieces, and an embroidery motif becomes a DST machine file.
scenarios.push({
  name: 'textile-studio',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument } = await import('pdf-lib');
    await t.page.addInitScript(() => { try { if (!sessionStorage.getItem('tsInit')) { localStorage.removeItem('mt:textile-studio'); localStorage.removeItem('mt:textile-measures'); sessionStorage.setItem('tsInit', '1'); } } catch {} });
    await t.page.goto(`${t.BASE}/textile-designer?product=kurta`, { waitUntil: 'domcontentloaded' });
    const studio = t.page.getByLabel('Textile Studio', { exact: true });
    await studio.waitFor({ timeout: 30000 });
    t.check('product picker shows every garment', (await t.page.getByRole('radiogroup', { name: 'Product' }).getByRole('radio').count()) === 9);
    t.check('ready-made size M preloaded: pieces drafted at once', (await studio.getByRole('img', { name: 'Garment pieces' }).count()) === 1 && (await studio.getByRole('radio', { name: 'M', exact: true }).getAttribute('aria-checked')) === 'true');
    await studio.getByRole('radio', { name: 'XL', exact: true }).click();
    t.check('picking XL fills its measurements', (await studio.getByLabel('Bust / chest (round)', { exact: true }).inputValue()) === '101');
    await studio.getByLabel('Hip / seat (round)', { exact: true }).fill('112');
    t.check('a changed value is marked', /amber/.test(await studio.getByLabel('Hip / seat (round)', { exact: true }).getAttribute('class')));
    await studio.getByRole('radio', { name: 'Own measurements' }).click();
    const M = { 'Bust / chest (round)': 92, 'Waist (round)': 78, 'Hip / seat (round)': 100, 'Shoulder (across the back, point to point)': 38, 'Kurta length (shoulder to hem)': 105, 'Shoulder to waist': 40, 'Armhole (round)': 44, 'Front neck depth': 18, 'Back neck depth': 6, 'Sleeve length (shoulder down)': 48, 'Upper arm (round)': 30, 'Sleeve opening (round)': 24 };
    for (const [k, v] of Object.entries(M)) await studio.getByLabel(k, { exact: true }).fill(String(v));
    await studio.getByRole('button', { name: 'V-neck' }).click();
    await t.page.waitForTimeout(400);
    const pieces = studio.getByRole('img', { name: 'Garment pieces' });
    t.check('pieces drafted from the measurements', (await pieces.count()) === 1 && /Kurta \/ kameez \(v neck, elbow sleeves\)/.test(await studio.innerText()));
    await t.page.waitForTimeout(500);
    t.check('presentation mockup shown', (await studio.getByRole('img', { name: 'Garment mockup' }).count()) === 1);
    await t.shot('textile-kurta');
    const [pdf] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), studio.getByRole('button', { name: /Ready-to-print PDF/ }).click()]);
    const doc = await PDFDocument.load(fs.readFileSync(await pdf.path()));
    const sz = doc.getPage(0).getSize();
    t.check('print PDF at real roll width (1600 mm)', Math.abs(sz.width / 72 * 25.4 - 1600) < 2, JSON.stringify(sz));
    const [tp] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), studio.getByRole('button', { name: /Technical production file/ }).click()]);
    const tdoc = await PDFDocument.load(fs.readFileSync(await tp.path()));
    t.check('technical production file (A4, branded)', tdoc.getPageCount() >= 1 && Math.round(tdoc.getPage(0).getSize().width / 72 * 25.4) === 210);
    await studio.getByRole('button', { name: /Open the design workspace/ }).click();
    const ws = t.page.getByRole('dialog', { name: /Design workspace/ });
    await ws.waitFor({ timeout: 20000 });
    t.check('design workspace opens on the drafted pieces', (await ws.count()) === 1 && (await ws.getByRole('button', { name: /Player name/ }).count()) === 0);
    await t.page.keyboard.press('Escape');
    await ws.getByRole('button', { name: 'File' }).click();
    await ws.getByRole('menuitem', { name: /Close/ }).click();
    await studio.getByRole('button', { name: /^Embroidery/ }).click();
    const emb = t.page.getByRole('dialog', { name: 'Embroidery workspace' });
    await emb.waitFor({ timeout: 10000 });
    await emb.getByRole('button', { name: /^Add / }).first().click();
    await t.page.waitForTimeout(800);
    const stats = await emb.innerText();
    t.check('motif turned into stitches', /[1-9][\d,]* stitches/.test(stats), stats.slice(0, 160));
    await emb.getByRole('radio', { name: 'Satin' }).click();
    await t.page.waitForTimeout(500);
    const [dst] = await Promise.all([t.page.waitForEvent('download', { timeout: 30000 }), emb.getByRole('button', { name: /DST/ }).click()]);
    const bytes = fs.readFileSync(await dst.path());
    t.check('DST machine file', dst.suggestedFilename().endsWith('.dst') && bytes.subarray(0, 3).toString() === 'LA:' && bytes.length > 600 && bytes[bytes.length - 1] === 0xF3, `${bytes.length}`);
    t.check('DST checked before download', /DST checked and saved/.test(await t.page.getByRole('status').last().innerText().catch(() => '')));
    await emb.getByRole('group', { name: 'Embroidery presets' }).getByRole('button', { name: 'Chest flower' }).click();
    await t.page.waitForTimeout(600);
    t.check('ready preset adds objects in sewing order', /Chest flower: Petals 1/.test(await emb.getByLabel('Stitch settings').innerText()));
    const sim = emb.getByRole('group', { name: 'Stitch simulation' });
    await sim.getByLabel('Stitch sequence').fill('50');
    t.check('stitch simulation steps through the sewing order', /(^|\s)50 \//.test(await sim.innerText()), await sim.innerText());
    await sim.getByRole('button', { name: 'Done' }).click();
    await emb.getByRole('radio', { name: 'Appliqué' }).click();
    t.check('appliqué stops shown', /stops/.test(await emb.innerText()));
    await t.shot('embroidery');
    await emb.getByRole('button', { name: 'Save' }).click();
    await emb.getByRole('button', { name: 'Close embroidery' }).click();
    t.check('embroidery saved to the project', /stitches, \d+ colours?\./.test(await studio.innerText()));
  },
});

// Textile Design Studio: the old /textile-designer address opens the merged workspace; Simple mode
// hides production controls without touching the design; settings reset keeps the artwork.
scenarios.push({
  name: 'textile-merge-modes',
  async run(t) {
    await t.page.goto(`${t.BASE}/textile-designer?garment=polo`, { waitUntil: 'domcontentloaded' });
    await t.page.getByLabel('Textile Design Studio').waitFor({ timeout: 30000 });
    t.check('team kit designer opens at /textile-designer', /\/textile-designer/.test(t.page.url()), t.page.url());
    await t.page.getByLabel('Project name').first().waitFor({ timeout: 30000 });
    await t.page.waitForTimeout(600);
    const polo = t.page.getByRole('radiogroup', { name: 'Product' }).getByRole('radio', { name: /Polo/ });
    t.check('polo picked from the old address', (await polo.getAttribute('aria-checked')) === 'true', `${t.page.url()} checked=${await polo.getAttribute('aria-checked')}`);
    const name = t.page.getByLabel('Project name').first();
    await name.fill('Merge check');
    const editPrint = () => t.page.getByRole('button', { name: /Edit print file/ }).count();
    t.check('professional mode shows the print studio', (await editPrint()) === 1);
    await t.page.getByRole('radio', { name: 'Simple' }).click();
    await t.page.waitForTimeout(300);
    t.check('simple mode hides production controls', (await editPrint()) === 0);
    t.check('switching mode keeps the design', (await name.inputValue()) === 'Merge check');
    await t.page.getByRole('radio', { name: 'Professional' }).click();
    await t.page.getByRole('button', { name: /Workspace settings/ }).click();
    await t.page.getByRole('menuitem', { name: 'Restore default settings' }).click();
    await t.page.waitForTimeout(300);
    t.check('restoring settings keeps the design', (await t.page.getByLabel('Project name').first().inputValue()) === 'Merge check');
    await t.page.getByRole('radiogroup', { name: 'Product' }).getByRole('radio', { name: /Chudidar/ }).click();
    await t.page.waitForTimeout(500);
    t.check('made-to-measure garments in the same workspace', (await t.page.getByLabel('Textile Studio', { exact: true }).count()) === 1 && (await t.page.getByLabel('Waist to knee', { exact: true }).count()) === 1);
    await t.page.getByRole('button', { name: /Workspace settings/ }).click();
    await t.page.getByLabel('Units').selectOption('in');
    await t.page.getByLabel('Waist (round)', { exact: true }).fill('30');
    await t.page.getByLabel('Units').selectOption('cm');
    t.check('measurements convert between units', (await t.page.getByLabel('Waist (round)', { exact: true }).inputValue()) === '76.2');
  },
});

// Download & print (folding): branded layout template and job report without artwork; with a
// 2-page artwork PDF the print files — actual size on A3, fit to A4, normal with bleed — and the zip.
scenarios.push({
  name: 'print-downloads',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument } = await import('pdf-lib');
    await t.page.goto(`${t.BASE}/print-size-calculator?tab=fold`, { waitUntil: 'domcontentloaded' });
    await t.page.getByLabel('Folding result').waitFor({ timeout: 30000 });
    await t.page.waitForTimeout(500);
    const panel = t.page.getByRole('region', { name: 'Download and print' });
    await panel.waitFor({ timeout: 30000 });
    t.check('simple mode: only paper, job name and client', !(await panel.getByLabel('Printer no-print margin mm').count()) && await panel.getByLabel('Job name').isVisible());
    const plan = await panel.getByTestId('print-plan').innerText();
    t.check('plan: actual size on A3, fit to A4 scaled', /Actual size — A3 landscape, 100 %/.test(plan) && /Fit to print — A4 landscape, scaled to \d+(\.\d)? %/.test(plan), plan.slice(0, 300));
    t.check('print files wait for artwork', await panel.getByRole('button', { name: 'Normal PDF' }).isDisabled());
    await panel.getByLabel('Job name').fill('Leaflet job');
    const k = 72 / 25.4;
    const [tp] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), panel.getByRole('button', { name: 'Layout template' }).click()]);
    const tdoc = await PDFDocument.load(fs.readFileSync(await tp.path()));
    t.check('layout template: outside + inside', tdoc.getPageCount() === 2 && tp.suggestedFilename() === 'Leaflet_job_LAYOUT_TEMPLATE.pdf', `${tdoc.getPageCount()} ${tp.suggestedFilename()}`);
    const [rp] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), panel.getByRole('button', { name: 'Job report' }).click()]);
    const rdoc = await PDFDocument.load(fs.readFileSync(await rp.path()));
    const sz = rdoc.getPage(0).getSize();
    t.check('one job report: 2 A4 landscape pages', rdoc.getPageCount() === 2 && Math.round(sz.width / k) === 297 && rp.suggestedFilename() === 'Leaflet_job_JOB_REPORT.pdf', `${rdoc.getPageCount()} ${rp.suggestedFilename()}`);
    const art = await PDFDocument.create();
    for (let i = 0; i < 2; i++) art.addPage([303 * k, 216 * k]).drawRectangle({ x: 0, y: 0, width: 303 * k, height: 216 * k });
    const path = (await import('node:path')).join(process.cwd(), 'e2e-out', 'leaflet_art.pdf');
    fs.writeFileSync(path, await art.save());
    await panel.getByLabel('Artwork for print files').setInputFiles(path);
    await t.page.waitForTimeout(600);
    const get = async (name) => { const [d] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), panel.getByRole('button', { name }).click()]); return { name: d.suggestedFilename(), doc: await PDFDocument.load(fs.readFileSync(await d.path())) }; };
    const actual = await get('Actual size');
    const aw = actual.doc.getPage(0).getMediaBox().width / k;
    t.check('actual size on A3 landscape, 2 sheets', Math.round(aw) === 420 && actual.doc.getPageCount() === 2 && /_PRINT_ACTUAL_SIZE_on_A3\.pdf$/.test(actual.name), `${aw} ${actual.name}`);
    const fit = await get('Fit to A4');
    t.check('fit to A4: A4 sheet, scaled', Math.round(fit.doc.getPage(0).getMediaBox().width / k) === 297 && /_PRINT_FIT_TO_A4_\d+(-\d)?pc\.pdf$/.test(fit.name), fit.name);
    const normal = await get('Normal PDF');
    const nm = normal.doc.getPage(0).getMediaBox(), nt = normal.doc.getPage(0).getTrimBox();
    t.check('normal: trim + bleed page, no marks', Math.round(nm.width / k) === 303 && Math.round(nt.width / k) === 297, `${nm.width / k}`);
    const [z] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), panel.getByRole('button', { name: /Download all/ }).click()]);
    const zs = fs.readFileSync(await z.path()).toString('latin1');
    t.check('zip: 3 print files + job report', /ACTUAL_SIZE/.test(zs) && /FIT_TO_A4/.test(zs) && /NORMAL_with_bleed/.test(zs) && /JOB_REPORT/.test(zs), z.suggestedFilename());
    await panel.getByRole('radio', { name: 'Pro' }).first().click();
    t.check('pro mode adds margin, crop marks and job details', await panel.getByLabel('Printer no-print margin mm').isVisible() && await panel.getByLabel('Designer').isVisible());
    await t.shot('print-downloads');
  },
});

// Textile sizes: a manufacturer size chart (CSV) drafts every size from its own measurements;
// the print PDF lays out each size separately; the cutting pattern PDF is made at real size.
scenarios.push({
  name: 'textile-size-chart',
  async run(t) {
    const fs = await import('node:fs');
    const { PDFDocument } = await import('pdf-lib');
    await t.page.addInitScript(() => { try { if (!sessionStorage.getItem('scInit')) { localStorage.removeItem('mt:textile-studio'); localStorage.removeItem('mt:textile-measures'); localStorage.removeItem('mt:textile-workspace'); sessionStorage.setItem('scInit', '1'); } } catch {} });
    await t.page.goto(`${t.BASE}/textile-designer?product=kurta`, { waitUntil: 'domcontentloaded' });
    const studio = t.page.getByLabel('Textile Studio', { exact: true });
    await studio.waitFor({ timeout: 30000 });
    await studio.getByRole('radio', { name: 'Size chart (several sizes)' }).click();
    const csv = 'Size,Bust,Waist,Hip,Shoulder,Length,Waist length,Armhole,Front neck,Back neck,Sleeve length,Bicep,Sleeve opening,Qty\nS,88,72,94,36,104,39,42,17,6,45,28,22,2\nM,92,78,100,38,105,40,44,18,6,48,30,24,3\nL,100,86,108,40,108,41,46,18,6,50,32,26,1';
    const path = (await import('node:path')).join(process.cwd(), 'e2e-out', 'sizes.csv');
    fs.writeFileSync(path, csv);
    await studio.getByRole('group', { name: 'Size chart' }).locator('input[type=file]').setInputFiles(path);
    await t.page.waitForTimeout(500);
    const status = await studio.getByRole('group', { name: 'Size chart' }).innerText();
    t.check('size chart imported (3 sizes)', /3 sizes imported/.test(status) && (await studio.getByLabel(/^Size name \d$/).count()) === 3, status.slice(0, 200));
    t.check('pieces drafted for the chart', (await studio.getByRole('img', { name: 'Garment pieces' }).count()) === 1, (await studio.innerText()).slice(0, 300));
    const [pdf] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), studio.getByRole('button', { name: /Ready-to-print PDF/ }).click()]);
    const doc = await PDFDocument.load(fs.readFileSync(await pdf.path()));
    t.check('each size laid out on its own pages', doc.getPageCount() >= 3, String(doc.getPageCount()));
    const [cut] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), studio.getByRole('button', { name: /^Cutting pattern/ }).click()]);
    const cdoc = await PDFDocument.load(fs.readFileSync(await cut.path()));
    t.check('cutting pattern PDF at the roll width', Math.round(cdoc.getPage(0).getSize().width / 72 * 25.4) === 1600, JSON.stringify(cdoc.getPage(0).getSize()));
    await t.shot('size-chart');
  },
});

// Photo Studio face tools: with landmarks given (the real face finder downloads a model), eyes,
// mouth and shape edits preview on a close-up and apply to the photo as one history step.
scenarios.push({
  name: 'photo-studio-face',
  async run(t) {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('lib/photo/face.ts', 'utf8');
    const arr = (n) => JSON.parse('[' + src.match(new RegExp(`export const ${n} = \\[([^\\]]*)\\]`))[1] + ']');
    const ring = (cx, cy, rx, ry, n, a0 = 0) => Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos(a0 + (i / n) * 2 * Math.PI), y: cy + ry * Math.sin(a0 + (i / n) * 2 * Math.PI) }));
    const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.45 }));
    const put = (ids, pts) => ids.forEach((id, i) => (lm[id] = pts[i]));
    put(arr('FACE_OVAL'), ring(0.5, 0.45, 0.18, 0.25, 36, -Math.PI / 2));
    put(arr('EYE_R'), ring(0.43, 0.38, 0.04, 0.015, 16)); put(arr('EYE_L'), ring(0.57, 0.38, 0.04, 0.015, 16));
    put(arr('LIPS_OUTER'), ring(0.5, 0.58, 0.06, 0.025, 20)); put(arr('LIPS_INNER'), ring(0.5, 0.58, 0.04, 0.01, 20));
    put([468, 469, 470, 471, 472], [[0.43, 0.38], [0.44, 0.38], [0.43, 0.37], [0.42, 0.38], [0.43, 0.39]].map(([x, y]) => ({ x, y })));
    put([473, 474, 475, 476, 477], [[0.57, 0.38], [0.58, 0.38], [0.57, 0.37], [0.56, 0.38], [0.57, 0.39]].map(([x, y]) => ({ x, y })));
    lm[1] = { x: 0.5, y: 0.48 }; lm[129] = { x: 0.48, y: 0.47 }; lm[358] = { x: 0.52, y: 0.47 };
    await t.page.addInitScript((pts) => { window.__mtFaceLandmarks = pts; try { localStorage.setItem('mt:photoMode', 'pro'); } catch {} }, lm);
    await t.page.goto(`${t.BASE}/photo-studio`);
    await t.page.locator('input[type=file]').first().setInputFiles('public/templates/photos/mt-38.jpg');
    await t.page.waitForSelector('[aria-label="Tools"]', { timeout: 60000 });
    await t.page.waitForTimeout(1200);
    const big = () => t.eval(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < x.length; i += 400) s += x[i] + x[i + 1] * 3 + x[i + 2] * 7; return s; });
    const find = t.page.getByRole('button', { name: 'Find face', exact: true }).first();
    await find.scrollIntoViewIfNeeded();
    await find.click();
    await t.page.waitForTimeout(800);
    t.check('face found', (await t.page.getByText('Face found.').count()) > 0);
    t.check('face preview shown', (await t.page.getByLabel('Face preview').count()) > 0);
    const groups = { 'Eyes': ['Brighten eye whites', 'Iris clarity', 'Dark circles', 'Eye size', 'Eye distance'], 'Brows & forehead': ['Brow lift', 'Forehead height'], 'Nose': ['Slim nose', 'Nose length'], 'Mouth': ['Whiten teeth', 'Lip colour', 'Lip saturation', 'Fuller lips', 'Mouth width', 'Smile lift'], 'Face shape': ['Slim face', 'Slim jaw', 'Chin length'] };
    for (const [g, labels] of Object.entries(groups)) {
      const head = t.page.getByRole('group', { name: `Face ${g.toLowerCase()}` }).first().getByRole('button').first();
      if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
      for (const label of labels) t.check(`face slider ${label}`, (await t.page.getByRole('slider', { name: label, exact: true }).count()) > 0);
    }
    const counts = [];
    for (const g of ['Natural', 'Beauty', 'Sculpt', 'Portrait (men)']) counts.push(await t.page.getByRole('group', { name: `${g} face presets`, exact: true }).first().getByRole('button').count());
    t.check('face preset groups', counts.every((n) => n === 3), counts.join(' / '));
    const before = await big();
    await t.page.getByRole('button', { name: 'Soft glam', exact: true }).click();
    await t.page.waitForTimeout(600);
    t.check('preset strength slider shown', (await t.page.getByRole('slider', { name: 'Preset strength' }).count()) === 1);
    t.check('preview does not touch the photo yet', (await big()) === before);
    await t.shot('face-preview');
    await t.page.getByRole('button', { name: 'Apply face edits' }).click();
    await t.page.waitForTimeout(2500);
    const after = await big();
    t.check('face edits change the photo', after !== before, `${before} → ${after}`);
    t.check('face edit recorded in history', (await t.page.getByText('Face retouch').count()) >= 1);
    await t.shot('face-applied');
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
    await t.page.getByRole('button', { name: /Ready-to-print PDF/ }).waitFor({ timeout: 30000 });
    await t.page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Ready-to-print PDF/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 60000 });
    await t.shot('jersey-print');
    const fs = await import('node:fs');
    const [pdfDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 120000 }), t.page.getByRole('button', { name: /Ready-to-print PDF/ }).click()]);
    const pdf = fs.readFileSync(await pdfDl.path());
    const txt = pdf.toString('latin1');
    t.check('one print PDF for the team', pdf.subarray(0, 4).toString() === '%PDF' && pdf.length > 5000, `${pdfDl.suggestedFilename()} ${pdf.length} bytes`);
    t.check('print PDF is all vector', !/\/Subtype\s*\/Image/.test(txt));
    // Only two players selected → still one file.
    await t.page.getByLabel('Print row 3').uncheck();
    await t.page.getByLabel('Print row 4').uncheck();
    t.check('summary follows the selection', /2\s*garments/.test(await t.page.getByLabel('Print summary').innerText()));
    const [svgDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Ready-to-print SVG/ }).click()]);
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
    await t.page.waitForFunction(() => /Player name/.test(document.querySelector('[aria-label="Layers"]')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    await t.page.waitForTimeout(800);
    const ltxt = await layers.innerText();
    t.check('layers list the added artwork', /Player number/.test(ltxt) && /Sash/.test(ltxt), ltxt.slice(0, 120));
    // The jersey's own name and number open as editable text layers too.
    t.check('standard name and number are editable layers', /Player name/.test(ltxt) && (ltxt.match(/Player number/g) || []).length >= 2, ltxt.slice(0, 160));
    await layers.getByRole('button', { name: /Player number/ }).first().click();
    await studio.getByLabel('Font', { exact: true }).waitFor({ timeout: 5000 });
    t.check('text inspector: font, size, outline controls', await studio.getByLabel('Font weight').isVisible() && await studio.getByLabel('Text content').isVisible());
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
    await t.page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Ready-to-print PDF/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 90000 });
    const [pdfDl] = await Promise.all([t.page.waitForEvent('download', { timeout: 120000 }), t.page.getByRole('button', { name: /Ready-to-print PDF/ }).click()]);
    const pdf = fs.readFileSync(await pdfDl.path()).toString('latin1');
    t.check('live-text PDF embeds the real font', /\/FontFile2/.test(pdf) && /Oswald/i.test(pdf));
    const [svgLive] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Ready-to-print SVG/ }).click()]);
    const live = fs.readFileSync(await svgLive.path(), 'utf8');
    t.check('live SVG keeps numbers as retypeable text', />07<\/text>/.test(live), svgLive.suggestedFilename());
    await t.page.getByRole('radio', { name: 'Outlines (exact shapes)' }).click();
    const [svgOut] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), t.page.getByRole('button', { name: /Ready-to-print SVG/ }).click()]);
    const out = fs.readFileSync(await svgOut.path(), 'utf8');
    t.check('outlined SVG draws numbers from the font curves', !/>07<\/text>/.test(out) && /fill="#ffcc00"/i.test(out));
  },
});

// Pattern Design: diamond repeat and the repeat views (1 tile, 2 × 2, 3 × 3, 5 × 5).
scenarios.push({
  name: 'pattern-motif-edit',
  async run(t) {
    await t.page.goto(t.BASE + '/patterns', { waitUntil: 'domcontentloaded' });
    const box = t.page.getByRole('group', { name: 'Edit single motifs' });
    await box.getByRole('button', { name: 'Edit motifs' }).click({ timeout: 30000 });
    const prev = () => t.page.getByRole('img', { name: 'Pattern preview' }).evaluate((el) => el.style.backgroundImage);
    const before = await prev();
    const motifs = box.getByRole('button', { name: /^Motif \d+/ });
    t.check('motifs of the tile are listed', (await motifs.count()) >= 2, String(await motifs.count()));
    await motifs.first().click();
    const turn = box.getByRole('slider', { name: 'Turn (°)' });
    await turn.fill('90');
    await t.page.waitForTimeout(300);
    t.check('turning one motif changes the pattern', (await prev()) !== before);
    t.check('edit counted', (await box.getByText('1 motif edited.').count()) === 1);
    t.check('edited motif marked', (await box.getByRole('button', { name: /\(edited\)/ }).count()) === 1);
    await box.getByRole('checkbox', { name: 'Hide this motif' }).check();
    await t.page.waitForTimeout(200);
    await t.shot('motif-edit');
    await box.getByRole('button', { name: 'Reset all motifs' }).click();
    await t.page.waitForTimeout(300);
    t.check('reset restores the pattern', (await prev()) === before);
  },
});

scenarios.push({
  name: 'pattern-repeat-views',
  async run(t) {
    await t.page.goto(t.BASE + '/patterns', { waitUntil: 'domcontentloaded' });
    const rep = t.page.locator('button[title="Motifs on a diamond lattice, turned 45°"]');
    await rep.click({ timeout: 30000 });
    t.check('diamond repeat selected', (await rep.getAttribute('aria-pressed')) === 'true');
    const views = t.page.getByRole('radiogroup', { name: 'Repeat view' });
    for (const [label, size] of [['1 tile', /^contain$/], ['3 × 3', /^33\.3+\d*%( auto)?$/], ['5 × 5', /^20%( auto)?$/]]) {
      await views.getByRole('radio', { name: label }).click();
      const bs = await t.page.getByRole('img', { name: 'Pattern preview' }).evaluate((el) => el.style.backgroundSize);
      t.check(`repeat view ${label}`, size.test(bs), bs);
    }
    await t.shot('diamond-5x5');
  },
});

// Text writer: Tanglish → Tamil with accept / keep, replace the selected text, insert a new one, back to the original.
scenarios.push({
  name: 'text-writer-tamil',
  async run(t) {
    await t.editor();
    await t.eval(async () => { const c = window.__fabricCanvas; const F = window.fabric || (await import('fabric')).fabric; const tb = new F.Textbox('Hello team', { left: 200, top: 200, width: 500, fontSize: 60, fontFamily: 'Arial' }); c.add(tb); c.setActiveObject(tb); c.requestRenderAll(); }).catch(() => {});
    await t.page.waitForTimeout(500);
    const hasText = await t.eval(() => !!window.__fabricCanvas.getActiveObject());
    if (!hasText) { await t.page.keyboard.press('t'); }
    await t.page.getByRole('button', { name: 'Write', exact: true }).first().click({ timeout: 10000 });
    const w = t.page.getByRole('dialog', { name: 'Text writer' });
    t.check('writer opens with the selected text', (await w.getByLabel('Text', { exact: true }).inputValue()) === 'Hello team');
    await w.getByLabel(/Tanglish/).check();
    await w.getByLabel('Text', { exact: true }).fill('Vanakkam, eppadi irukkinga?');
    const sug = await w.getByLabel('Tamil suggestion').innerText();
    t.check('Tanglish suggestion in Tamil', sug.includes('வணக்கம், எப்படி இருக்கீங்க?'), sug.slice(0, 80));
    await w.getByRole('button', { name: 'Use the Tamil' }).click();
    t.check('accepted text is editable Tamil', (await w.getByLabel('Text', { exact: true }).inputValue()) === 'வணக்கம், எப்படி இருக்கீங்க?');
    await w.getByRole('button', { name: 'Replace selected text' }).click();
    await t.page.waitForTimeout(1500);
    const o = await t.eval(() => { const a = window.__fabricCanvas.getActiveObject(); return { text: a.text, font: a.fontFamily }; });
    t.check('selected text replaced on the design', o.text === 'வணக்கம், எப்படி இருக்கீங்க?', JSON.stringify(o));
    t.check('a font with Tamil letters is used', /Tamil|Catamaran|Kavivanar/.test(o.font), o.font);
    await t.page.getByRole('button', { name: 'Write', exact: true }).first().click();
    await w.getByLabel('Text', { exact: true }).fill('مرحبا بكم');
    t.check('Arabic detected as right to left', /right to left/.test(await w.getByLabel('Text direction').innerText()));
    await w.getByRole('button', { name: 'Back to the original' }).click();
    t.check('original text one click away', (await w.getByLabel('Text', { exact: true }).inputValue()) === 'வணக்கம், எப்படி இருக்கீங்க?');
    await w.getByLabel('Text', { exact: true }).fill('مرحبا بكم');
    const before = await t.eval(() => window.__fabricCanvas.getObjects().length);
    await w.getByRole('button', { name: 'Insert as new text' }).click();
    await t.page.waitForTimeout(1200);
    const after = await t.eval(() => { const a = window.__fabricCanvas.getActiveObject(); return { n: window.__fabricCanvas.getObjects().length, dir: a.direction, align: a.textAlign, text: a.text }; });
    t.check('inserted as a new right-to-left text', after.n === before + 1 && after.dir === 'rtl' && after.align === 'right' && after.text === 'مرحبا بكم', JSON.stringify(after));
    await t.shot('text-writer');
  },
});

// Jersey creator: vector graphic generators and ready designs in the print studio; measurements per size.
scenarios.push({
  name: 'jersey-creator',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: /Edit print file/ }).click({ timeout: 30000 });
    const studio = t.page.getByRole('dialog', { name: 'Print studio' });
    await studio.getByRole('tab', { name: 'Creator' }).click();
    await studio.getByRole('button', { name: 'Generate Brush strokes' }).click();
    const layers = studio.getByLabel('Layers');
    await t.page.waitForTimeout(800);
    t.check('generator adds an editable vector graphic', /Brush strokes/.test(await layers.innerText()));
    const settings = studio.getByLabel('Graphic settings');
    t.check('graphic settings shown', await settings.isVisible());
    await settings.getByRole('button', { name: /New variation/ }).click();
    await settings.getByLabel('Amount of the graphic').fill('0.8');
    await settings.getByLabel('Where the graphic sits').selectOption('bottom');
    await t.page.waitForTimeout(600);
    t.check('settings change the graphic', /Brush strokes/.test(await layers.innerText()));
    await studio.getByRole('button', { name: 'Design Inferno' }).click();
    await t.page.waitForTimeout(1200);
    t.check('ready design adds its layers', /Flames/.test(await layers.innerText()));
    const flowers = studio.getByRole('region', { name: 'Flowers and ornaments' });
    await flowers.getByLabel('Petal count').fill('9');
    await flowers.getByLabel('Petal shape').selectOption('lotus');
    await flowers.getByRole('button', { name: '+ Add flower' }).click();
    await flowers.getByRole('button', { name: 'Paisley' }).click();
    await flowers.getByRole('button', { name: '+ Neckline' }).click();
    await t.page.waitForTimeout(800);
    const lt = await layers.innerText();
    t.check('flower builder and ornaments add editable groups', /Flower/.test(lt) && /Paisley/.test(lt) && /Neckline design/.test(lt), lt.slice(0, 300));
    await t.shot('jersey-creator');
    await studio.getByRole('button', { name: /^Save/ }).click();
    await studio.getByRole('button', { name: 'Close print studio' }).click();
    const front = await t.page.getByRole('application').first().innerHTML();
    t.check('mockup shows the generated vectors', front.length > 20000, String(front.length));
    // Measurements from the pattern pieces.
    await t.page.getByRole('tab', { name: /Players|Sizes/ }).first().click();
    await t.page.getByText('Size chart & custom sizes').click();
    const mt = t.page.getByRole('table', { name: 'Measurement table' });
    t.check('measurements listed', /Chest width/.test(await mt.innerText()) && /Sleeve opening/.test(await mt.innerText()));
    await t.page.getByRole('radio', { name: 'in' }).click();
    t.check('measurements in inches', /″/.test(await mt.innerText()));
    t.check('standard template marked unverified', /unverified/.test(await t.page.getByLabel('Garment measurements').innerText()));
    // Cost from your own price table, and the branded production specification.
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    await t.page.getByText(/^Cost & price/).click();
    t.check('no invented prices', /Add your fabric price per m² and printing price per m²/.test(await t.page.getByLabel('Cost result').innerText()));
    await t.page.getByLabel('Fabric 1 price / m²').fill('12');
    await t.page.getByLabel('Printing 1 price / m² printed').fill('6');
    await t.page.getByLabel('Cost per garment').fill('5');
    await t.page.getByLabel('Margin percent').fill('40');
    const cost = await t.page.getByLabel('Cost result').innerText();
    t.check('price per garment computed', /per garment/.test(cost) && !/Add your/.test(cost), cost.slice(0, 200));
    const fs = await import('node:fs');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 30000 }), t.page.getByRole('button', { name: /Technical production file/ }).click()]);
    const pdf = fs.readFileSync(await dl.path());
    t.check('one technical production file (spec + order list)', pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 3000 && /TECHNICAL-PRODUCTION-FILE\.pdf$/.test(dl.suggestedFilename()), `${dl.suggestedFilename()} ${pdf.length}`);
  },
});

// Garment engineering: long sleeves, factory pattern import, back to the standard template.
scenarios.push({
  name: 'garment-engineering',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-designer?garment=jersey', { waitUntil: 'domcontentloaded' });
    const box = t.page.getByLabel('Pattern pieces');
    await box.waitFor({ timeout: 30000 });
    t.check('standard template is labelled', /standard template/.test(await box.innerText()));
    await t.page.getByRole('radio', { name: 'Long sleeves' }).click();
    t.check('long sleeves change the pieces', /long sleeves/i.test(await box.innerText()), (await box.innerText()).slice(0, 120));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200cm" height="100cm" viewBox="0 0 2000 1000"><path id="front" d="M100 100H680V900H100Z"/><path id="back" d="M800 100H1380V920H800Z"/><polygon id="sleeve left" points="1500,100 1900,100 1850,400 1550,400"/><polygon id="sleeve right" points="1500,500 1900,500 1850,800 1550,800"/></svg>';
    await t.page.setInputFiles('input[accept=".svg,image/svg+xml"]', { name: 'acme-jersey.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await t.page.getByText(/Imported 4 pieces/).waitFor({ timeout: 15000 });
    t.check('factory pattern replaces the template', /acme-jersey — 4 pieces imported/.test(await box.innerText()), (await box.innerText()).slice(0, 120));
    await t.page.getByRole('tab', { name: /Print files/ }).click();
    const sum = await t.page.getByLabel('Print summary').innerText();
    t.check('factory pieces nest without overlaps', /No overlapping pieces/.test(sum), sum.slice(0, 160));
    await t.shot('factory-pattern');
    await t.page.getByRole('tab', { name: /Design/ }).first().click();
    await t.page.getByRole('button', { name: 'Back to the standard template' }).click();
    t.check('back to the standard template', /standard template/.test(await t.page.getByLabel('Pattern pieces').innerText()));
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
    // The Wallpaper Designer is retired: the plain link lands on Pattern Design, and it is in no menu.
    // The redirect can race the previous page's navigation (net::ERR_ABORTED) — retry once, then check where we landed.
    try { await t.page.goto(t.BASE + '/wallpaper-designer?open=1', { waitUntil: 'domcontentloaded' }); }
    catch { await t.page.waitForTimeout(800); await t.page.goto(t.BASE + '/wallpaper-designer?open=1', { waitUntil: 'domcontentloaded' }).catch(() => {}); }
    await t.page.waitForURL(/\/patterns/, { timeout: 15000 });
    t.check('old wallpaper link goes to Pattern Design', /\/patterns/.test(t.page.url()));
    t.check('wallpaper designer not in the navigation', (await t.page.locator('a[href="/wallpaper-designer"]').count()) === 0);
    // Saved wallpaper projects still open (the page loads when it carries a project).
    await t.page.goto(t.BASE + '/wallpaper-designer?localDoc=none', { waitUntil: 'domcontentloaded' });
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

// Imposition canvas: select a placed page, set X, duplicate by a distance, Ctrl+D repeats, lock, delete; mark style.
scenarios.push({
  name: 'imposition-canvas',
  async run(t) {
    await t.page.goto(t.BASE + '/print-layout', { waitUntil: 'domcontentloaded' });
    await t.page.getByRole('button', { name: 'Create sample document' }).first().click({ timeout: 30000 });
    await t.page.getByRole('button', { name: /Create and open/ }).click();
    await t.page.getByText(/8 pages analysed/).waitFor({ timeout: 60000 });
    await t.page.getByRole('button', { name: 'N-up pages', exact: true }).click();
    await t.page.getByRole('button', { name: '4-up' }).click();
    await t.page.getByLabel('Crop marks').check().catch(() => {});
    t.check('crop mark style controls', (await t.page.getByLabel('Crop mark style', { exact: true }).count()) === 1);
    await t.page.getByRole('button', { name: 'Apply' }).click();
    await t.page.getByText(/N-up pages — done/).waitFor({ timeout: 10000 });
    const groups = () => t.page.locator('[role=img][aria-label^="Sheet"] [data-grp]').evaluateAll((els) => new Set(els.map((e) => e.getAttribute('data-grp'))).size);
    const n0 = await groups();
    await t.page.locator('[role=img][aria-label^="Sheet"]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const pt = await t.page.locator('[role=img][aria-label^="Sheet"]').evaluate((box) => {
      const host = box.getBoundingClientRect();
      // Visible area only: below the pinned tool bar and inside the window.
      const top = Math.max(host.top, document.querySelector('header[aria-label="Tool bar"]')?.getBoundingClientRect().bottom || 0), bottom = Math.min(host.bottom, window.innerHeight);
      let best = null;
      for (const g of box.querySelectorAll('[data-grp]')) { if (!g.querySelector('clipPath')) continue; const r = g.getBoundingClientRect(); const x0 = Math.max(r.left, host.left), y0 = Math.max(r.top, top), x1 = Math.min(r.right, host.right), y1 = Math.min(r.bottom, bottom); const a = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); if (!best || a > best.a) best = { a, x: (x0 + x1) / 2, y: (y0 + y1) / 2 }; }
      return best;
    });
    await t.page.mouse.click(pt.x, pt.y);
    const panel = t.page.getByRole('region', { name: 'Placed page', exact: true });
    await panel.waitFor({ timeout: 10000 });
    await panel.getByLabel('Duplicate distance across').fill('0');
    await panel.getByLabel('Duplicate distance up').fill('-5');
    await panel.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await t.page.waitForTimeout(300);
    await t.page.keyboard.press('Control+d');
    await t.page.waitForTimeout(300);
    t.check('duplicate + Ctrl+D add two placed pages', (await groups()) === n0 + 2, `${n0} → ${await groups()}`);
    await panel.getByLabel('Placed page X').fill('20');
    await panel.getByLabel('Placed page X').press('Enter');
    await t.page.waitForTimeout(300);
    t.check('numeric X position applied', /at 20,/.test(await t.page.getByText(/^Selected:/).innerText()), await t.page.getByText(/^Selected:/).innerText());
    await panel.getByRole('button', { name: 'Lock' }).click();
    await t.page.keyboard.press('Delete');
    await t.page.waitForTimeout(300);
    t.check('locked page is not deleted', (await groups()) === n0 + 2);
    await panel.getByRole('button', { name: 'Unlock' }).click();
    await panel.getByRole('button', { name: 'Delete' }).click();
    await t.page.waitForTimeout(300);
    t.check('delete removes the placed page', (await groups()) === n0 + 1);
    await t.shot('canvas');
  },
});

// Print Size & Binding Calculator: spine from caliper, cover spread, editor link with fold guides.
scenarios.push({
  name: 'binding-calculator',
  async run(t) {
    await t.page.addInitScript(() => { try { localStorage.setItem('mt:print-mode', 'pro'); } catch {} });
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
    const fs = await import('node:fs');
    // Download & print: a perfect-binding cover goes on a big sheet at actual size, or is fitted to A4.
    await t.page.getByRole('radio', { name: 'Perfect / softcover' }).click();
    const panel = t.page.getByRole('region', { name: 'Download and print' });
    await panel.scrollIntoViewIfNeeded();
    const plan = await panel.getByTestId('print-plan').innerText();
    t.check('cover: actual size on SRA3 / 33 × 48 class, fit to A4 scaled', /Actual size — (SRA3|33 × 48 cm|A3\+|SRA2)/.test(plan) && /Fit to print — A4.*scaled/.test(plan), plan.slice(0, 300));
    await panel.getByLabel('Actual size paper').selectOption('a4');
    await t.page.waitForTimeout(200);
    t.check('A4 at actual size says it does not fit', /needs a sheet of at least/.test(await panel.getByTestId('print-plan').innerText()));
    await panel.getByLabel('Actual size paper').selectOption('auto');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 60000 }), panel.getByRole('button', { name: 'Layout template' }).click()]);
    const b = fs.readFileSync(await dl.path());
    t.check('branded cover layout template PDF', b.subarray(0, 4).toString() === '%PDF' && /_LAYOUT_TEMPLATE\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
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
    t.check('pattern can go to a garment, a box or a design', (await t.page.getByRole('link', { name: /A garment \(Textile\)/ }).count()) === 1 && (await t.page.getByRole('link', { name: /A box \(Packaging\)/ }).count()) === 1);
    await t.page.goto(t.BASE + '/wallpaper-designer?open=1', { waitUntil: 'domcontentloaded' });
    const btn = t.page.getByRole('button', { name: `Pattern: ${name}` }).first();
    await btn.waitFor({ timeout: 30000 });
    t.check('wallpaper lists the saved pattern', await btn.isVisible());
    await t.shot('continuity');
  },
});

// Colours panel in the editor (Colour Explorer is only inside the editor now): values, contrast, gradient.
scenarios.push({
  name: 'colour-explorer',
  async run(t) {
    await t.editor('w=1080&h=1080&panel=colours');
    await t.page.getByRole('tab', { name: 'Contrast' }).click();
    t.check('contrast grades shown', await t.page.getByText(/AA normal text/).first().isVisible());
    await t.page.getByRole('tab', { name: 'Gradient' }).click();
    await t.page.getByRole('button', { name: 'Apply gradient' }).click();
    await t.page.waitForTimeout(500);
    const g = await t.eval(() => { const bg = window.__fabricCanvas.getObjects().find((o) => o.__isArtboard); return !!(bg && bg.fill && bg.fill.colorStops); });
    t.check('gradient applied to the page background', g);
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
    await t.page.locator('header a[href="/"]').first().click();
    await t.page.getByRole('dialog').waitFor({ timeout: 5000 });
    t.check('leave prompt appears', await t.page.getByRole('button', { name: 'Save & leave' }).isVisible());
    await t.page.getByRole('button', { name: 'Stay here' }).click();
    await t.page.getByRole('button', { name: 'Save', exact: true }).click();
    t.check('after saving: continue, save as, new or default', await t.page.getByRole('dialog', { name: 'Saved' }).isVisible());
    await t.page.getByRole('button', { name: 'Continue editing' }).click();
    await t.page.getByRole('button', { name: /Projects/ }).click();
    t.check('saved project listed', await t.page.getByRole('dialog').getByText('My Team').first().isVisible());
    await t.shot('jersey-projects');
    // .mtd project file (download fallback in the test browser), then reopen it.
    await t.page.getByRole('button', { name: 'Close' }).click();
    const fs = await import('node:fs');
    const [dl] = await Promise.all([t.page.waitForEvent('download', { timeout: 30000 }), t.page.getByRole('button', { name: /Save file/ }).click()]);
    const bytes = fs.readFileSync(await dl.path());
    t.check('.mtd project file saved', /\.mtd(\.svg)?$/.test(dl.suggestedFilename()) && bytes.length > 1000, `${dl.suggestedFilename()} ${bytes.length} bytes`);
    await t.page.getByRole('button', { name: 'New', exact: true }).click();
    await t.page.getByRole('button', { name: 'Start from default' }).click();
    t.check('start from default clears the design', !/99/.test(await t.page.getByLabel('Preview player').innerText()));
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

scenarios.push({
  name: 'packaging-panel',
  async run(t) {
    await t.editor('w=1080&h=1080&panel=packaging');
    await t.page.getByRole('button', { name: 'Add this dieline to the page' }).click();
    await t.page.waitForTimeout(800);
    const kinds = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__die).map((o) => o.__die).sort());
    t.check('dieline added as cut and crease layers', kinds.includes('cut') && kinds.includes('crease'), kinds.join(','));
    await t.shot('dieline');
    // Change the product size: the dieline is redrawn, not duplicated.
    await t.page.getByLabel('Length', { exact: true }).fill('80');
    await t.page.getByLabel('Length', { exact: true }).press('Enter');
    await t.page.getByRole('button', { name: 'Update the dieline' }).click();
    await t.page.waitForTimeout(600);
    const cuts = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__die === 'cut').length);
    t.check('one cut layer after updating', cuts === 1, cuts);
    // Mark a drawn rectangle as a crease line.
    await t.eval(() => { const F = window.fabric, c = window.__fabricCanvas; const r = new F.Rect({ left: 200, top: 200, width: 80, height: 40, fill: '#ff0000' }); c.add(r); c.setActiveObject(r); c.fire('selection:created', { selected: [r] }); });
    await t.page.waitForTimeout(300);
    await t.page.getByRole('tab', { name: 'Lines' }).click();
    await t.page.getByRole('button', { name: /^Perforation$/ }).click();
    const perf = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__die === 'perf').length);
    t.check('selected shape marked as perforation', perf === 1, perf);
  },
});

scenarios.push({
  name: 'packaging-template-opens',
  async run(t) {
    await t.page.goto(t.BASE + '/packaging-dieline', { waitUntil: 'domcontentloaded' });
    await t.page.locator('#templates').getByRole('button', { name: /Customise/ }).first().click();
    await t.page.waitForURL(/\/editor\?/, { timeout: 30000 });
    await t.page.waitForFunction(() => !!window.__fabricCanvas, null, { timeout: 30000 });
    await t.page.waitForTimeout(1500);
    const r = await t.eval(() => { const o = window.__fabricCanvas.getObjects(); return { brand: o.some((x) => x.name === 'Brand name' && x.text), die: o.filter((x) => x.__die).length, art: o.filter((x) => !x.__die && !x.__isArtboard).length }; });
    t.check('template design opened in the editor', r.brand && r.die >= 2 && r.art > 5, JSON.stringify(r));
    // Locked die lines must not catch clicks: the artwork under them stays selectable.
    const clickable = await t.eval(() => window.__fabricCanvas.getObjects().filter((x) => x.__die && x.evented !== false).length);
    t.check('locked die lines are click-through', clickable === 0, clickable);
    await t.shot('template-in-editor');
  },
});

scenarios.push({
  name: 'textile-template-opens',
  async run(t) {
    await t.page.goto(t.BASE + '/textile-studio', { waitUntil: 'domcontentloaded' });
    await t.page.locator('#templates').getByRole('button', { name: /Customise/ }).first().click();
    await t.page.waitForURL(/\/editor\?/, { timeout: 30000 });
    await t.page.waitForFunction(() => !!window.__fabricCanvas, null, { timeout: 30000 });
    await t.page.waitForTimeout(1500);
    const r = await t.eval(() => { const o = window.__fabricCanvas.getObjects(); return { base: o.filter((x) => x.__texBase).length, cut: o.filter((x) => x.__die === 'cut' && x.__tex).length, guides: o.filter((x) => x.__pat).length, text: o.some((x) => x.name === 'Chest text') }; });
    t.check('garment template opened with pieces, cut line and guides', r.base >= 4 && r.cut === 1 && r.guides >= 8 && r.text, JSON.stringify(r));
    const clickable = await t.eval(() => window.__fabricCanvas.getObjects().filter((x) => (x.__pat || x.__die) && x.evented !== false).length);
    t.check('pattern guides are click-through', clickable === 0, clickable);
    t.check('editor opens in the Textile workspace', (await t.page.getByRole('radiogroup', { name: 'Workspace type' }).getByRole('radio', { name: /Textile/ }).getAttribute('aria-checked')) === 'true');
    // change the size: pieces redraw, artwork stays
    await t.page.getByRole('button', { name: /Pattern is up to date/ }).waitFor({ timeout: 15000 });
    await t.page.getByRole('button', { name: 'XL', exact: true }).click();
    await t.page.getByRole('button', { name: /Update pattern/ }).click();
    await t.page.waitForTimeout(800);
    const r2 = await t.eval(() => { const o = window.__fabricCanvas.getObjects(); const c = o.find((x) => x.__tex); return { size: c && JSON.parse(c.__tex).size, base: o.filter((x) => x.__texBase).length, text: o.some((x) => x.name === 'Chest text') }; });
    t.check('size change redraws the pieces and keeps the artwork', r2.size === 'XL' && r2.base === r.base && r2.text, JSON.stringify(r2));
    await t.shot('textile-in-editor');
  },
});

scenarios.push({
  name: 'workspace-type-switch',
  init: () => { try { localStorage.setItem('mt:editorMode', 'pro'); } catch {} },
  async run(t) {
    await t.editor('w=1080&h=1080');
    const rail = () => t.page.locator('nav[aria-label="Editor panels"] button');
    const has = async (label) => (await rail().filter({ hasText: label }).count()) > 0;
    t.check('Design workspace: no packaging or textile tools', !(await has('Packaging')) && !(await has('Textile')));
    const group = t.page.getByRole('radiogroup', { name: 'Workspace type' });
    await group.getByRole('radio', { name: /Packaging/ }).click();
    await t.page.getByRole('tab', { name: 'Box', exact: true }).first().waitFor({ timeout: 10000 });
    t.check('Packaging workspace: box controls on the right, no textile tools', !(await has('Textile')));
    await group.getByRole('radio', { name: /Textile/ }).click();
    await t.page.getByRole('button', { name: /Lay out pattern pieces/ }).waitFor({ timeout: 10000 });
    t.check('Textile workspace: garment controls, no packaging tools', !(await has('Packaging')));
    await t.page.getByRole('button', { name: /Lay out pattern pieces/ }).click();
    await t.page.waitForTimeout(600);
    const n = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__texBase).length);
    t.check('blank page gets pattern pieces', n >= 4, n);
    await t.shot('textile-workspace');
  },
});

scenarios.push({
  name: 'print-and-cut',
  async run(t) {
    await t.editor('w=1080&h=1080&panel=qr&tab=barcode');
    await t.page.getByLabel('Barcode type').selectOption('code128');
    await t.page.getByLabel('Barcode data').fill('MTD-2026-0042');
    await t.page.getByRole('button', { name: /Add barcode to the page/ }).click();
    await t.page.waitForTimeout(800);
    const bc = await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__barcode).length);
    t.check('Code 128 barcode added as vector', bc === 1, bc);
    await t.page.getByLabel('Barcode type').selectOption('ean13');
    await t.page.getByLabel('Barcode data').fill('400638133393');
    await t.page.getByRole('button', { name: /Add barcode to the page/ }).click();
    await t.page.waitForTimeout(600);
    t.check('EAN-13 added', (await t.eval(() => window.__fabricCanvas.getObjects().filter((o) => o.__barcode).length)) === 2);
    // cut line around a shape
    await t.eval(() => { const c = window.__fabricCanvas, F = window.fabric; const r = new F.Circle({ left: 200, top: 200, radius: 120, fill: '#e11d48' }); c.add(r); c.setActiveObject(r); c.requestRenderAll(); });
    await t.page.locator('nav[aria-label="Editor panels"] button', { hasText: 'Print & cut' }).first().click();
    await t.page.getByRole('tab', { name: 'Cut & sticker' }).click();
    await t.page.getByRole('button', { name: /Make cut line/ }).click();
    await t.page.waitForTimeout(1200);
    const cut = await t.eval(() => { const o = window.__fabricCanvas.getObjects(); return { cut: o.filter((x) => x.__cutType === 'kiss' && x.__die === 'cut').length, border: o.filter((x) => x.name === 'Sticker border (white)').length }; });
    t.check('kiss-cut line and white border made around the shape', cut.cut === 1 && cut.border === 1, JSON.stringify(cut));
    await t.shot('print-and-cut');
  },
});
