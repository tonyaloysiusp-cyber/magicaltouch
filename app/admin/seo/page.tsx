'use client';

// SEO & promotion (admins only):
//  · Overview — every landing page scored as Working / Needs work / Not
//    working, setup checks, visitors from search, and Ads & posts per page
//  · Keyword ideas — real autocomplete searches, one tap to draft a page
//  · Search engines — Google verification code, send all pages to Bing / Yandex
//  · Landing pages — create keyword pages ("free logo maker", "eid templates")
//    without code; they go live at /<slug> and in the sitemap
//  · Keywords — the searches we target (never creates pages)
//  · Free promotion — a checklist of free channels to list the site on
//  · Campaign links — tracked links (UTM) for posts, ads and partners

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Eye, EyeOff, Globe, Loader2, Pencil, Plus, Search, Send, Trash2, Link2, Sparkles, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { apiFetch } from '@/lib/api/client';
import { ALL_LANDINGS } from '@/lib/landings';
import { Overview } from '@/components/admin/seo/Overview';
import { KeywordIdeas } from '@/components/admin/seo/KeywordIdeas';
import { Promotion } from '@/components/admin/seo/Promotion';
import { Social } from '@/components/admin/seo/Social';
import { Performance } from '@/components/admin/seo/Performance';
import type { LandingDraft } from '@/lib/landingDraft';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

interface SeoPage { id: string; slug: string; title: string; h1: string; description: string; intro: string; thing: string; terms: string[]; faqs: [string, string][]; status: 'draft' | 'published' }
interface Promo { id: string; kind: 'channel' | 'campaign' | 'keyword'; name: string; url: string | null; status: 'todo' | 'doing' | 'done'; notes: string | null; meta: any }


type Tab = 'overview' | 'performance' | 'ideas' | 'pages' | 'engines' | 'promo' | 'social' | 'keywords' | 'links';
type PageRequest = { edit: string } | { draft: LandingDraft };

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export default function SeoAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [tab, setTab] = useState<Tab>('overview');
  // A page to open in the Landing pages editor (from Overview or Keyword ideas).
  const [request, setRequest] = useState<PageRequest | null>(null);
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [promo, setPromo] = useState<Promo[]>([]);
  const [gcode, setGcode] = useState('');
  const [bcode, setBcode] = useState('');
  const [hidden, setHiddenState] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: pr }, { data: s }] = await Promise.all([
      supabase.from('seo_pages').select('*').order('updated_at', { ascending: false }),
      supabase.from('promo_items').select('*').order('created_at', { ascending: true }),
      supabase.from('site_settings').select('key, value'),
    ]);
    setPages((p as SeoPage[]) || []);
    setPromo((pr as Promo[]) || []);
    setGcode(((s as any[]) || []).find((x) => x.key === 'google_verification')?.value || '');
    setBcode(((s as any[]) || []).find((x) => x.key === 'bing_verification')?.value || '');
    setHiddenState(new Set((((s as any[]) || []).find((x) => x.key === 'hidden_landings')?.value || '').split(',').map((x: string) => x.trim()).filter(Boolean)));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/seo');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      // Open a tab from the address (e.g. the autopilot report links to ?tab=performance).
      const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
      if (t && ['overview', 'performance', 'ideas', 'pages', 'engines', 'promo', 'social', 'keywords', 'links'].includes(t)) setTab(t);
      await load();
      setState('ok');
    })();
  }, [router, load]);

  const setHidden = async (h: Set<string>) => {
    const { error } = await supabase.from('site_settings').upsert({ key: 'hidden_landings', value: Array.from(h).sort().join(','), updated_at: new Date().toISOString() });
    if (error) { flash(error.message); return; }
    setHiddenState(new Set(h));
  };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 6000); };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  const TABS: [Tab, string][] = [['overview', 'Overview'], ['performance', 'Performance'], ['ideas', 'Keyword ideas'], ['pages', 'Landing pages'], ['engines', 'Search engines'], ['promo', 'Free promotion'], ['social', 'Social & promo kit'], ['keywords', 'Site search'], ['links', 'Campaign links']];
  const openPage = (r: PageRequest) => { setRequest(r); setTab('pages'); };
  const trackKeyword = async (name: string) => {
    const exists = promo.some((p) => p.kind === 'keyword' && p.name.toLowerCase() === name.toLowerCase());
    if (!exists) await supabase.from('promo_items').insert({ kind: 'keyword', name, status: 'todo', meta: { also: [] } });
    await load();
  };
  return (
    <AdminShell active="seo" title="SEO & promotion" accent="SEO" subtitle="See which pages work and which don’t, find the searches people make, fix pages in one place, send everything to Google and Bing, and promote the site for free.">
      <div className="flex flex-col gap-6">
        <nav role="tablist" className="flex gap-2 overflow-x-auto mt-scroll">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border ${tab === id ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{label}</button>
          ))}
        </nav>
        {msg && <p className="rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm">{msg}</p>}
        {tab === 'overview' && <Overview onEdit={(slug) => openPage({ edit: slug })} onTab={setTab} />}
        {tab === 'performance' && <Performance onEdit={(slug) => openPage({ edit: slug })} onDraft={(draft) => openPage({ draft })} flash={flash} />}
        {tab === 'ideas' && <KeywordIdeas onDraft={(draft) => openPage({ draft })} onKeyword={trackKeyword} />}
        {tab === 'engines' && <Engines gcode={gcode} setGcode={setGcode} bcode={bcode} setBcode={setBcode} flash={flash} busy={busy} setBusy={setBusy} />}
        {tab === 'pages' && <Pages pages={pages} hidden={hidden} setHidden={setHidden} reload={load} flash={flash} request={request} clearRequest={() => setRequest(null)} />}
        {tab === 'keywords' && <Keywords promo={promo} pages={pages} hidden={hidden} reload={load} />}
        {tab === 'promo' && <Promotion promo={promo} reload={load} />}
        {tab === 'social' && <Social flash={flash} />}
        {tab === 'links' && <Campaigns promo={promo} reload={load} />}
      </div>
    </AdminShell>
  );
}

// ---------------------------------------------------------------- search engines
function Engines({ gcode, setGcode, bcode, setBcode, flash, busy, setBusy }: { gcode: string; setGcode: (v: string) => void; bcode: string; setBcode: (v: string) => void; flash: (m: string) => void; busy: string | null; setBusy: (v: string | null) => void }) {
  const saveBing = async () => {
    const m = bcode.match(/content=["']([^"']+)["']/);
    const value = (m ? m[1] : bcode).trim();
    setBcode(value);
    await supabase.from('site_settings').upsert({ key: 'bing_verification', value, updated_at: new Date().toISOString() });
    flash(value ? 'Saved. It is on every page within an hour — then press Verify in Bing Webmaster Tools.' : 'Removed the Bing code.');
  };
  const saveCode = async () => {
    // Accept the whole <meta …> tag or just the content value.
    const m = gcode.match(/content=["']([^"']+)["']/);
    const value = (m ? m[1] : gcode).trim();
    setGcode(value);
    await supabase.from('site_settings').upsert({ key: 'google_verification', value, updated_at: new Date().toISOString() });
    flash(value ? 'Saved. It is on every page within an hour — then press Verify in Google Search Console.' : 'Removed the Google code.');
  };
  const ping = async () => {
    setBusy('ping');
    try {
      const r: any = await apiFetch('/api/admin/indexnow', { method: 'POST', body: JSON.stringify({}) });
      flash(`Sent ${r.submitted} pages: ${r.results.map((x: any) => `${x.engine} ${x.ok ? '✓' : `✕ (${x.status})`}`).join(' · ')}`);
      if (r.results.some((x: any) => x.ok)) await supabase.from('site_settings').upsert({ key: 'indexnow_last', value: new Date().toISOString(), updated_at: new Date().toISOString() });
    } catch (e: any) {
      flash(`Could not send: ${e?.message || e}`);
    }
    setBusy(null);
  };
  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Globe size={19} /> Google Search Console</h2>
        <ol className="mt-3 list-decimal pl-5 text-[14px] text-mt-muted space-y-1">
          <li>Open <a className="underline" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console</a> → Add property → URL prefix → <span className="font-mono">{SITE}</span>.</li>
          <li>Choose <b>HTML tag</b>, copy the tag and paste it below, then Save.</li>
          <li>Wait a few minutes, press <b>Verify</b> in Google, then submit <span className="font-mono">sitemap.xml</span> and <span className="font-mono">image-sitemap.xml</span>.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <input value={gcode} onChange={(e) => setGcode(e.target.value)} placeholder='<meta name="google-site-verification" content="…" />' className={`${field} flex-1 min-w-[260px] font-mono text-[12px]`} />
          <button onClick={saveCode} className={`${btn} bg-mt-primary text-mt-onprimary`}><Check size={14} /> Save</button>
        </div>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Globe size={19} /> Bing Webmaster Tools <span className="text-[12px] font-normal text-mt-muted">— also Yahoo, DuckDuckGo and ChatGPT search</span></h2>
        <ol className="mt-3 list-decimal pl-5 text-[14px] text-mt-muted space-y-1">
          <li><b>Fastest:</b> verify Google first, then in <a className="underline" href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer">Bing Webmaster Tools</a> choose <b>Import from Google Search Console</b> — nothing to paste here.</li>
          <li>Or choose <b>HTML Meta Tag</b>, copy the tag, paste it below and Save, then press Verify in Bing.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <input value={bcode} onChange={(e) => setBcode(e.target.value)} placeholder='<meta name="msvalidate.01" content="…" />' className={`${field} flex-1 min-w-[260px] font-mono text-[12px]`} />
          <button onClick={saveBing} className={`${btn} bg-mt-primary text-mt-onprimary`}><Check size={14} /> Save</button>
        </div>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Send size={19} /> Send all pages to search engines</h2>
        <p className="mt-2 text-[14px] text-mt-muted">Submits every page in the sitemap to Bing, Yandex and the shared IndexNow service, so new templates and pages get picked up fast. Do it after publishing new templates or pages.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy === 'ping'} onClick={ping} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy === 'ping' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send now</button>
          <a href="/sitemap.xml" target="_blank" className={`${btn} border border-mt-border text-mt-ink`}><ExternalLink size={14} /> sitemap.xml</a>
          <a href="/image-sitemap.xml" target="_blank" className={`${btn} border border-mt-border text-mt-ink`}><ExternalLink size={14} /> image-sitemap.xml</a>
          <a href={`https://www.google.com/search?q=site:${SITE.replace('https://', '')}`} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border text-mt-ink`}><Search size={14} /> Check Google</a>
          <a href={`https://www.bing.com/search?q=site:${SITE.replace('https://', '')}`} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border text-mt-ink`}><Search size={14} /> Check Bing</a>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- landing pages
// One list for every landing page: the built-in ones that ship with the site
// and the ones made here. Built-in pages can be edited (the edit is saved as a
// page with the same address and wins), reset to the original, switched off
// or back on. Custom pages can be edited, unpublished and deleted.
const EMPTY = { slug: '', title: '', h1: '', description: '', intro: '', thing: 'design', terms: '', faqs: '' };
type Row = { slug: string; h1: string; title: string; description: string; kind: 'builtin' | 'custom'; db?: SeoPage; hidden: boolean; edited: boolean; live: boolean };

function Pages({ pages, hidden, setHidden, reload, flash, request, clearRequest }: { pages: SeoPage[]; hidden: Set<string>; setHidden: (h: Set<string>) => Promise<void>; reload: () => Promise<void>; flash: (m: string) => void; request: PageRequest | null; clearRequest: () => void }) {
  const builtIn = useMemo(() => ALL_LANDINGS(), []);
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState<{ slug: string | null; id: string | null; builtin: boolean } | null>(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'all' | 'live' | 'builtin' | 'custom' | 'edited' | 'off'>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rows: Row[] = useMemo(() => {
    const db = new Map(pages.map((p) => [p.slug, p]));
    const seen = new Set<string>();
    const out: Row[] = [];
    builtIn.forEach((l) => {
      if (seen.has(l.slug)) return;
      seen.add(l.slug);
      const d = db.get(l.slug);
      const edited = !!d && d.status === 'published';
      out.push({ slug: l.slug, h1: edited ? d!.h1 : l.h1, title: edited ? d!.title : l.title, description: edited ? d!.description : l.description, kind: 'builtin', db: d, hidden: hidden.has(l.slug), edited, live: !hidden.has(l.slug) });
    });
    pages.forEach((p) => {
      if (seen.has(p.slug)) return;
      out.push({ slug: p.slug, h1: p.h1, title: p.title, description: p.description, kind: 'custom', db: p, hidden: hidden.has(p.slug), edited: false, live: p.status === 'published' && !hidden.has(p.slug) });
    });
    return out;
  }, [builtIn, pages, hidden]);

  const list = rows.filter((r) => {
    if (show === 'live' && !r.live) return false;
    if (show === 'builtin' && r.kind !== 'builtin') return false;
    if (show === 'custom' && r.kind !== 'custom') return false;
    if (show === 'edited' && !r.edited) return false;
    if (show === 'off' && r.live) return false;
    const t = q.trim().toLowerCase();
    return !t || `${r.slug} ${r.h1} ${r.title}`.toLowerCase().includes(t);
  });
  const counts = { all: rows.length, live: rows.filter((r) => r.live).length, builtin: rows.filter((r) => r.kind === 'builtin').length, custom: rows.filter((r) => r.kind === 'custom').length, edited: rows.filter((r) => r.edited).length, off: rows.filter((r) => !r.live).length };

  const set = (k: keyof typeof EMPTY, v: string) => setF((x) => ({ ...x, [k]: v, ...(k === 'h1' && !editing?.slug && (!x.slug || x.slug === slugify(x.h1)) ? { slug: slugify(v) } : {}) }));
  const openNew = () => { setEditing({ slug: null, id: null, builtin: false }); setF(EMPTY); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit = (r: Row) => {
    const b = builtIn.find((l) => l.slug === r.slug);
    const d = r.db;
    const src = d ? { title: d.title, h1: d.h1, description: d.description, intro: d.intro, thing: d.thing, terms: d.terms || [], faqs: d.faqs || [] } : { title: b!.title, h1: b!.h1, description: b!.description, intro: b!.intro.join('\n\n'), thing: b!.thing, terms: b!.terms, faqs: b!.faqs };
    setEditing({ slug: r.slug, id: d?.id || null, builtin: r.kind === 'builtin' });
    setF({ slug: r.slug, title: src.title, h1: src.h1, description: src.description, intro: src.intro, thing: src.thing, terms: src.terms.join(', '), faqs: src.faqs.map(([qq, aa]) => `${qq} | ${aa}`).join('\n') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const close = () => { setEditing(null); setF(EMPTY); };

  // Opened from Overview ("Fix this page") or Keyword ideas ("Create page").
  useEffect(() => {
    if (!request) return;
    if ('edit' in request) {
      const r = rows.find((x) => x.slug === request.edit);
      if (r) openEdit(r);
    } else {
      const d = request.draft;
      if (rows.some((r) => r.slug === d.slug)) flash(`/${d.slug} already exists — edit that page instead.`);
      else { setEditing({ slug: null, id: null, builtin: false }); setF({ ...d }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
    clearRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, rows]);

  const save = async (status: 'draft' | 'published') => {
    const slug = editing?.slug || slugify(f.slug || f.h1);
    if (!slug || !f.h1.trim() || !f.title.trim() || !f.description.trim()) return flash('Add a page heading, a Google title and a description.');
    if (!editing?.slug && rows.some((r) => r.slug === slug)) return flash(`/${slug} already exists — edit that page instead.`);
    const row = { slug, title: f.title.trim(), h1: f.h1.trim(), description: f.description.trim(), intro: f.intro.trim(), thing: f.thing.trim() || 'design', terms: f.terms.split(',').map((t) => t.trim()).filter(Boolean), faqs: f.faqs.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]).map(([qq, aa]) => [qq, aa]), status, updated_at: new Date().toISOString() };
    const { error } = editing?.id ? await supabase.from('seo_pages').update(row).eq('id', editing.id) : await supabase.from('seo_pages').insert(row);
    if (error) return flash(error.message.includes('duplicate') ? 'That address is already used.' : error.message);
    flash(status === 'published' ? `Saved — /${slug} shows the new text within an hour.` : editing?.builtin ? 'Saved as draft — the original text stays live until you publish.' : 'Saved as draft (not visible on the site).');
    close();
    reload();
  };

  const toggleHidden = async (slugs: string[], off: boolean) => {
    const h = new Set(hidden);
    slugs.forEach((x) => (off ? h.add(x) : h.delete(x)));
    await setHidden(h);
    flash(off ? `${slugs.length} page${slugs.length > 1 ? 's' : ''} switched off — removed from the site and the sitemap within an hour.` : `${slugs.length} page${slugs.length > 1 ? 's' : ''} back on.`);
  };
  const setStatus = async (r: Row, status: 'draft' | 'published') => {
    if (!r.db) return;
    await supabase.from('seo_pages').update({ status, updated_at: new Date().toISOString() }).eq('id', r.db.id);
    reload();
  };
  const removeRows = async (rs: Row[]) => {
    const custom = rs.filter((r) => r.kind === 'custom' && r.db);
    const builtins = rs.filter((r) => r.kind === 'builtin');
    const msg = [custom.length && `delete ${custom.length} custom page${custom.length > 1 ? 's' : ''}`, builtins.length && `switch off ${builtins.length} built-in page${builtins.length > 1 ? 's' : ''} (they can be switched back on)`].filter(Boolean).join(' and ');
    if (!msg || !window.confirm(`This will ${msg}. Continue?`)) return;
    setBusy(true);
    if (custom.length) await supabase.from('seo_pages').delete().in('id', custom.map((r) => r.db!.id));
    if (builtins.length) await toggleHidden(builtins.map((r) => r.slug), true);
    setSel(new Set());
    setBusy(false);
    reload();
  };
  const resetBuiltin = async (r: Row) => {
    if (!r.db || !window.confirm(`Put /${r.slug} back to its original text?`)) return;
    await supabase.from('seo_pages').delete().eq('id', r.db.id);
    reload();
  };

  const selected = rows.filter((r) => sel.has(r.slug));
  const titleLen = f.title.length, descLen = f.description.length;
  return (
    <>
      {editing && (
        <section className={card}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold inline-flex items-center gap-2 flex-1">{editing.slug ? <><Pencil size={18} /> Edit /{editing.slug}</> : <><Plus size={19} /> New landing page</>}</h2>
            <button onClick={close} aria-label="Close" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>
          </div>
          <p className="mt-1 text-[13px] text-mt-muted">{editing.builtin ? 'This is a built-in page. Your edit replaces its text; “Reset” in the list brings the original back.' : 'One page per search phrase. It lists every template whose name or keywords match the words you give, plus your text and questions.'}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="text-[12px] text-mt-muted">Page heading (H1)<input className={field} value={f.h1} onChange={(e) => set('h1', e.target.value)} placeholder="Free logo maker" /></label>
            <label className="text-[12px] text-mt-muted">Address<div className="flex items-center gap-1"><span className="text-[13px] text-mt-faint">/</span><input className={field} value={f.slug} disabled={!!editing.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="free-logo-maker" /></div></label>
            <label className="text-[12px] text-mt-muted lg:col-span-2">Google title <span className={titleLen > 60 ? 'text-amber-600' : ''}>({titleLen}/60)</span><input className={field} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Free Logo Maker — Design a Logo Online in Minutes" /></label>
            <label className="text-[12px] text-mt-muted lg:col-span-2">Google description <span className={descLen > 160 ? 'text-amber-600' : ''}>({descLen}/160)</span><textarea rows={2} className={`${field} h-auto py-2`} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
            <label className="text-[12px] text-mt-muted lg:col-span-2">Intro text (paragraphs separated by an empty line)<textarea rows={4} className={`${field} h-auto py-2`} value={f.intro} onChange={(e) => set('intro', e.target.value)} /></label>
            <label className="text-[12px] text-mt-muted">What it makes (e.g. “logo”, “Eid card”)<input className={field} value={f.thing} onChange={(e) => set('thing', e.target.value)} /></label>
            <label className="text-[12px] text-mt-muted">Template words to match (comma separated)<input className={field} value={f.terms} onChange={(e) => set('terms', e.target.value)} placeholder="logo, brand, business card" /></label>
            <label className="text-[12px] text-mt-muted lg:col-span-2">Questions — one per line: Question | Answer<textarea rows={4} className={`${field} h-auto py-2 font-mono text-[12px]`} value={f.faqs} onChange={(e) => set('faqs', e.target.value)} placeholder={'Is the logo maker free? | Yes, every template and download is free.'} /></label>
          </div>
          <EditorChecks f={f} />
          <div className="mt-4 rounded-2xl border border-mt-border p-4 max-w-2xl">
            <p className="text-[12px] text-mt-muted mb-1">How it can look on Google</p>
            <p className="text-[12px] text-[#4D5156]">{SITE.replace('https://', '')} › {f.slug || 'your-page'}</p>
            <p className="text-[18px] text-[#1A0DAB] leading-snug truncate">{f.title || 'Your Google title'}</p>
            <p className="text-[13px] text-[#4D5156] line-clamp-2">{f.description || 'Your description appears here.'}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => save('published')} className={`${btn} bg-emerald-600 text-white`}><Globe size={14} /> {editing.slug ? 'Save & publish' : 'Publish'}</button>
            <button onClick={() => save('draft')} className={`${btn} border border-mt-border text-mt-ink`}>Save draft</button>
            <button onClick={close} className={`${btn} text-mt-muted`}>Cancel</button>
          </div>
        </section>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold flex-1">Landing pages <span className="text-mt-muted font-normal">({counts.live} live)</span></h2>
          <button onClick={openNew} className={`${btn} bg-mt-primary text-mt-onprimary`}><Plus size={14} /> New page</button>
        </div>
        <p className="mt-1 text-[13px] text-mt-muted">Pages are built when someone first opens them and cached — nothing is pre-made or stored. Switching a page off removes it from the site and the sitemap.</p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" className={`${field} pl-9`} /></div>
          {([['all', 'All'], ['live', 'Live'], ['builtin', 'Built-in'], ['custom', 'Custom'], ['edited', 'Edited'], ['off', 'Off / draft']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setShow(id)} className={`h-8 px-3 rounded-full text-[12px] border ${show === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{label} {counts[id]}</button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-mt-surface2 px-3 py-2 text-[13px]">
            <b>{selected.length} selected</b>
            <button disabled={busy} onClick={() => toggleHidden(selected.map((r) => r.slug), true).then(() => setSel(new Set()))} className={`${btn} border border-mt-border`}><EyeOff size={14} /> Switch off</button>
            <button disabled={busy} onClick={() => toggleHidden(selected.map((r) => r.slug), false).then(() => setSel(new Set()))} className={`${btn} border border-mt-border`}><Eye size={14} /> Switch on</button>
            <button disabled={busy} onClick={() => removeRows(selected)} className={`${btn} text-rose-600`}><Trash2 size={14} /> Remove</button>
            <button onClick={() => setSel(new Set())} className={`${btn} text-mt-muted`}>Clear</button>
          </div>
        )}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead className="text-left text-mt-muted"><tr>
              <th className="py-2 w-8"><input type="checkbox" aria-label="Select all shown" checked={list.length > 0 && list.every((r) => sel.has(r.slug))} onChange={(e) => setSel(e.target.checked ? new Set(list.map((r) => r.slug)) : new Set())} /></th>
              <th>Page</th><th>Type</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.slug} className="border-t border-mt-border align-top">
                  <td className="py-2.5"><input type="checkbox" aria-label={`Select ${r.slug}`} checked={sel.has(r.slug)} onChange={(e) => setSel((x) => { const n = new Set(x); e.target.checked ? n.add(r.slug) : n.delete(r.slug); return n; })} /></td>
                  <td className="py-2.5 pr-3"><b className="text-mt-ink">{r.h1}</b><div className="text-mt-faint">/{r.slug}</div></td>
                  <td className="py-2.5 text-mt-muted">{r.kind === 'builtin' ? (r.edited ? 'Built-in · edited' : 'Built-in') : 'Custom'}</td>
                  <td className="py-2.5"><span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${r.live ? 'bg-emerald-600/10 text-emerald-600' : 'bg-mt-surface2 text-mt-muted'}`}>{r.hidden ? 'Off' : r.live ? 'Live' : 'Draft'}</span></td>
                  <td className="py-2.5 text-right whitespace-nowrap space-x-3">
                    {r.live && <a href={`/${r.slug}`} target="_blank" className="text-[#3B82C4] inline-flex items-center gap-1"><ExternalLink size={13} /> View</a>}
                    <button onClick={() => openEdit(r)} className="text-mt-muted hover:text-mt-ink">Edit</button>
                    {r.kind === 'builtin' && r.db && <button onClick={() => resetBuiltin(r)} className="text-mt-muted hover:text-mt-ink">Reset</button>}
                    {r.kind === 'custom' && !r.hidden && r.db && <button onClick={() => setStatus(r, r.db!.status === 'published' ? 'draft' : 'published')} className="text-mt-muted hover:text-mt-ink">{r.db.status === 'published' ? 'Unpublish' : 'Publish'}</button>}
                    {r.hidden ? <button onClick={() => toggleHidden([r.slug], false)} className="text-emerald-600">Switch on</button> : r.kind === 'builtin' && <button onClick={() => toggleHidden([r.slug], true)} className="text-mt-muted hover:text-mt-ink">Switch off</button>}
                    {r.kind === 'custom' && <button onClick={() => removeRows([r])} className="text-rose-600 inline-flex items-center gap-1"><Trash2 size={13} /> Delete</button>}
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="py-4 text-mt-muted">No pages match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- keywords
// Search keywords: the words people use to find things. They are not pages.
// Each keyword can list other words it also finds (so "nikah" finds wedding
// templates) and can be shown as a popular search on the Templates page.
// The list is published as one small public setting the gallery search
// reads. Below it: what visitors really searched, and which searches found
// nothing — add those as keywords to fix them.
const SUGGESTED = ['free design tool', 'canva alternative free', 'free flyer maker', 'free poster maker', 'free invitation maker', 'free resume maker', 'free certificate maker', 'business card', 'menu', 'instagram post', 'birthday', 'wedding', 'eid', 'diwali', 'christmas', 'uae national day'];
const STOP = ['free', 'online', 'the', 'and', 'for', 'maker', 'template', 'templates', 'design', 'with'];

function Keywords({ promo, reload }: { promo: Promo[]; pages: SeoPage[]; hidden: Set<string>; reload: () => Promise<void> }) {
  const [k, setK] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<{ id: string; name: string; also: string; notes: string } | null>(null);
  const [tpl, setTpl] = useState<{ hay: string }[]>([]);
  const [searches, setSearches] = useState<{ q: string; searches: number; results: number }[] | null>(null);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/public-templates').then((r) => r.json()).then((rows: any[]) => setTpl((rows || []).map((t) => ({ hay: `${t.name || ''} ${t.category || ''} ${(t.tags || []).join(' ')} ${t.search_keywords || ''} ${t.occasion || ''} ${t.industry || ''}`.toLowerCase() })))).catch(() => {});
  }, []);
  useEffect(() => {
    supabase.rpc('admin_searches', { p_days: days }).then(({ data }) => setSearches((data as any[]) || []));
  }, [days]);
  const kws = promo.filter((p) => p.kind === 'keyword');
  const alsoOf = (p: Promo): string[] => (Array.isArray(p.meta?.also) ? p.meta.also : []);
  const words = (kw: string) => kw.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !STOP.includes(w));
  const count = (kw: string, also: string[] = []) => {
    if (!tpl.length) return null;
    const groups = [words(kw).concat(also.map((a) => a.toLowerCase()))];
    if (!groups[0].length) return null;
    return tpl.filter((t) => groups[0].some((w) => t.hay.includes(w))).length;
  };

  // The public list the gallery search uses.
  const publish = async (list: Promo[]) => {
    const value = JSON.stringify(list.filter((p) => p.kind === 'keyword').map((p) => ({ k: p.name.trim().toLowerCase(), also: alsoOf(p), popular: !!p.meta?.popular })));
    await supabase.from('site_settings').upsert({ key: 'search_keywords', value, updated_at: new Date().toISOString() });
  };
  const after = async () => {
    await reload();
    const { data } = await supabase.from('promo_items').select('*').eq('kind', 'keyword');
    await publish((data as Promo[]) || []);
    setNote('Saved — the Templates search uses it straight away.');
    setTimeout(() => setNote(null), 4000);
  };

  const add = async (name: string, also: string[] = []) => {
    const parts = name.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).filter((n) => !kws.some((x) => x.name.toLowerCase() === n.toLowerCase()));
    if (!parts.length) return;
    await supabase.from('promo_items').insert(parts.map((n) => ({ kind: 'keyword', name: n, status: 'todo', meta: { also } })));
    setK('');
    after();
  };
  const setStatus = async (p: Promo, status: Promo['status']) => { await supabase.from('promo_items').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id); reload(); };
  const togglePopular = async (p: Promo) => { await supabase.from('promo_items').update({ meta: { ...(p.meta || {}), popular: !p.meta?.popular } }).eq('id', p.id); after(); };
  const saveEdit = async () => {
    if (!edit || !edit.name.trim()) return;
    const p = kws.find((x) => x.id === edit.id);
    const also = edit.also.split(',').map((x) => x.trim()).filter(Boolean);
    await supabase.from('promo_items').update({ name: edit.name.trim(), notes: edit.notes.trim() || null, meta: { ...(p?.meta || {}), also }, updated_at: new Date().toISOString() }).eq('id', edit.id);
    setEdit(null);
    after();
  };
  const remove = async (p: Promo) => {
    if (!window.confirm(`Remove the keyword “${p.name}”?`)) return;
    await supabase.from('promo_items').delete().eq('id', p.id);
    after();
  };
  const shown = kws.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const known = new Set(kws.map((x) => x.name.toLowerCase()));

  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Search size={19} /> Search keywords</h2>
        <p className="mt-1 text-[13px] text-mt-muted">The words people use to find templates. Keywords are not pages: they make the Templates search smarter. Give a keyword other words it should also find (e.g. <i>nikah</i> → wedding, walima), and switch on <i>Popular</i> to show it as a one-tap search under the search box. Separate several keywords with commas.</p>
        <div className="mt-4 flex gap-2"><input value={k} onChange={(e) => setK(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(k)} placeholder="e.g. nikah, graduation party" className={field} /><button onClick={() => add(k)} className={`${btn} bg-mt-primary text-mt-onprimary`}><Plus size={14} /> Add</button></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{SUGGESTED.filter((s) => !known.has(s)).map((s) => <button key={s} onClick={() => add(s)} className="h-7 px-2.5 rounded-full border border-mt-border text-[12px] text-mt-muted hover:text-mt-ink">+ {s}</button>)}</div>
        {note && <p className="mt-3 text-[13px] text-emerald-600">{note}</p>}
        {kws.length > 8 && <div className="mt-4 relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kws.length} keywords`} className={`${field} pl-9`} /></div>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead className="text-left text-mt-muted"><tr><th className="py-2">Keyword</th><th>Also finds</th><th>Templates found</th><th>Popular</th><th>Google ranking</th><th></th></tr></thead>
            <tbody>
              {shown.map((p) => {
                const n = count(p.name, alsoOf(p));
                const isEdit = edit?.id === p.id;
                return (
                  <tr key={p.id} className="border-t border-mt-border align-top">
                    <td className="py-2 pr-3">
                      {isEdit ? <input autoFocus value={edit!.name} onChange={(e) => setEdit({ ...edit!, name: e.target.value })} className={field} /> : <><span className="font-medium text-mt-ink">{p.name}</span>{p.notes && <div className="text-mt-faint text-[12px]">{p.notes}</div>}</>}
                    </td>
                    <td className="py-2 pr-3 max-w-[240px]">
                      {isEdit ? (
                        <div className="flex flex-col gap-1.5">
                          <input value={edit!.also} onChange={(e) => setEdit({ ...edit!, also: e.target.value })} placeholder="wedding, walima" className={field} />
                          <input value={edit!.notes} onChange={(e) => setEdit({ ...edit!, notes: e.target.value })} placeholder="Note (optional)" className={field} />
                        </div>
                      ) : alsoOf(p).length ? <span className="text-mt-muted">{alsoOf(p).join(', ')}</span> : <span className="text-mt-faint">—</span>}
                    </td>
                    <td className="py-2">{n === null ? <span className="text-mt-faint">—</span> : <a href={`/templates?q=${encodeURIComponent(p.name)}`} target="_blank" className={n ? 'text-mt-ink hover:underline' : 'text-amber-600'}>{n} {n === 1 ? 'template' : 'templates'}{!n && ' — add “also finds” words'}</a>}</td>
                    <td className="py-2"><input type="checkbox" aria-label={`Show ${p.name} as a popular search`} checked={!!p.meta?.popular} onChange={() => togglePopular(p)} /></td>
                    <td className="py-2"><select value={p.status} onChange={(e) => setStatus(p, e.target.value as any)} className="h-8 rounded-lg border border-mt-border bg-mt-surface text-[12px] px-2"><option value="todo">Not ranking yet</option><option value="doing">On page 2–5</option><option value="done">On page 1</option></select></td>
                    <td className="py-2 text-right whitespace-nowrap space-x-3">
                      {isEdit ? <><button onClick={saveEdit} className="text-emerald-600 font-semibold">Save</button><button onClick={() => setEdit(null)} className="text-mt-muted">Cancel</button></>
                        : <><button onClick={() => setEdit({ id: p.id, name: p.name, also: alsoOf(p).join(', '), notes: p.notes || '' })} className="text-mt-muted hover:text-mt-ink">Edit</button><button onClick={() => remove(p)} className="text-rose-600">Remove</button></>}
                    </td>
                  </tr>
                );
              })}
              {!kws.length && <tr><td colSpan={6} className="py-4 text-mt-muted">Add keywords above or tap a suggestion.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold flex-1">What visitors searched</h2>
          {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`h-8 px-3 rounded-full text-[12px] border ${days === d ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{d} days</button>)}
        </div>
        <p className="mt-1 text-[13px] text-mt-muted">Searches typed in the Templates gallery. Searches that found nothing are in amber — add them as keywords with “also finds” words, or make templates for them.</p>
        {searches === null ? <p className="mt-3 text-[13px] text-mt-muted">Loading…</p> : !searches.length ? <p className="mt-3 text-[13px] text-mt-muted">No searches yet.</p> : (
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-[13px]">
            {searches.map((r) => (
              <li key={r.q} className="flex items-center justify-between gap-2 py-1 border-b border-mt-border">
                <span className={r.results ? 'text-mt-ink truncate' : 'text-amber-600 truncate'}>{r.q}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-mt-muted tabular-nums">{r.searches}× · {r.results} found</span>
                  {!known.has(r.q) && <button onClick={() => add(r.q)} className="text-[12px] text-[#3B82C4] hover:underline">+ keyword</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- editor checks
// Live checks while writing a landing page, so it scores well before publishing.
function EditorChecks({ f }: { f: typeof EMPTY }) {
  const words = [f.h1, f.intro, f.faqs].join(' ').split(/\s+/).filter(Boolean).length;
  const kw = f.h1.toLowerCase().replace(/^free\s+/, '').split(/\s+/).slice(0, 2).join(' ');
  const faqs = f.faqs.split('\n').filter((l) => l.includes('|')).length;
  const checks: [boolean, string][] = [
    [f.title.length >= 30 && f.title.length <= 60, `Google title 30–60 characters (now ${f.title.length})`],
    [!!kw && f.title.toLowerCase().includes(kw), `Title contains the main phrase “${kw || '…'}”`],
    [f.description.length >= 120 && f.description.length <= 160, `Description 120–160 characters (now ${f.description.length})`],
    [words >= 150, `Your own text: ${words} words (aim for 150+; the built-in guide adds ~350 more)`],
    [faqs >= 3, `3+ questions (now ${faqs}) — they can show on Google`],
    [f.terms.trim().length > 0, 'Template words set, so the page shows templates'],
  ];
  const ok = checks.filter((c) => c[0]).length;
  return (
    <div className="mt-4 rounded-2xl bg-mt-surface2 p-4 max-w-2xl">
      <p className="text-[12px] font-semibold text-mt-ink">SEO check — {ok}/{checks.length}</p>
      <ul className="mt-2 grid gap-1 text-[12px]">{checks.map(([pass, t]) => <li key={t} className={pass ? 'text-emerald-600' : 'text-amber-600'}>{pass ? '✓' : '•'} {t}</li>)}</ul>
    </div>
  );
}

// ---------------------------------------------------------------- campaign links (UTM)
function Campaigns({ promo, reload }: { promo: Promo[]; reload: () => Promise<void> }) {
  const [c, setC] = useState({ page: '/', source: 'instagram', medium: 'social', campaign: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const url = useMemo(() => {
    const u = new URL(c.page.startsWith('http') ? c.page : `${SITE}${c.page.startsWith('/') ? '' : '/'}${c.page}`);
    if (c.source) u.searchParams.set('utm_source', c.source);
    if (c.medium) u.searchParams.set('utm_medium', c.medium);
    if (c.campaign) u.searchParams.set('utm_campaign', slugify(c.campaign));
    return u.toString();
  }, [c]);
  const rows = promo.filter((p) => p.kind === 'campaign');
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(t); setTimeout(() => setCopied(null), 1500); });
  const save = async () => { if (!c.campaign.trim()) return; await supabase.from('promo_items').insert({ kind: 'campaign', name: c.campaign.trim(), url, status: 'doing', meta: c }); reload(); };
  const remove = async (p: Promo) => { await supabase.from('promo_items').delete().eq('id', p.id); reload(); };
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Link2 size={19} /> Campaign links</h2>
      <p className="mt-1 text-[13px] text-mt-muted">Make a tracked link for each post, ad or partner, so you can see which ones bring visitors (in Google Analytics or Vercel Analytics).</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-[12px] text-mt-muted">Page<input className={field} value={c.page} onChange={(e) => setC({ ...c, page: e.target.value })} placeholder="/free-flyer-maker" /></label>
        <label className="text-[12px] text-mt-muted">Where it is posted<select className={field} value={c.source} onChange={(e) => setC({ ...c, source: e.target.value })}>{['instagram', 'facebook', 'linkedin', 'pinterest', 'youtube', 'whatsapp', 'tiktok', 'x', 'reddit', 'producthunt', 'newsletter', 'google-ads', 'partner'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-[12px] text-mt-muted">Type<select className={field} value={c.medium} onChange={(e) => setC({ ...c, medium: e.target.value })}>{['social', 'paid', 'email', 'referral', 'listing', 'video'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-[12px] text-mt-muted">Campaign name<input className={field} value={c.campaign} onChange={(e) => setC({ ...c, campaign: e.target.value })} placeholder="national-day-2026" /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-[260px] rounded-xl bg-mt-surface2 px-3 py-2 text-[12px] break-all">{url}</code>
        <button onClick={() => copy(url)} className={`${btn} border border-mt-border text-mt-ink`}>{copied === url ? <Check size={14} /> : <Copy size={14} />} Copy</button>
        <button onClick={save} disabled={!c.campaign.trim()} className={`${btn} bg-mt-primary text-mt-onprimary`}><Sparkles size={14} /> Save campaign</button>
      </div>
      <ul className="mt-5 divide-y divide-mt-border">
        {rows.map((r) => (
          <li key={r.id} className="py-2.5 flex flex-wrap items-center gap-3 text-[13px]">
            <b className="text-mt-ink">{r.name}</b>
            <span className="flex-1 min-w-[200px] text-mt-muted truncate">{r.url}</span>
            <button onClick={() => copy(r.url || '')} className="text-mt-muted hover:text-mt-ink">{copied === r.url ? 'Copied' : 'Copy'}</button>
            <button onClick={() => remove(r)} className="text-rose-600">Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
