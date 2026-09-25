'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

const FORMATS = ['Logo', 'Business Card', 'Social Post', 'Poster', 'Presentation', 'Marketing Material'];

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
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            Make your brand
            <br />
            look like your brand.
          </h2>
          <p className="mt-5 text-white/70 leading-relaxed max-w-md">
            Create professional visual content without slowing down your ideas.
          </p>
          <button
            onClick={goToCreate}
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#17161B] px-6 py-3.5 rounded-full bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Start Designing <ArrowRight size={15} />
          </button>
        </Reveal>

        <Reveal delayMs={150}>
          <div className="flex flex-wrap gap-2.5">
            {FORMATS.map((f) => (
              <span
                key={f}
                className="text-sm text-white/85 border border-white/15 rounded-full px-4 py-2"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
