// SEO performance analysis — Admin → SEO → Performance and the weekly
// autopilot (/api/cron/seo-autopilot). From the data in seo_perf_data it
// works out:
//  · top     — the pages people actually visit (any page), with the trend
//  · rising  — pages growing against the previous 30 days
//  · topTemplates — the most-viewed template pages
//  · pages   — every live landing page scored, with visitors and search entries
//  · add     — searches people make that have no page yet: what visitors
//              typed in the gallery, keywords you track, festivals coming up
//  · update  — pages worth fixing first (visitors but weak score, season
//              starting, live but no visitors)
//  · remove  — pages to switch off: no templates to show, or duplicates
// and which of those the autopilot may do on its own (safe and reversible).

import { ALL_LANDINGS, Landing } from '@/lib/landings';
import { auditLanding, PageStatus, Issue } from '@/lib/seoAudit';
import { guideFor, guideWords, landingWords } from '@/lib/landingGuide';
import { coreWords, draftLanding, termsFor, LandingDraft } from '@/lib/landingDraft';

export interface PerfData {
  views: { path: string; v30: number | null; vprev: number | null }[];
  entries: { path: string; n: number; search: number }[];
  searches: { q: string; n: number; results: number }[];
  keywords: string[];
  occasions: { name: string; occasion_date: string }[];
  pages: { slug: string; title: string; h1: string; description: string; intro: string; thing: string; terms: string[]; faqs: [string, string][]; status: string; created_at: string }[];
  hidden: string;
  autopilot: string;
  last_run: string | null;
}

export interface PageRow { slug: string; h1: string; kind: 'builtin' | 'edited' | 'custom'; seasonal: boolean; templates: number | null; v30: number; vprev: number; entries: number; fromSearch: number; score: number; status: PageStatus; issues: Issue[] }
export interface TopRow { path: string; label: string; type: 'home' | 'landing' | 'template' | 'tool' | 'other'; v30: number; vprev: number; entries: number; fromSearch: number }
export interface AddIdea { phrase: string; source: 'search' | 'keyword' | 'occasion'; why: string; templates: number; auto: boolean; draft: LandingDraft }
export interface UpdateIdea { slug: string; h1: string; why: string; action: string; urgent: boolean }
export interface RemoveIdea { slug: string; h1: string; why: string; auto: boolean }

export interface Analysis {
  totals: { v30: number; vprev: number; entries: number; fromSearch: number; landingViews: number };
  top: TopRow[];
  rising: TopRow[];
  topTemplates: TopRow[];
  pages: PageRow[];
  add: AddIdea[];
  update: UpdateIdea[];
  remove: RemoveIdea[];
  autopilot: { on: boolean; lastRun: { at: string; published: number; hidden: number; summary: string | null } | null };
}

const n = (x: unknown) => Number(x) || 0;
const NAMES: Record<string, string> = { '/': 'Home page', '/templates': 'Template gallery', '/create': 'Create a design', '/editor': 'Editor', '/photo-studio': 'Photo Studio', '/ai-studio': 'AI Studio', '/about': 'About', '/tutorials': 'Tutorials', '/free-design-tools': 'Free design tools', '/contact': 'Contact' };
const label = (p: string) => { const t = NAMES[p] || p.replace(/^\/templates\/category\//, 'Category: ').replace(/^\/templates\//, '').replace(/^\//, '').replace(/-/g, ' ') || p; return t.charAt(0).toUpperCase() + t.slice(1); };
const typeOf = (p: string, landing: Set<string>): TopRow['type'] => (p === '/' ? 'home' : p.startsWith('/templates/') && !p.startsWith('/templates/category') ? 'template' : p === '/templates' || p.startsWith('/templates/category') ? 'tool' : landing.has(p.slice(1)) ? 'landing' : /^\/(create|photo-studio|ai-studio|editor|free-design-tools)/.test(p) ? 'tool' : 'other');

/** Live landing pages: built-in ones (with Admin edits) and custom ones. */
export function liveLandings(d: Pick<PerfData, 'pages' | 'hidden'>): { l: Landing; kind: PageRow['kind'] }[] {
  const hidden = new Set(d.hidden.split(',').map((x) => x.trim()).filter(Boolean));
  const db = new Map(d.pages.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  const out: { l: Landing; kind: PageRow['kind'] }[] = [];
  ALL_LANDINGS().forEach((b) => {
    if (seen.has(b.slug)) return;
    seen.add(b.slug);
    if (hidden.has(b.slug)) return;
    const e = db.get(b.slug);
    const edited = e && e.status === 'published';
    out.push({ l: edited ? { ...b, title: e.title, h1: e.h1, description: e.description, intro: e.intro.split(/\n{2,}/).filter(Boolean), terms: e.terms?.length ? e.terms : b.terms, faqs: e.faqs || [], thing: e.thing || b.thing } : b, kind: edited ? 'edited' : 'builtin' });
  });
  d.pages.forEach((p) => {
    if (seen.has(p.slug) || p.status !== 'published' || hidden.has(p.slug)) return;
    out.push({ l: { slug: p.slug, thing: p.thing, h1: p.h1, title: p.title, description: p.description, intro: p.intro.split(/\n{2,}/).filter(Boolean), terms: p.terms || [], uses: [], faqs: p.faqs || [], related: ['free-design-templates', 'free-flyer-maker', 'free-poster-maker'] }, kind: 'custom' });
  });
  return out;
}

/** Does a live landing page already cover this phrase? */
function coveredBy(phrase: string, lands: Landing[]): Landing | undefined {
  const w = coreWords(phrase.replace(/\([^)]*\)/g, ' ')).filter((x) => x.length > 2 && !['templates', 'template'].includes(x));
  if (!w.length) return undefined;
  return lands.find((l) => { const hay = `${l.slug.replace(/-/g, ' ')} ${l.terms.join(' ')}`.toLowerCase(); return w.every((x) => hay.includes(x.replace(/['’]s$/, ''))); });
}

export async function analyze(d: PerfData, countTemplates: (terms: string[]) => Promise<number>, today = new Date()): Promise<Analysis> {
  const views = new Map(d.views.map((v) => [v.path, { v30: n(v.v30), vprev: n(v.vprev) }]));
  const entries = new Map(d.entries.map((e) => [e.path, { n: n(e.n), search: n(e.search) }]));
  const lands = liveLandings(d);
  const landSlugs = new Set(lands.map((x) => x.l.slug));
  const row = (path: string): TopRow => ({ path, label: label(path), type: typeOf(path, landSlugs), v30: views.get(path)?.v30 || 0, vprev: views.get(path)?.vprev || 0, entries: entries.get(path)?.n || 0, fromSearch: entries.get(path)?.search || 0 });
  const all = [...views.keys()].filter((p) => !/^\/(admin|dashboard|profile|login|signup|reset-password|auth|editor)/.test(p)).map(row);

  // ---- every live landing page, scored
  const pages: PageRow[] = await Promise.all(lands.map(async ({ l, kind }) => {
    const templates = l.terms.length ? await countTemplates(l.terms) : l.ctaHref ? null : 0;
    const r = row(`/${l.slug}`);
    const words = landingWords(l) + (l.lang ? 0 : guideWords(guideFor(l)));
    const a = auditLanding({ slug: l.slug, title: l.title, description: l.description, h1: l.h1, words, faqs: l.faqs.length, templates, live: true, views30: r.v30, fromSearch30: r.fromSearch, related: l.related.length });
    return { slug: l.slug, h1: l.h1, kind, seasonal: !!l.seasonal, templates, v30: r.v30, vprev: r.vprev, entries: r.entries, fromSearch: r.fromSearch, score: a.score, status: a.status, issues: a.issues };
  }));

  // ---- add: real demand with no page yet
  const ls = lands.map((x) => x.l);
  const ideas = new Map<string, Omit<AddIdea, 'templates' | 'auto' | 'draft'> & { weight: number }>();
  const put = (phrase: string, source: AddIdea['source'], why: string, weight: number) => {
    const k = phrase.toLowerCase().trim();
    if (k.length < 3 || coveredBy(k, ls)) return;
    const cur = ideas.get(k);
    if (!cur || cur.weight < weight) ideas.set(k, { phrase: k, source, why, weight });
  };
  d.searches.forEach((s) => { if (n(s.n) >= 2) put(s.q, 'search', `${n(s.n)} visitor searches in 30 days${n(s.results) ? '' : ' — found nothing'}`, n(s.n) * 2); });
  d.keywords.forEach((k) => put(k, 'keyword', 'A keyword you track — no page targets it yet', 3));
  d.occasions.forEach((o) => {
    const days = Math.round((new Date(`${o.occasion_date}T12:00:00Z`).getTime() - today.getTime()) / 86400000);
    if (days < 7) return; // too late to rank this year
    put(`${o.name.replace(/\([^)]*\)/g, '').trim()} templates`, 'occasion', `${o.name} is in ${days} days — people search 2–6 weeks ahead`, days <= 45 ? 8 : 4);
  });
  const add: AddIdea[] = (await Promise.all([...ideas.values()].sort((a, b) => b.weight - a.weight).slice(0, 18).map(async (i) => {
    const terms = termsFor(i.phrase);
    const templates = terms.length ? await countTemplates(terms) : 0;
    const strong = i.source === 'keyword' || i.weight >= 6;
    // Never publish by itself a page promising a tool the site doesn't have.
    const toolClaim = /\b(logo|collage|signature|sticker|animated|gif|video|mockup generator|qr)\b/.test(i.phrase);
    return { phrase: i.phrase, source: i.source, why: toolClaim ? `${i.why} · check the site really offers this before publishing` : i.why, templates, auto: strong && templates >= 8 && !toolClaim, draft: draftLanding(i.phrase, templates) };
  }))).filter((i) => i.templates > 0).sort((a, b) => Number(b.auto) - Number(a.auto) || b.templates - a.templates);

  // ---- update: where a little work pays most
  const update: UpdateIdea[] = [];
  const occSoon = d.occasions.map((o) => ({ ...o, days: Math.round((new Date(`${o.occasion_date}T12:00:00Z`).getTime() - today.getTime()) / 86400000) })).filter((o) => o.days >= 3 && o.days <= 45);
  pages.forEach((p) => {
    const occ = p.seasonal && occSoon.find((o) => coreWords(o.name).some((w) => w.length > 3 && p.slug.includes(w)));
    if (occ) update.push({ slug: p.slug, h1: p.h1, why: `${occ.name} is in ${occ.days} days`, action: 'Refresh the year and dates, add new templates, then send it to search engines', urgent: true });
    else if (p.v30 > 0 && p.score < 80) update.push({ slug: p.slug, h1: p.h1, why: `${p.v30} visits but scores ${p.score}/100`, action: p.issues.find((i) => i.level === 'bad')?.fix || p.issues[0]?.fix || 'Fix the issues listed', urgent: false });
    else if (p.score < 70) update.push({ slug: p.slug, h1: p.h1, why: `Scores ${p.score}/100`, action: p.issues.find((i) => i.level === 'bad')?.fix || p.issues[0]?.fix || 'Fix the issues listed', urgent: false });
  });
  update.sort((a, b) => Number(b.urgent) - Number(a.urgent));

  // ---- remove: switch off what can't help
  const remove: RemoveIdea[] = [];
  pages.forEach((p) => { if (p.templates === 0) remove.push({ slug: p.slug, h1: p.h1, why: 'Shows no templates — visitors land on an empty page', auto: true }); });
  const byTerms = new Map<string, PageRow[]>();
  lands.forEach(({ l }) => { if (!l.terms.length || l.lang) return; const k = [...l.terms].map((x) => x.toLowerCase()).sort().join('|'); const pr = pages.find((p) => p.slug === l.slug)!; byTerms.set(k, [...(byTerms.get(k) || []), pr]); });
  byTerms.forEach((group) => {
    if (group.length < 2) return;
    const [best, ...rest] = [...group].sort((a, b) => b.v30 - a.v30 || b.score - a.score);
    rest.forEach((p) => { if (!remove.some((r) => r.slug === p.slug)) remove.push({ slug: p.slug, h1: p.h1, why: `Same templates as /${best.slug} — two pages compete for one search`, auto: false }); });
  });

  const top = [...all].sort((a, b) => b.v30 - a.v30).filter((r) => r.v30 > 0).slice(0, 12);
  const rising = all.filter((r) => r.v30 >= 3 && r.v30 > r.vprev).sort((a, b) => (b.v30 - b.vprev) - (a.v30 - a.vprev)).slice(0, 8);
  const topTemplates = all.filter((r) => r.type === 'template' && r.v30 > 0).sort((a, b) => b.v30 - a.v30).slice(0, 8);
  let lastRun: Analysis['autopilot']['lastRun'] = null;
  try { lastRun = d.last_run ? JSON.parse(d.last_run) : null; } catch {}
  return {
    totals: { v30: all.reduce((s, r) => s + r.v30, 0), vprev: all.reduce((s, r) => s + r.vprev, 0), entries: [...entries.values()].reduce((s, e) => s + e.n, 0), fromSearch: [...entries.values()].reduce((s, e) => s + e.search, 0), landingViews: pages.reduce((s, p) => s + p.v30, 0) },
    top, rising, topTemplates, pages: pages.sort((a, b) => b.v30 - a.v30 || b.score - a.score), add, update, remove,
    autopilot: { on: d.autopilot === 'on', lastRun },
  };
}

/** What the autopilot may do by itself: publish strong new pages (max 3 a run), switch off empty pages. */
export function autopilotActions(a: Analysis) {
  const publish = a.add.filter((i) => i.auto).slice(0, 3).map((i) => ({ type: 'publish' as const, page: { slug: i.draft.slug, title: i.draft.title, h1: i.draft.h1, description: i.draft.description, intro: i.draft.intro, thing: i.draft.thing, terms: i.draft.terms.split(',').map((t) => t.trim()).filter(Boolean), faqs: i.draft.faqs.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]) } }));
  const hide = a.remove.filter((r) => r.auto).map((r) => ({ type: 'hide' as const, slug: r.slug }));
  const lines = [
    ...publish.map((p) => `New page: /${p.page.slug} — ${p.page.h1}`),
    ...hide.map((h) => `Switched off (no templates): /${h.slug}`),
    ...a.update.filter((u) => u.urgent).slice(0, 4).map((u) => `Needs your update: /${u.slug} — ${u.why}`),
    `Visitors in 30 days: ${a.totals.v30} views, ${a.totals.fromSearch} visitors from search engines.`,
  ];
  return { actions: [...publish, ...hide], summary: lines.join('\n'), newSlugs: publish.map((p) => p.page.slug) };
}
