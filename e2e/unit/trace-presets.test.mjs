import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, trace } from '../../lib/trace.ts';

// A 120×80 test drawing: black frame + diagonal line + filled red square on white.
function drawing() {
  const w = 120, h = 80, data = new Uint8ClampedArray(w * h * 4).fill(255);
  const put = (x, y, r, g, b) => { const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; };
  for (let x = 5; x < 115; x++) for (const y of [5, 6, 73, 74]) put(x, y, 0, 0, 0);
  for (let y = 5; y < 75; y++) for (const x of [5, 6, 113, 114]) put(x, y, 0, 0, 0);
  for (let i = 10; i < 70; i++) { put(i, i, 0, 0, 0); put(i + 1, i, 0, 0, 0); }
  for (let y = 20; y < 50; y++) for (let x = 70; x < 100; x++) put(x, y, 220, 30, 30);
  return { width: w, height: h, data };
}

test('every trace preset, including technical drawing, sketch and low fidelity photo, gives real vector paths', () => {
  for (const id of ['logo', 'bw', 'silhouette', 'line', 'technical', 'sketch', 'photo', 'lowphoto', 'c4']) {
    const p = PRESETS.find((x) => x.id === id);
    assert.ok(p, id);
    const r = trace(drawing(), p.o);
    const svg = JSON.stringify(r);
    assert.ok(/M[\d.\- ]+[LC]/.test(svg), `${id} makes paths`);
    assert.doesNotMatch(svg, /<image|data:image/, `${id} never embeds the bitmap`);
  }
  const tech = trace(drawing(), PRESETS.find((x) => x.id === 'technical').o);
  assert.doesNotMatch(JSON.stringify(tech), /C/, 'technical drawing keeps straight lines');
});
