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

export default [
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
