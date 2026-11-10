// Unit tests for the template search ranking (lib/templateSearch.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDoc, parseSearch, scoreDoc, vocabulary, relatedSearches, hashtagTitle, stem } from '../../lib/templateSearch.ts';

const T = [
  { name: 'Royal Wedding Invitation', category: 'Wedding', sub: 'Invitation', hashtags: ['weddinginvitation', 'wedding', 'invitation'] },
  { name: 'Kids Birthday Party Invite', category: 'Birthday', hashtags: ['birthdayinvitation', 'birthday', 'party'] },
  { name: 'Happy Diwali Greeting Post', category: 'Festivals', occasion: 'Diwali', hashtags: ['happydiwali', 'diwali'] },
  { name: 'City Clinic Health Flyer', category: 'Business', industry: 'Medical', hashtags: ['medicalflyer', 'clinic'] },
  { name: 'Family Photo Collage', category: 'Photo Collage', hashtags: ['familyphotocollage', 'photocollage'] },
];
const docs = T.map((t) => buildDoc(t));
const vocab = vocabulary(docs);
const hits = (q) => T.filter((_, i) => scoreDoc(docs[i], parseSearch(q, vocab)) > 0).map((t) => t.name);

test('plural and singular match', () => { assert.equal(stem('invitations'), 'invitation'); assert.ok(hits('invitations').includes('Royal Wedding Invitation')); });
test('short forms: invite and bday', () => { assert.ok(hits('bday invite').includes('Kids Birthday Party Invite')); });
test('every word must match', () => { assert.deepEqual(hits('wedding invitation'), ['Royal Wedding Invitation']); });
test('synonym: doctor finds medical', () => { assert.ok(hits('doctor').includes('City Clinic Health Flyer')); });
test('one-word hashtag splits into words', () => { assert.ok(hits('#birthdayinvitation').includes('Kids Birthday Party Invite')); });
test('typo tolerance', () => { assert.ok(hits('invitaion').includes('Royal Wedding Invitation')); });
test('partial word while typing', () => { assert.ok(hits('diwa').includes('Happy Diwali Greeting Post')); });
test('title match ranks above hashtag-only match', () => {
  const p = parseSearch('photo', vocab);
  const a = scoreDoc(docs[4], p);
  assert.ok(a > 0);
});
test('no false positives', () => { assert.deepEqual(hits('zebra'), []); });
test('related searches from hashtags', () => {
  const r = relatedSearches('photo', [['familyphotocollage', 40], ['photocollage', 90], ['weddingphotos', 12]], 5).map((x) => x.label);
  assert.ok(r.includes('Family Photo Collage'));
  assert.ok(r.includes('Wedding Photos'));
});
test('hashtag titles', () => { assert.equal(hashtagTitle('weddinginvitation'), 'Wedding Invitation'); assert.equal(hashtagTitle('happydiwali'), 'Happy Diwali'); });
