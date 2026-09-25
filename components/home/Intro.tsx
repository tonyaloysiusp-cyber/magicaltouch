'use client';

import { MockDesignCard } from '@/components/MockDesignCard';
import { Reveal } from './Reveal';

const COLLAGE = [
  { label: 'Social Post', colors: ['#EC1E79', '#8B6FC4'] as [string, string], span: 'col-span-2 row-span-2' },
  { label: 'Event Poster', colors: ['#3FA9E8', '#4FC8C0'] as [string, string], span: 'row-span-2' },
  { label: 'Business Card', colors: ['#17161B', '#6C4FD1'] as [string, string], span: '' },
  { label: 'Invitation', colors: ['#F5B942', '#EC1E79'] as [string, string], span: '' },
  { label: 'Presentation', colors: ['#7ED33E', '#4FC8C0'] as [string, string], span: 'col-span-2' },
];

export function Intro() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-14 items-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight">
            One workspace.
            <br />
            Endless possibilities.
          </h2>
          <p className="mt-5 text-[#4A4750] dark:text-[#B7B2C6] max-w-md leading-relaxed">
            From quick social posts to professional marketing materials and print-ready
            designs, Magical Touch gives you everything you need to create beautiful
            content in one place.
          </p>
        </Reveal>

        <Reveal delayMs={150}>
          <div className="grid grid-cols-3 grid-rows-2 gap-3 h-72 sm:h-80">
            {COLLAGE.map((c) => (
              <div key={c.label} className={`rounded-xl overflow-hidden shadow-sm ${c.span}`}>
                <MockDesignCard colors={c.colors} label={c.label} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
