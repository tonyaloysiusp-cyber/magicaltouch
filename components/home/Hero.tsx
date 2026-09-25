'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { WorkspacePreview } from './WorkspacePreview';
import { Reveal } from './Reveal';

export function Hero() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 md:pt-20">
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-14 items-center">
        <Reveal>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">
            <Sparkles size={13} />
            <span>Your Creative Space</span>
          </div>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-6xl sm:text-7xl leading-[0.98] tracking-tight">
            Create.
            <br />
            Design.
            <br />
            <span className="italic bg-brand-gradient bg-clip-text text-transparent">Make it magical.</span>
          </h1>

          <p className="mt-7 text-lg text-[#4A4750] dark:text-[#B7B2C6] max-w-md leading-relaxed">
            Your creative space for turning ideas into designs people remember.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={goToCreate}
              className="relative overflow-hidden inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-[0_10px_24px_-8px_rgba(108,79,209,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(108,79,209,0.65)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
            >
              Start Creating <ArrowRight size={15} />
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full border border-black/15 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40 transition-colors"
            >
              Explore Templates
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#4A4750] dark:text-[#8A8496]">Free to create. No complicated plans.</p>
        </Reveal>

        <Reveal delayMs={150}>
          <WorkspacePreview />
        </Reveal>
      </div>
    </section>
  );
}
