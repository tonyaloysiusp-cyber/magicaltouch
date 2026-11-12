'use client';

// Admin → Template Manager → Titles, descriptions & hashtags.
// Works out a clean title, description, hashtags and search keywords for
// every template from what its title already says (lib/templates/copywriter),
// shows before / after, and saves only when an admin presses Apply. The
// first save of each template keeps its original copy, so “Undo all” puts
// everything back.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, RotateCcw, Search, Wand2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useRouter } from 'next/navigation';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { CopyInput, CopyOut, copyChanged, rewriteCopy } from '@/lib/templates/copywriter';

type Row = CopyInput & { status: string; tags: string[] | null };
type Item = { t: Row; o: CopyOut };
const COLS = 'id,name,category,occasion,search_keywords,hashtags,width,height,status,tags,description';
const BRAND = ['mt-internal', 'brand-promo'];

const revalidate = async () => {
  const { data } = await supabase.auth.getSession();
  await fetch('/api/admin/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } }).catch(() => null);
};

export default function TemplateCopyPage() {
  const router = useRouter();
  const [access, setAccess] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [rows, setRows] = useState<(Row & { description: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [backups, setBackups] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      setProgress(`Loading templates… ${all.length.toLocaleString()}`);
      const { data, error } = await supabase.from('templates').select(COLS).eq('status', 'published').order('id').range(from, from + 999);
      if (error || !data?.length) break;
      all.push(...data);
      if (data.length < 1000) break;
    }
    setRows(all.filter((r) => !(r.tags || []).some((t: string) => BRAND.includes(t))));
    const { count } = await supabase.from('template_copy_backup').select('template_id', { count: 'exact', head: true });
    setBackups(count ?? null);
    setLoading(false); setProgress('');
  };
  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) { router.push('/login?next=/admin/library/copy'); return; }
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) { setAccess('denied'); return; }
      setAccess('ok'); load();
    })();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const items: (Item & { description: string | null })[] = useMemo(() => rows.map((t) => ({ t, o: rewriteCopy(t), description: t.description })).filter((x) => copyChanged(x.t, x.o) || x.o.description !== x.description), [rows]);
  const cats = useMemo(() => [...new Set(items.map((x) => x.t.category || '—'))].sort(), [items]);
  const shown = items.filter((x) => (!cat || (x.t.category || '—') === cat) && (!q.trim() || `${x.t.name} ${x.o.name}`.toLowerCase().includes(q.trim().toLowerCase())));
  const chosen = shown.filter((x) => !skip.has(x.t.id));

  const apply = async () => {
    setBusy('apply'); setMsg(null);
    let done = 0;
    try {
      for (let i = 0; i < chosen.length; i += 200) {
        const part = chosen.slice(i, i + 200).map((x) => ({ id: x.t.id, ...x.o }));
        const { data, error } = await supabase.rpc('admin_update_template_copy', { items: part });
        if (error) throw error;
        done += Number(data) || 0;
        setProgress(`Saving… ${done.toLocaleString()} of ${chosen.length.toLocaleString()}`);
      }
      await revalidate();
      setMsg(`Saved ${done.toLocaleString()} templates. The site shows the new titles within a few minutes.`);
      setConfirm('');
      await load();
    } catch (e: any) { setMsg(`Stopped after ${done.toLocaleString()}: ${e?.message || 'could not save'}. Nothing else was changed.`); }
    setBusy(null); setProgress('');
  };
  const undoAll = async () => {
    setBusy('undo'); setMsg(null);
    const { data, error } = await supabase.rpc('admin_restore_template_copy', { ids: null });
    setMsg(error ? `Could not undo: ${error.message}` : `Put back the original copy of ${Number(data).toLocaleString()} templates.`);
    await revalidate();
    await load(); setBusy(null);
  };

  const field = 'h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';
  return (
    <AdminShell active="library" title="Titles, descriptions & hashtags" subtitle="Clean copy worked out from each template’s title — review, then apply">
      {access === 'denied' ? <p className="text-[14px]">Only admins can open this page.</p> : access === 'checking' ? <p className="text-[13px] text-mt-muted">Checking access…</p> : (
      <div className="space-y-4">
        <Link href="/admin/library" className="inline-flex items-center gap-1.5 text-[13px] text-mt-muted hover:text-mt-ink"><ArrowLeft size={14} /> Template Manager</Link>
        <div className="rounded-2xl border border-mt-border bg-mt-surface p-4 flex flex-wrap items-center gap-3">
          {loading ? <p className="text-[13px] text-mt-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {progress}</p> : (
            <>
              <p className="text-[14px]"><b>{items.length.toLocaleString()}</b> of {rows.length.toLocaleString()} published templates would get new copy. Showing {shown.length.toLocaleString()}, <b>{chosen.length.toLocaleString()}</b> ticked.</p>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={field} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <label className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mt-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles" className={`${field} pl-8 w-52`} /></label>
              {backups ? <button type="button" onClick={undoAll} disabled={!!busy} className="ml-auto h-9 px-3 rounded-lg border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === 'undo' ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Undo all ({backups.toLocaleString()})</button> : null}
            </>
          )}
        </div>

        {!loading && chosen.length > 0 && (
          <div className="rounded-2xl border border-mt-border bg-mt-surface p-4 flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-mt-muted">To save the ticked {chosen.length.toLocaleString()} templates, type <b className="text-mt-ink">APPLY</b>. The original copy is kept so you can undo.</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="APPLY" className={`${field} w-28`} aria-label="Type APPLY to confirm" />
            <button type="button" onClick={apply} disabled={confirm !== 'APPLY' || !!busy} className="h-9 px-4 rounded-lg bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy === 'apply' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Apply to {chosen.length.toLocaleString()}</button>
            {progress && <span className="text-[12.5px] text-mt-muted">{progress}</span>}
          </div>
        )}
        {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}

        <ul className="space-y-2">
          {shown.slice(0, 150).map(({ t, o, description }) => {
            const off = skip.has(t.id);
            return (
              <li key={t.id} className={`rounded-xl border border-mt-border bg-mt-surface p-3 grid gap-2 md:grid-cols-[24px_1fr_1fr] ${off ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={!off} onChange={() => setSkip((s) => { const n = new Set(s); off ? n.delete(t.id) : n.add(t.id); return n; })} className="h-4 w-4 mt-1 accent-[#3B82C4]" aria-label={`Include ${t.name}`} />
                <div className="text-[12.5px] text-mt-muted space-y-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide">Now · {t.category}</p>
                  <p className="text-mt-ink line-through decoration-rose-400/60">{t.name}</p>
                  <p className="line-clamp-2">{description}</p>
                  <p className="truncate">#{(t.hashtags || []).join(' #')}</p>
                </div>
                <div className="text-[12.5px] space-y-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"><Check size={11} /> New</p>
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-mt-muted line-clamp-3">{o.description}</p>
                  <p className="text-[#3B82C4] break-words">#{o.hashtags.join(' #')}</p>
                  <p className="text-mt-faint truncate">Keywords: {o.search_keywords}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {shown.length > 150 && <p className="text-[12.5px] text-mt-muted">Showing the first 150 — Apply covers all {chosen.length.toLocaleString()} ticked. Use the category list to review more.</p>}
      </div>
      )}
    </AdminShell>
  );
}
