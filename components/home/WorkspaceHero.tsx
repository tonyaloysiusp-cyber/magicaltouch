'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { HeroCurves } from './HeroCurves';
import { HowToVideo } from './HowToVideo';

export function WorkspaceHero() {
  const router = useRouter();
  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="relative overflow-hidden bg-mt-bg">
      <div className="relative mt-container pt-14 sm:pt-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] font-medium text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[5.25rem] tracking-[-0.035em] text-mt-ink">
          Design anything.
          <br />
          Make it{' '}
          <span className="relative inline-block">
            <span className="mt-spectrum-text">magical.</span>
            <Sparkle className="absolute -top-3 -right-5 sm:-top-5 sm:-right-8 w-6 h-6 sm:w-9 sm:h-9" />
          </span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-mt-muted max-w-xl mx-auto leading-relaxed">
          Start from 700+ professional templates or a blank canvas, then change every word, colour and photo. Free, right in your browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={goToCreate}
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full bg-mt-primary text-mt-onprimary hover:-translate-y-0.5 transition-transform"
          >
            Start designing <ArrowRight size={15} />
          </button>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full border border-mt-border text-mt-ink hover:border-mt-ink/40 transition-colors"
          >
            Browse templates
          </Link>
        </div>
      </div>

      {/* A self-playing walkthrough inside the editor, with the brand
          curves sweeping behind it and the pen drawing the light. */}
      <div className="relative mt-16 sm:mt-24 pb-16 sm:pb-24">
        <HeroCurves layer="back" className="absolute left-1/2 -translate-x-1/2 -top-10 sm:-top-44 w-[1000px] sm:w-[1700px] max-w-none pointer-events-none" />
        <div className="relative z-10 max-w-6xl 2xl:max-w-7xl min-[1900px]:max-w-[1440px] mx-auto px-3 sm:px-6">
          <div className="rounded-[20px] sm:rounded-[24px] p-px mt-spectrum shadow-[0_50px_100px_-40px_rgba(9,9,11,0.35)] dark:shadow-[0_50px_120px_-40px_rgba(53,194,241,0.25)]">
            <div className="rounded-[19px] sm:rounded-[23px] overflow-hidden bg-mt-surface text-left">
              <HowToVideo />
            </div>
          </div>
        </div>
        <HeroCurves layer="front" className="absolute z-20 left-1/2 -translate-x-1/2 -top-10 sm:-top-44 w-[1000px] sm:w-[1700px] max-w-none pointer-events-none" />
      </div>
    </section>
  );
}

// The four-point star from the logo, in the brand spectrum.
function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="mt-sparkle" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F2708F" />
          <stop offset="0.5" stopColor="#35C2F1" />
          <stop offset="1" stopColor="#8CC84B" />
        </linearGradient>
      </defs>
      <path d="M20 0C21.5 12 28 18.5 40 20C28 21.5 21.5 28 20 40C18.5 28 12 21.5 0 20C12 18.5 18.5 12 20 0Z" fill="url(#mt-sparkle)" />
    </svg>
  );
}
