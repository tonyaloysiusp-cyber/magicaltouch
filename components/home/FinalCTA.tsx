'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <div className="rounded-3xl bg-brand-gradient px-8 py-16 sm:py-24 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl text-white leading-[1.05] tracking-tight max-w-2xl mx-auto">
            Ready to make something magical?
          </h2>
          <p className="mt-5 text-white/90 text-lg max-w-md mx-auto">
            Your next great design can start right now.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={goToCreate}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#17161B] px-7 py-3.5 rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.06),0_10px_24px_-8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.06),0_16px_30px_-8px_rgba(0,0,0,0.35)] transition-all"
            >
              Start Creating <ArrowRight size={15} />
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-7 py-3.5 rounded-full border border-white/40 hover:bg-white/10 transition-colors"
            >
              Explore Templates
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
