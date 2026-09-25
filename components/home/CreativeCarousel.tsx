'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Reveal } from './Reveal';

interface Slide {
  label: string;
  title: string;
  body: string;
  colors: [string, string, string];
}

// One slide per creative category this app is actually built for (matches
// the categories used throughout the gallery/templates elsewhere) — real
// gradient artwork built from this app's own brand palette, not stock
// photography, so there's zero licensing risk.
const SLIDES: Slide[] = [
  {
    label: 'Social',
    title: 'Posts that stop the scroll.',
    body: 'Instagram, TikTok, Stories — sized right and ready to post in minutes.',
    colors: ['#EC1E79', '#8B6FC4', '#3FA9E8'],
  },
  {
    label: 'Branding',
    title: 'A brand that looks like one.',
    body: 'Logos, business cards and a consistent look across everything you make.',
    colors: ['#17161B', '#6C4FD1', '#3FA9E8'],
  },
  {
    label: 'Print',
    title: 'Print-ready, no guesswork.',
    body: 'Bleed, safe area and CMYK-aware exports mean it prints exactly as designed.',
    colors: ['#F5B942', '#FF6F91', '#8B6FC4'],
  },
  {
    label: 'Events',
    title: 'Posters people actually notice.',
    body: 'Flyers, invitations and signage with real presence, not a template that looks like one.',
    colors: ['#7ED33E', '#4FC8C0', '#3FA9E8'],
  },
  {
    label: 'Presentations',
    title: 'Decks that feel designed.',
    body: 'A cover slide worth opening, and a deck that matches the rest of your brand.',
    colors: ['#6C4FD1', '#EC1E79', '#F5B942'],
  },
];

const AUTO_ADVANCE_MS = 4500;

export function CreativeCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((i: number) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <Reveal>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">
              Creative possibilities
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight">
              Made for ideas worth seeing.
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => goTo(index - 1)}
              aria-label="Previous slide"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 dark:border-white/15 text-[#17161B] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              aria-label="Next slide"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 dark:border-white/15 text-[#17161B] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          className="relative rounded-3xl overflow-hidden shadow-[0_40px_80px_-40px_rgba(23,22,27,0.35)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide) => (
              <div key={slide.label} className="w-full shrink-0">
                <div
                  className="relative h-72 sm:h-96 flex items-center px-8 sm:px-16 overflow-hidden"
                  style={{ background: `linear-gradient(120deg, ${slide.colors[0]}, ${slide.colors[1]} 55%, ${slide.colors[2]})` }}
                >
                  {/* Soft translucent circles for depth, echoing the day/night
                      ArtworkPanel's ambient-blob treatment elsewhere on this
                      page -- pure CSS, no image assets. */}
                  <div className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -left-10 -bottom-24 w-64 h-64 rounded-full bg-black/10" />

                  <div className="relative max-w-md">
                    <span className="inline-block text-[11px] font-semibold tracking-wide uppercase text-white/90 bg-white/15 rounded-full px-3 py-1">
                      {slide.label}
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-white leading-tight">
                      {slide.title}
                    </h3>
                    <p className="mt-3 text-sm text-white/85 leading-relaxed max-w-sm">{slide.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.label}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'}`}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
