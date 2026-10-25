'use client';

import { Check } from 'lucide-react';
import { Reveal } from './Reveal';

const POINTS = ['Every template', 'Every editing tool', 'Photo Studio', 'Tutorials & courses', 'No watermark', 'PNG, JPG, WebP, TIFF & PDF'];

// Magical Touch has one tier, so this says so plainly instead of
// dressing it up as a pricing table.
export function PricingFree() {
  return (
    <section id="pricing" className="border-t border-mt-border">
      <div className="mt-container py-16 sm:py-20 grid gap-10 md:grid-cols-2 md:items-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.08] tracking-[-0.03em]">
            Free to use.
            <br />
            <span className="mt-spectrum-text">No catch.</span>
          </h2>
          <p className="mt-5 text-mt-muted text-lg max-w-md leading-relaxed">
            No trials, no locked tools and no plans to compare. Sign up and start designing.
          </p>
        </Reveal>
        <Reveal delayMs={100}>
          <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 auto-rows-fr">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 rounded-2xl border border-mt-border px-4 py-3.5 text-sm font-medium text-mt-ink leading-snug">
                <span className="w-6 h-6 rounded-full mt-spectrum flex items-center justify-center shrink-0">
                  <Check size={13} strokeWidth={3} className="text-white" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
