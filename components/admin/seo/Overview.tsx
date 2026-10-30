'use client';

// Admin → SEO → Overview: is SEO working, and what to fix next.
//  · Setup checks that decide whether Google can find the site at all
//  · Visitors in the last 30 days and how many came from search engines
//  · Every landing page scored 0–100 as Working / Needs work / Not working,
//    with each problem and how to fix it, plus Ads & posts for each page

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Loader2, Megaphone, Pencil, RefreshCw, Search, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import type { AuditRow } from '@/app/api/admin/seo-audit/route';
import { AdsDialog } from './AdsDialog';

const SITE_HOST = 'www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

interface Audit {
  days: number;
  setup: { id: string; ok: boolean; title: string; why: string; fix: string }[];
  traffic: { visitors: number; searchVisitors: number; sources: { host: string; n: number }[] };
  rows: AuditRow[];
}

const STATUS = {
  working: { label: 'Working', cls: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400' },
  'needs-work': { label: 'Needs work', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  'not-working': { label: 'Not working', cls: 'bg-rose-600/10 text-rose-700 dark:text-rose-400' },
} as const;

function ScoreRing({ v }: { v: number }) {
  const c = v >= 80 ? '#059669' : v >= 50 ? '#D97706' : '#E11D48';
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center" aria-label={`Score ${v} of 100`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="3" /><circle cx="18" cy="18" r="15.5" fill="none" stroke={c} strokeWidth="3" strokeDasharray={`${(v / 100) * 97.4} 97.4`} strokeLinecap="round" /></svg>
      <span className="text-[12px] font-semibold tabular-nums">{v}</span>
    </span>
  );
}

export function Overview({ onEdit, onTab }: { onEdit: (slug: string) => void; onTab: (t: 'engines' | 'promo' | 'ideas') => void }) {
  const [a, setA] = useState<Audit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState<'all' | 'working' | 'needs-work' | 'not-working'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [ads, setAds] = useState<AuditRow | null>(null);

  const load = async () => {
    setBusy(true); setErr(null);
    try { setA(await apiFetch<Audit>('/api/admin/seo-audit')); } catch (e: any) { setErr(e?.message || 'Could not run the check'); }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const r = a?.rows || [];
    return { all: r.length, working: r.filter((x) => x.status === 'working').length, 'needs-work': r.filter((x) => x.status === 'needs-work').length, 'not-working': r.filter((x) => x.status === 'not-working').length };
  }, [a]);
  const avg = a?.rows.length ? Math.round(a.rows.reduce((s, r) => s + r.score, 0) / a.rows.length) : 0;
  const list = (a?.rows || []).filter((r) => (show === 'all' || r.status === show) && (!q.trim() || `${r.slug} ${r.h1}`.toLowerCase().includes(q.trim().toLowerCase())));
  const setupDone = a ? a.setup.filter((s) => s.ok).length : 0;

  if (!a) return <section className={card}>{err ? <p className="text-rose-600 text-sm">{err} <button onClick={load} className="underline ml-2">Try again</button></p> : <p className="text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Checking every page… (about 10 seconds)</p>}</section>;

  return (
    <>
      {/* headline numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['SEO score', `${avg}/100`, avg >= 80 ? 'text-emerald-600' : avg >= 50 ? 'text-amber-600' : 'text-rose-600', 'Average of all landing pages'],
          ['Setup', `${setupDone}/${a.setup.length}`, setupDone === a.setup.length ? 'text-emerald-600' : 'text-rose-600', 'Things Google needs to find you'],
          [`Visitors (${a.days} days)`, a.traffic.visitors.toLocaleString(), 'text-mt-ink', 'Unique visitors'],
          ['From Google & Bing', a.traffic.searchVisitors.toLocaleString(), a.traffic.searchVisitors ? 'text-emerald-600' : 'text-rose-600', a.traffic.visitors ? `${Math.round((100 * a.traffic.searchVisitors) / a.traffic.visitors)}% of visitors` : '—'],
        ].map(([k, v, c, sub]) => (
          <div key={k} className="rounded-3xl border border-mt-border bg-mt-surface p-4">
            <p className="text-[12px] text-mt-muted">{k}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${c}`}>{v}</p>
            <p className="text-[12px] text-mt-faint">{sub}</p>
          </div>
        ))}
      </section>

      {/* setup */}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold flex-1">Can Google find the site? <span className="text-mt-muted font-normal">{setupDone}/{a.setup.length} done</span></h2>
          <button onClick={load} disabled={busy} className={`${btn} border border-mt-border`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check again</button>
        </div>
        <ul className="mt-4 divide-y divide-mt-border">
          {a.setup.map((s) => (
            <li key={s.id} className="py-3 flex gap-3 items-start">
              {s.ok ? <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" /> : <XCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-medium ${s.ok ? 'text-mt-muted' : 'text-mt-ink'}`}>{s.title}</p>
                {!s.ok && <p className="text-[13px] text-mt-muted"><span className="text-mt-ink">Why it matters:</span> {s.why}<br /><span className="text-mt-ink">How to fix:</span> {s.fix}</p>}
              </div>
              {!s.ok && (s.id === 'google' || s.id === 'bing' || s.id === 'indexnow') && <button onClick={() => onTab('engines')} className={`${btn} border border-mt-border shrink-0`}>Fix</button>}
              {!s.ok && s.id === 'listings' && <button onClick={() => onTab('promo')} className={`${btn} border border-mt-border shrink-0`}>Fix</button>}
            </li>
          ))}
        </ul>
        {a.traffic.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-mt-border">
            <p className="text-[12px] text-mt-muted mb-2">Where visitors came from</p>
            <ul className="flex flex-wrap gap-2 text-[12px]">{a.traffic.sources.map((s) => <li key={s.host} className="px-3 py-1 rounded-full border border-mt-border"><b>{s.host}</b> <span className="text-mt-muted tabular-nums">{s.n}</span></li>)}</ul>
          </div>
        )}
      </section>

      {/* pages */}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold flex-1">Landing pages — what’s working</h2>
          <button onClick={() => onTab('ideas')} className={`${btn} bg-mt-primary text-mt-onprimary`}><Search size={14} /> Find new keywords</button>
        </div>
        <p className="mt-1 text-[13px] text-mt-muted">Scored on title, description, length, templates shown, questions and links. <b>Working</b> = score 80+ and visitors arrive. Worst first — fix from the top.</p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {(['all', 'not-working', 'needs-work', 'working'] as const).map((id) => (
            <button key={id} onClick={() => setShow(id)} className={`h-8 px-3 rounded-full text-[12px] border ${show === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{id === 'all' ? 'All' : STATUS[id].label} {counts[id]}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" className="h-8 flex-1 min-w-[160px] rounded-full border border-mt-input-border bg-mt-surface px-3 text-[13px]" />
        </div>
        <ul className="mt-3 divide-y divide-mt-border">
          {list.map((r) => {
            const isOpen = open === r.slug;
            return (
              <li key={r.slug} className="py-3">
                <button onClick={() => setOpen(isOpen ? null : r.slug)} className="w-full flex items-center gap-3 text-left" aria-expanded={isOpen}>
                  <ScoreRing v={r.score} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-mt-ink truncate">{r.h1}</span>
                    <span className="block text-[12px] text-mt-faint truncate">/{r.slug} · {r.templates === null ? 'tool page' : `${r.templates >= 60 ? '60+' : r.templates} templates`} · {r.words} words · {r.views30} views · {r.fromSearch30} from search</span>
                  </span>
                  <span className={`hidden sm:inline text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  <ChevronDown size={16} className={`text-mt-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-3 ml-[52px] flex flex-col gap-3">
                    <span className={`sm:hidden self-start text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                    {r.issues.length ? (
                      <ul className="flex flex-col gap-2">
                        {r.issues.map((i, k) => (
                          <li key={k} className="flex gap-2 text-[13px]">
                            {i.level === 'bad' ? <XCircle size={15} className="text-rose-600 mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />}
                            <span><span className="text-mt-ink">{i.text}</span> <span className="text-mt-muted">{i.fix}</span></span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[13px] text-emerald-600 inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> Nothing to fix on this page.</p>}
                    <div className="rounded-2xl border border-mt-border p-3 max-w-xl">
                      <p className="text-[12px] text-[#4D5156] dark:text-mt-faint">{SITE_HOST} › {r.slug}</p>
                      <p className="text-[16px] text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug truncate">{r.title}</p>
                      <p className="text-[13px] text-[#4D5156] dark:text-mt-muted line-clamp-2">{r.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onEdit(r.slug)} className={`${btn} bg-mt-primary text-mt-onprimary`}><Pencil size={14} /> Fix this page</button>
                      <button onClick={() => setAds(r)} className={`${btn} border border-mt-border`}><Megaphone size={14} /> Ads & posts</button>
                      {r.live && <a href={`/${r.slug}`} target="_blank" className={`${btn} border border-mt-border`}><ExternalLink size={14} /> View</a>}
                      <a href={`https://www.google.com/search?q=site:${SITE_HOST}/${r.slug}`} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}><Search size={14} /> Is it on Google?</a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!list.length && <li className="py-4 text-[13px] text-mt-muted">No pages here.</li>}
        </ul>
      </section>
      {ads && <AdsDialog row={ads} onClose={() => setAds(null)} />}
    </>
  );
}
