'use client';

import { Reveal } from './Reveal';

const STEPS = [
  { n: '01', title: 'Start', body: 'Choose a template or blank canvas.' },
  { n: '02', title: 'Create', body: 'Build your design.' },
  { n: '03', title: 'Refine', body: 'Perfect every detail.' },
  { n: '04', title: 'Export', body: 'Download and share.' },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase text-center">How it works</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight text-center">
          From idea to finished design.
        </h2>
      </Reveal>

      <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delayMs={i * 100}>
            <div className="relative">
              <span className="block font-[family-name:var(--font-display)] text-7xl sm:text-8xl leading-none tracking-tight bg-brand-gradient bg-clip-text text-transparent opacity-90">
                {s.n}
              </span>
              <h3 className="mt-2 font-semibold text-xl text-[#17161B] dark:text-[#F3F1F7]">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[#4A4750] dark:text-[#B7B2C6] leading-relaxed max-w-[13rem]">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
