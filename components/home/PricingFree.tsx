'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

const POINTS = ['No complicated plans.', 'No creative roadblocks.', 'Just a space to create.'];

// Deliberately not a pricing table — Magical Touch has one tier, so this
// section makes that a strength (free, no catch) rather than dressing it
// up as a "Free" column next to fake Pro/Business tiers that don't exist.
export function PricingFree() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section id="pricing" className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">Free, always</p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-5xl sm:text-6xl leading-[1.05] tracking-tight">
          Your creativity has no limits.
        </h2>
        <p className="mt-6 text-lg text-[#4A4750] dark:text-[#B7B2C6] max-w-md mx-auto leading-relaxed">
          Create freely. Explore freely. Make it magical.
        </p>
      </Reveal>

      <Reveal delayMs={100}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {POINTS.map((p) => (
            <span key={p} className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6]">
              {p}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal delayMs={160}>
        <button
          onClick={goToCreate}
          className="relative overflow-hidden mt-10 inline-flex items-center gap-2 text-sm font-semibold text-white px-7 py-4 rounded-full bg-brand-gradient shadow-[0_10px_24px_-8px_rgba(108,79,209,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(108,79,209,0.65)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
        >
          Start Creating — It's Free <ArrowRight size={15} />
        </button>
      </Reveal>
    </section>
  );
}
