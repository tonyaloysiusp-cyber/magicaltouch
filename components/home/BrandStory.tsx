'use client';

import { Sparkles } from 'lucide-react';
import { Reveal } from './Reveal';

// The brand's core narrative, told visually rather than just stated: an
// idea (a single spark) becomes a design (a composed shape) becomes a
// finished Magical Touch piece (the full brand gradient). Three stages,
// one scroll-triggered reveal each, no photography — pure CSS/SVG so it
// stays crisp at any size and costs nothing to load.
const STAGES = [
  {
    label: 'Idea',
    caption: 'A thought worth building.',
  },
  {
    label: 'Design',
    caption: 'Shape, color, composition.',
  },
  {
    label: 'Magical Touch',
    caption: 'The finishing detail that makes it yours.',
  },
] as const;

function StageVisual({ stage }: { stage: 0 | 1 | 2 }) {
  if (stage === 0) {
    return (
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-[#17161B]/[0.04] dark:bg-white/[0.06]">
        <span className="w-3 h-3 rounded-full bg-[#17161B] dark:bg-white" />
        <span className="absolute inset-0 rounded-full border border-dashed border-black/15 dark:border-white/20 animate-[spin_18s_linear_infinite]" />
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
        <span className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-2xl rotate-6 border-2 border-[#3FA9E8]" />
        <span className="absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full -translate-x-3 translate-y-3 border-2 border-[#EC1E79]" />
        <span className="absolute w-6 h-6 sm:w-7 sm:h-7 rounded-md translate-x-4 -translate-y-2 bg-[#7ED33E]/70" />
      </div>
    );
  }
  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-[0_16px_32px_-12px_rgba(108,79,209,0.55)] bg-brand-gradient flex items-center justify-center">
      <Sparkles size={26} className="text-white drop-shadow-sm" />
    </div>
  );
}

export function BrandStory() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center">
      <Reveal>
        <h2 className="font-[family-name:var(--font-display)] text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Every great design
          <br />
          starts with an <span className="italic">idea.</span>
        </h2>
        <p className="mt-6 text-base sm:text-lg text-[#4A4750] dark:text-[#B7B2C6] max-w-lg mx-auto leading-relaxed">
          Magical Touch gives that idea a place to become something real.
        </p>
      </Reveal>

      <div className="mt-16 flex items-center justify-center gap-4 sm:gap-10">
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-4 sm:gap-10">
            <Reveal delayMs={i * 180}>
              <div className="flex flex-col items-center gap-4 w-24 sm:w-32">
                <StageVisual stage={i as 0 | 1 | 2} />
                <div>
                  <p className="text-sm font-semibold text-[#17161B] dark:text-[#F3F1F7]">{s.label}</p>
                  <p className="mt-1 text-xs text-[#4A4750] dark:text-[#8A8496] leading-snug">{s.caption}</p>
                </div>
              </div>
            </Reveal>
            {i < STAGES.length - 1 && (
              <Reveal delayMs={i * 180 + 90} className="hidden sm:block shrink-0">
                <span className="block w-8 lg:w-14 h-px bg-gradient-to-r from-black/20 to-black/5 dark:from-white/25 dark:to-white/5" />
              </Reveal>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
