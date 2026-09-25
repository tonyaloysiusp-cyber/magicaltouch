'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Reveal } from './Reveal';

export function CreatorSection() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        <Reveal className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden shadow-sm h-56 mt-8">
            <MockDesignCard colors={['#EC1E79', '#8B6FC4']} label="Portfolio Cover" />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm h-56">
            <MockDesignCard colors={['#F5B942', '#FF6F91']} label="Zine Layout" />
          </div>
        </Reveal>

        <Reveal delayMs={150}>
          <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">For creators</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            Your ideas deserve a magical touch.
          </h2>
          <p className="mt-5 text-[#4A4750] dark:text-[#B7B2C6] leading-relaxed max-w-md">
            Create content, explore ideas and turn your imagination into
            something real.
          </p>
          <button
            onClick={goToCreate}
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full border border-black/15 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40 transition-colors"
          >
            Start Creating <ArrowRight size={15} />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
