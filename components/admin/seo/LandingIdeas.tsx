'use client';

// "Page ideas" at the top of Admin → SEO → Landing pages: pages worth adding
// right now (festivals coming up, what visitors search, design types with
// many templates), each with ready text. Approve = published at once;
// Not now = hidden from the list. Approved pages look after themselves:
// no visitors in a month → deleted; festival pages switch off after the day.

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Sparkles, X, CalendarHeart, Search, LayoutTemplate } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { expandList } from '@/lib/templatesData';
import { buildIdeas, Idea } from '@/lib/landingIdeas';
import type { TypeSource } from '@/lib/designTypes';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const ICON = { festival: <CalendarHeart size={14} />, searches: <Search size={14} />, coverage: <LayoutTemplate size={14} /> };
const LABEL = { festival: 'Festival coming', searches: 'People search this', coverage: 'Many templates' };

export function LandingIdeas({ existing, onEdit, onLink, flash }: { existing: { slug: string; h1: string }[]; onEdit: (i: Idea) => void; onLink: (slug: string, url: string) => Promise<void>; flash: (m: string) => void }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [linkFor, setLinkFor] = useState<{ slug: string; url: string } | null>(null);
  const [raw, setRaw] = useState<{ templates: TypeSource[]; searches: { q: string; count: number; results: number }[]; occasions: { name: string; date: string }[] } | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [list, { data: s }, { data: o }, { data: d }] = await Promise.all([
        fetch('/api/public-templates').then((r) => r.json()).catch(() => null),
        supabase.from('site_searches_daily').select('q, count, results').gte('day', since),
        supabase.from('occasions').select('name, occasion_date').eq('active', true).gte('occasion_date', new Date().toISOString().slice(0, 10)).order('occasion_date').limit(40),
        supabase.from('site_settings').select('value').eq('key', 'landing_ideas_dismissed').maybeSingle(),
      ]);
      const rows = list ? expandList(list) : [];
      const searches = new Map<string, { q: string; count: number; results: number }>();
      ((s as any[]) || []).forEach((r) => { const x = searches.get(r.q) || { q: r.q, count: 0, results: r.results }; x.count += r.count; x.results = r.results; searches.set(r.q, x); });
      setDismissed(new Set(String(d?.value || '').split(',').filter(Boolean)));
      setRaw({
        templates: rows.map((t: any) => ({ name: t.name, category: t.category, width: t.width, height: t.height, tags: t.tags, occasion: t.occasion, industry: t.industry, searchKeywords: t.searchKeywords ?? t.search_keywords })),
        searches: Array.from(searches.values()).sort((a, b) => b.count - a.count).slice(0, 60),
        occasions: ((o as any[]) || []).map((x) => ({ name: x.name, date: x.occasion_date })),
      });
    })();
  }, []);

  useEffect(() => {
    if (!raw) return;
    // Heavy-ish (8,000+ templates): give the page a moment to draw first.
    const id = window.setTimeout(() => setIdeas(buildIdeas({ ...raw, existing, dismissed })), 50);
    return () => window.clearTimeout(id);
  }, [raw, existing, dismissed]);

  const shown = useMemo(() => (ideas ? (all ? ideas : ideas.slice(0, 6)) : []), [ideas, all]);

  // No new page: the address opens the gallery with this filter (fast).
  const saveLink = async (i: Idea, url: string) => {
    if (!/^\/templates(\/|\?|$)/.test(url.trim())) return flash('Use a gallery link that starts with /templates, e.g. /templates?kind=brochure');
    setBusy(i.slug);
    await onLink(i.slug, url.trim());
    setBusy(null);
    setLinkFor(null);
    await dismiss(i);
    flash(`/${i.slug} now opens ${url.trim()} — no extra page to build.`);
  };
  const dismiss = async (i: Idea) => {
    const next = new Set(dismissed);
    next.add(i.slug);
    setDismissed(next);
    await supabase.from('site_settings').upsert({ key: 'landing_ideas_dismissed', value: Array.from(next).slice(-300).join(','), updated_at: new Date().toISOString() });
  };

  return (
    <section className={card}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-2xl bg-mt-accentsoft text-mt-accent inline-flex items-center justify-center shrink-0"><Sparkles size={18} /></span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Page ideas for you</h2>
          <p className="text-[13px] text-mt-muted">Suggestions from festivals coming up, what people search, and designs we have lots of. <b>Use gallery link</b> needs no new page: the address opens the templates page already filtered (fastest). <b>Edit &amp; publish</b> opens the ready-written page so you can change it first. Pages with no visitors after a month are removed automatically; festival pages switch off after the festival.</p>
        </div>
      </div>
      {!ideas ? (
        <p className="mt-4 text-[13px] text-mt-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Finding ideas…</p>
      ) : !ideas.length ? (
        <p className="mt-4 text-[13px] text-mt-muted">No new ideas right now — every popular search already has a page.</p>
      ) : (
        <>
          <ul className="mt-4 grid gap-2.5">
            {shown.map((i) => (
              <li key={i.slug} className="rounded-2xl border border-mt-border p-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-mt-accent inline-flex items-center gap-1">{ICON[i.source]} {LABEL[i.source]}</p>
                    <p className="text-[15px] font-semibold text-mt-ink">{i.h1}</p>
                    <p className="text-[12px] text-mt-muted">/{i.slug} · {i.why}</p>
                  </div>
                  <button onClick={() => setOpen(open === i.slug ? null : i.slug)} className={`${btn} text-mt-muted`}>Preview <ChevronDown size={14} className={open === i.slug ? 'rotate-180' : ''} /></button>
                  <button onClick={() => dismiss(i)} className={`${btn} text-mt-muted`}><X size={14} /> Not now</button>
                  <button onClick={() => onEdit(i)} className={`${btn} border border-mt-border text-mt-ink`}>Edit &amp; publish</button>
                  <button onClick={() => setLinkFor(linkFor?.slug === i.slug ? null : { slug: i.slug, url: i.link })} className={`${btn} bg-emerald-600 text-white`}><Check size={14} /> Use gallery link</button>
                </div>
                {linkFor?.slug === i.slug && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-mt-surface2 p-3">
                    <span className="text-[12px] text-mt-muted">/{i.slug} opens</span>
                    <input value={linkFor.url} onChange={(e) => setLinkFor({ slug: i.slug, url: e.target.value })} className="flex-1 min-w-[220px] h-9 rounded-lg border border-mt-input-border bg-mt-surface px-3 text-[13px]" />
                    <a href={linkFor.url} target="_blank" rel="noreferrer" className="text-[12px] text-[#3B82C4] hover:underline">Check it</a>
                    <button disabled={busy === i.slug} onClick={() => saveLink(i, linkFor.url)} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy === i.slug ? <Loader2 size={14} className="animate-spin" /> : null} Save</button>
                  </div>
                )}
                {open === i.slug && (
                  <div className="mt-3 rounded-xl bg-mt-surface2 p-3 text-[13px] space-y-2">
                    <div>
                      <p className="text-[12px] text-[#4D5156]">magicaltouchdesign.com › {i.slug}</p>
                      <p className="text-[17px] text-[#1A0DAB] leading-snug">{i.title}</p>
                      <p className="text-[13px] text-[#4D5156]">{i.description}</p>
                    </div>
                    <p className="text-mt-muted whitespace-pre-line">{i.intro}</p>
                    <p className="text-[12px] text-mt-faint">Shows templates matching: {i.terms.join(', ').replace(/\+/g, ' + ')} · {i.faqs.length} questions answered</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {ideas.length > 6 && <button onClick={() => setAll((v) => !v)} className="mt-3 text-[13px] font-semibold text-[#3B82C4] hover:underline">{all ? 'Show fewer' : `Show all ${ideas.length} ideas`}</button>}
        </>
      )}
    </section>
  );
}
