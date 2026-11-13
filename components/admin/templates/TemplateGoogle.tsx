'use client';

// Admin → Templates → Google & hashtags: how ready each template is for
// Google (score 0–100 and what is missing), with its Google preview,
// search words and hashtags. Empty hashtags = automatic ones are used.
// Saving updates the public template page within the hour.

import { refreshPublicLists } from '@/lib/siteRefresh';
import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { allPages } from '@/lib/templatesData';
import { autoHashtags, seoScore, BRAND_TAGS } from '@/lib/templateHashtags';

interface Row { id: string; name: string; slug: string; category: string; occasion: string | null; industry: string | null; tags: string[] | null; hashtags: string[] | null; search_keywords: string | null; description: string | null; preview: string | null; thumbnail: string | null }
const PAGE = 40;
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const tone = (n: number) => (n >= 80 ? 'bg-emerald-600' : n >= 55 ? 'bg-amber-500' : 'bg-rose-600');

export function TemplateGoogle() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [show, setShow] = useState<'all' | 'work' | 'good'>('work');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Row | null>(null);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    allPages<Row>((from, to) => supabase.from('templates').select('id,name,slug,category,occasion,industry,tags,hashtags,search_keywords,description,preview,thumbnail').eq('status', 'published').order('id').range(from, to))
      .then((r: any) => setRows(((r?.data ?? r) as Row[]) || []));
  }, []);

  const scored = useMemo(() => (rows || []).map((r) => ({ r, ...seoScore(r) })), [rows]);
  const cats = useMemo(() => Array.from(new Set((rows || []).map((r) => r.category))).sort(), [rows]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return scored
      .filter((x) => (cat === 'all' || x.r.category === cat) && (show === 'all' || (show === 'work' ? x.score < 80 : x.score >= 80)) && (!t || `${x.r.name} ${x.r.search_keywords || ''} ${(x.r.hashtags || []).join(' ')}`.toLowerCase().includes(t)))
      .sort((a, b) => a.score - b.score);
  }, [scored, q, cat, show]);
  const avg = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : 0;
  const work = scored.filter((x) => x.score < 80).length;

  const save = async () => {
    if (!open) return;
    setBusy(true);
    const patch = { search_keywords: (open.search_keywords || '').split(',').map((s) => s.trim()).filter(Boolean).join(', '), hashtags: (open.hashtags || []).map((h) => h.replace(/^#/, '').toLowerCase()).filter(Boolean), description: (open.description || '').trim() };
    refreshPublicLists();
    const { error } = await supabase.from('templates').update(patch).eq('id', open.id);
    setBusy(false);
    if (error) return setMsg(error.message);
    setRows((rs) => (rs || []).map((r) => (r.id === open.id ? { ...r, ...patch } : r)));
    setMsg('Saved — the template page shows it within the hour.');
    setOpen(null);
  };
  const addTag = (v: string) => {
    const h = v.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (h && open && !(open.hashtags || []).includes(h)) setOpen({ ...open, hashtags: [...(open.hashtags || []), h] });
    setTag('');
  };

  if (!rows) return <p className="py-6 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Checking every template…</p>;
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <section className="py-4 sm:py-6 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-mt-border p-4"><p className="text-[12px] text-mt-faint">Average Google score</p><p className="text-2xl font-semibold">{avg}<span className="text-[14px] text-mt-faint">/100</span></p></div>
        <div className="rounded-2xl border border-mt-border p-4"><p className="text-[12px] text-mt-faint">Need work (under 80)</p><p className="text-2xl font-semibold">{work.toLocaleString()}</p></div>
        <div className="rounded-2xl border border-mt-border p-4"><p className="text-[12px] text-mt-faint">How it works</p><p className="text-[12.5px] text-mt-muted leading-snug">Every template has its own Google page with picture, title and hashtags. Own hashtags and 3+ search words rank best.</p></div>
      </div>
      {msg && <p className="rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm">{msg}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-3 text-mt-faint" /><input className={`${field} pl-8`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, words or hashtags" /></label>
        <select className={`${field} w-auto`} value={cat} onChange={(e) => { setCat(e.target.value); setPage(0); }}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        {([['work', 'Needs work'], ['good', 'Good'], ['all', 'All']] as const).map(([id, l]) => <button key={id} onClick={() => { setShow(id); setPage(0); }} className={`h-9 px-3.5 rounded-full text-[13px] border ${show === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>)}
      </div>
      <ul className="divide-y divide-mt-border rounded-2xl border border-mt-border">
        {shown.map(({ r, score, missing }) => (
          <li key={r.id} className="p-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.thumbnail || r.preview || ''} alt="" loading="lazy" className="h-14 w-12 rounded-lg object-cover bg-mt-surface2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium truncate">{r.name}</p>
              <p className="text-[12px] text-mt-faint truncate">{r.category}{missing.length ? ` · missing: ${missing.join(', ')}` : ' · all good'}</p>
            </div>
            <div className="w-24 hidden sm:block"><div className="h-1.5 rounded-full bg-mt-surface2"><div className={`h-1.5 rounded-full ${tone(score)}`} style={{ width: `${score}%` }} /></div><p className="text-[11px] text-mt-faint mt-1">{score}/100</p></div>
            <button onClick={() => setOpen({ ...r })} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold">Edit</button>
          </li>
        ))}
        {!shown.length && <li className="p-4 text-[13px] text-mt-muted">Nothing here.</li>}
      </ul>
      <div className="flex items-center gap-2 text-[13px] text-mt-muted">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 px-3 rounded-full border border-mt-border disabled:opacity-40">Back</button>
        <span>{list.length ? `${page * PAGE + 1}–${Math.min(list.length, page * PAGE + PAGE)} of ${list.length.toLocaleString()}` : '0'}</span>
        <button disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)} className="h-8 px-3 rounded-full border border-mt-border disabled:opacity-40">Next</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/50 grid place-items-center p-3" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-mt-surface border border-mt-border p-5 sm:p-6 grid gap-3">
            <div className="flex items-center gap-3"><h3 className="text-lg font-semibold flex-1 truncate">{open.name}</h3><a href={`/templates/${open.slug}`} target="_blank" className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5"><ExternalLink size={12} /> Page</a><button onClick={() => setOpen(null)} className="h-9 w-9 rounded-full grid place-items-center hover:bg-mt-surface2" aria-label="Close"><X size={18} /></button></div>
            <div className="rounded-2xl border border-mt-border p-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-mt-faint mb-1">How it can look on Google</p>
                <p className="text-[12px] text-[#4D5156] dark:text-mt-muted">magicaltouchdesign.com › templates</p>
                <p className="text-[16px] text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug line-clamp-1">{open.name} Template — Free & Editable</p>
                <p className="text-[12px] text-[#4D5156] dark:text-mt-muted line-clamp-2">{open.description || `Free ${open.name} template. Edit online and download as PDF, PNG or JPG.`}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.thumbnail || open.preview || ''} alt="" className="h-20 w-16 rounded-lg object-cover shrink-0" />
            </div>
            <label className="text-[12px] text-mt-muted">Search words (comma separated)<input className={field} value={open.search_keywords || ''} onChange={(e) => setOpen({ ...open, search_keywords: e.target.value })} placeholder="birthday invitation, kids party, 6th birthday" /></label>
            <label className="text-[12px] text-mt-muted">Description (80+ letters is best)<textarea className={`${field} h-20 py-2`} value={open.description || ''} onChange={(e) => setOpen({ ...open, description: e.target.value })} maxLength={300} /></label>
            <div className="text-[12px] text-mt-muted">Hashtags {!(open.hashtags || []).length && <span className="text-mt-faint">— none yet, so these automatic ones are used:</span>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {((open.hashtags || []).length ? open.hashtags! : autoHashtags(open)).map((h) => (
                  <span key={h} className={`h-7 pl-2.5 pr-1 rounded-full text-[12px] inline-flex items-center gap-1 ${(open.hashtags || []).length ? 'bg-mt-surface2 text-[#3B82C4]' : 'border border-dashed border-mt-border text-mt-faint'}`}>#{h}
                    {(open.hashtags || []).length ? <button onClick={() => setOpen({ ...open, hashtags: (open.hashtags || []).filter((x) => x !== h) })} className="h-5 w-5 grid place-items-center" aria-label={`Remove ${h}`}><X size={11} /></button> : <span className="w-1" />}
                  </span>
                ))}
                {BRAND_TAGS.map((h) => <span key={h} className="h-7 px-2.5 rounded-full text-[12px] inline-flex items-center text-mt-faint border border-mt-border" title="Always added">#{h}</span>)}
              </div>
              <div className="mt-1.5 flex gap-2">
                <input className={field} value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTag(tag); } }} placeholder="Type a hashtag and press Enter" />
                {!(open.hashtags || []).length && <button onClick={() => setOpen({ ...open, hashtags: autoHashtags(open) })} className="h-10 px-3 rounded-xl border border-mt-border text-[12px] shrink-0">Use these & edit</button>}
              </div>
            </div>
            <div className="flex gap-2 pt-1"><button onClick={save} disabled={busy} className="h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 bg-mt-primary text-mt-onprimary disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
