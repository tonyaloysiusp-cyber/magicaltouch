// Unit tests for the editor's pure maths (run with --experimental-strip-types).
import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, rgbToHex, rgbToCmyk, cmykToRgb, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, normalizeColor, contrastRatio } from '../../lib/editor/color.ts';
import { shapePathD, SHAPES } from '../../lib/editor/shapePaths.ts';
import { planResize } from '../../lib/editor/smartResize.ts';
import { gradientCoords, fromFabricGradient } from '../../lib/editor/gradients.ts';
import { presetToPx, ALL_PRESETS } from '../../lib/editor/sizePresets.ts';

const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test('unit conversions are exact (1in = 25.4mm = 72pt = 96px)', () => {
  const a4 = presetToPx(ALL_PRESETS.find((p) => p.id === 'a4'));
  assert.ok(near(a4.width, (210 / 25.4) * 96), `A4 width ${a4.width}`);
  assert.ok(near(a4.height, (297 / 25.4) * 96));
  const letter = presetToPx(ALL_PRESETS.find((p) => p.id === 'letter'));
  assert.equal(letter.width, 816);
  assert.equal(letter.height, 1056);
});

test('colour round trips', () => {
  for (const hex of ['#000000', '#FFFFFF', '#3B82C4', '#F3A6B8', '#8CC84B']) {
    const rgb = hexToRgb(hex);
    assert.equal(rgbToHex(rgb), hex);
    const hsl = rgbToHsl(rgb);
    const back = rgbToHex(hslToRgb(hsl.h, hsl.s, hsl.l));
    const d = hexToRgb(back);
    assert.ok(Math.abs(d.r - rgb.r) <= 3 && Math.abs(d.g - rgb.g) <= 3 && Math.abs(d.b - rgb.b) <= 3, `${hex} -> ${back}`);
    const hsv = rgbToHsv(rgb);
    assert.equal(rgbToHex(hsvToRgb(hsv.h, hsv.s, hsv.v)), hex);
  }
  assert.deepEqual(rgbToCmyk({ r: 0, g: 0, b: 0 }), { c: 0, m: 0, y: 0, k: 100 });
  assert.deepEqual(rgbToCmyk({ r: 255, g: 0, b: 0 }), { c: 0, m: 100, y: 100, k: 0 });
  assert.equal(rgbToHex(cmykToRgb(0, 100, 100, 0)), '#FF0000');
  assert.equal(normalizeColor('rgba(59, 130, 196, 0.5)'), '#3B82C4');
  assert.equal(normalizeColor('#abc'), '#AABBCC');
  assert.ok(near(contrastRatio('#000000', '#FFFFFF'), 21, 0.01));
});

test('every library shape produces a valid path in its box', () => {
  for (const s of SHAPES) {
    const d = shapePathD(s.kind, 200, 100, s.params);
    assert.ok(d.startsWith('M'), s.kind);
    const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    assert.ok(nums.every((n) => Number.isFinite(n)), `${s.kind} has non-finite numbers`);
    // Coordinates stay within the box (with a little room for curves).
    assert.ok(nums.every((n) => n >= -5 && n <= 205), `${s.kind} out of box: ${d.slice(0, 80)}`);
  }
});

test('smart resize never stretches content and keeps backgrounds covering', () => {
  const from = { width: 1080, height: 1080 };
  const to = { width: 1080, height: 1920 };
  const plan = planResize(
    [
      { box: { left: 0, top: 0, width: 1080, height: 1080 }, isImage: true, isShape: false }, // background photo
      { box: { left: 340, top: 440, width: 400, height: 200 }, isImage: false, isShape: false }, // centred title
      { box: { left: 40, top: 980, width: 200, height: 60 }, isImage: false, isShape: false }, // footer bottom-left
    ],
    from,
    to
  );
  assert.equal(plan[0].role, 'background');
  assert.ok(plan[0].scaleX === plan[0].scaleY && 1080 * plan[0].scaleX >= 1919, 'background covers new page');
  assert.equal(plan[1].scaleX, plan[1].scaleY, 'content scales uniformly');
  assert.ok(near(plan[1].cx, 540, 0.5) && Math.abs(plan[1].cy - 960) < 60, `title stays about centred: ${plan[1].cx},${plan[1].cy}`);
  assert.ok(plan[2].cy > 1700, `footer stays near the bottom: ${plan[2].cy}`);
});

test('resize keeps blocks together (bullet stays next to its line, bands keep spanning)', () => {
  const from = { width: 1080, height: 1920 };
  const to = { width: 1080, height: 1080 };
  const plan = planResize(
    [
      { box: { left: 0, top: 0, width: 1080, height: 300 }, isImage: false, isShape: true }, // header band
      { box: { left: 80, top: 100, width: 600, height: 100 }, isImage: false, isShape: false, isText: true }, // name on band
      { box: { left: 100, top: 600, width: 12, height: 12 }, isImage: false, isShape: true }, // bullet
      { box: { left: 124, top: 594, width: 500, height: 24 }, isImage: false, isShape: false, isText: true }, // its line
    ],
    from,
    to
  );
  const s = 1080 / 1920;
  assert.ok(near(plan[3].cx - plan[2].cx, (374 - 106) * s, 0.5), 'bullet-to-text spacing scales, never splits');
  assert.ok(near(plan[0].scaleX * 1080, 1080, 0.5), 'band still spans the page');
  assert.ok(plan[1].cy - plan[1].scaleY * 50 >= plan[0].cy - plan[0].scaleY * 150 - 0.5, 'name stays on its band');
});

test('gradient angle round trips', () => {
  for (const angle of [0, 45, 90, 135, 180, 270]) {
    const coords = gradientCoords({ type: 'linear', angle, stops: [] });
    const spec = fromFabricGradient({ type: 'linear', coords, colorStops: [{ offset: 0, color: '#000' }, { offset: 1, color: 'rgba(255,0,0,0.5)' }] });
    assert.equal(((spec.angle % 360) + 360) % 360, angle);
    assert.equal(spec.stops[1].opacity, 0.5);
    assert.equal(spec.stops[1].color, '#ff0000');
  }
});
