'use client';

// Admin → Content → Template Quality & Review.
// Look at every template with a large preview and decide: Keep, Improve,
// Replace, Archive or Review later. Nothing is deleted: Archive hides a
// template from the gallery (its page redirects to the category) and
// Restore brings it back. Every change is written to an audit log.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { DECISIONS, Decision, ReviewRow, categorySlug, collectionOf, decisionOf, suggestedScore, tagsFor } from '@/lib/templates/review';

const COLS = 'id,name,slug,category,status,tags,thumbnail,preview,width,height,color1,color2,is_free,description,hashtags,updated_at,created_at';
const PAGE = 48;
const COLLECTIONS: [string, string][] = [['', 'All collections'], ['pro-pilot-2026-11', 'Pro brand sets'], ['birthday-pro-2026-11', 'Birthday collection'], ['diwali-pro-2026-11', 'Diwali Pro'], ['universe-2026-11', 'Creative Universe'], ['albums-2026-11', 'Photo albums'], ['collection-500', 'Collection 500'], ['wave-2026-11', 'Wave 2'], ['mass-collection', 'Mass collection']];
const field = 'h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';

type Filters = { status: string; decision: string; collection: string; category: string; q: string; sort: string; special: string };
const START: Filters = { status: 'published', decision: '', collection: '', category: '', q: '', sort: 'new', special: '' };

async function readSetting(key: string): Promise<string> {
  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return (data as any)?.value || '';
}
async function writeSetting(key: string, value: string) {
  return supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}

export default function TemplateReview() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [f, setF] = useState<Filters>(START);
  const [qInput, setQInput] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ d: Decision | 'restore'; ids: string[] } | null>(null);
  const [big, setBig] = useState<ReviewRow | null>(null);
  const [dupIds, setDupIds] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/review');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      setMe({ id: user.id, email: user.email || '' });
      setState('ok');
    })();
  }, [router]);

  // Category list + decision counts (once).
  useEffect(() => {
    if (state !== 'ok') return;
    (async () => {
      const { data } = await supabase.from('template_categories').select('name,parent_id').is('parent_id', null).order('name');
      setCats(((data as any[]) || []).map((c) => c.name));
      const out: Record<string, number> = {};
      await Promise.all([
        ...DECISIONS.filter((d) => d.id !== 'archive').map(async (d) => { const { count } = await supabase.from('templates').select('id', { count: 'exact', head: true }).contains('tags', [`review:${d.id}`]); out[d.id] = count || 0; }),
        (async () => { const { count } = await supabase.from('templates').select('id', { count: 'exact', head: true }).contains('tags', ['archived']); out.archive = count || 0; })(),
        (async () => { const { count } = await supabase.from('templates').select('id', { count: 'exact', head: true }).eq('status', 'published'); out.published = count || 0; })(),
      ]);
      setSummary(out);
    })();
  }, [state, msg]);

  // Duplicate candidates: same name and size as another published template.
  useEffect(() => {
    if (state !== 'ok' || f.special !== 'dupes' || dupIds) return;
    (async () => {
      const all: { id: string; name: string; width: number; height: number }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from('templates').select('id,name,width,height').eq('status', 'published').order('id').range(from, from + 999);
        all.push(...((data as any[]) || []));
        if (!data || data.length < 1000) break;
      }
      const groups = new Map<string, string[]>();
      all.forEach((r) => { const k = `${r.name.toLowerCase().replace(/\s+/g, ' ').trim()}|${r.width}x${r.height}`; groups.set(k, [...(groups.get(k) || []), r.id]); });
      setDupIds(Array.from(groups.values()).filter((g) => g.length > 1).flat());
    })();
  }, [state, f.special, dupIds]);

  const load = useCallback(async () => {
    if (state !== 'ok') return;
    if (f.special === 'dupes' && !dupIds) return;
    setBusy(true);
    let q: any = supabase.from('templates').select(COLS, { count: 'exact' });
    if (f.status === 'archived') q = q.contains('tags', ['archived']);
    else if (f.status) q = q.eq('status', f.status);
    if (f.decision) q = q.contains('tags', [`review:${f.decision}`]);
    if (f.collection) q = q.contains('tags', [f.collection]);
    if (f.category) q = q.eq('category', f.category);
    if (f.q) { const s = f.q.replace(/[%,()]/g, ' '); q = q.or(`name.ilike.%${s}%,search_keywords.ilike.%${s}%,category.ilike.%${s}%,slug.ilike.%${s}%`); }
    if (f.special === 'nopreview') q = q.is('thumbnail', null);
    if (f.special === 'free') q = q.eq('is_free', true);
    if (f.special === 'pro') q = q.eq('is_free', false);
    if (f.special === 'undecided') q = q.not('tags', 'cs', '{review:keep}').not('tags', 'cs', '{review:improve}').not('tags', 'cs', '{review:replace}').not('tags', 'cs', '{review:later}');
    if (f.special === 'dupes') q = q.in('id', (dupIds || []).slice(0, 400));
    q = f.sort === 'updated' ? q.order('updated_at', { ascending: false }) : f.sort === 'name' ? q.order('name') : f.sort === 'old' ? q.order('created_at') : q.order('created_at', { ascending: false });
    const { data, count, error } = await q.order('id').range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) setMsg(`Could not load templates: ${error.message}`);
    setRows((data as any) || []);
    setTotal(count || 0);
    setBusy(false);
  }, [state, f, page, dupIds]);
  useEffect(() => { load(); }, [load]);

  const change = (patch: Partial<Filters>) => { setPage(0); setSel(new Set()); setF((x) => ({ ...x, ...patch })); };

  // Apply a decision to templates (after confirmation for more than one).
  const apply = async (d: Decision | 'restore', ids: string[]) => {
    setBusy(true); setMsg(null);
    try {
      const { data: current } = await supabase.from('templates').select('id,slug,name,category,status,tags').in('id', ids);
      const list = (current as any[]) || [];
      let redirects: Record<string, string> = {};
      try { redirects = JSON.parse((await readSetting('template_redirects')) || '{}'); } catch { redirects = {}; }
      let changedRedirects = false;
      for (const t of list) {
        const patch: any = { tags: tagsFor(t.tags, d), updated_at: new Date().toISOString() };
        if (d === 'archive') {
          patch.status = 'unpublished';
          if (t.slug) { redirects[t.slug] = `/templates/category/${categorySlug(t.category || 'templates')}`; changedRedirects = true; }
        }
        if (d === 'restore') {
          patch.status = 'published';
          if (t.slug && redirects[t.slug]) { delete redirects[t.slug]; changedRedirects = true; }
        }
        const { error } = await supabase.from('templates').update(patch).eq('id', t.id);
        if (error) throw error;
      }
      if (changedRedirects) await writeSetting('template_redirects', JSON.stringify(redirects));
      // Audit log (newest first, last 3,000 changes).
      let log: any[] = [];
      try { log = JSON.parse((await readSetting('template_review_log')) || '[]'); } catch { log = []; }
      const at = new Date().toISOString();
      log = [...list.map((t) => ({ at, by: me?.id, id: t.id, slug: t.slug, name: t.name, action: d, from: { status: t.status, decision: decisionOf(t) } })), ...log].slice(0, 3000);
      await writeSetting('template_review_log', JSON.stringify(log));
      setMsg(`${DECISIONS.find((x) => x.id === d)?.label || 'Restore'}: ${list.length} template${list.length === 1 ? '' : 's'} updated.${d === 'archive' || d === 'restore' ? ' The gallery list updates at the next site refresh.' : ''}`);
      setSel(new Set()); setConfirm(null);
      await load();
    } catch (e: any) {
      setMsg(`Could not save: ${e?.message || e}`);
    }
    setBusy(false);
  };
  const ask = (d: Decision | 'restore', ids: string[]) => (ids.length > 1 || d === 'archive' ? setConfirm({ d, ids }) : apply(d, ids));

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id));

  if (state === 'loading') return <div className="min-h-screen grid place-items-center text-mt-muted"><Loader2 className="animate-spin" /></div>;
  if (state === 'denied') return <div className="min-h-screen grid place-items-center text-mt-muted">This page is for admins.</div>;

  return (
    <AdminShell active="review" title="Template Quality & Review" subtitle="Keep the good ones, improve the promising ones, replace or archive weak designs. Nothing is deleted.">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="rounded-xl border border-mt-border bg-mt-surface p-3"><p className="text-[11px] text-mt-muted">Published</p><p className="text-xl font-semibold tabular-nums">{(summary.published ?? 0).toLocaleString()}</p></div>
        {DECISIONS.map((d) => (
          <button key={d.id} type="button" onClick={() => change(d.id === 'archive' ? { status: 'archived', decision: '' } : { decision: d.id, status: '' })} className="rounded-xl border border-mt-border bg-mt-surface p-3 text-left hover:border-mt-ink/40">
            <p className="text-[11px] text-mt-muted">{d.label}</p><p className="text-xl font-semibold tabular-nums">{(summary[d.id] ?? 0).toLocaleString()}</p>
          </button>
        ))}
        <button type="button" onClick={() => change({ special: 'dupes', status: 'published' })} className="rounded-xl border border-mt-border bg-mt-surface p-3 text-left hover:border-mt-ink/40"><p className="text-[11px] text-mt-muted">Duplicate candidates</p><p className="text-xl font-semibold tabular-nums">{dupIds ? dupIds.length : '—'}</p></button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); change({ q: qInput.trim() }); }} className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mt-muted" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search name, category, keyword" className={`${field} pl-8 w-64`} aria-label="Search templates" />
        </form>
        <select className={field} value={f.status} onChange={(e) => change({ status: e.target.value })} aria-label="Status">
          <option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="unpublished">Hidden</option><option value="archived">Archived</option>
        </select>
        <select className={field} value={f.decision} onChange={(e) => change({ decision: e.target.value })} aria-label="Decision">
          <option value="">Any decision</option>{DECISIONS.filter((d) => d.id !== 'archive').map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select className={field} value={f.collection} onChange={(e) => change({ collection: e.target.value })} aria-label="Collection">
          {COLLECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={field} value={f.category} onChange={(e) => change({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={field} value={f.special} onChange={(e) => change({ special: e.target.value })} aria-label="Show">
          <option value="">Everything</option><option value="undecided">Not reviewed yet</option><option value="dupes">Duplicate candidates</option><option value="nopreview">Missing preview</option><option value="free">Free</option><option value="pro">Pro</option>
        </select>
        <select className={field} value={f.sort} onChange={(e) => change({ sort: e.target.value })} aria-label="Sort">
          <option value="new">Recently created</option><option value="updated">Recently updated</option><option value="old">Oldest first</option><option value="name">Name A–Z</option>
        </select>
        <button type="button" onClick={() => { setQInput(''); change(START); }} className="h-9 px-3 rounded-lg text-[13px] text-mt-muted hover:text-mt-ink">Reset</button>
      </div>

      {/* Bulk bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-mt-border bg-mt-surface px-3 py-2">
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} /> Select page</label>
        <span className="text-[13px] text-mt-muted">{sel.size} selected · {total.toLocaleString()} match</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {DECISIONS.map((d) => <button key={d.id} type="button" disabled={!sel.size || busy} onClick={() => ask(d.id, Array.from(sel))} className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-40 ${d.tone}`}>{d.label}</button>)}
          <button type="button" disabled={!sel.size || busy} onClick={() => ask('restore', Array.from(sel))} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold border border-mt-border disabled:opacity-40 inline-flex items-center gap-1"><RotateCcw size={13} /> Restore</button>
        </span>
      </div>
      {msg && <p role="status" className="mt-2 text-[13px] text-mt-muted">{msg}</p>}

      {/* Grid */}
      <ul className={`mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${busy ? 'opacity-60' : ''}`}>
        {rows.map((r) => {
          const dec = decisionOf(r);
          const sc = suggestedScore(r);
          const D = DECISIONS.find((x) => x.id === dec);
          return (
            <li key={r.id} className={`rounded-2xl border bg-mt-surface overflow-hidden flex flex-col ${sel.has(r.id) ? 'border-[#3B82C4] ring-2 ring-[#3B82C4]/30' : 'border-mt-border'}`}>
              <button type="button" onClick={() => setBig(r)} className="relative block bg-mt-surface2 aspect-[4/5]" aria-label={`Preview ${r.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumbnail ? <img src={r.preview || r.thumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-3" /> : <span className="absolute inset-0 grid place-items-center text-[12px] text-rose-600">No preview</span>}
                <span className="absolute left-2 top-2 flex gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${r.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>{r.status}</span>
                  {D && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${D.tone}`}>{D.label}</span>}
                </span>
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${sc.score >= 80 ? 'bg-emerald-600 text-white' : sc.score >= 70 ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'}`} title={`${sc.level} (suggested)${sc.notes.length ? ' — ' + sc.notes.join(', ') : ''}`}>{sc.score}</span>
              </button>
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} className="mt-1" aria-label={`Select ${r.name}`} />
                  <span className="text-[13px] font-semibold leading-snug line-clamp-2">{r.name}</span>
                </label>
                <p className="text-[11.5px] text-mt-muted">{r.category} · {r.width}×{r.height} · {collectionOf(r.tags)} · {r.is_free ? 'Free' : 'Pro'}</p>
                <p className="flex items-center gap-1 text-[11px] text-mt-muted">
                  {[r.color1, r.color2].filter(Boolean).map((c) => <i key={c!} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c! }} title={c!} />)}
                  <span className="ml-1">{sc.level}</span>
                  {r.updated_at && <span className="ml-auto">{new Date(r.updated_at).toLocaleDateString()}</span>}
                </p>
                <div className="mt-auto pt-2 grid grid-cols-5 gap-1">
                  {DECISIONS.map((d) => <button key={d.id} type="button" disabled={busy} title={d.hint} onClick={() => ask(d.id, [r.id])} className={`h-7 rounded-md text-[10.5px] font-semibold ${dec === d.id ? d.tone : 'border border-mt-border hover:border-mt-ink/40'}`}>{d.id === 'later' ? 'Later' : d.label}</button>)}
                </div>
                {dec === 'archive' && <button type="button" onClick={() => ask('restore', [r.id])} className="h-7 rounded-md border border-mt-border text-[11px] font-semibold inline-flex items-center justify-center gap-1"><RotateCcw size={12} /> Restore</button>}
              </div>
            </li>
          );
        })}
      </ul>
      {!busy && rows.length === 0 && <p className="mt-10 text-center text-mt-muted">No templates match these filters.</p>}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="text-[13px] tabular-nums">Page {page + 1} of {pages}</span>
        <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
      </div>

      {/* Confirm */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm">
          <div className="w-full max-w-md rounded-2xl bg-mt-surface p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">{confirm.d === 'restore' ? 'Restore' : DECISIONS.find((d) => d.id === confirm.d)!.label} {confirm.ids.length} template{confirm.ids.length === 1 ? '' : 's'}?</h2>
            <p className="mt-2 text-[14px] text-mt-muted">
              {confirm.d === 'archive' ? 'They leave the public gallery. Records, designs and assets are kept, old links go to the category page, and you can restore them any time.'
                : confirm.d === 'restore' ? 'They return to the public gallery and their old links work again.'
                : 'Only the review decision is saved. Nothing is published, hidden or deleted.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold">Cancel</button>
              <button type="button" disabled={busy} onClick={() => apply(confirm.d, confirm.ids)} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Large preview */}
      {big && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 grid place-items-center" role="dialog" aria-modal="true" aria-label={big.name} onClick={() => setBig(null)}>
          <div className="relative max-h-full w-full max-w-4xl rounded-2xl bg-mt-surface p-4 grid gap-4 md:grid-cols-[1fr_280px]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setBig(null)} className="absolute right-3 top-3 h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label="Close"><X size={15} /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big.preview || big.thumbnail || ''} alt={big.name} className="max-h-[80vh] w-full object-contain rounded-lg bg-mt-surface2" />
            <div className="text-[13px] space-y-2">
              <h3 className="text-base font-semibold pr-8">{big.name}</h3>
              <p className="text-mt-muted">{big.category} · {big.width}×{big.height} px · {big.status}</p>
              <p className="text-mt-muted">{big.description}</p>
              <p className="text-mt-muted">Suggested score: <b className="text-mt-ink">{suggestedScore(big).score}</b> ({suggestedScore(big).level}). Automatic hint — your decision counts.</p>
              <div className="grid grid-cols-2 gap-1.5 pt-2">
                {DECISIONS.map((d) => <button key={d.id} type="button" onClick={() => { ask(d.id, [big.id]); setBig(null); }} className={`h-9 rounded-lg text-[12.5px] font-semibold ${d.tone}`}>{d.label}</button>)}
              </div>
              {big.slug && <Link href={`/templates/${big.slug}`} target="_blank" className="inline-flex items-center gap-1 text-[#3B82C4]">Open template page <ExternalLink size={12} /></Link>}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
