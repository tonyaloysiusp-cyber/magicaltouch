import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { ALL_LANDINGS } from '@/lib/landings';
import { searchTemplates } from '@/lib/seo';
import { coreWords } from '@/lib/landingDraft';

// Admin → SEO → Keyword ideas. Free, no API key: asks the public
// autocomplete services of Google, Bing and DuckDuckGo what people type
// after a seed phrase ("free flyer" → "free flyer maker for church", …),
// then says for each idea whether we already have a page for it and how
// many of our templates match — so you only build pages that can rank.
export const runtime = 'nodejs';
export const maxDuration = 30;

const MODS = ['', 'free ', ' maker', ' template', ' ideas', ' for', ' online', ' design'];

async function google(q: string, gl: string): Promise<string[]> {
  try {
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=${gl}&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 86400 } } as RequestInit);
    if (!r.ok) return [];
    const j = JSON.parse(new TextDecoder('utf-8').decode(await r.arrayBuffer()));
    return Array.isArray(j?.[1]) ? j[1] : [];
  } catch { return []; }
}
async function bing(q: string): Promise<string[]> {
  try {
    const r = await fetch(`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`, { next: { revalidate: 86400 } } as RequestInit);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.[1]) ? j[1] : [];
  } catch { return []; }
}
async function ddg(q: string): Promise<string[]> {
  try {
    const r = await fetch(`https://duckduckgo.com/ac/?type=list&q=${encodeURIComponent(q)}`, { next: { revalidate: 86400 } } as RequestInit);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.[1]) ? j[1] : [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const seed = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase().slice(0, 60);
    const gl = (request.nextUrl.searchParams.get('gl') || 'ae').toLowerCase().replace(/[^a-z]/g, '').slice(0, 2) || 'ae';
    if (seed.length < 2) return NextResponse.json({ error: 'Type a phrase, e.g. “wedding invitation”' }, { status: 400 });

    const queries = MODS.map((m) => (m.startsWith(' ') ? seed + m : m + seed)).filter((q, i, a) => a.indexOf(q) === i);
    const lists = await Promise.all(queries.flatMap((q) => [google(q, gl).then((l) => l.map((s) => ['google', s])), bing(q).then((l) => l.map((s) => ['bing', s])), ddg(q).then((l) => l.map((s) => ['ddg', s]))]));

    // Count how many engines suggest each phrase: suggested by more = searched more.
    const found = new Map<string, Set<string>>();
    lists.flat().forEach(([src, s]) => {
      const k = String(s).toLowerCase().replace(/\s+/g, ' ').trim();
      if (k.length < 4 || k.length > 70 || /\b(canva\.com|login|apk|download crack|porn|sex)\b/.test(k)) return;
      if (!found.has(k)) found.set(k, new Set());
      found.get(k)!.add(src);
    });

    const landings = ALL_LANDINGS();
    const ideas = [...found.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].length - b[0].length)
      .slice(0, 36);

    const rows = await Promise.all(ideas.map(async ([phrase, srcs]) => {
      const words = coreWords(phrase);
      const page = landings.find((l) => {
        const hay = `${l.slug.replace(/-/g, ' ')} ${l.h1.toLowerCase()}`;
        return words.length > 0 && words.every((w) => hay.includes(w));
      });
      const templates = words.length ? (await searchTemplates([words.join(' ')], 60)).length || (await searchTemplates(words.slice(0, 1), 60)).length : 0;
      return { phrase, engines: [...srcs], strength: srcs.size, page: page ? { slug: page.slug, h1: page.h1 } : null, templates };
    }));

    return NextResponse.json({ seed, gl, ideas: rows });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not get keyword ideas' }, { status: 500 });
  }
}
