'use client';

// Admin → SEO → Keyword ideas. Type a topic; get what people really search
// for (autocomplete from Google, Bing and DuckDuckGo — free, no key), with:
//  · how many engines suggest it (more = more searched)
//  · whether we already have a page for it
//  · how many of our templates match (only build pages that can show some)
// One tap drafts a complete landing page to review and publish.

import { useState } from 'react';
import { ExternalLink, Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { draftLanding, LandingDraft } from '@/lib/landingDraft';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

interface Idea { phrase: string; engines: string[]; strength: number; page: { slug: string; h1: string } | null; templates: number }
const SEEDS = ['flyer', 'invitation', 'poster', 'certificate', 'menu', 'eid', 'wedding card', 'instagram post', 'business card', 'resume', 'birthday', 'logo'];
const COUNTRIES: [string, string][] = [['ae', 'UAE'], ['in', 'India'], ['sa', 'Saudi Arabia'], ['us', 'USA'], ['gb', 'UK'], ['ca', 'Canada'], ['au', 'Australia']];

export function KeywordIdeas({ onDraft, onKeyword }: { onDraft: (d: LandingDraft) => void; onKeyword: (k: string) => Promise<void> }) {
  const [q, setQ] = useState('');
  const [gl, setGl] = useState('ae');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [only, setOnly] = useState<'all' | 'missing'>('missing');
  const [added, setAdded] = useState<Set<string>>(new Set());

  const go = async (seed = q) => {
    if (seed.trim().length < 2) return;
    setQ(seed); setBusy(true); setErr(null);
    try { setIdeas((await apiFetch<{ ideas: Idea[] }>(`/api/admin/keyword-ideas?q=${encodeURIComponent(seed.trim())}&gl=${gl}`)).ideas); }
    catch (e: any) { setErr(e?.message || 'Could not get ideas'); }
    setBusy(false);
  };
  const list = (ideas || []).filter((i) => only === 'all' || !i.page);

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Sparkles size={19} /> Keyword ideas</h2>
      <p className="mt-1 text-[13px] text-mt-muted">What people actually type into Google, Bing and DuckDuckGo. Build pages for phrases with <b>no page yet</b> and <b>8+ matching templates</b> — those are your quickest wins.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="A topic, e.g. wedding invitation" className="w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface pl-9 pr-3 text-sm" /></div>
        <select value={gl} onChange={(e) => setGl(e.target.value)} aria-label="Country" className="h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm">{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <button onClick={() => go()} disabled={busy || q.trim().length < 2} className={`${btn} h-10 bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Find ideas</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{SEEDS.map((s) => <button key={s} onClick={() => go(s)} className="h-7 px-2.5 rounded-full border border-mt-border text-[12px] text-mt-muted hover:text-mt-ink">{s}</button>)}</div>
      {err && <p className="mt-3 text-[13px] text-rose-600">{err}</p>}
      {ideas && (
        <>
          <div className="mt-5 flex items-center gap-2">
            <p className="flex-1 text-[13px] text-mt-muted">{ideas.length} ideas · {ideas.filter((i) => !i.page).length} without a page</p>
            {(['missing', 'all'] as const).map((id) => <button key={id} onClick={() => setOnly(id)} className={`h-8 px-3 rounded-full text-[12px] border ${only === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{id === 'missing' ? 'No page yet' : 'All'}</button>)}
          </div>
          <ul className="mt-2 divide-y divide-mt-border">
            {list.map((i) => {
              const good = !i.page && i.templates >= 8;
              return (
                <li key={i.phrase} className="py-2.5 flex flex-wrap items-center gap-3">
                  <span className="flex-1 min-w-[200px]">
                    <span className="text-[14px] font-medium text-mt-ink">{i.phrase}</span>
                    <span className="ml-2 inline-flex gap-0.5 align-middle" aria-label={`Suggested by ${i.strength} of 3 search engines`} title={`Suggested by: ${i.engines.join(', ')}`}>{[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-3 rounded-full ${n <= i.strength ? 'bg-emerald-500' : 'bg-mt-border'}`} />)}</span>
                    <span className="block text-[12px] text-mt-faint">{i.templates >= 60 ? '60+' : i.templates} matching templates{i.page ? ` · page: /${i.page.slug}` : ''}</span>
                  </span>
                  {i.page ? <a href={`/${i.page.slug}`} target="_blank" className="text-[12px] text-[#3B82C4] inline-flex items-center gap-1">Has a page <ExternalLink size={12} /></a>
                    : <button onClick={() => onDraft(draftLanding(i.phrase, i.templates))} className={`${btn} h-8 ${good ? 'bg-emerald-600 text-white' : 'border border-mt-border'}`} title={i.templates < 8 ? 'Few templates match — the page may look empty' : ''}><Plus size={13} /> Create page</button>}
                  <button disabled={added.has(i.phrase)} onClick={() => onKeyword(i.phrase).then(() => setAdded((s) => new Set(s).add(i.phrase)))} className="text-[12px] text-mt-muted hover:text-mt-ink disabled:text-emerald-600">{added.has(i.phrase) ? 'Tracked ✓' : '+ Track'}</button>
                </li>
              );
            })}
            {!list.length && <li className="py-4 text-[13px] text-mt-muted">Every idea already has a page — try another topic.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
