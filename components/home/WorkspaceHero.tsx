'use client';

// Home hero — corporate, calm, and alive: an architectural photograph as the
// stage, with real Magical Touch templates (letterhead, business card,
// flyer, social post, poster) floating over it and a print-ready spec card
// showing bleed and trim. Pure CSS animation; nothing heavy to download.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useTemplateCountLabel } from '@/lib/templateCount';
import { resolveAuthedPath } from '@/lib/authNav';

const C = '/templates/collection/';
const SHOWCASE = [
  { slug: 'pro-northline-consulting-services-flyer', label: 'Services flyer · A4 print' },
  { slug: 'pro-maison-vera-autumn-edit-fashion-poster', label: 'Fashion poster · A3' },
  { slug: 'pro-future-forward-summit-speaker-announcement', label: 'Speaker post · 1080 × 1080' },
  { slug: 'pro-saffron-table-brunch-menu', label: 'Restaurant menu · A4' },
];

export function WorkspaceHero() {
  const count = useTemplateCountLabel();
  const router = useRouter();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), 3600);
    return () => clearInterval(t);
  }, []);

  const goToCreate = async () => router.push(await resolveAuthedPath('/create'));

  return (
    <section className="relative overflow-hidden bg-mt-bg">
      <style>{`
        @keyframes mth-float { 0%,100% { transform: translate3d(0,0,0) rotate(var(--r,0deg)) } 50% { transform: translate3d(0,-10px,0) rotate(var(--r,0deg)) } }
        @keyframes mth-rise { from { opacity: 0; transform: translate3d(0,24px,0) } to { opacity: 1; transform: none } }
        @keyframes mth-pan { from { transform: scale(1.08) translate3d(-1.5%,0,0) } to { transform: scale(1.08) translate3d(1.5%,0,0) } }
        @keyframes mth-draw { from { stroke-dashoffset: 120 } to { stroke-dashoffset: 0 } }
        .mth-float { animation: mth-float 7s ease-in-out infinite; }
        .mth-rise { animation: mth-rise .9s cubic-bezier(.2,.7,.2,1) both; }
        .mth-pan { animation: mth-pan 22s ease-in-out infinite alternate; }
        .mth-draw path { stroke-dasharray: 120; animation: mth-draw 2.4s ease-out .6s both; }
        @media (prefers-reduced-motion: reduce) { .mth-float, .mth-rise, .mth-pan, .mth-draw path { animation: none !important } }
      `}</style>

      {/* fine architectural grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.25]" style={{ backgroundImage: 'linear-gradient(to right, rgb(var(--mt-border-rgb,228 228 231) / .55) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--mt-border-rgb,228 228 231) / .55) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 70% at 30% 30%, #000 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 30%, #000 40%, transparent 100%)' }} />

      <div className="relative mt-container pt-12 pb-16 sm:pt-20 sm:pb-24 grid gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
        {/* Copy */}
        <div className="mth-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-mt-border bg-mt-surface/80 backdrop-blur px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-mt-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B82C4]" aria-hidden /> The design studio for growing brands
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-display)] font-medium text-[2.5rem] leading-[1.05] sm:text-[3.6rem] lg:text-[4.1rem] tracking-[-0.035em] text-mt-ink">
            Design with the polish of a{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(95deg,#1E3A5F 0%,#3B82C4 45%,#A69BD3 100%)' }}>global brand.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-mt-muted max-w-xl leading-relaxed">
            {count} professionally designed templates for print and digital — letterheads, brochures, campaigns and social posts. Edit every word, colour and photo, then export print-ready files with bleed and crop marks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={goToCreate} className="inline-flex items-center gap-2 text-[15px] font-semibold h-12 px-6 rounded-full bg-mt-primary text-mt-onprimary shadow-[0_12px_30px_-12px_rgba(9,9,11,0.55)] hover:-translate-y-0.5 transition-transform">
              Start designing <ArrowRight size={16} />
            </button>
            <Link href="/templates" className="inline-flex items-center gap-2 text-[15px] font-semibold h-12 px-6 rounded-full border border-mt-border bg-mt-surface text-mt-ink hover:border-mt-ink/40 transition-colors">
              Explore templates
            </Link>
          </div>
          <ul className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-[14px] text-mt-muted max-w-xl">
            {['Free, no watermark', 'Print-ready PDF', 'Brand kit & fonts'].map((t) => (
              <li key={t} className="inline-flex items-center gap-2"><Check size={16} className="text-[#3B82C4] shrink-0" aria-hidden /> {t}</li>
            ))}
          </ul>
        </div>

        {/* Stage */}
        <div className="relative mx-auto w-full max-w-[640px] aspect-[1/1.02] sm:aspect-[1.08/1]" aria-hidden>
          {/* architecture photo */}
          <div className="absolute inset-x-[6%] top-0 bottom-[10%] overflow-hidden rounded-[28px] shadow-[0_40px_90px_-40px_rgba(15,23,42,0.6)] mth-rise" style={{ animationDelay: '.1s' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/templates/photos/pro/city.jpg" alt="" className="mth-pan absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-[#0B1220]/10 to-transparent" />
            <div className="absolute left-6 bottom-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Now designing</p>
              <p className="mt-1 text-[15px] font-semibold transition-opacity duration-500" key={i}>{SHOWCASE[i].label}</p>
            </div>
          </div>

          {/* letterhead (left) */}
          <figure className="absolute left-0 top-[12%] w-[30%] mth-rise" style={{ animationDelay: '.35s' }}>
            <div className="mth-float rounded-md bg-white shadow-[0_24px_50px_-20px_rgba(15,23,42,0.55)] ring-1 ring-black/5 overflow-hidden" style={{ ['--r' as any]: '-4deg', animationDelay: '-1s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${C}pro-atlas-and-co-architects-letterhead.webp`} alt="" className="block w-full" />
            </div>
          </figure>

          {/* rotating featured template (right) */}
          <figure className="absolute right-0 top-[4%] w-[36%] mth-rise" style={{ animationDelay: '.5s' }}>
            <div className="mth-float relative aspect-[1/1.414] rounded-md bg-white shadow-[0_30px_60px_-22px_rgba(15,23,42,0.6)] ring-1 ring-black/5 overflow-hidden" style={{ ['--r' as any]: '3deg', animationDelay: '-3s' }}>
              {SHOWCASE.map((s, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.slug} src={`${C}${s.slug}.webp`} alt="" loading={k === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" style={{ opacity: k === i ? 1 : 0 }} />
              ))}
            </div>
          </figure>

          {/* business card */}
          <figure className="absolute left-[14%] bottom-[2%] w-[38%] mth-rise" style={{ animationDelay: '.65s' }}>
            <div className="mth-float rounded-lg shadow-[0_24px_50px_-18px_rgba(15,23,42,0.6)] overflow-hidden ring-1 ring-black/10" style={{ ['--r' as any]: '-2deg', animationDelay: '-5s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${C}pro-atlas-and-co-architects-business-card-front.webp`} alt="" className="block w-full" />
            </div>
          </figure>

          {/* print spec card */}
          <div className="absolute right-[3%] bottom-[6%] w-[44%] max-w-[250px] rounded-2xl border border-mt-border bg-mt-surface/95 backdrop-blur p-3.5 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.5)] mth-rise" style={{ animationDelay: '.8s' }}>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0 mth-draw" fill="none" strokeWidth="1.5">
                <rect x="10" y="10" width="28" height="28" rx="1" className="stroke-mt-faint" strokeDasharray="2 2" />
                <rect x="14" y="14" width="20" height="20" rx="1" stroke="#3B82C4" />
                <path d="M4 14h6M4 34h6M38 14h6M38 34h6M14 4v6M34 4v6M14 38v6M34 38v6" className="stroke-mt-ink" />
              </svg>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-mt-ink">Print-ready PDF</p>
                <p className="text-[11.5px] text-mt-muted leading-snug">3 mm bleed · crop marks · CMYK</p>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {['#1E3A5F', '#3B82C4', '#C9A86A', '#F4F1EA', '#0B1220'].map((c) => <span key={c} className="h-4 flex-1 rounded" style={{ background: c }} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
