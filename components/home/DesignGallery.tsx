'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Reveal } from './Reveal';

const GALLERY = [
  { label: 'Studio Launch Post', category: 'Social', colors: ['#EC1E79', '#8B6FC4'] as [string, string], h: 'h-72' },
  { label: 'Weekend Market Flyer', category: 'Print', colors: ['#F5B942', '#FF6F91'] as [string, string], h: 'h-96' },
  { label: 'Founders Business Card', category: 'Branding', colors: ['#17161B', '#6C4FD1'] as [string, string], h: 'h-60' },
  { label: 'Grand Opening Poster', category: 'Events', colors: ['#3FA9E8', '#4FC8C0'] as [string, string], h: 'h-96' },
  { label: 'Quarterly Deck Cover', category: 'Presentations', colors: ['#6C4FD1', '#EC1E79'] as [string, string], h: 'h-64' },
  { label: 'Golden Hour Invite', category: 'Events', colors: ['#F5B942', '#8B6FC4'] as [string, string], h: 'h-80' },
];

export function DesignGallery() {
  const router = useRouter();

  const useTemplate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">Made in Magical Touch</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight max-w-lg">
          Real designs, made by creators like you.
        </h2>
      </Reveal>

      <div className="mt-12 columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
        {GALLERY.map((g, i) => (
          <Reveal key={g.label} delayMs={i * 60} className="break-inside-avoid">
            <button
              onClick={useTemplate}
              className={`group relative w-full ${g.h} rounded-2xl overflow-hidden block text-left shadow-sm hover:shadow-xl transition-all duration-300`}
            >
              <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
                <MockDesignCard colors={g.colors} label={g.label} />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-semibold tracking-wide uppercase">{g.category}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-white font-medium">{g.label}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#17161B] bg-white px-3 py-1.5 rounded-full shrink-0">
                    Use Template <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
