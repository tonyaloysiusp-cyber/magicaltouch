import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTable, fillTemplate, unknownFields, nUp } from '../../lib/print/vdp.ts';
import { svgPathToPdf } from '../../lib/print/pathPdf.ts';

test('CSV with quotes and Excel paste (tabs) parse to the same table', () => {
  const a = parseTable('Name,Title,City\n"Arun, K",Manager,"Dubai ""Marina"""\nRavi,Designer,Chennai\n');
  assert.deepEqual(a.headers, ['Name', 'Title', 'City']);
  assert.deepEqual(a.rows[0], ['Arun, K', 'Manager', 'Dubai "Marina"']);
  const b = parseTable('Name\tTitle\nArun\tManager');
  assert.deepEqual(b.rows, [['Arun', 'Manager']]);
});
test('placeholders and serial numbers', () => {
  const ds = parseTable('Name,Seat\nArun,A1\nRavi,B7');
  assert.equal(fillTemplate('{name} · seat {Seat} · No. {#0099}', ds, 1), 'Ravi · seat B7 · No. 0100');
  assert.deepEqual(unknownFields('{Name} {Phone}', ds), ['Phone']);
});
test('N-up: 85×55 cards on SRA3 with 4 mm gaps', () => {
  const g = nUp(320, 450, 85, 55, 4, 10);
  assert.equal(g.cols, 3); assert.equal(g.rows, 7); assert.equal(g.per, 21);
});
test('path converter handles quadratics, relative and compact numbers', () => {
  const ops = svgPathToPdf('M10-20Q15 0 20-20l5.5.5Z', (x, y) => [x, -y]);
  assert.match(ops, /10 20 m/); assert.match(ops, / c\n/); assert.match(ops, /25\.5 19\.5 l/); assert.match(ops, /h\n$/);
});
