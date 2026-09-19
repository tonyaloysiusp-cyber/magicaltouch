'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <div className="rounded-3xl bg-brand-gradient px-8 py-16 sm:py-20 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-white leading-tight max-w-xl mx-auto">
            Ready to make something magical?
          </h2>
          <p className="mt-4 text-white/90 max-w-md mx-auto">
            Start designing for free — no credit card, no limits.
          </p>
          <button
            onClick={goToCreate}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#17161B] px-7 py-3.5 rounded-full bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Start Designing Free <ArrowRight size={15} />
          </button>
        </div>
      </Reveal>
    </section>
  );
}
