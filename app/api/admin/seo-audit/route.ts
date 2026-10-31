import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { ALL_LANDINGS, Landing } from '@/lib/landings';
import { searchTemplates } from '@/lib/seo';
import { guideFor, guideWords, landingWords } from '@/lib/landingGuide';
import { auditLanding, isSearchReferrer, AuditResult } from '@/lib/seoAudit';

// Admin → SEO → Overview. One request that answers "which pages work and
// which don't": every landing page (built-in, edited and custom) with its
// score, issues, matching templates, visitors and visitors from search in
// the last 30 days, plus the setup checks that decide whether Google can
// find the site at all.
export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'bom1';

const DAYS = 30;

export interface AuditRow extends AuditResult {
  slug: string; h1: string; title: string; description: string; thing: string;
  kind: 'builtin' | 'edited' | 'custom'; live: boolean; seasonal: boolean;
  templates: number | null; words: number; faqs: number; views30: number; fromSearch30: number;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const since = new Date(Date.now() - (DAYS - 1) * 86400000).toISOString().slice(0, 10);
    const [pagesQ, settingsQ, viewsQ, visitsQ, promoQ] = await Promise.all([
      supabase.from('seo_pages').select('slug,title,h1,description,intro,thing,terms,faqs,status'),
      supabase.from('site_settings').select('key,value,updated_at'),
      supabase.from('site_views_daily').select('path,views').gte('day', since).range(0, 19999),
      supabase.from('site_visitors_daily').select('first_path,referrer').gte('day', since).range(0, 49999),
      supabase.from('promo_items').select('kind,status'),
    ]);
    const settings = new Map(((settingsQ.data as any[]) || []).map((s) => [s.key, s]));
    const hidden = new Set(String(settings.get('hidden_landings')?.value || '').split(',').map((x) => x.trim()).filter(Boolean));

    const views = new Map<string, number>();
    ((viewsQ.data as any[]) || []).forEach((r) => views.set(r.path, (views.get(r.path) || 0) + Number(r.views || 0)));
    const fromSearch = new Map<string, number>();
    const sources = new Map<string, number>();
    let visitors = 0, searchVisitors = 0;
    ((visitsQ.data as any[]) || []).forEach((v) => {
      visitors++;
      const host = v.referrer ? String(v.referrer).replace(/^www\./, '') : 'direct';
      sources.set(host, (sources.get(host) || 0) + 1);
      if (isSearchReferrer(v.referrer)) { searchVisitors++; fromSearch.set(v.first_path, (fromSearch.get(v.first_path) || 0) + 1); }
    });

    // Built-in pages, with an edit from Admin replacing their text.
    const db = new Map(((pagesQ.data as any[]) || []).map((p) => [p.slug, p]));
    const seen = new Set<string>();
    const pages: { l: Landing; kind: AuditRow['kind']; live: boolean }[] = [];
    ALL_LANDINGS().forEach((b) => {
      if (seen.has(b.slug)) return;
      seen.add(b.slug);
      const d = db.get(b.slug);
      const edited = d && d.status === 'published';
      const l: Landing = edited ? { ...b, title: d.title, h1: d.h1, description: d.description, intro: String(d.intro || '').split(/\n{2,}/).filter(Boolean), terms: d.terms?.length ? d.terms : b.terms, faqs: d.faqs || [], thing: d.thing || b.thing } : b;
      pages.push({ l, kind: edited ? 'edited' : 'builtin', live: !hidden.has(b.slug) });
    });
    db.forEach((d, slug) => {
      if (seen.has(slug)) return;
      pages.push({
        l: { slug, thing: d.thing || 'design', h1: d.h1, title: d.title, description: d.description, intro: String(d.intro || '').split(/\n{2,}/).filter(Boolean), terms: d.terms || [], uses: [], faqs: d.faqs || [], related: ['free-design-templates', 'free-flyer-maker', 'free-poster-maker'] },
        kind: 'custom', live: d.status === 'published' && !hidden.has(slug),
      });
    });

    const rows: AuditRow[] = await Promise.all(pages.map(async ({ l, kind, live }) => {
      const templates = l.terms.length ? (await searchTemplates(l.terms, 60)).length : l.ctaHref ? null : 0;
      const words = landingWords(l) + (l.lang ? 0 : guideWords(guideFor(l)));
      const path = `/${l.slug}`;
      const v = views.get(path) || 0, s = fromSearch.get(path) || 0;
      const a = auditLanding({ slug: l.slug, title: l.title, description: l.description, h1: l.h1, words, faqs: l.faqs.length, templates, live, views30: v, fromSearch30: s, related: l.related.length });
      return { ...a, slug: l.slug, thing: l.thing, h1: l.h1, title: l.title, description: l.description, kind, live, seasonal: !!l.seasonal, templates, words, faqs: l.faqs.length, views30: v, fromSearch30: s };
    }));

    const channels = ((promoQ.data as any[]) || []).filter((p) => p.kind === 'channel');
    const indexnow = settings.get('indexnow_last')?.value || null;
    const setup = [
      { id: 'google', ok: !!settings.get('google_verification')?.value, title: 'Google Search Console verified', why: 'Without it Google may not index the site, and you can’t see which searches find you.', fix: 'SEO → Search engines: paste the Google HTML tag, Save, press Verify in Google, then submit sitemap.xml.' },
      { id: 'bing', ok: !!settings.get('bing_verification')?.value, title: 'Bing Webmaster Tools verified', why: 'Bing also powers Yahoo, DuckDuckGo and ChatGPT search results.', fix: 'In Bing Webmaster Tools choose “Import from Google Search Console” (fastest), or paste the Bing meta tag in Search engines.' },
      { id: 'indexnow', ok: !!indexnow && Date.now() - new Date(indexnow).getTime() < 14 * 86400000, title: 'Pages sent to search engines in the last 14 days', why: 'Telling Bing and others about new pages gets them indexed in days instead of weeks.', fix: 'Press “Send to search engines” after adding templates or pages.' },
      { id: 'listings', ok: channels.filter((c) => c.status === 'done').length >= 5, title: 'Listed on at least 5 free sites', why: 'Links from other sites are the biggest reason Google trusts a new site.', fix: 'Open Free promotion and do the “Start here” items first.' },
      { id: 'thin', ok: rows.filter((r) => r.live && r.words < 250).length === 0, title: 'No thin landing pages', why: 'Pages under 250 words rarely rank and can drag the site down.', fix: 'Open the flagged pages below and add text and questions.' },
      { id: 'empty', ok: rows.filter((r) => r.live && r.templates === 0).length === 0, title: 'Every landing page shows templates', why: 'Empty pages make visitors leave straight away.', fix: 'Add matching template words, or switch the page off.' },
    ];

    return NextResponse.json({
      days: DAYS,
      setup,
      traffic: { visitors, searchVisitors, sources: [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([host, n]) => ({ host, n })) },
      indexnowLast: indexnow,
      rows: rows.sort((a, b) => a.score - b.score),
    });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not run the SEO check' }, { status: 500 });
  }
}
