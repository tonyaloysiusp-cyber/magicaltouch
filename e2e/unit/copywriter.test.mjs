// Template copy rewriting from titles (lib/templates/copywriter.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteCopy, parseName, titleCase, copyChanged } from '../../lib/templates/copywriter.ts';

const cu = { id: 'x1', name: 'Crestview Realty Modern villas, ready to move in Portrait Post · Full Photo', category: 'Social Media Posts', occasion: null, search_keywords: 'real estate, portrait post, real estate, luxury real estate, professional template', hashtags: ['editabletemplate', 'portraitpost', 'realestate', 'socialmedia'], width: 1080, height: 1350 };

test('generated names lose the made-up brand and gain the industry', () => {
  const o = rewriteCopy(cu);
  assert.equal(o.name, 'Modern Villas, Ready to Move in · Real Estate Portrait Post (Full Photo)');
  assert.ok(o.hashtags.includes('realestate') && o.hashtags.includes('luxuryrealestate'));
  assert.ok(!o.hashtags.includes('real') && !o.hashtags.includes('estate'));
  assert.match(o.description, /Portrait 1080 × 1350 px/);
  assert.ok(o.search_keywords.startsWith('real estate portrait post'));
  assert.ok(copyChanged(cu, o));
});

test('same template, same copy; different ids vary the wording', () => {
  assert.deepEqual(rewriteCopy(cu), rewriteCopy({ ...cu }));
  const ds = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => rewriteCopy({ ...cu, id }).description));
  assert.ok(ds.size >= 2);
});

test('hand-made titles are kept; occasions lead the hashtags', () => {
  const t = { id: 'y', name: "Olive Split Father's Day Celebration Post", category: 'Social Media Posts', occasion: "Father's Day", search_keywords: 'fathers day template', hashtags: ['fathersday'], width: 1080, height: 1080 };
  const o = rewriteCopy(t);
  assert.equal(o.name, t.name);
  assert.equal(o.hashtags[0], 'fathersday');
  assert.ok(o.hashtags.length <= 12 && new Set(o.hashtags).size === o.hashtags.length);
});

test('parsing and title case', () => {
  assert.deepEqual(parseName('Meridian Partners Business Card — Bold'), { brand: null, headline: 'Meridian Partners', format: 'Business Card', layout: 'Bold' });
  assert.equal(titleCase('book early and save 25%'), 'Book Early and Save 25%');
});
