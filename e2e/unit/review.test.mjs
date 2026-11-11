import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagsFor, decisionOf, suggestedScore, collectionOf } from '../../lib/templates/review.ts';

test('decisions replace each other and archive/restore round-trips', () => {
  let t = tagsFor(['birthday'], 'keep');
  assert.deepEqual(t, ['birthday', 'review:keep']);
  t = tagsFor(t, 'improve');
  assert.deepEqual(t, ['birthday', 'review:improve']);
  t = tagsFor(t, 'archive');
  assert.equal(decisionOf({ tags: t, status: 'unpublished' }), 'archive');
  t = tagsFor(t, 'restore');
  assert.deepEqual(t, ['birthday']);
});

test('suggested score uses collection and metadata', () => {
  const row = { id: '1', name: 'Sage Garden Wedding Invitation', slug: 's', category: 'Wedding', status: 'published', tags: ['pro-pilot-2026-11'], thumbnail: '/t.webp', preview: null, width: 1, height: 1, color1: null, color2: null, is_free: true, description: 'x'.repeat(120), hashtags: ['a', 'b', 'c'], updated_at: null, created_at: null };
  assert.equal(collectionOf(row.tags), 'Pro brand sets');
  assert.equal(suggestedScore(row).level, 'Premium');
  assert.ok(suggestedScore({ ...row, thumbnail: null }).score < 70);
});
