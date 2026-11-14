import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSvgToPdf, textFaces, faceKey } from '../../lib/svgToPdf.ts';

function recorder() {
  const log = [];
  const pdf = new Proxy({ log, __faces: new Map([['Oswald|700|0', 'Oswald-700']]), GState: function (o) { Object.assign(this, o); } }, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push([k, ...a]); return pdf; }; },
  });
  return pdf;
}

test('linear gradient prints as vector bands, transparent stop fades', () => {
  const pdf = recorder();
  renderSvgToPdf(pdf, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff00"/></linearGradient></defs><rect width="100" height="50" fill="url(#g)"/></svg>`);
  const fills = pdf.log.filter((l) => l[0] === 'setFillColor');
  assert.ok(fills.length > 30, `bands: ${fills.length}`);
  assert.ok(fills[0][1] >= 250 && fills[0][3] <= 5, String(fills[0]));
  assert.ok(pdf.log.some((l) => l[0] === 'clip'));
  assert.ok(pdf.log.some((l) => l[0] === 'setGState'), 'fading stop uses transparency');
});

test('radial gradient draws rings', () => {
  const pdf = recorder();
  renderSvgToPdf(pdf, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="r" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs><circle cx="50" cy="50" r="40" fill="url(#r)"/></svg>`);
  assert.ok(pdf.log.filter((l) => l[0] === 'setFillColor').length > 30);
});

test('live text uses the embedded face, keeps outline under fill, squeezes and rotates', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(90 50 50)"><g transform="scale(0.8 1)"><text x="10" y="20" font-family="'Oswald', sans-serif" font-size="10" font-weight="700" fill="#ffffff" stroke="#000000" stroke-width="1" paint-order="stroke" letter-spacing="1">ALI 23</text></g></g></svg>`;
  assert.deepEqual(textFaces([svg]), ['Oswald|700|0']);
  assert.equal(faceKey("'Bebas Neue', sans-serif", 'bold', undefined), 'Bebas Neue|700|0');
  const pdf = recorder();
  renderSvgToPdf(pdf, svg);
  assert.ok(pdf.log.some((l) => l[0] === 'setFont' && l[1] === 'Oswald-700'));
  const texts = pdf.log.filter((l) => l[0] === 'text');
  assert.equal(texts.length, 2);
  assert.equal(texts[0][4].renderingMode, 'stroke');
  assert.equal(texts[1][4].renderingMode, 'fill');
  assert.equal(texts[1][1], 'ALI 23');
  assert.ok(Math.abs(texts[1][4].angle + 90) < 0.01);
  assert.ok(Math.abs(texts[1][4].horizontalScale - 0.8) < 0.01);
});
