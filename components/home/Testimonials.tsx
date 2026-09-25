'use client';

import { Star } from 'lucide-react';
import { Reveal } from './Reveal';

const TESTIMONIALS = [
  {
    name: 'Maya Chen',
    role: 'Independent Designer',
    quote: 'I switched my whole freelance workflow to Magical Touch. The print-ready exports alone saved me hours per project.',
    initials: 'MC',
    colors: ['#EC1E79', '#8B6FC4'] as [string, string],
  },
  {
    name: 'Jordan Reyes',
    role: 'Small Business Owner',
    quote: 'I\'m not a designer, but I made flyers and a menu for my shop that actually look professional. Genuinely surprised.',
    initials: 'JR',
    colors: ['#3FA9E8', '#4FC8C0'] as [string, string],
  },
  {
    name: 'Priya Patel',
    role: 'Event Organizer',
    quote: 'The templates gave me a starting point for every event this year — invitations, posters, social posts, all in one place.',
    initials: 'PP',
    colors: ['#F5B942', '#FF6F91'] as [string, string],
  },
];

export function Testimonials() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase text-center">Loved by creators</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight text-center">
          People are making magic.
        </h2>
      </Reveal>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delayMs={i * 90}>
            <div className="h-full rounded-2xl border border-black/10 dark:border-white/10 p-7 bg-white dark:bg-[#1B1926]">
              <div className="flex gap-0.5 text-[#F5B942]">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-4 text-sm text-[#4A4750] dark:text-[#B7B2C6] leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#17161B] dark:text-[#F3F1F7]">{t.name}</p>
                  <p className="text-xs text-[#4A4750] dark:text-[#8A8496]">{t.role}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
