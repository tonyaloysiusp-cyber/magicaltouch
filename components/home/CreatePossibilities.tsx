'use client';

import { useRouter } from 'next/navigation';
import {
  Share2,
  Sparkles,
  Printer,
  PartyPopper,
  Presentation,
  Megaphone,
  Briefcase,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

interface Possibility {
  label: string;
  icon: LucideIcon;
  colors: [string, string];
  big?: boolean;
}

// An editorial bento grid rather than a uniform icon row — two categories
// get a larger, more prominent tile so the section reads as designed
// rather than auto-generated, while every tile still shares one visual
// language (brand-palette gradient + icon + label).
const POSSIBILITIES: Possibility[] = [
  { label: 'Social', icon: Share2, colors: ['#EC1E79', '#8B6FC4'], big: true },
  { label: 'Branding', icon: Sparkles, colors: ['#17161B', '#6C4FD1'], big: true },
  { label: 'Print', icon: Printer, colors: ['#F5B942', '#FF6F91'] },
  { label: 'Events', icon: PartyPopper, colors: ['#7ED33E', '#4FC8C0'] },
  { label: 'Presentations', icon: Presentation, colors: ['#3FA9E8', '#4FC8C0'] },
  { label: 'Marketing', icon: Megaphone, colors: ['#8B6FC4', '#3FA9E8'] },
  { label: 'Business', icon: Briefcase, colors: ['#6C4FD1', '#EC1E79'] },
  { label: 'Content', icon: FileText, colors: ['#4FC8C0', '#7ED33E'] },
];

export function CreatePossibilities() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">Create</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight max-w-xl">
          Create without limits.
        </h2>
        <p className="mt-5 text-[#4A4750] dark:text-[#B7B2C6] max-w-md leading-relaxed">
          Start with a blank canvas, a template, an image or simply an idea.
          Build it your way.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {POSSIBILITIES.map((p, i) => (
          <Reveal
            key={p.label}
            delayMs={i * 50}
            className={p.big ? 'sm:col-span-2' : 'col-span-1'}
          >
            <button
              onClick={goToCreate}
              className={`group relative w-full overflow-hidden rounded-2xl text-left p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                p.big ? 'h-40 sm:h-48' : 'h-40'
              }`}
              style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}
            >
              <span className="pointer-events-none absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
              <p.icon size={22} className="text-white/90 relative" />
              <span className="relative text-white font-semibold text-lg">{p.label}</span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
