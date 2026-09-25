'use client';

import { MousePointer2, Type, Share2, Zap, Printer } from 'lucide-react';
import { Reveal } from './Reveal';

// Large editorial feature statements rather than a grid of small cards —
// each gets its own full-width beat, alternating text/visual sides, so
// every capability gets room to breathe instead of competing for
// attention in a 6-up grid.
const FEATURES = [
  {
    eyebrow: 'Freedom',
    title: 'Design freely.',
    body: 'Every element is yours to move, shape and transform.',
    icon: MousePointer2,
    colors: ['#EC1E79', '#8B6FC4'] as [string, string],
  },
  {
    eyebrow: 'Detail',
    title: 'Make every detail yours.',
    body: 'Typography, images, colors and composition — make the design feel like you.',
    icon: Type,
    colors: ['#3FA9E8', '#4FC8C0'] as [string, string],
  },
  {
    eyebrow: 'Format',
    title: 'Create for every format.',
    body: 'From social posts to print-ready designs.',
    icon: Share2,
    colors: ['#F5B942', '#FF6F91'] as [string, string],
  },
  {
    eyebrow: 'Speed',
    title: 'Work faster.',
    body: 'Start with templates and make them your own.',
    icon: Zap,
    colors: ['#7ED33E', '#4FC8C0'] as [string, string],
  },
  {
    eyebrow: 'Print',
    title: 'Ready for the real world.',
    body: 'Create designs that can move from screen to print.',
    icon: Printer,
    colors: ['#6C4FD1', '#EC1E79'] as [string, string],
  },
];

function FeatureVisual({ colors, Icon }: { colors: [string, string]; Icon: typeof MousePointer2 }) {
  return (
    <div
      className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden flex items-center justify-center shadow-[0_30px_60px_-30px_rgba(23,22,27,0.35)]"
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
    >
      <span className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -left-8 -bottom-14 w-36 h-36 rounded-full bg-black/10" />
      <div className="relative w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
        <Icon size={32} className="text-white" strokeWidth={1.75} />
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 space-y-20 sm:space-y-28">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">Features</p>
      </Reveal>

      {FEATURES.map((f, i) => (
        <Reveal key={f.title} delayMs={80}>
          <div
            className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
              i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <FeatureVisual colors={f.colors} Icon={f.icon} />
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: f.colors[0] }}>
                {f.eyebrow}
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight">
                {f.title}
              </h3>
              <p className="mt-5 text-lg text-[#4A4750] dark:text-[#B7B2C6] leading-relaxed max-w-md">{f.body}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </section>
  );
}
