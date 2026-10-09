'use client';

// One-tap starts: the most common things people make, straight to the
// right size on the New Design page.

import Link from 'next/link';
import { Wand2 } from 'lucide-react';
import { GOALS } from '@/lib/create/catalog';
import { GoalIcon } from '@/components/create/GoalIcon';

export function QuickStart() {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto mt-scroll pb-1" role="group" aria-label="Start something new">
      <Link href="/create?wizard=1" className="shrink-0 flex items-center gap-2.5 h-14 pl-3 pr-4 rounded-2xl mt-spectrum-border bg-mt-surface hover:-translate-y-0.5 transition-transform">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center bg-[#A69BD3]/20 text-[#7565C2]">
          <Wand2 size={18} />
        </span>
        <span className="text-[13px] font-semibold whitespace-nowrap">Help me choose</span>
      </Link>
      {GOALS.map((g) => (
        <Link
          key={g.id}
          href={`/create?size=${g.presets[0]}`}
          className="shrink-0 flex items-center gap-2.5 h-14 pl-2 pr-4 rounded-2xl border border-mt-border bg-mt-surface hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-18px_rgba(9,9,11,0.5)] transition-all"
        >
          <GoalIcon id={g.id} />
          <span className="text-[13px] font-semibold whitespace-nowrap">{g.label}</span>
        </Link>
      ))}
    </div>
  );
}
