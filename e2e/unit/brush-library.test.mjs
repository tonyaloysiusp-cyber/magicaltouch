import test from 'node:test';
import assert from 'node:assert/strict';
let lib = null;
try { lib = await import('../../lib/editor/brush.ts'); } catch { /* perfect-freehand is installed in CI */ }

test('brush library: 14 presets, every stroke is vector path data', { skip: !lib && 'perfect-freehand not installed here' }, () => {
  const { BRUSH_PRESETS, brushLayers, DEFAULT_BRUSH } = lib;
  assert.equal(BRUSH_PRESETS.length, 14);
  const pts = Array.from({ length: 40 }, (_, i) => [100 + i * 6, 200 + Math.sin(i / 5) * 30, 0.5]);
  for (const p of BRUSH_PRESETS) {
    const L = brushLayers(pts, { ...DEFAULT_BRUSH, kind: p.kind, preset: p.id, size: 16, ...p.s }, false, true);
    assert.ok(L.length >= 1 && L.every((l) => /^M/.test(l.d.trim())), p.id);
  }
  const soft = brushLayers(pts, { ...DEFAULT_BRUSH, preset: 'soft', size: 16, hardness: 0.3 }, false, true);
  assert.equal(soft.length, 3, 'soft brush = feathered layers');
  assert.ok(soft[0].opacity < soft[2].opacity);
  // Calligraphy: a horizontal stroke and a vertical stroke get different widths from the same nib.
  const h = brushLayers([[0, 0, 0.5], [200, 0, 0.5]], { ...DEFAULT_BRUSH, preset: 'calligraphy', size: 20, angle: 0, roundness: 0.1 }, false, true)[0].d;
  const v = brushLayers([[0, 0, 0.5], [0, 200, 0.5]], { ...DEFAULT_BRUSH, preset: 'calligraphy', size: 20, angle: 0, roundness: 0.1 }, false, true)[0].d;
  const spanY = (d) => { const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2])); return Math.max(...ys) - Math.min(...ys); };
  const spanX = (d) => { const xs = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1])); return Math.max(...xs) - Math.min(...xs); };
  assert.ok(spanY(h) < 5 && spanX(v) > 15, 'thin across, thick down with a horizontal nib');
  const dashes = brushLayers(pts, { ...DEFAULT_BRUSH, preset: 'dashed', size: 10, spacing: 2 }, false, true)[0].d;
  assert.ok((dashes.match(/M/g) || []).length > 3, 'dashed = separate dashes');
});
