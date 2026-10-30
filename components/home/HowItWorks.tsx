'use client';

import { useTemplateCountLabel } from '@/lib/templateCount';
import { Reveal } from './Reveal';

// A real sequence, so the numbers carry meaning. Each takes one of the
// logo's colours.
const STEPS = [
  { n: '1', color: '#EC5F84', title: 'Pick a template — or paste any design', body: 'Choose from {count} designs for festivals, birthdays, weddings, business and more, start blank, or paste a design you like and let free AI rebuild it.' },
  { n: '2', color: '#1FAEE6', title: 'Make it yours', body: 'Change the words, colours, fonts and photos. Remove backgrounds, add effects, translate to Arabic or Hindi, resize for any platform.' },
  { n: '3', color: '#6DB33A', title: 'Download or share', body: 'Download a print-ready PDF (CMYK too), PNG or JPG — no watermark — or share it straight to WhatsApp and Instagram.' },
];

export function HowItWorks() {
  const count = useTemplateCountLabel();
  return (
    <section className="border-t border-mt-border">
      <div className="mt-container py-16 sm:py-20">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.08] tracking-[-0.03em]">
            From idea to finished design.
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delayMs={i * 80}>
              <li className="border-t-2 pt-6" style={{ borderColor: s.color }}>
                <span className="font-[family-name:var(--font-display)] text-4xl font-medium" style={{ color: s.color }}>
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-mt-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-mt-muted leading-relaxed max-w-xs">{s.body.replace('{count}', count)}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
