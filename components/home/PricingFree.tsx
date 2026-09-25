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
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase text-center">Pricing</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight text-center">
          Free to create. No catch.
        </h2>
        <p className="mt-3 text-[#4A4750] dark:text-[#B7B2C6] text-center max-w-md mx-auto">
          Magical Touch is free to use — every tool, every template.
        </p>
      </Reveal>

      <Reveal delayMs={100} className="mt-12 max-w-md mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 p-8 bg-white dark:bg-[#1B1926] shadow-[0_30px_60px_-30px_rgba(23,22,27,0.25)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
          <p className="text-sm font-semibold text-[#6C4FD1] dark:text-[#B9A6F2]">Free Forever</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#17161B] dark:text-[#F3F1F7]">$0</p>
          <p className="mt-1 text-sm text-[#4A4750] dark:text-[#B7B2C6]">Everything you need, always free.</p>

          <ul className="mt-6 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#7ED33E]/15 flex items-center justify-center mt-0.5">
                  <Check size={12} className="text-[#4c9a1e]" />
                </span>
                <span className="text-sm text-[#4A4750] dark:text-[#B7B2C6] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={goToCreate}
            className="relative overflow-hidden mt-8 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-[0_10px_24px_-8px_rgba(108,79,209,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(108,79,209,0.65)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
          >
            Start Designing Free <ArrowRight size={15} />
          </button>
        </div>
      </Reveal>
    </section>
  );
}
