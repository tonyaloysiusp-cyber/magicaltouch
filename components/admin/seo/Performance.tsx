'use client';

// Admin → SEO → Performance: which pages really work, and what to do next.
//  · Best performing pages (any page), rising pages, top template pages
//  · Every landing page ranked by visitors, with its score
//  · Add: searches with no page yet (visitor searches, tracked keywords,
//    festivals coming up) — publish in one tap or edit first
//  · Update: where a little work pays most (season starting, weak score)
//  · Switch off: empty or duplicate pages
//  · Autopilot: every Monday, does the safe fixes by itself and reports to
//    the admin inbox and daily e-mail; "Apply safe fixes now" does it today

import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, ExternalLink, Loader2, Minus, Pencil, Plus, RefreshCw, Rocket, Search, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { supabase } from '@/lib/supabase';
import type { Analysis, TopRow } from '@/lib/seoPerformance';
import type { LandingDraft } from '@/lib/landingDraft';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const TYPE: Record<TopRow['type'], string> = { home: 'Home', landing: 'Landing page', template: 'Template', tool: 'Tool', other: 'Page' };

function Trend({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="text-mt-faint">—</span>;
  if (!before) return <span className="text-emerald-600 text-[12px] font-semibold">new</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-mt-muted inline-flex items-center"><Minus size={13} />0%</span>;
  return pct > 0 ? <span className="text-emerald-600 inline-flex items-center text-[12px] font-semibold"><ArrowUpRight size={14} />{pct}%</span> : <span className="text-rose-600 inline-flex items-center text-[12px] font-semibold"><ArrowDownRight size={14} />{Math.abs(pct)}%</span>;
}

export function Performance({ onEdit, onDraft, flash }: { onEdit: (slug: string) => void; onDraft: (d: LandingDraft) => void; flash: (m: string) => void }) {
  const [a, setA] = useState<Analysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try { setA(await apiFetch<Analysis>('/api/admin/seo-performance')); } catch (e: any) { setErr(e?.message || 'Could not load'); }
  };
  useEffect(() => { load(); }, []);

  const one = async (key: string, actions: any[], done: string) => {
    setBusy(key);
    const { error } = await supabase.rpc('seo_apply', { p_token: null, p_actions: actions, p_summary: null });
    setBusy(null);
    if (error) return flash(error.message);
    flash(done);
    load();
  };
  const publish = (d: LandingDraft) => one(`add-${d.slug}`, [{ type: 'publish', page: { slug: d.slug, title: d.title, h1: d.h1, description: d.description, intro: d.intro, thing: d.thing, terms: d.terms.split(',').map((t) => t.trim()).filter(Boolean), faqs: d.faqs.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]) } }], `Published /${d.slug} — it’s in the sitemap within an hour.`);
  const hide = (slug: string) => one(`rm-${slug}`, [{ type: 'hide', slug }], `/${slug} switched off. Switch it back on any time in Landing pages.`);
  const applyAll = async () => {
    setBusy('apply');
    try {
      const r = await apiFetch<{ published: number; hidden: number; sent: number }>('/api/admin/seo-performance', { method: 'POST', body: JSON.stringify({ action: 'apply' }) });
      flash(`Done: ${r.published} new page${r.published === 1 ? '' : 's'} published, ${r.hidden} switched off, ${r.sent} sent to search engines.`);
      load();
    } catch (e: any) { flash(e?.message || 'Could not apply'); }
    setBusy(null);
  };
  const toggle = async () => {
    if (!a) return;
    setBusy('auto');
    try {
      await apiFetch('/api/admin/seo-performance', { method: 'POST', body: JSON.stringify({ action: 'autopilot', on: !a.autopilot.on }) });
      setA({ ...a, autopilot: { ...a.autopilot, on: !a.autopilot.on } });
      flash(!a.autopilot.on ? 'Autopilot on — it runs every Monday morning and reports in your inbox.' : 'Autopilot off.');
    } catch (e: any) { flash(e?.message || 'Could not change'); }
    setBusy(null);
  };

  if (!a) return <section className={card}>{err ? <p className="text-sm text-rose-600">{err} <button onClick={load} className="underline ml-2">Try again</button></p> : <p className="text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Analysing every page…</p>}</section>;
  const autoAdds = a.add.filter((i) => i.auto).length, autoRemoves = a.remove.filter((r) => r.auto).length;

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ['Page views (30 days)', a.totals.v30.toLocaleString(), <Trend key="t" now={a.totals.v30} before={a.totals.vprev} />],
          ['Visitors from search', a.totals.fromSearch.toLocaleString(), <span key="s" className="text-[12px] text-mt-faint">of {a.totals.entries} visitors</span>],
          ['Landing page views', a.totals.landingViews.toLocaleString(), <span key="l" className="text-[12px] text-mt-faint">{a.pages.length} live pages</span>],
          ['Ready to do', `${autoAdds + autoRemoves + a.update.filter((u) => u.urgent).length}`, <span key="r" className="text-[12px] text-mt-faint">{autoAdds} add · {a.update.filter((u) => u.urgent).length} update · {autoRemoves} off</span>],
        ] as [string, string, React.ReactNode][]).map(([k, v, sub]) => (
          <div key={k} className="rounded-3xl border border-mt-border bg-mt-surface p-4"><p className="text-[12px] text-mt-muted">{k}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p><div className="mt-0.5">{sub}</div></div>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <Bot size={22} className={a.autopilot.on ? 'text-emerald-600' : 'text-mt-muted'} />
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-lg font-semibold">SEO autopilot {a.autopilot.on ? <span className="text-emerald-600">· on</span> : <span className="text-mt-muted">· off</span>}</h2>
            <p className="text-[13px] text-mt-muted">Every Monday morning: publishes up to 3 pages for strong demand (only where 8+ templates match), switches off pages that show no templates, sends new and in-season pages to search engines, and posts a report to your inbox and daily e-mail. Everything it does can be undone in Landing pages.</p>
            {a.autopilot.lastRun && <p className="mt-1 text-[12px] text-mt-faint">Last run {new Date(a.autopilot.lastRun.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}: {a.autopilot.lastRun.published} published, {a.autopilot.lastRun.hidden} switched off.</p>}
          </div>
          <button onClick={toggle} disabled={busy === 'auto'} className={`${btn} ${a.autopilot.on ? 'bg-emerald-600 text-white' : 'border border-mt-border'}`}>{a.autopilot.on ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} {a.autopilot.on ? 'On' : 'Turn on'}</button>
          <button onClick={applyAll} disabled={!!busy || autoAdds + autoRemoves === 0} className={`${btn} bg-mt-primary text-mt-onprimary`} title={autoAdds + autoRemoves === 0 ? 'Nothing safe to do automatically right now' : ''}>{busy === 'apply' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Apply safe fixes now</button>
          <button onClick={load} className={`${btn} border border-mt-border`} aria-label="Refresh"><RefreshCw size={14} /></button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold">Best performing pages</h2>
          <p className="text-[13px] text-mt-muted">Views in the last 30 days against the 30 before, and how many visitors arrived on each page from Google, Bing and other search engines.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[460px]">
              <thead className="text-left text-mt-muted"><tr><th className="py-2 font-medium">Page</th><th className="font-medium text-right">Views</th><th className="font-medium text-right">Trend</th><th className="font-medium text-right">From search</th></tr></thead>
              <tbody>
                {a.top.map((r) => (
                  <tr key={r.path} className="border-t border-mt-border">
                    <td className="py-2 pr-3"><a href={r.path} target="_blank" className="font-medium text-mt-ink hover:underline">{r.label}</a><span className="ml-2 text-[11px] text-mt-faint">{TYPE[r.type]}</span></td>
                    <td className="text-right tabular-nums">{r.v30}</td><td className="text-right"><Trend now={r.v30} before={r.vprev} /></td><td className="text-right tabular-nums">{r.fromSearch || <span className="text-mt-faint">0</span>}</td>
                  </tr>
                ))}
                {!a.top.length && <tr><td colSpan={4} className="py-4 text-mt-muted">No visits recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
          {a.rising.length > 0 && <div className="mt-4"><p className="text-[12px] font-semibold text-mt-muted">Rising</p><div className="mt-1.5 flex flex-wrap gap-1.5">{a.rising.map((r) => <a key={r.path} href={r.path} target="_blank" className="px-2.5 py-1 rounded-full border border-emerald-600/30 text-[12px] text-emerald-700 dark:text-emerald-400">{r.label} +{r.v30 - r.vprev}</a>)}</div></div>}
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Most viewed templates</h2>
          <p className="text-[13px] text-mt-muted">Make more designs like these — and pin them on Pinterest and Instagram.</p>
          <ul className="mt-3 divide-y divide-mt-border text-[13px]">
            {a.topTemplates.map((r) => <li key={r.path} className="py-2 flex items-center gap-3"><a href={r.path} target="_blank" className="flex-1 min-w-0 truncate hover:underline">{r.label}</a><span className="tabular-nums text-mt-muted">{r.v30} views</span>{r.fromSearch > 0 && <span className="text-[11px] text-emerald-600">{r.fromSearch} from search</span>}</li>)}
            {!a.topTemplates.length && <li className="py-4 text-mt-muted">No template views yet.</li>}
          </ul>
        </section>
      </div>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2"><Plus size={19} /><h2 className="text-lg font-semibold flex-1">Add — pages people are looking for</h2></div>
        <p className="text-[13px] text-mt-muted">From what visitors search for on the site, keywords you track, and festivals coming up. <b>Auto</b> means it’s safe to publish as is (strong demand and 8+ matching templates).</p>
        <ul className="mt-3 divide-y divide-mt-border">
          {a.add.map((i) => (
            <li key={i.phrase} className="py-3 flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-[220px]">
                <span className="text-[14px] font-medium text-mt-ink">{i.draft.h1}</span>{i.auto && <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Auto</span>}
                <span className="block text-[12px] text-mt-muted">{i.why} · {i.templates >= 60 ? '60+' : i.templates} templates · /{i.draft.slug}</span>
              </span>
              <button onClick={() => onDraft(i.draft)} className={`${btn} border border-mt-border`}><Pencil size={13} /> Edit first</button>
              <button onClick={() => publish(i.draft)} disabled={busy === `add-${i.draft.slug}` || i.templates < 3} className={`${btn} ${i.auto ? 'bg-emerald-600 text-white' : 'border border-mt-border'}`}>{busy === `add-${i.draft.slug}` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Publish</button>
            </li>
          ))}
          {!a.add.length && <li className="py-4 text-[13px] text-mt-muted">Nothing to add right now — try Keyword ideas for more.</li>}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <div className="flex items-center gap-2"><RefreshCw size={18} /><h2 className="text-lg font-semibold">Update — quickest wins</h2></div>
          <ul className="mt-3 divide-y divide-mt-border">
            {a.update.slice(0, 12).map((u) => (
              <li key={u.slug} className="py-3 flex items-start gap-3">
                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${u.urgent ? 'bg-rose-600' : 'bg-amber-500'}`} />
                <span className="flex-1 min-w-0"><span className="text-[14px] font-medium">{u.h1}</span><span className="block text-[12px] text-mt-muted">{u.why} — {u.action}</span></span>
                <button onClick={() => onEdit(u.slug)} className={`${btn} border border-mt-border shrink-0`}><Pencil size={13} /> Fix</button>
              </li>
            ))}
            {!a.update.length && <li className="py-4 text-[13px] text-emerald-600 inline-flex items-center gap-2"><CheckCircle2 size={15} /> Every page is in good shape.</li>}
          </ul>
        </section>
        <section className={card}>
          <div className="flex items-center gap-2"><XCircle size={18} /><h2 className="text-lg font-semibold">Switch off — pages that can’t help</h2></div>
          <p className="text-[13px] text-mt-muted">Switching off hides a page and removes it from the sitemap. It can be switched back on.</p>
          <ul className="mt-3 divide-y divide-mt-border">
            {a.remove.map((r) => (
              <li key={r.slug} className="py-3 flex items-start gap-3">
                <span className="flex-1 min-w-0"><span className="text-[14px] font-medium">{r.h1}</span><span className="block text-[12px] text-mt-muted">{r.why}</span></span>
                <a href={`/${r.slug}`} target="_blank" className={`${btn} border border-mt-border shrink-0`}><ExternalLink size={13} /></a>
                <button onClick={() => hide(r.slug)} disabled={busy === `rm-${r.slug}`} className={`${btn} text-rose-600 border border-rose-600/30 shrink-0`}>Switch off</button>
              </li>
            ))}
            {!a.remove.length && <li className="py-4 text-[13px] text-emerald-600 inline-flex items-center gap-2"><CheckCircle2 size={15} /> Nothing to switch off.</li>}
          </ul>
        </section>
      </div>

      <section className={card}>
        <div className="flex items-center gap-2"><Search size={18} /><h2 className="text-lg font-semibold flex-1">Landing pages ranked by visitors</h2></div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead className="text-left text-mt-muted"><tr><th className="py-2 font-medium">Page</th><th className="font-medium text-right">Views</th><th className="font-medium text-right">Trend</th><th className="font-medium text-right">From search</th><th className="font-medium text-right">Score</th><th /></tr></thead>
            <tbody>
              {a.pages.map((p) => (
                <tr key={p.slug} className="border-t border-mt-border">
                  <td className="py-2 pr-3"><span className="font-medium">{p.h1}</span><span className="block text-[11px] text-mt-faint">/{p.slug}</span></td>
                  <td className="text-right tabular-nums">{p.v30}</td><td className="text-right"><Trend now={p.v30} before={p.vprev} /></td><td className="text-right tabular-nums">{p.fromSearch}</td>
                  <td className={`text-right tabular-nums font-semibold ${p.score >= 80 ? 'text-emerald-600' : p.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{p.score}</td>
                  <td className="text-right"><button onClick={() => onEdit(p.slug)} className="text-[12px] text-mt-muted hover:text-mt-ink pl-3">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
