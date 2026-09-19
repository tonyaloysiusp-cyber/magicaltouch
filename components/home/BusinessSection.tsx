'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

const POINTS = [
  'Print-ready exports with bleed and safe area built in',
  'Consistent branding across every design you make',
  'Reusable templates for your whole team',
  'Everything saved to one dashboard, ready when you need it',
];

export function BusinessSection() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="bg-[#17161B] text-white">
      <div className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <p className="text-xs font-semibold text-[#C4DA3B] tracking-wide uppercase">For business</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight">
            Design that keeps up with your business.
          </h2>
          <p className="mt-5 text-white/70 leading-relaxed max-w-md">
            From marketing materials to print-ready signage, Magical Touch
            helps businesses of any size look polished and consistent — no
            design team required.
          </p>
          <button
            onClick={goToCreate}
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#17161B] px-6 py-3.5 rounded-full bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Start Designing <ArrowRight size={15} />
          </button>
        </Reveal>

        <Reveal delayMs={150}>
          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  <Check size={13} className="text-[#7ED33E]" />
                </span>
                <span className="text-white/85 leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
