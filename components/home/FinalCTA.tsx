'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { BrandRibbon } from './BrandRibbon';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="mt-container pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] bg-[#09090B] ring-1 ring-white/10 px-6 pt-16 pb-28 sm:pt-20 sm:pb-36 text-center">
          <BrandRibbon still className="absolute left-1/2 -translate-x-1/2 -bottom-40 sm:-bottom-52 w-[1500px] max-w-none pointer-events-none opacity-90" />
          <h2 className="relative font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl text-white leading-[1.08] tracking-[-0.03em] max-w-2xl mx-auto">
            Your next design starts here.
          </h2>
          <p className="relative mt-5 text-white/70 text-lg max-w-md mx-auto">Pick a template and make it yours in minutes.</p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={goToCreate}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#09090B] px-6 py-3.5 rounded-full bg-white hover:-translate-y-0.5 transition-transform"
            >
              Start designing <ArrowRight size={15} />
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full border border-white/30 hover:border-white/60 transition-colors"
            >
              Browse templates
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
