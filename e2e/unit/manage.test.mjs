// Unit tests for the Template Manager helpers (lib/templates/manage.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug, buildTree, flatten, withDescendants, rootName, canMoveUnder, binTags, unbin, inBin, copyName, sizeLabel } from '../../lib/templates/manage.ts';

const cats = [
  { id: 'b', name: 'Business', slug: 'business', parent_id: null, sort_order: 2 },
  { id: 's', name: 'Social Media', slug: 'social-media', parent_id: null, sort_order: 1 },
  { id: 'i', name: 'Instagram', slug: 'instagram', parent_id: 's', sort_order: 1 },
  { id: 'st', name: 'Stories', slug: 'stories', parent_id: 'i', sort_order: 1 },
  { id: 'f', name: 'Flyer', slug: 'flyer', parent_id: 'b', sort_order: 1 },
];

test('slugs', () => {
  assert.equal(slugify('Love & Family'), 'love-and-family');
  assert.equal(slugify('  Café Menus! '), 'cafe-menus');
  assert.equal(uniqueSlug('Flyer', ['flyer', 'flyer-2']), 'flyer-3');
  assert.equal(uniqueSlug('Posters', ['flyer']), 'posters');
});

test('tree order, flatten and descendants', () => {
  const tree = buildTree(cats);
  assert.deepEqual(tree.map((n) => n.id), ['s', 'b']);
  assert.deepEqual(flatten(tree).map((n) => `${n.depth}${n.id}`), ['0s', '1i', '2st', '0b', '1f']);
  assert.deepEqual(withDescendants('s', cats).sort(), ['i', 's', 'st']);
});

test('root names follow the top-level category', () => {
  assert.equal(rootName('st', cats), 'Social Media');
  assert.equal(rootName('f', cats), 'Business');
  assert.equal(rootName('b', cats), 'Business');
  assert.equal(rootName(null, cats), '');
});

test('no loops when moving categories', () => {
  assert.equal(canMoveUnder('s', 'st', cats), false);
  assert.equal(canMoveUnder('s', 's', cats), false);
  assert.equal(canMoveUnder('i', 'b', cats), true);
  assert.equal(canMoveUnder('i', null, cats), true);
});

test('bin keeps the old status and restore brings it back', () => {
  const t = binTags(['universe-2026-11', 'review:keep'], 'published');
  assert.ok(inBin(t));
  assert.deepEqual(unbin(t), { tags: ['universe-2026-11', 'review:keep'], status: 'published' });
  assert.equal(unbin(binTags([], 'draft')).status, 'draft');
  assert.equal(binTags(binTags([], 'draft'), 'unpublished').filter((x) => x.startsWith('bin')).length, 2);
});

test('copy names and size labels', () => {
  assert.equal(copyName('Menu'), 'Menu (copy)');
  assert.equal(copyName('Menu (copy)'), 'Menu (copy 2)');
  assert.equal(copyName('Menu (copy 2)'), 'Menu (copy 3)');
  assert.equal(sizeLabel(1080, 1080), '1080 × 1080 · Square');
  assert.equal(sizeLabel(1080, 1920), '1080 × 1920 · Portrait');
});
