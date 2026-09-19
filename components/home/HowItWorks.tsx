'use client';

import { LayoutTemplate, PenTool, Sparkles, Download } from 'lucide-react';
import { Reveal } from './Reveal';

const STEPS = [
  { icon: LayoutTemplate, title: 'Choose', body: 'Start blank or pick a template sized for what you\'re making.' },
  { icon: PenTool, title: 'Create', body: 'Add text, photos and shapes on a canvas built for real design work.' },
  { icon: Sparkles, title: 'Refine', body: 'Fine-tune colors, layout and layers until it feels right.' },
  { icon: Download, title: 'Export', body: 'Download it ready to share online or print at full quality.' },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] tracking-wide uppercase text-center">How it works</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight text-center">
          From idea to finished design.
        </h2>
      </Reveal>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delayMs={i * 100}>
            <div className="relative flex lg:flex-col items-start lg:items-center gap-4 lg:text-center">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-black/10" />
              )}
              <div className="relative shrink-0 w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold z-10">
                {i + 1}
              </div>
              <div>
                <div className="flex items-center gap-2 lg:justify-center">
                  <s.icon size={16} className="text-[#6C4FD1]" />
                  <h3 className="font-semibold text-[#17161B]">{s.title}</h3>
                </div>
                <p className="mt-1.5 text-sm text-[#4A4750] leading-relaxed lg:max-w-[13rem]">{s.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
