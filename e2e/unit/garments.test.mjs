// Unit tests for the sublimation garment layouts (lib/garments.ts),
// the PNG DPI writer (lib/pngDpi.ts) and letter outlines' path fitting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, SIZES, layoutPieces, printLayoutSvg, markupSvg, pieceSvg, cmykOf } from '../../lib/garments.ts';
import { pngWithDpi, crc32 } from '../../lib/pngDpi.ts';
import { fitPath, pathBox } from '../../lib/pathFit.ts';
import { DEFAULT_PATTERN, layout, tileSvg, motifPath } from '../../lib/patterns.ts';

const p = { ...DEFAULT_PATTERN, motif: 'chevron' };
const L = layout(p);
const inner = tileSvg(p, { background: false }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const common = { tileInner: inner, tileW: L.w, tileH: L.h, repeatMm: 60, background: '#ffffff' };

test('every product has pieces with outlines and sizes', () => {
  for (const pr of PRODUCTS) {
    assert.ok(pr.pieces.length > 0, pr.id);
    for (const pc of pr.pieces) { assert.match(pc.d, /^M/); assert.ok(pc.w > 0 && pc.h > 0 && pc.qty > 0); }
  }
  assert.ok(PRODUCTS.find((x) => x.id === 'socks'));
});

test('a piece wider than the roll is turned 90 degrees', () => {
  const flag = PRODUCTS.find((x) => x.id === 'flag');
  const { placed } = layoutPieces(flag, 1, 1118, 10, 15);
  assert.equal(placed[0].rot, true);
  assert.equal(placed[0].w, 900);
  assert.ok(placed[0].x + placed[0].w + 10 <= 1118);
});

test('pieces fit the roll and never overlap', () => {
  for (const pr of PRODUCTS) for (const roll of [914, 1600]) {
    const { placed, height } = layoutPieces(pr, 1.1, roll, 10, 15);
    for (const a of placed) {
      if (a.tooWide) { assert.equal(pr.id, 'flag'); assert.equal(roll, 914); continue; }
      assert.ok(a.x - 10 >= 0 && a.x + a.w + 10 <= roll, `${pr.id} fits ${roll}`);
      assert.ok(a.y + a.h + 10 <= height);
    }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      const apart = a.x + a.w + 10 <= b.x - 10 || b.x + b.w + 10 <= a.x - 10 || a.y + a.h + 10 <= b.y - 10 || b.y + b.h + 10 <= a.y - 10;
      assert.ok(apart, `${pr.id} pieces ${i} and ${j} overlap`);
    }
  }
});

test('a size run lays out every garment of every size', () => {
  const jersey = PRODUCTS.find((x) => x.id === 'jersey');
  const perGarment = jersey.pieces.reduce((n, pc) => n + pc.qty, 0);
  const run = [{ label: 'S', k: 0.95, qty: 2 }, { label: 'L', k: 1.05, qty: 3 }];
  const { placed } = layoutPieces(jersey, 1, 1600, 10, 15, run);
  assert.equal(placed.length, perGarment * 5);
  assert.equal(placed.filter((x) => x.size === 'L').length, perGarment * 3);
});

test('print layout is a real-size SVG with cut lines and mirror option', () => {
  const pr = PRODUCTS[0];
  const r = printLayoutSvg({ ...common, product: pr, sizeK: 1, sizeLabel: 'M', rollW: 1600, bleed: 10, cutLines: true, name: 'A & B', mirror: true });
  assert.match(r.svg, /width="1600mm"/);
  assert.match(r.svg, /id="cut-lines" transform="translate\(1600 0\) scale\(-1 1\)"/);
  assert.match(r.svg, /A &amp; B/);
  const ps = pieceSvg(r.placed[0], { ...common, bleed: 10, cutLines: false });
  assert.ok(Math.abs(ps.w - (r.placed[0].w + 20)) < 0.01);
});

test('markup sheet is A3 and lists every piece', () => {
  const pr = PRODUCTS.find((x) => x.id === 'shorts');
  const svg = markupSvg({ ...common, product: pr, sizeLabel: 'M', sizeK: 1, name: 'Kit', colors: ['#1E3A5F'], bleed: 10, rollW: 1600, sizeRun: { M: 4 }, date: '2026-11-12' });
  assert.match(svg, /width="420mm" height="297mm"/);
  for (const pc of pr.pieces) assert.ok(svg.includes(pc.label), pc.label);
  assert.equal(cmykOf('#000000'), 'C0 M0 Y0 K100');
});

test('PNG gets a valid pHYs chunk for the DPI', () => {
  // Minimal PNG: signature + IHDR + IEND.
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type, data) => {
    const b = new Uint8Array(12 + data.length); const dv = new DataView(b.buffer);
    dv.setUint32(0, data.length); b.set([...type].map((c) => c.charCodeAt(0)), 4); b.set(data, 8);
    dv.setUint32(8 + data.length, crc32(b.subarray(4, 8 + data.length))); return b;
  };
  const ihdr = chunk('IHDR', new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]));
  const iend = chunk('IEND', new Uint8Array());
  const png = new Uint8Array([...sig, ...ihdr, ...iend]);
  const out = pngWithDpi(png, 300);
  const s = String.fromCharCode(...out);
  const at = s.indexOf('pHYs');
  assert.ok(at > s.indexOf('IHDR') && at < s.indexOf('IEND'));
  const dv = new DataView(out.buffer);
  assert.equal(dv.getUint32(at + 4), Math.round(300 / 0.0254));
  assert.equal(out[at + 12], 1);
  // Running it twice keeps a single pHYs.
  const twice = String.fromCharCode(...pngWithDpi(out, 150));
  assert.equal(twice.split('pHYs').length, 2);
});

test('letter outlines are fitted into the motif box and used as the motif path', () => {
  const d = 'M100 50L300 50L300 150L100 150Z';
  const f = fitPath(d, pathBox(d));
  const b = pathBox(f);
  assert.ok(Math.abs(b.w - 100) < 0.01 && Math.abs(b.x + 50) < 0.01 && Math.abs(b.y + 25) < 0.01);
  const q = { ...DEFAULT_PATTERN, motif: 'text', text: 'AB', textPath: f };
  assert.equal(motifPath(q), f);
  assert.ok(tileSvg(q).includes(f));
  assert.equal(motifPath({ ...q, textPath: undefined }), null);
});

test('pattern variation (size / rotation jitter, alternate) stays seamless and varied', async () => {
  const { layout, DEFAULT_PATTERN } = await import('../../lib/patterns.ts');
  const plain = layout({ ...DEFAULT_PATTERN, repeat: 'grid' });
  assert.equal(plain.places.length, 1);
  const v = layout({ ...DEFAULT_PATTERN, repeat: 'grid', sizeJitter: 0.8, rotJitter: 90, alternate: 'rotate' });
  assert.equal(v.places.length, 16);
  assert.equal(v.w, plain.w * 4);
  const sizes = new Set(v.places.map((q) => q.s.toFixed(3)));
  assert.ok(sizes.size > 5, 'sizes vary');
  // Same seed → same result (seamless and repeatable).
  assert.deepEqual(layout({ ...DEFAULT_PATTERN, repeat: 'grid', sizeJitter: 0.8, rotJitter: 90 }), layout({ ...DEFAULT_PATTERN, repeat: 'grid', sizeJitter: 0.8, rotJitter: 90 }));
});

test('wallpaper rolls: drops, repeat matching, doors and extra allowance', async () => {
  const { rollEstimate } = await import('../../lib/wall.ts');
  const spec = { rollWidthMm: 530, rollLengthMm: 10050, repeatMm: 640, match: 'straight', trimMm: 100, extraPct: 10 };
  // 4 m wall, 2.5 m high: ceil(4000/530) = 8 drops; drop = ceil(2600/640)*640 = 3200; 3 drops per roll → 3 rolls (+10% → 4).
  const e = rollEstimate([{ name: 'A', widthMm: 4000, heightMm: 2500, openings: [] }], spec);
  assert.equal(e.drops, 8); assert.equal(e.walls[0].dropMm, 3200); assert.equal(e.dropsPerRoll, 3); assert.equal(e.rolls, 3); assert.equal(e.rollsWithExtra, 4);
  // A full-height 900 mm door saves one drop; a window (not full height) saves none.
  const d = rollEstimate([{ name: 'A', widthMm: 4000, heightMm: 2500, openings: [{ kind: 'door', widthMm: 900, heightMm: 2400 }, { kind: 'window', widthMm: 1200, heightMm: 1200 }] }], spec);
  assert.equal(d.drops, 7);
  assert.ok(Math.abs(d.netAreaM2 - (10 - 2.16 - 1.44)) < 1e-9);
  const h = rollEstimate([{ name: 'A', widthMm: 1000, heightMm: 2500, openings: [] }], { ...spec, match: 'half-drop' });
  assert.equal(h.walls[0].dropMm, 3520);
});
