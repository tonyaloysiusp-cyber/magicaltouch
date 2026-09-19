'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

const INCLUDED = [
  'Full design studio with shapes, text and photo tools',
  'Access to every template',
  'Print-ready exports with bleed and safe area',
  'Unlimited designs saved to your dashboard',
  'Resize any design to a new format',
];

export function PricingFree() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] tracking-wide uppercase text-center">Pricing</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight text-center">
          Free to create. No catch.
        </h2>
        <p className="mt-3 text-[#4A4750] text-center max-w-md mx-auto">
          Magical Touch is free to use — every tool, every template.
        </p>
      </Reveal>

      <Reveal delayMs={100} className="mt-12 max-w-md mx-auto">
        <div className="rounded-2xl border border-black/10 p-8 bg-white shadow-sm">
          <p className="text-sm font-semibold text-[#6C4FD1]">Free Forever</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">$0</p>
          <p className="mt-1 text-sm text-[#4A4750]">Everything you need, always free.</p>

          <ul className="mt-6 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#7ED33E]/15 flex items-center justify-center mt-0.5">
                  <Check size={12} className="text-[#4c9a1e]" />
                </span>
                <span className="text-sm text-[#4A4750] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={goToCreate}
            className="mt-8 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Start Designing Free <ArrowRight size={15} />
          </button>
        </div>
      </Reveal>
    </section>
  );
}
