'use client';

import { ArtworkPanel } from '@/components/ArtworkPanel';
import { HomeTheme } from '@/hooks/useHomeTheme';
import { Reveal } from './Reveal';

// Shows the same pure CSS/SVG day/night artwork used on the login and
// signup pages, so the homepage's own theme switch has a real, tangible
// payoff instead of just recoloring text and backgrounds — this is the
// "creative space" the rest of the page talks about, shown rather than
// described. The artwork's own composition is portrait (built for a
// full-height login column), so it keeps an aspect-[3/4] box here too —
// stretching it into a short wide banner would crop the ambient shapes
// at top and bottom.
export function CreativeShowcase({ theme }: { theme: HomeTheme }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_0.85fr] gap-14 items-center">
        <Reveal>
          <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">
            Your Creative Space
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight">
            Design in the light.
            <br />
            Create through the night.
          </h2>
          <p className="mt-5 text-[#4A4750] dark:text-[#B7B2C6] max-w-md leading-relaxed">
            Flip the switch up top and the whole workspace follows — bright
            and airy for a daytime session, moody and neon-accented for
            late-night inspiration.
          </p>
        </Reveal>

        <Reveal delayMs={150}>
          <div className="w-full max-w-sm mx-auto aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_40px_80px_-40px_rgba(23,22,27,0.35)]">
            <ArtworkPanel variant={theme === 'night' ? 'night' : 'day'} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
