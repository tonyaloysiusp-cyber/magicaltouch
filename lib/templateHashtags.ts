// Hashtags for a template: the ones written in Admin → Templates → Google &
// hashtags, or (when none) made from its name, category and occasion, plus
// the brand tags. Shown on the template page and used as search keywords.

export const BRAND_TAGS = ['magicaltouchdesign', 'magicaltouch', 'freetemplates'];

const clean = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const STOP = new Set(['the', 'and', 'for', 'with', 'your', 'a', 'an', 'of', 'to', 'in', 'on', 'my', 'our', 'post', 'story', 'template', 'templates', 'design', 'free', 'modern', 'simple', 'minimal']);

import { typeHashtags } from '@/lib/designTypes';

export interface HashtagSource { name: string; category: string; occasion?: string | null; industry?: string | null; hashtags?: string[] | null; search_keywords?: string | null; width?: number; height?: number; tags?: string[] | null }

/** Automatic tags only (ignores any written ones). */
export function autoHashtags(t: HashtagSource, max = 12): string[] {
  const out: string[] = [];
  const add = (s?: string | null) => { const v = s ? clean(s) : ''; if (v.length >= 3 && v.length <= 32 && !out.includes(v)) out.push(v); };
  const cat = t.category || '';
  // What it is + what it's for first ("birthday flyer", "photo album", "photo editing").
  typeHashtags({ name: t.name, category: cat, width: t.width || 1080, height: t.height || 1080, tags: t.tags, occasion: t.occasion, industry: t.industry, searchKeywords: t.search_keywords }).forEach(add);
  add(`${cat} template`);
  add(`${cat} design`);
  if (t.occasion) { add(t.occasion); add(`${t.occasion} template`); }
  if (t.industry) add(t.industry);
  (t.search_keywords || '').split(',').slice(0, 3).forEach((k) => add(k));
  t.name.split(/[^A-Za-z0-9']+/).filter((w) => w.length > 3 && !STOP.has(w.toLowerCase())).slice(0, 2).forEach((w) => add(w));
  add('graphic design');
  return out.slice(0, max);
}

/** Written tags first (if any), else automatic ones; brand tags always last. */
export function templateHashtags(t: HashtagSource, max = 12): string[] {
  const own = (t.hashtags || []).map(clean).filter(Boolean);
  const base = own.length ? own : autoHashtags(t, max);
  return [...new Set([...base, ...BRAND_TAGS])].slice(0, max + BRAND_TAGS.length);
}

/** 0–100: how ready a template is for Google, with what is missing. */
export function seoScore(t: HashtagSource & { preview?: string | null; tags?: string[] | null; description?: string | null }) {
  const missing: string[] = [];
  let s = 0;
  if (t.preview) s += 25; else missing.push('picture');
  if (t.name && t.name.length >= 12 && t.name.length <= 70) s += 15; else missing.push('clear name (12–70 letters)');
  const kw = (t.search_keywords || '').split(',').filter((x) => x.trim()).length;
  if (kw >= 3) s += 20; else if (kw > 0) { s += 10; missing.push('more search words'); } else missing.push('search words');
  if ((t.hashtags || []).length >= 3) s += 20; else { s += 10; missing.push('own hashtags (auto ones used)'); }
  if ((t.tags || []).length >= 3) s += 10; else missing.push('3+ tags');
  if ((t.description || '').length >= 80) s += 10; else missing.push('longer description');
  return { score: s, missing };
}
