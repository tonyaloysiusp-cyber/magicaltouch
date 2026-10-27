'use client';

// SEO & promotion (admins only):
//  · Search engines — Google verification code, send all pages to Bing / Yandex
//  · Landing pages — create keyword pages ("free logo maker", "eid templates")
//    without code; they go live at /<slug> and in the sitemap
//  · Keywords — the searches we target and which page answers each
//  · Free promotion — a checklist of free channels to list the site on
//  · Campaign links — tracked links (UTM) for posts, ads and partners

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Globe, Loader2, Megaphone, Plus, Search, Send, Trash2, Link2, Sparkles } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { apiFetch } from '@/lib/api/client';
import { ALL_LANDINGS } from '@/lib/landings';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

interface SeoPage { id: string; slug: string; title: string; h1: string; description: string; intro: string; thing: string; terms: string[]; faqs: [string, string][]; status: 'draft' | 'published' }
interface Promo { id: string; kind: 'channel' | 'campaign' | 'keyword'; name: string; url: string | null; status: 'todo' | 'doing' | 'done'; notes: string | null; meta: any }

const CHANNELS: [string, string, string][] = [
  ['Google Search Console', 'https://search.google.com/search-console', 'Verify the site and submit sitemap.xml — the most important step for Google.'],
  ['Bing Webmaster Tools', 'https://www.bing.com/webmasters', 'Import from Search Console; also covers Yahoo and DuckDuckGo.'],
  ['Google Business Profile', 'https://business.google.com', 'Category: Graphic designer / Software company — not interior design.'],
  ['AlternativeTo', 'https://alternativeto.net', 'Add as a free alternative to Canva and Photoshop.'],
  ['Product Hunt', 'https://www.producthunt.com', 'Launch: “Free design tool — every feature free”.'],
  ['SaaSHub', 'https://www.saashub.com', 'Free software listing.'],
  ['BetaList', 'https://betalist.com', 'Startup listing.'],
  ['Pinterest', 'https://www.pinterest.com', 'Pin template previews with links — big free traffic for templates.'],
  ['Behance', 'https://www.behance.net', 'Show template collections with the site link.'],
  ['Dribbble', 'https://dribbble.com', 'Post designs with the site link.'],
  ['Figma Community', 'https://www.figma.com/community', 'Publish a free template pack, site link in profile.'],
  ['Instagram', 'https://www.instagram.com', 'Link in bio; post a template every day.'],
  ['Facebook Page', 'https://www.facebook.com', 'Page + posts in small-business groups.'],
  ['LinkedIn', 'https://www.linkedin.com', 'Company page and founder posts.'],
  ['YouTube', 'https://www.youtube.com', 'Short tutorials linking to /tutorials.'],
  ['Reddit', 'https://www.reddit.com', 'Helpful answers in r/canva, r/graphic_design, r/smallbusiness — no spam.'],
];

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export default function SeoAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [tab, setTab] = useState<'engines' | 'pages' | 'keywords' | 'promo' | 'links'>('engines');
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [promo, setPromo] = useState<Promo[]>([]);
  const [gcode, setGcode] = useState('');
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
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/seo');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
      setState('ok');
    })();
  }, [router, load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 6000); };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  const TABS = [['engines', 'Search engines'], ['pages', 'Landing pages'], ['keywords', 'Keywords'], ['promo', 'Free promotion'], ['links', 'Campaign links']] as const;
  return (
    <AdminShell active="seo" title="SEO & promotion" accent="SEO" subtitle="Get found on Google and Bing: landing pages for the searches people make, quick submission to search engines, free promotion channels and tracked campaign links.">
      <div className="flex flex-col gap-6">
        <nav role="tablist" className="flex gap-2 overflow-x-auto mt-scroll">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border ${tab === id ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{label}</button>
          ))}
        </nav>
        {msg && <p className="rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm">{msg}</p>}
        {tab === 'engines' && <Engines gcode={gcode} setGcode={setGcode} flash={flash} busy={busy} setBusy={setBusy} />}
        {tab === 'pages' && <Pages pages={pages} reload={load} flash={flash} />}
        {tab === 'keywords' && <Keywords promo={promo} pages={pages} reload={load} />}
        {tab === 'promo' && <Channels promo={promo} reload={load} />}
        {tab === 'links' && <Campaigns promo={promo} reload={load} />}
      </div>
    </AdminShell>
  );
}

// ---------------------------------------------------------------- search engines
function Engines({ gcode, setGcode, flash, busy, setBusy }: { gcode: string; setGcode: (v: string) => void; flash: (m: string) => void; busy: string | null; setBusy: (v: string | null) => void }) {
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
const EMPTY = { slug: '', title: '', h1: '', description: '', intro: '', thing: 'design', terms: '', faqs: '', status: 'draft' as 'draft' | 'published' };

function Pages({ pages, reload, flash }: { pages: SeoPage[]; reload: () => Promise<void>; flash: (m: string) => void }) {
  const [f, setF] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const builtIn = ALL_LANDINGS();
  const set = (k: keyof typeof EMPTY, v: string) => setF((x) => ({ ...x, [k]: v, ...(k === 'h1' && !editId && (!x.slug || x.slug === slugify(x.h1)) ? { slug: slugify(v) } : {}) }));
  const edit = (p: SeoPage) => { setEditId(p.id); setF({ slug: p.slug, title: p.title, h1: p.h1, description: p.description, intro: p.intro, thing: p.thing, terms: p.terms.join(', '), faqs: (p.faqs || []).map(([q, a]) => `${q} | ${a}`).join('\n'), status: p.status }); };
  const save = async (status: 'draft' | 'published') => {
    const slug = slugify(f.slug || f.h1);
    if (!slug || !f.h1.trim() || !f.title.trim() || !f.description.trim()) return flash('Add a page heading, a Google title and a description.');
    if (builtIn.some((l) => l.slug === slug) && !editId) return flash(`/${slug} already exists as a built-in page.`);
    const row = { slug, title: f.title.trim(), h1: f.h1.trim(), description: f.description.trim(), intro: f.intro.trim(), thing: f.thing.trim() || 'design', terms: f.terms.split(',').map((t) => t.trim()).filter(Boolean), faqs: f.faqs.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]).map(([q, a]) => [q, a]), status, updated_at: new Date().toISOString() };
    const { error } = editId ? await supabase.from('seo_pages').update(row).eq('id', editId) : await supabase.from('seo_pages').insert(row);
    if (error) return flash(error.message.includes('duplicate') ? 'That address is already used.' : error.message);
    flash(status === 'published' ? `Live at /${slug} (within an hour on Google’s next visit). Press “Send now” in Search engines to tell Bing.` : 'Saved as draft.');
    setF(EMPTY);
    setEditId(null);
    reload();
  };
  const remove = async (p: SeoPage) => {
    if (!window.confirm(`Delete the page /${p.slug}?`)) return;
    await supabase.from('seo_pages').delete().eq('id', p.id);
    reload();
  };
  const titleLen = f.title.length, descLen = f.description.length;
  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Plus size={19} /> {editId ? 'Edit landing page' : 'New landing page'}</h2>
        <p className="mt-1 text-[13px] text-mt-muted">One page per search phrase. It lists every template whose name or keywords match the words you give, plus your text and questions.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-[12px] text-mt-muted">Page heading (H1)<input className={field} value={f.h1} onChange={(e) => set('h1', e.target.value)} placeholder="Free logo maker" /></label>
          <label className="text-[12px] text-mt-muted">Address<div className="flex items-center gap-1"><span className="text-[13px] text-mt-faint">/</span><input className={field} value={f.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="free-logo-maker" /></div></label>
          <label className="text-[12px] text-mt-muted lg:col-span-2">Google title <span className={titleLen > 60 ? 'text-amber-600' : ''}>({titleLen}/60)</span><input className={field} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Free Logo Maker — Design a Logo Online in Minutes" /></label>
          <label className="text-[12px] text-mt-muted lg:col-span-2">Google description <span className={descLen > 160 ? 'text-amber-600' : ''}>({descLen}/160)</span><textarea rows={2} className={`${field} h-auto py-2`} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
          <label className="text-[12px] text-mt-muted lg:col-span-2">Intro text (a short paragraph or two)<textarea rows={3} className={`${field} h-auto py-2`} value={f.intro} onChange={(e) => set('intro', e.target.value)} /></label>
          <label className="text-[12px] text-mt-muted">What it makes (e.g. “logo”, “Eid card”)<input className={field} value={f.thing} onChange={(e) => set('thing', e.target.value)} /></label>
          <label className="text-[12px] text-mt-muted">Template words to match (comma separated)<input className={field} value={f.terms} onChange={(e) => set('terms', e.target.value)} placeholder="logo, brand, business card" /></label>
          <label className="text-[12px] text-mt-muted lg:col-span-2">Questions — one per line: Question | Answer<textarea rows={3} className={`${field} h-auto py-2 font-mono text-[12px]`} value={f.faqs} onChange={(e) => set('faqs', e.target.value)} placeholder={'Is the logo maker free? | Yes, every template and download is free.'} /></label>
        </div>
        <div className="mt-4 rounded-2xl border border-mt-border p-4 max-w-2xl">
          <p className="text-[12px] text-mt-muted mb-1">How it can look on Google</p>
          <p className="text-[12px] text-[#4D5156]">{SITE.replace('https://', '')} › {f.slug || 'your-page'}</p>
          <p className="text-[18px] text-[#1A0DAB] leading-snug truncate">{f.title || 'Your Google title'}</p>
          <p className="text-[13px] text-[#4D5156] line-clamp-2">{f.description || 'Your description appears here.'}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => save('published')} className={`${btn} bg-emerald-600 text-white`}><Globe size={14} /> Publish</button>
          <button onClick={() => save('draft')} className={`${btn} border border-mt-border text-mt-ink`}>Save draft</button>
          {editId && <button onClick={() => { setEditId(null); setF(EMPTY); }} className={`${btn} text-mt-muted`}>Cancel</button>}
        </div>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold">Your pages <span className="text-mt-muted font-normal">({pages.length})</span></h2>
        <ul className="mt-3 divide-y divide-mt-border">
          {pages.map((p) => (
            <li key={p.id} className="py-3 flex flex-wrap items-center gap-3">
              <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-600/10 text-emerald-600' : 'bg-mt-surface2 text-mt-muted'}`}>{p.status}</span>
              <span className="flex-1 min-w-[200px]"><b className="text-mt-ink">{p.h1}</b> <span className="text-mt-muted text-[13px]">/{p.slug}</span></span>
              {p.status === 'published' && <a href={`/${p.slug}`} target="_blank" className="text-[13px] text-[#3B82C4] inline-flex items-center gap-1"><ExternalLink size={13} /> View</a>}
              <button onClick={() => edit(p)} className="text-[13px] text-mt-muted hover:text-mt-ink">Edit</button>
              <button onClick={() => remove(p)} className="text-[13px] text-rose-600 inline-flex items-center gap-1"><Trash2 size={13} /> Delete</button>
            </li>
          ))}
          {!pages.length && <li className="py-3 text-[13px] text-mt-muted">No custom pages yet.</li>}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold">Built-in pages ({builtIn.length})</summary>
          <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[13px]">
            {builtIn.map((l) => <li key={l.slug}><a href={`/${l.slug}`} target="_blank" className="text-mt-muted hover:text-mt-ink">/{l.slug}</a></li>)}
          </ul>
        </details>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- keywords
const SUGGESTED = ['free design tool', 'canva alternative free', 'free photoshop alternative', 'free flyer maker', 'free poster maker', 'free invitation maker', 'free resume maker', 'free certificate maker', 'free business card maker', 'free menu maker', 'instagram post maker', 'remove background free', 'design templates free', 'تصميم فلاير مجانا', 'تصميم بطاقة دعوة', 'christmas templates', 'uae national day templates', 'diwali templates'];

function Keywords({ promo, pages, reload }: { promo: Promo[]; pages: SeoPage[]; reload: () => Promise<void> }) {
  const [k, setK] = useState('');
  const kws = promo.filter((p) => p.kind === 'keyword');
  const allPages = useMemo(() => [...ALL_LANDINGS().map((l) => ({ slug: l.slug, h1: l.h1, text: `${l.h1} ${l.title} ${l.terms.join(' ')}` })), ...pages.filter((p) => p.status === 'published').map((p) => ({ slug: p.slug, h1: p.h1, text: `${p.h1} ${p.title} ${p.terms.join(' ')}` }))], [pages]);
  const bestPage = (kw: string) => {
    const words = kw.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !['free', 'online', 'the', 'and'].includes(w));
    let best: { slug: string; h1: string } | null = null, score = 0;
    allPages.forEach((p) => { const t = p.text.toLowerCase(); const s = words.filter((w) => t.includes(w)).length; if (s > score) { score = s; best = p; } });
    return best as { slug: string; h1: string } | null;
  };
  const add = async (name: string) => {
    const n = name.trim();
    if (!n || kws.some((x) => x.name.toLowerCase() === n.toLowerCase())) return;
    await supabase.from('promo_items').insert({ kind: 'keyword', name: n, status: 'todo' });
    setK('');
    reload();
  };
  const setStatus = async (p: Promo, status: Promo['status']) => { await supabase.from('promo_items').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id); reload(); };
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Search size={19} /> Keywords we target</h2>
      <p className="mt-1 text-[13px] text-mt-muted">Type the words people search for. Each keyword shows the page that answers it — if there is none, create one in Landing pages.</p>
      <div className="mt-4 flex gap-2"><input value={k} onChange={(e) => setK(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(k)} placeholder="e.g. free logo maker" className={field} /><button onClick={() => add(k)} className={`${btn} bg-mt-primary text-mt-onprimary`}><Plus size={14} /> Add</button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{SUGGESTED.filter((s) => !kws.some((x) => x.name === s)).map((s) => <button key={s} onClick={() => add(s)} className="h-7 px-2.5 rounded-full border border-mt-border text-[12px] text-mt-muted hover:text-mt-ink">+ {s}</button>)}</div>
      <table className="mt-5 w-full text-[13px]">
        <thead className="text-left text-mt-muted"><tr><th className="py-2">Keyword</th><th>Page that answers it</th><th>Check</th><th>Status</th></tr></thead>
        <tbody>
          {kws.map((p) => {
            const page = bestPage(p.name);
            return (
              <tr key={p.id} className="border-t border-mt-border">
                <td className="py-2 font-medium text-mt-ink">{p.name}</td>
                <td>{page ? <a href={`/${page.slug}`} target="_blank" className="text-[#3B82C4]">/{page.slug}</a> : <span className="text-amber-600">No page yet — create one</span>}</td>
                <td><a href={`https://www.google.com/search?q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer" className="text-mt-muted hover:text-mt-ink">Google</a> · <a href={`https://www.bing.com/search?q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer" className="text-mt-muted hover:text-mt-ink">Bing</a></td>
                <td><select value={p.status} onChange={(e) => setStatus(p, e.target.value as any)} className="h-8 rounded-lg border border-mt-border bg-mt-surface text-[12px] px-2"><option value="todo">Not ranking yet</option><option value="doing">On page 2–5</option><option value="done">On page 1</option></select></td>
              </tr>
            );
          })}
          {!kws.length && <tr><td colSpan={4} className="py-4 text-mt-muted">Add keywords above or tap a suggestion.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

// ---------------------------------------------------------------- free promotion checklist
function Channels({ promo, reload }: { promo: Promo[]; reload: () => Promise<void> }) {
  const rows = promo.filter((p) => p.kind === 'channel');
  useEffect(() => {
    // Seed the checklist the first time.
    if (rows.length) return;
    supabase.from('promo_items').insert(CHANNELS.map(([name, url, notes]) => ({ kind: 'channel', name, url, notes, status: 'todo' }))).then(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setStatus = async (p: Promo, status: Promo['status']) => { await supabase.from('promo_items').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id); reload(); };
  const done = rows.filter((r) => r.status === 'done').length;
  const blurb = 'Magical Touch Design is a free online design tool with 1,000+ professional templates for flyers, posters, invitations, resumes, menus, certificates and social media. Full editor, photo studio with background removal, and print-ready PDF / CMYK export — every feature free, no watermark, English and Arabic.';
  const [copied, setCopied] = useState(false);
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Megaphone size={19} /> Free promotion — {done}/{rows.length} done</h2>
        <button onClick={() => navigator.clipboard?.writeText(blurb).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className={`${btn} border border-mt-border text-mt-ink`}>{copied ? <Check size={14} /> : <Copy size={14} />} Copy our description</button>
      </div>
      <p className="mt-1 text-[13px] text-mt-muted">Every listing is a link to the site — the more good links, the higher Google ranks it. All free.</p>
      <ul className="mt-4 divide-y divide-mt-border">
        {rows.map((r) => (
          <li key={r.id} className="py-3 flex flex-wrap items-center gap-3">
            <button onClick={() => setStatus(r, r.status === 'done' ? 'todo' : 'done')} aria-label={`Mark ${r.name} done`} className={`h-6 w-6 rounded-md border inline-flex items-center justify-center ${r.status === 'done' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-mt-border'}`}>{r.status === 'done' && <Check size={14} />}</button>
            <span className="flex-1 min-w-[220px]"><b className={r.status === 'done' ? 'line-through text-mt-muted' : 'text-mt-ink'}>{r.name}</b><span className="block text-[12px] text-mt-muted">{r.notes}</span></span>
            {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-[13px] text-[#3B82C4] inline-flex items-center gap-1">Open <ExternalLink size={13} /></a>}
          </li>
        ))}
      </ul>
    </section>
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
