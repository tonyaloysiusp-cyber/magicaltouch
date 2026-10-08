'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Crown } from 'lucide-react';
import { Template, TemplateCategory, fetchPublicTemplates, fetchCategories } from '@/lib/templatesData';
import { Reveal } from './Reveal';

const CATEGORY_ORDER = ['Birthday', 'Events', 'Wedding', 'Business', 'Social Media', 'Marketing', 'Menus', 'Certificates', 'Resume', 'Cards'];

// The live template library on the homepage: real thumbnails straight
// from the database, category tiles with counts, a filterable grid and
// an endless scrolling strip -- so new templates appear here the moment
// they are published.
export function TemplateShowcase() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [active, setActive] = useState<string>('All');

  useEffect(() => {
    fetchPublicTemplates().then((list) => setTemplates(list.filter((t) => !!t.id && !!t.thumbnail)));
    fetchCategories().then(setCategories);
  }, []);

  const catName = (t: Template) => categories.find((c) => c.id === t.categoryId)?.name || t.category;

  const tiles = useMemo(() => {
    const by: Record<string, Template[]> = {};
    templates.forEach((t) => {
      const n = catName(t);
      (by[n] ||= []).push(t);
    });
    return Object.entries(by)
      .sort(([a], [b]) => (CATEGORY_ORDER.indexOf(a) + 100) % 100 - (CATEGORY_ORDER.indexOf(b) + 100) % 100)
      .map(([name, list]) => ({ name, count: list.length, covers: list.slice(0, 3) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, categories]);

  const visible = useMemo(() => {
    const list = active === 'All' ? templates : templates.filter((t) => catName(t) === active);
    return list.slice(0, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, templates, categories]);

  const strip = useMemo(() => templates.slice(0, 24), [templates]);

  if (!templates.length) return null;

  return (
    <section id="templates" className="relative overflow-hidden bg-transparent border-y border-mt-border">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#8B6FC4]/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#3FA9E8]/[0.05] blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-mt-accent tracking-wide uppercase">Template library</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-6xl leading-[1.02] tracking-tight">
                {templates.length}+ designs, <span className="italic mt-gradient-text animate-mt-shine">ready to make yours.</span>
              </h2>
              <p className="mt-4 text-mt-muted max-w-lg leading-relaxed">
                Birthdays, weddings, events, menus, résumés and more — every one fully editable, every colour and word.
              </p>
            </div>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-[0_10px_24px_-8px_rgba(108,79,209,0.55)] hover:-translate-y-0.5 transition-transform shrink-0"
            >
              Explore all templates <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>

        {/* Category tiles with stacked 3D covers */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {tiles.map((c, i) => (
            <Reveal key={c.name} delayMs={i * 50}>
              <Link
                href={`/templates?category=${encodeURIComponent(c.name)}`}
                className="group block rounded-2xl border border-mt-border bg-mt-surface p-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-28 [perspective:600px]">
                  {c.covers.map((t, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={t.id}
                      src={t.thumbnail!}
                      alt=""
                      loading="lazy"
                      className="absolute top-1 h-24 w-auto max-w-[70%] rounded-lg shadow-lg object-cover ring-1 ring-black/5 transition-transform duration-500"
                      style={{
                        left: `${10 + k * 22}%`,
                        zIndex: 3 - k,
                        transform: `rotateY(${-18 + k * 6}deg) rotate(${(k - 1) * 6}deg)`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-mt-ink">{c.name}</span>
                  <span className="text-[11px] text-mt-muted">{c.count}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Filter + grid */}
        <div className="mt-14 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', ...tiles.map((t) => t.name)].map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                active === c ? 'bg-mt-ink text-mt-bg border-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:border-mt-accent'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 columns-2 sm:columns-3 lg:columns-5 gap-4 [&>*]:mb-4">
          {visible.map((t) => (
            <Link
              key={t.id}
              href={`/templates?template=${t.id}`}
              className="group block break-inside-avoid rounded-xl overflow-hidden border border-mt-border bg-mt-surface shadow-sm hover:shadow-xl transition-shadow"
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: `${t.width} / ${Math.min(t.height, t.width * 2.1)}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbnail!} alt={t.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                {t.isFree === false && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-[#14121F] bg-[#F5B942] px-2 py-0.5 rounded-full">
                    <Crown size={10} /> Premium
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-semibold text-[#14121F] bg-white px-3 py-1.5 rounded-full">
                    Use template <ArrowUpRight size={13} />
                  </span>
                </span>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-mt-ink truncate">{t.name}</p>
                <p className="text-[11px] text-mt-muted">
                  {catName(t)} · {t.width}×{t.height}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Endless strip */}
      <div className="relative pb-16 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex gap-4 w-max animate-mt-marquee hover:[animation-play-state:paused]">
          {[...strip, ...strip].map((t, i) => (
            <Link key={`${t.id}-${i}`} href={`/templates?template=${t.id}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.thumbnail!} alt={t.name} loading="lazy" className="h-40 w-auto rounded-xl shadow-md ring-1 ring-black/5 hover:-translate-y-1 transition-transform" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
