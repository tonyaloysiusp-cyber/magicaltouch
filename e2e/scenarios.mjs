// Editor scenarios. `t.eval` runs in the page; window.__fabricCanvas is the
// live Fabric canvas.
const objs = () => window.__fabricCanvas.getObjects().filter((o) => !o.__isArtboard && !o.__isGuide).map((o) => ({ type: o.type, left: Math.round(o.left), top: Math.round(o.top), w: Math.round(o.getScaledWidth()), h: Math.round(o.getScaledHeight()) }));

export default [
  {
    name: 'smoke',
    async run(t) {
      await t.editor();
      await t.shot('open');
      const n = await t.eval(() => window.__fabricCanvas.getObjects().length);
      t.check('canvas has objects (artboard)', n > 0, n);
      t.check('objects', true, JSON.stringify(await t.eval(objs)));
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
