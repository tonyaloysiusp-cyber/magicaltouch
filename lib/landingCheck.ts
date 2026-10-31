// Runs the landing page check (server only): gathers visitors, search
// visitors and template counts, opens every live page to make sure it
// loads and count the template cards it really shows, decides each page's status (lib/landingLifecycle.ts) and saves it —
// removing not-working pages when auto-cleanup is on and `apply` is true.
// Used by the daily job and by "Check now" in Admin → SEO → Page health.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_URL, searchTemplates } from '@/lib/seo';
import { decide, livePages, parseSettings, summarize, PageCheck, StatusRow } from '@/lib/landingLifecycle';

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

/** Opens the live page like a visitor: its HTTP status and how many template cards it really shows. */
async function openPage(url: string): Promise<{ http: number; shown: number | null }> {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual', cache: 'no-store', headers: { 'User-Agent': 'MagicalTouch-PageCheck/1.0 (bot)' }, signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) return { http: r.status, shown: null };
    const html = await r.text();
    const shown = new Set(html.match(/href="\/templates\/[a-z0-9-]+"/g) || []).size;
    return { http: 200, shown };
  } catch { return { http: 0, shown: null }; }
}

export async function runLandingCheck(supabase: SupabaseClient, token: string | null, apply: boolean) {
  const [{ data: perf, error: e1 }, { data: life, error: e2 }] = await Promise.all([
    supabase.rpc('seo_perf_data', token ? { p_token: token } : {}),
    supabase.rpc('landing_data', token ? { p_token: token } : {}),
  ]);
  if (e1 || e2 || !perf || !life) throw new Error((e1 || e2)?.message || 'No data');
  const settings = parseSettings((life as any).settings);
  const hidden = new Set(String((perf as any).hidden || '').split(',').map((x) => x.trim()).filter(Boolean));
  const views = new Map<string, number>(((perf as any).views || []).map((v: any) => [v.path, Number(v.v30) || 0]));
  const search = new Map<string, number>(((perf as any).entries || []).map((e: any) => [e.path, Number(e.search) || 0]));
  const pages = livePages((perf as any).pages || [], hidden);

  const checks: PageCheck[] = await pool(pages, 6, async ({ l, kind }) => {
    const tool = !!l.ctaHref;
    const [matching, page] = await Promise.all([
      l.terms.length ? searchTemplates(l.terms, 60).then((r) => r.length) : Promise.resolve(tool ? null : 0),
      openPage(`${SITE_URL}/${l.slug}`),
    ]);
    // What visitors actually see wins; the database count is the fallback.
    const templates = tool && !page.shown ? null : page.shown ?? matching;
    return { slug: l.slug, h1: l.h1, kind, tool, templates, http: page.http, views30: views.get(`/${l.slug}`) || 0, search30: search.get(`/${l.slug}`) || 0 };
  });

  const { decisions, blocked } = decide(checks, ((life as any).status || []) as StatusRow[], settings, (life as any).google_since || null);
  const summary = summarize(decisions, blocked);
  const remove = apply ? decisions.filter((d) => d.remove).map((d) => ({ slug: d.slug, kind: d.kind, reason: d.reason, delete: !!d.del })) : [];
  const rows = decisions.filter((d) => !remove.some((r) => r.slug === d.slug)).map((d) => ({ slug: d.slug, kind: d.kind, status: d.status, reason: d.reason, views30: d.views30, search30: d.search30, templates: d.templates, http: d.http }));
  const { data: res, error } = await supabase.rpc('landing_apply', { p_token: token, p_rows: rows, p_remove: remove, p_summary: summary });
  if (error) throw new Error(error.message);
  return { removed: (res as any)?.removed || 0, deleted: (res as any)?.deleted || 0, checked: decisions.length, blocked, summary, settings };
}
