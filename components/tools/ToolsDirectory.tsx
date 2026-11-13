'use client';

// The Tools page body: search, categories, recently used, recommended and a
// card per tool (preview, name, description, badge, Open). Every card opens
// the tool's real page.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Blend, Clock, Crop, Eraser, Flower2, Grid3x3, LayoutTemplate, Palette, PenTool, Ruler, ScanFace, Search, Sparkles, Star, X } from 'lucide-react';
import { RECOMMENDED, TOOLS, TOOL_CATEGORIES, ToolCategory, ToolEntry, readRecent, rememberTool, searchTools } from '@/lib/toolsCatalog';

const ICONS: Record<string, typeof Sparkles> = { LayoutTemplate, Crop, Eraser, PenTool, Grid3x3, Palette, ScanFace, Flower2, Blend, Ruler };

export function ToolIcon({ name, size = 22 }: { name: string; size?: number }) {
  const I = ICONS[name] || Sparkles;
  return <I size={size} aria-hidden />;
}

function Card({ t, compact = false }: { t: ToolEntry; compact?: boolean }) {
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <Link href={t.href} onClick={() => rememberTool(t.id)} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-mt-border bg-mt-surface transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(9,9,11,0.45)]">
      {!compact && (
        <div className="relative aspect-[16/9] overflow-hidden border-b border-mt-border" style={{ background: `linear-gradient(135deg, ${t.tint}22, ${t.tint}55)` }}>
          {thumbOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/tools/thumbs/${t.id}.webp`} alt={`${t.title} preview`} loading="lazy" decoding="async" onError={() => setThumbOk(false)} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-white"><span className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: t.tint }}><ToolIcon name={t.icon} size={30} /></span></span>
          )}
          {t.isNew && <span className="absolute left-3 top-3 rounded-full bg-mt-primary px-2.5 py-0.5 text-[11px] font-semibold text-mt-onprimary">New</span>}
        </div>
      )}
      <div className={`flex flex-1 flex-col ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: t.tint }}><ToolIcon name={t.icon} size={19} /></span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold leading-tight">{t.title}</h3>
            {compact && <p className="text-[12.5px] text-mt-muted truncate">{t.hint}</p>}
          </div>
        </div>
        {!compact && <p className="mt-3 text-[14px] text-mt-muted leading-relaxed flex-1">{t.body}</p>}
        <span className={`${compact ? 'mt-3' : 'mt-4'} inline-flex items-center gap-1 text-[14px] font-semibold`}>Open <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
        {!compact && t.panel && <span className="mt-1 block text-[12px] text-mt-muted">Also inside the editor → {t.panel}</span>}
      </div>
    </Link>
  );
}

export function ToolsDirectory() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ToolCategory | 'all'>('all');
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { setRecent(readRecent()); }, []);
  const list = useMemo(() => searchTools(q, cat === 'all' ? TOOLS : TOOLS.filter((t) => t.category === cat)), [q, cat]);
  const recentTools = recent.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean) as ToolEntry[];
  const recommended = RECOMMENDED.filter((id) => !recent.includes(id)).slice(0, 4).map((id) => TOOLS.find((t) => t.id === id)!).filter(Boolean);
  const filtering = !!q.trim() || cat !== 'all';

  return (
    <div className="mt-8 space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1 max-w-xl">
          <span className="sr-only">Search tools</span>
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-mt-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search tools — e.g. vector, passport, pattern" className="h-12 w-full rounded-full border border-mt-border bg-mt-surface pl-11 pr-10 text-[15px]" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full hover:bg-mt-surface2"><X size={15} /></button>}
        </label>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tool categories">
          {[{ id: 'all' as const, label: 'All tools' }, ...TOOL_CATEGORIES].map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`h-9 px-3.5 rounded-full border text-[13px] font-semibold ${cat === c.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {!filtering && recentTools.length > 0 && (
        <section aria-labelledby="recent-tools">
          <h2 id="recent-tools" className="text-[13px] font-semibold uppercase tracking-[0.15em] text-mt-muted inline-flex items-center gap-1.5"><Clock size={14} /> Recently used</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{recentTools.slice(0, 4).map((t) => <li key={t.id}><Card t={t} compact /></li>)}</ul>
        </section>
      )}
      {!filtering && (
        <section aria-labelledby="rec-tools">
          <h2 id="rec-tools" className="text-[13px] font-semibold uppercase tracking-[0.15em] text-mt-muted inline-flex items-center gap-1.5"><Star size={14} /> Recommended</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{recommended.map((t) => <li key={t.id}><Card t={t} compact /></li>)}</ul>
        </section>
      )}

      <section aria-labelledby="all-tools">
        <h2 id="all-tools" className="text-xl font-semibold">{filtering ? `${list.length} tool${list.length === 1 ? '' : 's'} found` : 'All tools'}</h2>
        {list.length ? (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((t) => <li key={t.id}><Card t={t} /></li>)}</ul>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-mt-border p-10 text-center">
            <p className="font-semibold">No tool matches “{q}”.</p>
            <p className="mt-1 text-[14px] text-mt-muted">Try another word, or <button type="button" onClick={() => { setQ(''); setCat('all'); }} className="underline underline-offset-2">show all tools</button>.</p>
          </div>
        )}
      </section>
    </div>
  );
}
