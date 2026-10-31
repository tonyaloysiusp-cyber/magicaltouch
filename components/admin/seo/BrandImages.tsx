'use client';

// Admin → SEO → Social → "Your images" — everything people see when the
// site is shared or found, fully editable here:
//  · Share image: the picture Google, WhatsApp, Facebook and LinkedIn show
//    for the site. Drawn live (/api/og): edit the words and colours, pick the
//    templates shown; {count} is always the live template count.
//  · Promo designs: ready brand posts (Instagram, story, Facebook, LinkedIn,
//    Pinterest…) saved as editable designs — open one in the editor to change
//    any word, colour, photo or template picture, then download or post it.

import { useEffect, useState } from 'react';
import { Check, Download, ExternalLink, Loader2, PenLine, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api/client';
import { parseShareImage, ShareImage, SHARE_DEFAULT } from '@/lib/shareImage';
import { useTemplateCountLabel } from '@/lib/templateCount';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
interface T { id: string; slug: string; name: string; thumbnail: string | null; preview: string | null; width: number; height: number; status?: string }

export function BrandImages({ flash }: { flash: (m: string) => void }) {
  const count = useTemplateCountLabel();
  const [s, setS] = useState<ShareImage>(SHARE_DEFAULT);
  const [picked, setPicked] = useState<T[]>([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<T[]>([]);
  const [v, setV] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [promos, setPromos] = useState<T[] | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'share_image').maybeSingle().then(async ({ data }) => {
      const x = parseShareImage((data as any)?.value);
      setS(x);
      if (x.templates.length) {
        const { data: rows } = await supabase.from('templates').select('id,slug,name,thumbnail,preview,width,height').in('slug', x.templates);
        setPicked(((rows as T[]) || []).sort((a, b) => x.templates.indexOf(a.slug) - x.templates.indexOf(b.slug)));
      }
    });
    supabase.from('templates').select('id,slug,name,thumbnail,preview,width,height,status').contains('tags', ['brand-promo']).order('sort_order').then(({ data }) => setPromos((data as T[]) || []));
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setFound([]);
    const h = setTimeout(async () => {
      const { data } = await supabase.from('templates').select('id,slug,name,thumbnail,preview,width,height').eq('status', 'published').ilike('name', `%${term}%`).limit(12);
      setFound((data as T[]) || []);
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const save = async () => {
    setBusy(true);
    const value = JSON.stringify({ ...s, templates: picked.map((p) => p.slug) });
    const { error } = await supabase.from('site_settings').upsert({ key: 'share_image', value, updated_at: new Date().toISOString() });
    if (!error) await apiFetch('/api/count-refresh', { method: 'POST', body: '{}' }).catch(() => null);
    setBusy(false);
    if (error) return flash(error.message);
    setTimeout(() => setV(Date.now()), 1500);
    flash('Saved — Google, WhatsApp and Facebook pick up the new image the next time they visit.');
  };
  const set = (k: keyof ShareImage) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value });

  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-lg font-semibold">Share image</h2>
            <p className="text-[13px] text-mt-muted">The picture Google, WhatsApp, Facebook and LinkedIn show for your site. Change the words, colours and templates — <b>{'{count}'}</b> is always the live number ({count}).</p>
          </div>
          <a href="/api/og" target="_blank" className={`${btn} border border-mt-border`}><ExternalLink size={14} /> Open full size</a>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="grid gap-2">
            <label className="text-[12px] text-mt-muted">Small heading<input className={field} value={s.kicker} onChange={set('kicker')} /></label>
            <label className="text-[12px] text-mt-muted">Headline<input className={field} value={s.headline} onChange={set('headline')} /></label>
            <label className="text-[12px] text-mt-muted">Coloured line<input className={field} value={s.highlight} onChange={set('highlight')} /></label>
            <label className="text-[12px] text-mt-muted">Description<input className={field} value={s.sub} onChange={set('sub')} /></label>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
              <label className="text-[12px] text-mt-muted">Website<input className={field} value={s.website} onChange={set('website')} /></label>
              <label className="text-[12px] text-mt-muted">Background<input type="color" className="block h-10 w-14 rounded-xl border border-mt-input-border" value={s.bg} onChange={set('bg')} /></label>
              <label className="text-[12px] text-mt-muted">Accent<input type="color" className="block h-10 w-14 rounded-xl border border-mt-input-border" value={s.accent} onChange={set('accent')} /></label>
            </div>
            <p className="mt-2 text-[12px] text-mt-muted">Templates shown ({picked.length}/4 — empty = your featured posts)</p>
            <div className="flex flex-wrap gap-2">
              {picked.map((p) => (
                <span key={p.slug} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail || p.preview || ''} alt={p.name} className="h-16 w-14 rounded-lg object-cover border border-mt-border" />
                  <button onClick={() => setPicked(picked.filter((x) => x.slug !== p.slug))} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-mt-ink text-mt-bg grid place-items-center" aria-label={`Remove ${p.name}`}><X size={11} /></button>
                </span>
              ))}
            </div>
            <label className="relative mt-1"><Search size={14} className="absolute left-3 top-3 text-mt-faint" /><input className={`${field} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a template to show (e.g. birthday)" /></label>
            {found.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {found.map((f) => (
                  <button key={f.slug} disabled={picked.length >= 4 || picked.some((p) => p.slug === f.slug)} onClick={() => setPicked([...picked, f])} title={f.name} className="disabled:opacity-30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.thumbnail || f.preview || ''} alt={f.name} className="h-16 w-14 rounded-lg object-cover border border-mt-border hover:border-mt-ink" />
                  </button>
                ))}
              </div>
            )}
            <button onClick={save} disabled={busy} className={`${btn} mt-2 self-start bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save share image</button>
          </div>
          <div>
            <p className="text-[12px] text-mt-muted mb-2">Live (after saving)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/og?v=${v}`} alt="Share image" className="w-full rounded-2xl border border-mt-border" />
            <div className="mt-3 rounded-2xl border border-mt-border p-3 text-[12px]">
              <p className="text-[#4D5156]">magicaltouchdesign.com</p>
              <p className="text-[16px] text-[#1A0DAB] dark:text-[#8AB4F8]">Free Online Design Tool & {count} Templates</p>
              <p className="text-mt-muted">How a Google result looks — the title and description update by themselves with the count.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Promo designs — edit anything</h2>
        <p className="mt-1 text-[13px] text-mt-muted">Your brand posts as real designs. <b>Edit design</b> opens the editor: change any word, colour, photo or template picture, press Save, and the new picture appears here. Download it or use it in <b>Posts</b> below.</p>
        {promos === null ? <p className="mt-3 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p> : !promos.length ? (
          <p className="mt-3 text-[13px] text-mt-muted">No promo designs yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {promos.map((p) => (
              <li key={p.id} className="rounded-2xl border border-mt-border overflow-hidden flex flex-col">
                <div className="aspect-square bg-mt-surface2 grid place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview || p.thumbnail || ''} alt={p.name} loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <p className="text-[13px] font-semibold">{p.name} <span className="font-normal text-mt-faint">· {p.width} × {p.height}</span></p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <a href={`/editor?templateId=${p.id}&editTemplate=1&w=${p.width}&h=${p.height}`} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center gap-1.5"><PenLine size={13} /> Edit design</a>
                    {p.preview && <a href={p.preview} download className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5"><Download size={13} /> Image</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
