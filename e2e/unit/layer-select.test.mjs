import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLayerSelection as nx } from '../../lib/ui/layerSelect.ts';

const L = [1, 2, 3, 4, 5, 6];
test('click selects one; shift-click selects the range from the anchor', () => {
  let s = nx(L, [], null, 2, {});
  assert.deepEqual(s.selection, [2]);
  s = nx(L, s.selection, s.anchor, 5, { shift: true });
  assert.deepEqual(s.selection, [2, 3, 4, 5]);
  s = nx(L, s.selection, s.anchor, 1, { shift: true }); // range re-pivots on the same anchor
  assert.deepEqual(s.selection, [1, 2]);
});
test('ctrl-click adds and removes single layers, in panel order', () => {
  let s = nx(L, [], null, 5, {});
  s = nx(L, s.selection, s.anchor, 3, { toggle: true });
  s = nx(L, s.selection, s.anchor, 1, { toggle: true });
  assert.deepEqual(s.selection, [1, 3, 5]);
  s = nx(L, s.selection, s.anchor, 1, { toggle: true });
  assert.deepEqual(s.selection, [3, 5]);
});
test('shift + ctrl adds a range to the selection', () => {
  let s = nx(L, [6], 6, 1, { toggle: true });
  s = nx(L, s.selection, s.anchor, 3, { shift: true, toggle: true });
  assert.deepEqual(s.selection, [1, 2, 3, 6]);
});
