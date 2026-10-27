// Site search keywords (Admin → SEO → Keywords). Each keyword can list
// other words it should also find — "nikah" also finds "wedding",
// "walima" — so visitors find templates whatever word they use. Published
// as one small public setting (site_settings.search_keywords); keywords
// never create pages.

import { supabase } from '@/lib/supabase';

export interface SearchKeyword { k: string; also: string[]; popular?: boolean }

let cache: Promise<SearchKeyword[]> | null = null;
export function loadSearchKeywords(): Promise<SearchKeyword[]> {
  if (!cache)
    cache = Promise.resolve(supabase.from('site_settings').select('value').eq('key', 'search_keywords').maybeSingle())
      .then(({ data }) => {
        try {
          const v = JSON.parse((data as any)?.value || '[]');
          return Array.isArray(v) ? (v as SearchKeyword[]) : [];
        } catch {
          return [];
        }
      })
      .catch(() => []);
  return cache;
}

/**
 * The words to look for: each typed word, plus everything its keyword
 * "also finds". A whole-phrase keyword ("save the date") counts too.
 * Returns one list of alternatives per word; a template matches when it
 * has at least one alternative of every word.
 */
export function expandQuery(q: string, keywords: SearchKeyword[]): string[][] {
  let text = q.trim().toLowerCase();
  if (!text) return [];
  const groups: string[][] = [];
  // Phrases first, longest first.
  [...keywords].filter((k) => k.k.includes(' ')).sort((a, b) => b.k.length - a.k.length).forEach((k) => {
    const p = k.k.toLowerCase();
    if (text.includes(p)) {
      groups.push([p, ...k.also.map((a) => a.toLowerCase())]);
      text = text.replace(p, ' ');
    }
  });
  text.split(/\s+/).filter(Boolean).forEach((w) => {
    const k = keywords.find((x) => x.k.toLowerCase() === w);
    groups.push(k ? [w, ...k.also.map((a) => a.toLowerCase())] : [w]);
  });
  return groups;
}

let last = '';
/** Remembers what visitors search (for Admin → Keywords). */
export function reportSearch(q: string, results: number) {
  const t = q.trim().toLowerCase();
  if (t.length < 2 || t === last) return;
  last = t;
  fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'search', q: t, results }) }).catch(() => {});
}
