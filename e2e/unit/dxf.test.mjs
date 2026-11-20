import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToPolylines, writeDxf, polyLength } from '../../lib/dxf.ts';
import { makeDieline, DEFAULT_DIE, ruleLength } from '../../lib/packaging/dieline.ts';

test('square path → closed polyline, DXF has layers and entities', () => {
  const p = pathToPolylines('M0 0H10V10H0Z');
  assert.equal(p.length, 1); assert.equal(p[0].closed, true); assert.equal(polyLength(p), 40);
  const dxf = writeDxf([{ name: 'CUT', color: 1, polylines: p }], 10);
  assert.match(dxf, /AC1009/); assert.match(dxf, /\nLAYER\n2\nCUT\n/); assert.match(dxf, /POLYLINE/); assert.match(dxf, /EOF\n$/);
});
test('curves flatten close to the true length (circle via 4 cubics)', () => {
  const r = 10, K = 0.5523;
  const d = `M${r} 0C${r} ${r * K} ${r * K} ${r} 0 ${r}C${-r * K} ${r} ${-r} ${r * K} ${-r} 0C${-r} ${-r * K} ${-r * K} ${-r} 0 ${-r}C${r * K} ${-r} ${r} ${-r * K} ${r} 0Z`;
  const len = polyLength(pathToPolylines(d, 0.01));
  assert.ok(Math.abs(len - 2 * Math.PI * r) < 0.05, String(len));
});
test('dieline knife length is preserved through DXF flattening', () => {
  const die = makeDieline(DEFAULT_DIE);
  const polys = die.lines.filter((l) => l.kind === 'cut').flatMap((l) => pathToPolylines(l.d, 0.02));
  assert.ok(Math.abs(polyLength(polys) - ruleLength(die, 'cut')) < 1, `${polyLength(polys)} vs ${ruleLength(die, 'cut')}`);
});

test('SVG arcs flatten to the right length (full circle as two arcs)', () => {
  const len = polyLength(pathToPolylines('M0 10A10 10 0 1 0 20 10A10 10 0 1 0 0 10Z', 0.01));
  assert.ok(Math.abs(len - 2 * Math.PI * 10) < 0.05, String(len));
});
