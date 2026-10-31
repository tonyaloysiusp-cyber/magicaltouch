// Landing page lifecycle — Admin → SEO → Page health and the daily job
// (/api/cron/landing-check). Decides, for every live landing page:
//   working      it loads, shows templates, and visitors arrive (any visitor,
//                or anyone coming from Google, Bing…)
//   warming      new: monitored for `days` (default 14) before it is judged,
//                and pages are only judged on visitors once Google Search
//                Console is verified — before that, Google can't have sent
//                anyone, so "no visitors" would say nothing about the page
//   not-working  broken (page error, or no templates to show), or no
//                visitors at all after the monitoring window
// Not-working pages are removed (switched off / unpublished, never
// deleted) when auto-cleanup is on. Safety: if a run would remove more than
// a third of the live pages at once, it removes nothing and reports instead.

import { ALL_LANDINGS, Landing } from '@/lib/landings';

export interface LifecycleSettings { on: boolean; days: number }
export interface StatusRow { slug: string; kind: 'builtin' | 'custom'; first_seen: string; status: string; reason: string | null; views30: number; search30: number; templates: number | null; http: number | null; checked_at: string | null; removed_at: string | null; snapshot?: any }
export interface PageCheck { slug: string; h1: string; kind: 'builtin' | 'custom'; tool: boolean; templates: number | null; http: number | null; views30: number; search30: number }
export interface Decision extends PageCheck { status: 'working' | 'warming' | 'not-working'; reason: string; day: number; remove: boolean }

export const DEFAULT_SETTINGS: LifecycleSettings = { on: true, days: 14 };

export function parseSettings(v: unknown): LifecycleSettings {
  try {
    const o = typeof v === 'string' ? JSON.parse(v) : v;
    const days = Math.max(7, Math.min(90, Number((o as any)?.days) || 14));
    return { on: (o as any)?.on !== false, days };
  } catch { return DEFAULT_SETTINGS; }
}

const daysBetween = (a: string, b: Date) => Math.floor((b.getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);

export function decide(pages: PageCheck[], status: StatusRow[], settings: LifecycleSettings, googleSince: string | null, today = new Date()): { decisions: Decision[]; blocked: string | null } {
  const known = new Map(status.map((s) => [s.slug, s]));
  const todayIso = today.toISOString().slice(0, 10);
  // A page error on most pages at once means the site (not the pages) had a problem.
  const errors = pages.filter((p) => p.http !== null && p.http !== 200).length;
  const siteDown = pages.length > 0 && errors / pages.length > 0.3;

  const decisions: Decision[] = pages.map((p) => {
    const first = known.get(p.slug)?.first_seen || todayIso;
    const start = googleSince && googleSince > first ? googleSince : first;
    const age = daysBetween(start, today);
    const day = Math.max(0, daysBetween(first, today));
    const base = { ...p, day };
    if (!siteDown && p.http !== null && p.http !== 200) return { ...base, status: 'not-working', reason: `Page error (${p.http || 'no answer'})`, remove: true };
    if (!p.tool && p.templates === 0) return { ...base, status: 'not-working', reason: 'Shows no templates — visitors land on an empty page', remove: true };
    if (p.views30 > 0 || p.search30 > 0) return { ...base, status: 'working', reason: p.search30 ? `${p.search30} visitor${p.search30 > 1 ? 's' : ''} from search, ${p.views30} views` : `${p.views30} view${p.views30 > 1 ? 's' : ''} in 30 days`, remove: false };
    if (!googleSince) return { ...base, status: 'warming', reason: 'Waiting for Google Search Console — judged once Google can send visitors', remove: false };
    if (age < settings.days) return { ...base, status: 'warming', reason: `Monitoring: day ${age + 1} of ${settings.days}`, remove: false };
    return { ...base, status: 'not-working', reason: `No visitors in ${age} days on Google`, remove: true };
  });

  let blocked: string | null = null;
  const toRemove = decisions.filter((d) => d.remove);
  if (!settings.on) { toRemove.forEach((d) => (d.remove = false)); }
  else if (toRemove.length > Math.max(3, Math.floor(pages.length / 3))) {
    blocked = `${toRemove.length} of ${pages.length} pages look not-working at once — nothing removed automatically. Check the list and remove them by hand if right.`;
    toRemove.forEach((d) => (d.remove = false));
  }
  return { decisions, blocked };
}

/** Live landing pages (built-in ones not switched off, and published Admin ones). */
export function livePages(dbPages: { slug: string; h1: string; status: string; terms: string[] }[], hidden: Set<string>): { l: Pick<Landing, 'slug' | 'h1' | 'terms' | 'ctaHref'>; kind: 'builtin' | 'custom' }[] {
  const db = new Map(dbPages.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  const out: { l: Pick<Landing, 'slug' | 'h1' | 'terms' | 'ctaHref'>; kind: 'builtin' | 'custom' }[] = [];
  ALL_LANDINGS().forEach((b) => {
    if (seen.has(b.slug)) return;
    seen.add(b.slug);
    if (hidden.has(b.slug)) return;
    const e = db.get(b.slug);
    out.push({ l: e && e.status === 'published' ? { ...b, h1: e.h1, terms: e.terms?.length ? e.terms : b.terms } : b, kind: 'builtin' });
  });
  dbPages.forEach((p) => { if (!seen.has(p.slug) && p.status === 'published' && !hidden.has(p.slug)) out.push({ l: { slug: p.slug, h1: p.h1, terms: p.terms || [] }, kind: 'custom' }); });
  return out;
}

export function summarize(ds: Decision[], blocked: string | null) {
  const c = (s: Decision['status']) => ds.filter((d) => d.status === s).length;
  const rm = ds.filter((d) => d.remove);
  return [
    `${c('working')} working · ${c('warming')} warming up · ${c('not-working')} not working`,
    ...rm.map((d) => `Removed /${d.slug} — ${d.reason}`),
    ...(blocked ? [blocked] : []),
  ].join('\n');
}
