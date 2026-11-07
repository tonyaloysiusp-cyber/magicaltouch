'use client';

// Admin → Social media → Our brand designs. The ready-made Magical Touch
// promo posts (tag "brand-promo") live here — not in the template drafts.
// Pick a channel, open one in the editor, or download the picture.

import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Row { id: string; name: string; thumbnail: string | null; width: number; height: number }

const CHANNELS: { id: string; label: string; test: (r: Row) => boolean }[] = [
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
  const [ch, setCh] = useState('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(24);

  useEffect(() => {
    supabase.from('templates').select('id,name,thumbnail,width,height').contains('tags', ['brand-promo']).order('name').limit(1000)
      .then(({ data }) => setRows((data as Row[]) || []));
  }, []);

  const list = useMemo(() => {
    const t = CHANNELS.find((c) => c.id === ch)!.test;
    const s = q.trim().toLowerCase();
    return (rows || []).filter((r) => t(r) && (!s || r.name.toLowerCase().includes(s)));
  }, [rows, ch, q]);
  useEffect(() => setShown(24), [ch, q]);

  return (
    <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Our brand designs <span className="text-mt-muted font-normal text-[13px]">{rows ? rows.length : '…'} ready posts</span></h2>
      <p className="mt-1 text-[13px] text-mt-muted">Magical Touch promotion posts for every channel. Edit one to change the wording, or download and post it. These are for our own pages only — customers never see them.</p>
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
              <p className="text-[11px] text-mt-faint">{r.width} × {r.height}</p>
              <div className="mt-auto flex gap-1.5">
                <a href={`/editor?w=${r.width}&h=${r.height}&templateId=${r.id}&editTemplate=1`} className="h-7 px-2.5 rounded-full bg-mt-primary text-mt-onprimary text-[11px] font-semibold inline-flex items-center gap-1"><Pencil size={11} /> Edit</a>
                {r.thumbnail && <a href={r.thumbnail} download className="h-7 px-2.5 rounded-full border border-mt-border text-[11px] inline-flex items-center gap-1"><Download size={11} /> Image</a>}
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
