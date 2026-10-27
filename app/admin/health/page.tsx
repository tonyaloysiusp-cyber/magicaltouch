'use client';

// Admin → Site health. Runs live checks (database, sign-in service, the
// template gallery, translation, fonts, page speed, errors visitors hit)
// and finds problems in the data (templates without content or picture,
// very heavy templates, old versions, large stored files). Each problem
// has a fix button where a safe fix exists.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2, Wrench, XCircle } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';

type Level = 'ok' | 'warn' | 'bad' | 'run';
interface Check { id: string; name: string; level: Level; detail: string; ms?: number; fix?: { label: string; run: () => Promise<string> } }
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value?: T; error?: string }> {
  const t = performance.now();
  try {
    const value = await fn();
    return { ms: Math.round(performance.now() - t), value };
  } catch (e: any) {
    return { ms: Math.round(performance.now() - t), error: e?.message || String(e) };
  }
}
const speed = (ms: number, good: number, ok: number): Level => (ms <= good ? 'ok' : ms <= ok ? 'warn' : 'bad');

function Icon({ level }: { level: Level }) {
  if (level === 'run') return <Loader2 size={18} className="animate-spin text-mt-faint" />;
  if (level === 'ok') return <CheckCircle2 size={18} className="text-emerald-600" />;
  if (level === 'warn') return <AlertTriangle size={18} className="text-amber-500" />;
  return <XCircle size={18} className="text-rose-600" />;
}

export default function HealthPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [checks, setChecks] = useState<Check[]>([]);
  const [h, setH] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const put = (c: Check) => setChecks((list) => { const i = list.findIndex((x) => x.id === c.id); if (i < 0) return [...list, c]; const n = [...list]; n[i] = c; return n; });

  const run = useCallback(async () => {
    setChecks([]);
    setMsg(null);
    const ids: [string, string][] = [['db', 'Database'], ['auth', 'Sign-in service'], ['proxy', 'Backup route (for blocked networks)'], ['gallery', 'Template gallery'], ['translate', 'Translation'], ['fonts', 'Fonts'], ['speed', 'Page speed (visitors, last 7 days)'], ['errors', 'Errors visitors hit (last 7 days)']];
    ids.forEach(([id, name]) => put({ id, name, level: 'run', detail: 'Checking…' }));

    const db = await timed(async () => { const { error, count } = await supabase.from('templates').select('id', { count: 'exact', head: true }).eq('status', 'published'); if (error) throw error; return count || 0; });
    put({ id: 'db', name: 'Database', ms: db.ms, level: db.error ? 'bad' : speed(db.ms, 700, 2000), detail: db.error ? `Not reachable: ${db.error}` : `Answered in ${db.ms} ms · ${db.value} published templates` });

    const auth = await timed(async () => { const r = await fetch(`${SB}/auth/v1/health`, { headers: { apikey: KEY } }); if (!r.ok) throw new Error(`status ${r.status}`); return r; });
    put({ id: 'auth', name: 'Sign-in service', ms: auth.ms, level: auth.error ? 'bad' : speed(auth.ms, 700, 2000), detail: auth.error ? `Problem: ${auth.error}. Logins may fail.` : `Answered in ${auth.ms} ms` });

    const proxy = await timed(async () => { const r = await fetch(`/sb/auth/v1/health`, { headers: { apikey: KEY } }); if (!r.ok) throw new Error(`status ${r.status}`); return r; });
    put({ id: 'proxy', name: 'Backup route (for blocked networks)', ms: proxy.ms, level: proxy.error ? 'bad' : speed(proxy.ms, 900, 2500), detail: proxy.error ? `Not working: ${proxy.error}. Visitors whose network blocks the database would see “check your connection”.` : `Working (${proxy.ms} ms). People on networks that block the database are routed through our own domain automatically.` });

    const gal = await timed(async () => { const r = await fetch('/api/public-templates', { cache: 'no-store' }); if (!r.ok) throw new Error(`status ${r.status}`); return (await r.json()) as any[]; });
    const galCount = gal.value?.length || 0;
    put({
      id: 'gallery', name: 'Template gallery', ms: gal.ms,
      level: gal.error ? 'bad' : galCount < (db.value || 0) ? 'warn' : speed(gal.ms, 1500, 4000),
      detail: gal.error ? `Not loading: ${gal.error}` : `${galCount} templates in ${gal.ms} ms${galCount < (db.value || 0) ? ` — ${(db.value || 0) - galCount} published templates are not showing yet (the list refreshes every 5 minutes)` : ''}`,
      fix: galCount < (db.value || 0) ? { label: 'Refresh the site now', run: refreshSite } : undefined,
    });

    const tr = await timed(async () => { const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: ['Happy birthday'], target: 'ar' }) }); const j = await r.json(); if (!r.ok || !/[؀-ۿ]/.test(j.texts?.[0] || '')) throw new Error(j.error || 'no translation came back'); return j; });
    put({ id: 'translate', name: 'Translation', ms: tr.ms, level: tr.error ? 'warn' : speed(tr.ms, 2500, 6000), detail: tr.error ? `Our server couldn’t translate (${tr.error}). Customers’ browsers still translate directly, so it usually keeps working.` : `Working (${tr.ms} ms)` });

    const ft = await timed(async () => { const r = await fetch(`/api/font-file?family=Noto%20Sans%20Tamil&weight=400&_=${Date.now()}`); if (!r.ok) throw new Error(`status ${r.status}`); return r; });
    put({ id: 'fonts', name: 'Fonts', ms: ft.ms, level: ft.error ? 'bad' : speed(ft.ms, 2000, 5000), detail: ft.error ? `Fonts not loading: ${ft.error}` : `Working (${ft.ms} ms for a Tamil font)` });

    const { data: st } = await supabase.rpc('admin_site_stats', { p_days: 7 });
    const avg = (st as any)?.avg_load_ms || 0;
    const slow = ((st as any)?.slow_pages || []) as any[];
    put({
      id: 'speed', name: 'Page speed (visitors, last 7 days)', level: !avg ? 'ok' : speed(avg, 2500, 4500),
      detail: !avg ? 'Not enough visits measured yet.' : `Average first-page load ${(avg / 1000).toFixed(1)} s.${slow.length ? ` Slowest: ${slow.slice(0, 3).map((p) => `${p.path} (${(p.load_ms / 1000).toFixed(1)} s)`).join(', ')}.` : ''}${avg > 2500 ? ' Large templates and photos are the usual cause — see “Heavy templates” below.' : ''}`,
      fix: avg > 2500 ? { label: 'Refresh the site cache', run: refreshSite } : undefined,
    });
    const errs = ((st as any)?.errors || []) as any[];
    const total = errs.reduce((a, e) => a + Number(e.count || 0), 0);
    put({ id: 'errors', name: 'Errors visitors hit (last 7 days)', level: !total ? 'ok' : total < 20 ? 'warn' : 'bad', detail: !total ? 'No errors reported.' : errs.slice(0, 4).map((e) => `${e.count}× on ${e.path}: ${e.message}`).join(' · ') });

    const { data: hh, error } = await supabase.rpc('admin_health');
    setH(error ? { error: error.message } : hh);
    setRanAt(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/health');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      setState('ok');
      run();
    })();
  }, [router, run]);

  async function refreshSite(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const r = await fetch('/api/admin/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
    return r.ok ? 'Done — every page shows the latest content on its next visit.' : 'Could not refresh the site. Please try again.';
  }

  const fix = async (id: string, f: () => Promise<string>) => {
    setBusy(id);
    try { setMsg(await f()); } catch (e: any) { setMsg(e?.message || 'That didn’t work.'); }
    setBusy(null);
  };

  const unpublishEmpty = async () => {
    const ids = (h?.published_no_content || []).map((t: any) => t.id);
    if (!ids.length || !window.confirm(`Unpublish ${ids.length} template(s) that have no design inside? They stay in Templates as drafts.`)) return 'Nothing changed.';
    const { error } = await supabase.from('templates').update({ status: 'draft' }).in('id', ids);
    if (error) throw error;
    run();
    return `${ids.length} empty template(s) moved to drafts.`;
  };
  const trimVersions = async () => {
    if (!window.confirm('Keep only the 5 newest saved versions of each template and remove older ones?')) return 'Nothing changed.';
    const { data, error } = await supabase.from('template_versions').select('id, template_id, created_at').order('created_at', { ascending: false }).range(0, 9999);
    if (error) throw error;
    const seen = new Map<string, number>(), extra: string[] = [];
    (data || []).forEach((v: any) => { const n = (seen.get(v.template_id) || 0) + 1; seen.set(v.template_id, n); if (n > 5) extra.push(v.id); });
    for (let i = 0; i < extra.length; i += 200) {
      const { error: e } = await supabase.from('template_versions').delete().in('id', extra.slice(i, i + 200));
      if (e) throw e;
    }
    run();
    return `Removed ${extra.length} old version(s).`;
  };
  const removeFiles = async (names: string[]) => {
    if (!names.length || !window.confirm(`Delete ${names.length} uploaded file(s)? No design uses them. This can’t be undone.`)) return 'Nothing changed.';
    const { data, error } = await supabase.storage.from('design-assets').remove(names);
    if (error) throw error;
    run();
    return `Deleted ${data?.length ?? names.length} file(s).`;
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  const bad = checks.filter((c) => c.level === 'bad').length, warn = checks.filter((c) => c.level === 'warn').length;
  const issues = h && !h.error ? [
    { id: 'empty', show: (h.published_no_content || []).length > 0, title: `${h.published_no_content.length} published template(s) have no design inside`, detail: 'Customers would open a blank page.', list: h.published_no_content.map((t: any) => t.name), fix: { label: 'Move them to drafts', run: unpublishEmpty } },
    { id: 'nothumb', show: (h.published_no_thumb || []).length > 0, title: `${h.published_no_thumb.length} published template(s) have no picture`, detail: 'They show an empty card in the gallery. Open each one in Templates and set a thumbnail.', list: h.published_no_thumb.map((t: any) => t.name) },
    { id: 'heavy', show: (h.heavy_templates || []).length > 0, title: `${h.heavy_templates.length} heavy template(s) (over 0.9 MB)`, detail: 'Big embedded photos make these slow to open. Open one in the editor and press Save — pictures are shrunk automatically.', links: h.heavy_templates.map((t: any) => ({ label: `${t.name} — ${t.mb} MB`, href: `/editor?w=${t.width}&h=${t.height}&templateId=${t.id}&editTemplate=1` })) },
    { id: 'versions', show: Number(h.versions_extra) > 0, title: `${h.versions_extra} old template version(s) beyond the newest 5`, detail: 'Backups from earlier saves. Keeping the newest 5 per template saves space.', fix: { label: 'Keep newest 5', run: trimVersions } },
    { id: 'files', show: (h.big_files || []).length > 0, title: `${h.big_files.length} large uploaded file(s) (${h.big_files.reduce((a: number, f: any) => a + Number(f.mb), 0).toFixed(1)} MB)`, detail: 'Pictures uploaded by the old “save to website” feature. Designs are now kept in people’s own Google Drive / Dropbox / device, so these are unused.', list: h.big_files.map((f: any) => `${f.mb} MB · ${new Date(f.created_at).toLocaleDateString('en-GB')}`), fix: { label: 'Delete these files', run: () => removeFiles(h.big_files.map((f: any) => f.name)) } },
  ].filter((x) => x.show) : [];

  return (
    <AdminShell active="health" title="Site health" accent="health" subtitle="Live checks of everything visitors depend on, plus problems found in the data — with one-tap fixes where they are safe.">
      <div className="flex flex-col gap-6">
        <section className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{checks.some((c) => c.level === 'run') ? 'Checking…' : bad ? `${bad} problem${bad > 1 ? 's' : ''} need attention` : warn ? `${warn} thing${warn > 1 ? 's' : ''} to look at` : 'Everything is working'}</h2>
              {ranAt && <p className="text-[12px] text-mt-muted">Checked {ranAt.toLocaleTimeString()}</p>}
            </div>
            <button onClick={() => fix('refresh', refreshSite)} disabled={!!busy} className={`${btn} border border-mt-border`}><Wrench size={13} /> Refresh the site now</button>
            <button onClick={run} disabled={checks.some((c) => c.level === 'run')} className={`${btn} bg-mt-primary text-mt-onprimary`}><RefreshCw size={13} /> Run checks again</button>
          </div>
          {msg && <p className="mt-3 rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm" role="status">{msg}</p>}
          <ul className="mt-4 divide-y divide-mt-border">
            {checks.map((c) => (
              <li key={c.id} className="py-3 flex items-start gap-3">
                <Icon level={c.level} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-mt-ink">{c.name}</p>
                  <p className="text-[13px] text-mt-muted break-words">{c.detail}</p>
                </div>
                {c.fix && <button onClick={() => fix(c.id, c.fix!.run)} disabled={busy === c.id} className={`${btn} border border-mt-border shrink-0`}>{busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} {c.fix.label}</button>}
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Problems found in the data</h2>
          {!h && <p className="mt-2 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Looking…</p>}
          {h?.error && <p className="mt-2 text-sm text-mt-muted">{/function|schema cache/i.test(h.error) ? 'The health check is being set up — this part appears once the database update is applied.' : h.error}</p>}
          {h && !h.error && !issues.length && <p className="mt-2 text-sm text-emerald-600 inline-flex items-center gap-2"><CheckCircle2 size={16} /> Nothing to fix.</p>}
          <ul className="mt-3 flex flex-col gap-3">
            {issues.map((i: any) => (
              <li key={i.id} className="rounded-2xl border border-mt-border p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[14px] font-medium text-mt-ink">{i.title}</p>
                    <p className="text-[13px] text-mt-muted">{i.detail}</p>
                  </div>
                  {i.fix && <button onClick={() => fix(i.id, i.fix.run)} disabled={busy === i.id} className={`${btn} ${i.id === 'files' ? 'bg-rose-600 text-white' : 'bg-mt-primary text-mt-onprimary'}`}>{busy === i.id ? <Loader2 size={13} className="animate-spin" /> : i.id === 'files' ? <Trash2 size={13} /> : <Wrench size={13} />} {i.fix.label}</button>}
                </div>
                {i.list && <details className="mt-2"><summary className="cursor-pointer text-[12px] text-mt-muted">Show {i.list.length}</summary><ul className="mt-1 text-[12px] text-mt-muted columns-2">{i.list.map((x: string, k: number) => <li key={k} className="truncate">{x}</li>)}</ul></details>}
                {i.links && <ul className="mt-2 flex flex-col gap-1 text-[12px]">{i.links.map((l: any) => <li key={l.href}><a href={l.href} target="_blank" className="text-[#3B82C4] hover:underline">{l.label}</a></li>)}</ul>}
              </li>
            ))}
          </ul>
        </section>

        {h && !h.error && (
          <section className={card}>
            <h2 className="text-lg font-semibold">Storage</h2>
            <p className="text-[13px] text-mt-muted">Database {h.db_size_mb} MB in total.</p>
            <div className="mt-3 grid md:grid-cols-2 gap-6 text-[13px]">
              <div>
                <p className="font-semibold mb-1">Biggest tables</p>
                <ul className="divide-y divide-mt-border">{(h.tables || []).map((t: any) => <li key={t.name} className="py-1 flex justify-between"><span>{t.name}</span><span className="tabular-nums text-mt-muted">{t.mb} MB · {Number(t.rows).toLocaleString()} rows</span></li>)}</ul>
              </div>
              <div>
                <p className="font-semibold mb-1">File storage</p>
                <ul className="divide-y divide-mt-border">{(h.buckets || []).map((b: any) => <li key={b.bucket_id} className="py-1 flex justify-between"><span>{b.bucket_id}</span><span className="tabular-nums text-mt-muted">{b.mb} MB · {b.files} files</span></li>)}</ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
