'use client';

// Admin → Social media → Our brand designs. The ready-made Magical Touch
// promo posts (tag "brand-promo") live here — not in the template drafts.
// Pick a channel, open one in the editor, or download the picture.

import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Pencil, Search, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { makeTemplateVideo, templateImage } from '@/lib/templateVideo';

interface Row { id: string; name: string; thumbnail: string | null; width: number; height: number; tags: string[] | null; occasion: string | null; slug: string | null }

const isFest = (r: Row) => (r.tags || []).includes('festival');
const CHANNELS: { id: string; label: string; test: (r: Row) => boolean }[] = [
  { id: 'festivals', label: 'Festivals', test: isFest },
  { id: 'all', label: 'All', test: () => true },
  { id: 'instagram', label: 'Instagram', test: (r) => /instagram/i.test(r.name) || (r.width === 1080 && r.height === 1350) },
  { id: 'story', label: 'Story / Reel', test: (r) => /story|reel/i.test(r.name) || (r.height > r.width * 1.6) },
  { id: 'facebook', label: 'Facebook', test: (r) => /facebook/i.test(r.name) },
  { id: 'linkedin', label: 'LinkedIn', test: (r) => /linkedin/i.test(r.name) },
  { id: 'google', label: 'Google Business', test: (r) => /google/i.test(r.name) },
  { id: 'youtube', label: 'YouTube', test: (r) => /youtube/i.test(r.name) },
  { id: 'x', label: 'X / Twitter', test: (r) => /twitter|\bx post\b/i.test(r.name) },
];

const short = (n: string) => n.replace(/^Magical Touch\s*/i, '') || n;

export function BrandDesigns() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ch, setCh] = useState('festivals');
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<{ id: string; what: 'video' | 'image'; p: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(24);

  useEffect(() => {
    supabase.from('templates').select('id,name,thumbnail,width,height,tags,occasion,slug').contains('tags', ['brand-promo']).order('name').limit(1000)
      .then(({ data }) => setRows((data as Row[]) || []));
    // Next date of every festival (from the festival calendar).
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('occasions').select('name,occasion_date').gte('occasion_date', today).order('occasion_date').limit(500)
      .then(({ data }) => { const m: Record<string, string> = {}; ((data as any[]) || []).forEach((o) => { if (!m[o.name]) m[o.name] = o.occasion_date; }); setDates(m); });
  }, []);

  const save = (url: string, name: string) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const fileName = (r: Row) => (r.slug || r.name).replace(/^mtd-/, 'magical-touch-').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const loadDesign = async (r: Row) => {
    const { data, error } = await supabase.from('templates').select('canvas_json').eq('id', r.id).single();
    if (error || !data) throw new Error(error?.message || 'Could not load the design');
    return (data as any).canvas_json;
  };
  const makeVideo = async (r: Row) => {
    setMsg(null); setBusy({ id: r.id, what: 'video', p: 0 });
    try {
      const json = await loadDesign(r);
      const { blob, ext } = await makeTemplateVideo(json, { seconds: 8, onProgress: (p) => setBusy({ id: r.id, what: 'video', p }) });
      const url = URL.createObjectURL(blob);
      save(url, `${fileName(r)}.${ext}`);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMsg(`Video saved (${(blob.size / 1048576).toFixed(1)} MB, ${ext.toUpperCase()}). Post it as a Reel, Story or video post.`);
    } catch (e: any) { setMsg(e?.message || 'The video could not be made.'); } finally { setBusy(null); }
  };
  const makeImage = async (r: Row) => {
    setMsg(null); setBusy({ id: r.id, what: 'image', p: 0 });
    try {
      const url = await templateImage(await loadDesign(r), r.width, r.height);
      if (!url) throw new Error('The picture could not be made.');
      save(url, `${fileName(r)}.png`);
    } catch (e: any) { setMsg(e?.message || 'The picture could not be made.'); } finally { setBusy(null); }
  };

  const list = useMemo(() => {
    const t = CHANNELS.find((c) => c.id === ch)!.test;
    const s = q.trim().toLowerCase();
    const l = (rows || []).filter((r) => t(r) && (!s || r.name.toLowerCase().includes(s)));
    // Festivals: the next one first.
    if (ch === 'festivals') l.sort((a, b) => (dates[a.occasion || ''] || '9999').localeCompare(dates[b.occasion || ''] || '9999'));
    return l;
  }, [rows, ch, q, dates]);
  useEffect(() => setShown(24), [ch, q]);

  return (
    <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Our brand designs <span className="text-mt-muted font-normal text-[13px]">{rows ? rows.length : '…'} ready posts</span></h2>
      <p className="mt-1 text-[13px] text-mt-muted">Magical Touch promotion posts for every channel, and a brand poster for every festival (the next one first). <b>Edit</b> changes words, colours and pictures; <b>Image</b> saves a full-size PNG and <b>Video</b> an 8-second animated video of the design as you saved it. Only for our own pages — customers never see them.</p>
      {msg && <p role="status" className="mt-3 rounded-xl bg-mt-surface2 px-3 py-2 text-[13px]">{msg}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CHANNELS.map((c) => (
          <button key={c.id} onClick={() => setCh(c.id)} className={`h-8 px-3 rounded-full text-[12px] font-medium border ${ch === c.id ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted'}`}>{c.label}</button>
        ))}
        <label className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8 w-44 rounded-full border border-mt-input-border bg-mt-surface pl-8 pr-3 text-[12px]" />
        </label>
      </div>
      <ul className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {list.slice(0, shown).map((r) => (
          <li key={r.id} className="rounded-2xl border border-mt-border overflow-hidden flex flex-col">
            <div className="aspect-square bg-mt-surface2 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.thumbnail && <img src={r.thumbnail} alt={r.name} loading="lazy" className="max-h-full max-w-full object-contain rounded-md shadow-sm" />}
            </div>
            <div className="p-2.5 flex-1 flex flex-col gap-2">
              <p className="text-[12px] font-medium leading-snug line-clamp-2">{short(r.name)}</p>
              <p className="text-[11px] text-mt-faint">{isFest(r) && r.occasion && dates[r.occasion] ? <b className="text-mt-ink font-semibold">{new Date(dates[r.occasion] + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · </b> : null}{r.width} × {r.height}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <a href={`/editor?w=${r.width}&h=${r.height}&templateId=${r.id}&editTemplate=1`} className="h-7 px-2.5 rounded-full bg-mt-primary text-mt-onprimary text-[11px] font-semibold inline-flex items-center gap-1"><Pencil size={11} /> Edit</a>
                <button type="button" disabled={!!busy} onClick={() => makeImage(r)} className="h-7 px-2.5 rounded-full border border-mt-border text-[11px] inline-flex items-center gap-1 disabled:opacity-50">{busy?.id === r.id && busy.what === 'image' ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Image</button>
                <button type="button" disabled={!!busy} onClick={() => makeVideo(r)} className="h-7 px-2.5 rounded-full border border-mt-border text-[11px] inline-flex items-center gap-1 disabled:opacity-50">{busy?.id === r.id && busy.what === 'video' ? <><Loader2 size={11} className="animate-spin" /> {Math.round(busy.p * 100)}%</> : <><Video size={11} /> Video</>}</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rows && list.length === 0 && <p className="mt-4 text-[13px] text-mt-muted">Nothing for this channel yet.</p>}
      {list.length > shown && <button onClick={() => setShown((n) => n + 24)} className="mt-4 h-9 px-4 rounded-full border border-mt-border text-[13px]">Show more ({list.length - shown})</button>}
    </section>
  );
}
