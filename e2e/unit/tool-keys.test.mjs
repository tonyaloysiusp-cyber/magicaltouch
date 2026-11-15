import test from 'node:test';
import assert from 'node:assert/strict';
const { DEFAULT_TOOL_KEYS, comboOf, toolForKey, assignKey, showCombo, TOOL_KEY_LABELS } = await import('../../lib/editor/toolKeys.ts');

test('defaults follow the old fixed keys', () => {
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, 'v', false), 'select');
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, 'M', false), 'rect');
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, 'T', true), 'triangle');
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, 't', false), 'text');
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, '\\', false), 'line');
  assert.equal(toolForKey(DEFAULT_TOOL_KEYS, 'z', false), null);
  assert.equal(TOOL_KEY_LABELS.length, Object.keys(DEFAULT_TOOL_KEYS).length);
});

test('reserved keys cannot become tool keys', () => {
  for (const k of ['?', ' ', 'Enter', 'Delete', 'ArrowUp', 'Escape']) assert.equal(comboOf(k, false), '');
});

test('assigning a used key moves it and reports the clash', () => {
  const { map, clashed } = assignKey(DEFAULT_TOOL_KEYS, 'rect', 'v');
  assert.equal(clashed, 'select');
  assert.equal(map.select, '');
  assert.equal(toolForKey(map, 'v', false), 'rect');
  assert.equal(toolForKey(map, 'm', false), null);
  assert.equal(showCombo('shift+o'), 'Shift + O');
});
