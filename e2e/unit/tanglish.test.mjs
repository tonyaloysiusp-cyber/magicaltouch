import test from 'node:test';
import assert from 'node:assert/strict';
import { tanglishToTamil, tanglishAlternatives, tanglishSuggest, looksTanglish } from '../../lib/i18n/tanglish.ts';

test('Tanglish → Tamil: the brief example, rules and dictionary', () => {
  assert.equal(tanglishToTamil('Vanakkam, eppadi irukkinga?'), 'வணக்கம், எப்படி இருக்கீங்க?');
  const cases = { kalai: 'கலை', paadal: 'பாடல்', thalaivar: 'தலைவர்', murugan: 'முருகன்', pandhu: 'பந்து', kandu: 'கண்டு', kattam: 'கட்டம்', vaazhga: 'வாழ்க', chennai: 'சென்னை', kaN: 'கண்', paLLi: 'பள்ளி', aRivu: 'அறிவு', 'inga vaanga': 'இங்க வாங்க' };
  for (const [l, t] of Object.entries(cases)) assert.equal(tanglishToTamil(l), t, l);
  assert.equal(tanglishToTamil('Score 2026 — 10%'), 'Score 2026 — 10%'.replace('Score', tanglishToTamil('Score')), 'digits and punctuation kept');
  assert.equal(tanglishToTamil('Arun FC', { keep: new Set(['fc']) }), 'அருன் FC', 'words to keep stay in English');
});

test('alternatives and suggestions let the user choose', () => {
  assert.ok(tanglishAlternatives('sundar').includes('சுந்தர்'));
  assert.ok(tanglishAlternatives('kalai').includes('களை'));
  const s = tanglishSuggest('naan Arun');
  assert.equal(s.length, 2); assert.equal(s[0].tamil, 'நான்'); assert.ok(s[0].known);
  assert.ok(looksTanglish('vanakkam nanba'));
  assert.ok(!looksTanglish('Happy birthday to you'));
});
