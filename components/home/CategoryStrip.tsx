'use client';

import { Reveal } from './Reveal';

const CATEGORIES = [
  { label: 'Social', colors: ['#EC1E79', '#8B6FC4'] as const },
  { label: 'Marketing', colors: ['#3FA9E8', '#4FC8C0'] as const },
  { label: 'Branding', colors: ['#17161B', '#6C4FD1'] as const },
  { label: 'Print', colors: ['#4FC8C0', '#7ED33E'] as const },
  { label: 'Events', colors: ['#7ED33E', '#C4DA3B'] as const },
  { label: 'Presentations', colors: ['#8B6FC4', '#3FA9E8'] as const },
];

export function CategoryStrip() {
  return (
    <section className="border-y border-black/10 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <Reveal>
          <p className="text-xs font-semibold text-[#4A4750] tracking-wide uppercase text-center">
            Made for every kind of creative work
          </p>
        </Reveal>
        <div className="mt-8 flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-6 no-scrollbar">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.label} delayMs={i * 60} className="shrink-0 w-28 md:w-auto">
              <div className="group cursor-default">
                <div
                  className="w-28 h-20 md:w-full md:h-16 rounded-lg transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}
                />
                <p className="mt-2 text-xs font-medium text-[#17161B] text-center">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
