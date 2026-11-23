import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXTILE_TEMPLATES, GARMENTS, layoutPieces, templateSpec, defaultTextileSpec, cutPath, textileFlatSvg, textileSketchSvg, remapOnPiece, fabricNeed } from '../../lib/textile/editorBridge.ts';
import { pathToPolylines } from '../../lib/dxf.ts';

const bbox = (d) => { const pts = pathToPolylines(d).flatMap((p) => p.pts); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };

test('every garment lays out pieces without overlap', () => {
  for (const g of GARMENTS) {
    const lay = layoutPieces(defaultTextileSpec(g.id));
    assert.ok(lay.pieces.length >= 1, g.id);
    for (let i = 0; i < lay.pieces.length; i++) for (let j = i + 1; j < lay.pieces.length; j++) {
      const a = lay.pieces[i], b = lay.pieces[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${g.id}: ${a.id} overlaps ${b.id}`);
    }
  }
});

test('cut line sits outside the stitch line by the seam allowance', () => {
  const s = defaultTextileSpec('kurta');
  for (const p of layoutPieces(s).pieces) {
    const c = bbox(cutPath(p, s.allowance)), st = bbox(p.d);
    assert.ok(Math.abs((st.x0 - c.x0) - s.allowance) < 2 && Math.abs((c.y1 - st.y1) - s.allowance) < 2, `${p.id} ${JSON.stringify({ c, st })}`);
  }
});

test('cut-on-fold frock pieces are opened out and "cut 2" pieces doubled', () => {
  const s = { ...defaultTextileSpec('frock'), skirt: 'aline' };
  const ids = layoutPieces(s).pieces.map((p) => p.id);
  assert.ok(ids.includes('sleeve') && ids.includes('sleeve-2'), ids.join());
  const front = layoutPieces(s).pieces.find((p) => p.id === 'bodice-front');
  assert.ok(front.w > 300, `full bodice front ${front.w}`); // half would be ~250 mm
});

test('templates render previews', () => {
  for (const t of TEXTILE_TEMPLATES) { assert.match(textileFlatSvg(t), /^<svg/); assert.match(textileSketchSvg(t), /^<svg/); assert.ok(layoutPieces(templateSpec(t)).pieces.length > 0); }
});

test('remap keeps small artwork in proportion and stretches full-piece fills', () => {
  const from = { id: 'front', label: 'F', d: '', x: 0, y: 0, w: 500, h: 700, qty: 1 }, to = { ...from, x: 10, w: 550, h: 720 };
  const logo = remapOnPiece({ x: 100, y: 100, w: 100, h: 50 }, from, to);
  assert.equal(logo.fx, logo.fy);
  const fill = remapOnPiece({ x: 0, y: 0, w: 500, h: 700 }, from, to);
  assert.ok(Math.abs(fill.fx - 1.1) < 1e-9 && Math.abs(fill.fy - 720 / 700) < 1e-9);
});

test('fabric need grows with a narrower fabric', () => {
  const s = defaultTextileSpec('kurta');
  assert.ok(fabricNeed(s, 1120).metres > fabricNeed(s, 1600).metres);
});
