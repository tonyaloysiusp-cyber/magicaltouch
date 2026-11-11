// Unit tests for the Pattern Studio engine (lib/patterns.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PATTERN, REPEATS, MOTIFS, layout, tileSvg, sheetSvg, rng } from '../../lib/patterns.ts';

test('every repeat type makes a valid tile', () => {
  for (const r of REPEATS) {
    const p = { ...DEFAULT_PATTERN, repeat: r.id };
    const { w, h, places } = layout(p);
    assert.ok(w > 0 && h > 0, r.id);
    assert.ok(places.length >= 1, r.id);
    const svg = tileSvg(p);
    assert.match(svg, /^<svg[^>]+viewBox="0 0 [\d.]+ [\d.]+"/);
    assert.ok(svg.includes('<use'), r.id);
  }
});

test('seamless: motifs crossing an edge are repeated on the other side', () => {
  const p = { ...DEFAULT_PATTERN, repeat: 'grid', scale: 1.4 };
  const svg = tileSvg(p);
  // centre motif plus copies on all sides
  assert.ok((svg.match(/<use /g) || []).length >= 5);
});

test('random patterns are repeatable from the seed', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(tileSvg({ ...DEFAULT_PATTERN, repeat: 'random', seed: 3 }), tileSvg({ ...DEFAULT_PATTERN, repeat: 'random', seed: 3 }));
  assert.notEqual(tileSvg({ ...DEFAULT_PATTERN, repeat: 'random', seed: 3 }), tileSvg({ ...DEFAULT_PATTERN, repeat: 'random', seed: 4 }));
});

test('text motif is escaped and sheet uses a pattern fill', () => {
  const svg = tileSvg({ ...DEFAULT_PATTERN, motif: 'text', text: '<&>' });
  assert.ok(!svg.includes('<&>'));
  const sheet = sheetSvg(DEFAULT_PATTERN, 1080, 1080);
  assert.match(sheet, /<pattern id="mtp"/);
  assert.match(sheet, /width="1080" height="1080"/);
  assert.equal(MOTIFS.length >= 12, true);
});

test('unsafe image motif is ignored', () => {
  const svg = tileSvg({ ...DEFAULT_PATTERN, motif: 'image', image: 'javascript:alert(1)' });
  assert.ok(!svg.includes('javascript'));
});
