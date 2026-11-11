'use client';

// Home hero — corporate, calm, and alive: an architectural photograph as the
// stage, with real Magical Touch templates (letterhead, business card,
// flyer, social post, poster) floating over it and a print-ready spec card
// showing bleed and trim. Pure CSS animation; nothing heavy to download.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useTemplateCountLabel } from '@/lib/templateCount';
import { resolveAuthedPath } from '@/lib/authNav';
import { HeroTour } from './HeroTour';


export function WorkspaceHero() {
  const count = useTemplateCountLabel();
  const router = useRouter();

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
            {count} professional templates and a complete studio — vector tools, Image Trace, Pattern Studio, brand kit, translation into 37 languages and print-ready export with bleed.
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

        {/* Self-playing product tour */}
        <div className="mth-rise" style={{ animationDelay: '.15s' }}><HeroTour /></div>
      </div>
    </section>
  );
}
