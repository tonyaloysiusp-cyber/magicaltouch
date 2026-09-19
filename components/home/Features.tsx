'use client';

import { LayoutTemplate, Palette, Share2, Printer, Maximize2, FolderOpen } from 'lucide-react';
import { Reveal } from './Reveal';

const FEATURES = [
  {
    icon: Palette,
    title: 'Design Studio',
    body: 'A full drag-and-drop canvas with shapes, text, photos and a real color and layer system — everything you need to build something from scratch.',
    colors: ['#EC1E79', '#8B6FC4'] as [string, string],
    big: true,
  },
  {
    icon: LayoutTemplate,
    title: 'Ready-to-use Templates',
    body: 'Start from a template built for the format you need and make it yours in minutes.',
    colors: ['#3FA9E8', '#4FC8C0'] as [string, string],
    big: false,
  },
  {
    icon: Share2,
    title: 'Social Media',
    body: 'Posts, stories and covers sized right for every platform.',
    colors: ['#17161B', '#6C4FD1'] as [string, string],
    big: false,
  },
  {
    icon: Printer,
    title: 'Print Ready',
    body: 'Bleed, safe area and CMYK-aware exports mean what you design is what gets printed.',
    colors: ['#F5B942', '#FF6F91'] as [string, string],
    big: false,
  },
  {
    icon: Maximize2,
    title: 'Resize & Adapt',
    body: 'Reuse one design across multiple sizes without starting over.',
    colors: ['#7ED33E', '#4FC8C0'] as [string, string],
    big: false,
  },
  {
    icon: FolderOpen,
    title: 'Your Designs, Anywhere',
    body: 'Everything you make is saved to your dashboard — pick up right where you left off, on any device.',
    colors: ['#6C4FD1', '#EC1E79'] as [string, string],
    big: true,
  },
];

export function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] tracking-wide uppercase">Features</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight max-w-lg">
          Everything you need to create.
        </h2>
      </Reveal>

      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <Reveal
            key={f.title}
            delayMs={i * 70}
            className={f.big ? 'md:col-span-2' : 'md:col-span-1'}
          >
            <div className="group h-full rounded-2xl border border-black/10 p-7 hover:border-black/20 hover:-translate-y-1 transition-all duration-300 bg-white">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg, ${f.colors[0]}, ${f.colors[1]})` }}
              >
                <f.icon size={19} />
              </div>
              <h3 className="mt-5 font-semibold text-lg text-[#17161B]">{f.title}</h3>
              <p className="mt-2 text-sm text-[#4A4750] leading-relaxed max-w-sm">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
