'use client';

// Admin → SEO → Page health: which landing pages work and which don't, with
// automatic clean-up.
//  · Every live page is checked each morning: does it load, does it show
//    templates, do visitors (and Google / Bing visitors) arrive?
//  · Working / Warming up (new pages are watched for the monitoring window
//    first) / Not working / Removed — with the reason for each
//  · Auto-cleanup DELETES broken pages (page error / no templates) and
//    switches off pages with no visitors after the watch period;
//    Restore brings switched-off pages back and restarts their monitoring

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Trash2, ExternalLink, Loader2, RefreshCw, RotateCcw, ShieldCheck, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
type St = 'working' | 'warming' | 'not-working' | 'removed' | 'deleted';
interface Row { slug: string; h1: string; kind: string; first_seen: string; status: St; reason: string | null; views30: number; search30: number; templates: number | null; http: number | null; checked_at: string | null; removed_at: string | null }
interface Data { status: Row[]; settings: string | { on: boolean; days: number }; googleSince: string | null; last: { at: string; removed: number; checked: number; summary: string | null } | null }

const ORDER: St[] = ['not-working', 'warming', 'working', 'removed', 'deleted'];
const broken = (r: { http: number | null; templates: number | null; reason: string | null }) => (r.http !== null && r.http !== 200) || r.templates === 0;

const META: Record<St, { label: string; cls: string; icon: JSX.Element }> = {
  working: { label: 'Working', cls: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400', icon: <CheckCircle2 size={14} /> },
  warming: { label: 'Warming up', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-400', icon: <Clock size={14} /> },
  'not-working': { label: 'Not working', cls: 'bg-rose-600/10 text-rose-700 dark:text-rose-400', icon: <XCircle size={14} /> },
  removed: { label: 'Switched off', cls: 'bg-mt-surface2 text-mt-muted', icon: <XCircle size={14} /> },
  deleted: { label: 'Deleted', cls: 'bg-rose-950/10 text-rose-900 dark:text-rose-300', icon: <Trash2 size={14} /> },
};

export function PageHealth({ flash, onTab }: { flash: (m: string) => void; onTab: (t: 'engines') => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [show, setShow] = useState<St | 'all'>('all');

  const load = async () => { try { setD(await apiFetch<Data>('/api/admin/landing-health')); } catch (e: any) { flash(e?.message || 'Could not load'); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const settings = (() => { try { const s = typeof d?.settings === 'string' ? JSON.parse(d.settings) : d?.settings; return { on: s?.on !== false, days: Number(s?.days) || 14 }; } catch { return { on: true, days: 14 }; } })();

  const post = async (key: string, body: object, done: (r: any) => string) => {
    setBusy(key);
    try { const r = await apiFetch('/api/admin/landing-health', { method: 'POST', body: JSON.stringify(body) }); flash(done(r)); await load(); } catch (e: any) { flash(e?.message || 'That didn’t work'); }
    setBusy(null);
  };

  if (!d) return <section className={card}><p className="text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p></section>;
  const rows = [...d.status].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.views30 - a.views30);
  const count = (s: St) => d.status.filter((r) => r.status === s).length;
  const list = rows.filter((r) => show === 'all' || r.status === show);
  const never = !d.status.length;

  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck size={22} className={settings.on ? 'text-emerald-600' : 'text-mt-muted'} />
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-lg font-semibold">Automatic page check {settings.on ? <span className="text-emerald-600">· clean-up on</span> : <span className="text-mt-muted">· report only</span>}</h2>
            <p className="text-[13px] text-mt-muted">Every morning each landing page is opened and checked. Broken pages (page error or no templates) are <b>deleted</b> straight away. New pages are watched for <b>{settings.days} days</b>, then switched off if nobody visits — those can be restored below.</p>
            {d.last && <p className="mt-1 text-[12px] text-mt-faint">Last check {new Date(d.last.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}: {d.last.checked} pages, {d.last.removed} removed.</p>}
          </div>
          <label className="text-[12px] text-mt-muted inline-flex items-center gap-2">Watch new pages
            <select value={settings.days} onChange={(e) => post('days', { action: 'settings', on: settings.on, days: Number(e.target.value) }, () => `New pages are now watched for ${e.target.value} days.`)} className="h-9 rounded-xl border border-mt-input-border bg-mt-surface px-2 text-[13px]">
              {[7, 14, 21, 30, 45, 60].map((n) => <option key={n} value={n}>{n} days</option>)}
            </select>
          </label>
          <button onClick={() => post('toggle', { action: 'settings', on: !settings.on, days: settings.days }, () => (!settings.on ? 'Auto clean-up on.' : 'Auto clean-up off — pages are only reported.'))} disabled={!!busy} className={`${btn} ${settings.on ? 'bg-emerald-600 text-white' : 'border border-mt-border'}`}>{settings.on ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Clean-up {settings.on ? 'on' : 'off'}</button>
          <button onClick={() => post('check', { action: 'check' }, (r) => `Checked ${r.checked} pages — ${r.deleted || 0} deleted, ${(r.removed || 0) - (r.deleted || 0)} switched off.${r.blocked ? ` ${r.blocked}` : ''}`)} disabled={!!busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy === 'check' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {busy === 'check' ? 'Checking every page…' : 'Check now'}</button>
        </div>
        {!d.googleSince && (
          <div className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-300 flex flex-wrap items-center gap-3">
            <span className="flex-1 min-w-[220px]"><b>Waiting for Google.</b> Pages with no visitors aren’t removed until Google Search Console is verified — before that Google can’t send anyone, so “no visitors” says nothing about the page. Broken pages are still deleted.</span>
            <button onClick={() => onTab('engines')} className={`${btn} border border-amber-600/40`}>Verify Google</button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['working', 'warming', 'not-working', 'removed', 'deleted'] as St[]).map((s) => (
          <button key={s} onClick={() => setShow(show === s ? 'all' : s)} className={`text-left rounded-3xl border bg-mt-surface p-4 ${show === s ? 'border-mt-ink' : 'border-mt-border'}`}>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${META[s].cls}`}>{META[s].icon}{META[s].label}</span>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{count(s)}</p>
          </button>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold flex-1">Every landing page</h2>
          {show !== 'all' && <button onClick={() => setShow('all')} className="text-[12px] text-mt-muted hover:text-mt-ink">Show all</button>}
        </div>
        {never ? (
          <p className="mt-3 text-[13px] text-mt-muted">Not checked yet — press <b>Check now</b> (takes about a minute).</p>
        ) : (
          <ul className="mt-3 divide-y divide-mt-border">
            {list.map((r) => (
              <li key={r.slug} className="py-3 flex flex-wrap items-center gap-3">
                <span className={`shrink-0 w-[118px] justify-center inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${META[r.status].cls}`}>{META[r.status].icon}{META[r.status].label}</span>
                <span className="flex-1 min-w-[220px]">
                  <span className="text-[14px] font-medium text-mt-ink">{r.h1}</span>
                  <span className="block text-[12px] text-mt-muted">{r.reason}</span>
                  <span className="block text-[11px] text-mt-faint">/{r.slug} · {r.views30} views · {r.search30} from search{r.templates !== null ? ` · ${r.templates >= 60 ? '60+' : r.templates} templates` : ''}{(r.status === 'removed' || r.status === 'deleted') && r.removed_at ? ` · ${r.status === 'deleted' ? 'deleted' : 'switched off'} ${new Date(r.removed_at).toLocaleDateString('en-GB')}` : ` · since ${new Date(`${r.first_seen}T00:00:00`).toLocaleDateString('en-GB')}`}</span>
                </span>
                {r.status === 'removed' ? (
                  <button onClick={() => post(`rs-${r.slug}`, { action: 'restore', slug: r.slug }, () => `/${r.slug} is back — monitoring again.`)} disabled={!!busy} className={`${btn} border border-mt-border`}><RotateCcw size={13} /> Restore</button>
                ) : r.status === 'deleted' ? null : (
                  <>
                    <a href={`/${r.slug}`} target="_blank" className={`${btn} border border-mt-border`} aria-label="View"><ExternalLink size={13} /></a>
                    {!broken(r) && <button onClick={() => post(`rm-${r.slug}`, { action: 'remove', slug: r.slug }, () => `/${r.slug} switched off.`)} disabled={!!busy} className={`${btn} text-mt-muted border border-mt-border`}>Switch off</button>}
                    <button onClick={() => { if (window.confirm(`Delete /${r.slug} for good? It disappears from the site and Google.`)) post(`rm-${r.slug}`, { action: 'remove', slug: r.slug, del: true }, () => `/${r.slug} deleted.`); }} disabled={!!busy} className={`${btn} ${broken(r) ? 'bg-rose-600 text-white' : 'text-rose-600 border border-rose-600/30'}`}><Trash2 size={13} /> Delete</button>
                  </>
                )}
              </li>
            ))}
            {!list.length && <li className="py-4 text-[13px] text-mt-muted">No pages here.</li>}
          </ul>
        )}
      </section>
    </>
  );
}
