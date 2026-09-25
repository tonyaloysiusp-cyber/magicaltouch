'use client';

import { Sparkles, Wand2 } from 'lucide-react';

const SWATCHES = ['#EC1E79', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#7ED33E', '#C4DA3B'];

// The hero's visual, deliberately NOT a literal app screenshot — the
// actual product is demonstrated later in ProductWorkspace. Here it's a
// bold, art-directed collage of tilted gradient cards (the kind of
// editorial composition a design studio's own poster would use), so the
// hero reads as a brand statement rather than a UI mockup.
export function CreativeHeroArt() {
  return (
    <div className="relative h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden sm:overflow-visible">
      <span className="pointer-events-none absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#3FA9E8]/20 blur-3xl -translate-x-16 -translate-y-10" />
      <span className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#7ED33E]/20 blur-3xl translate-x-24 translate-y-16" />

      {/* Back card: abstract teal/blue panel with a large ring motif */}
      <div className="absolute w-48 h-60 sm:w-56 sm:h-72 rounded-[2rem] -rotate-12 -translate-x-24 translate-y-4 shadow-[0_30px_60px_-25px_rgba(23,22,27,0.4)] bg-gradient-to-br from-[#3FA9E8] to-[#4FC8C0] overflow-hidden">
        <span className="absolute w-40 h-40 rounded-full border-[10px] border-white/25 -right-10 -top-10" />
        <span className="absolute w-24 h-24 rounded-full bg-white/15 left-4 bottom-6" />
      </div>

      {/* Back card 2: warm poster panel */}
      <div className="absolute w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] rotate-[18deg] translate-x-28 -translate-y-6 shadow-[0_30px_60px_-25px_rgba(23,22,27,0.4)] bg-gradient-to-br from-[#F5B942] to-[#FF6F91] overflow-hidden">
        <span className="absolute inset-x-6 bottom-6 h-1.5 rounded-full bg-white/70" />
        <span className="absolute inset-x-6 bottom-10 h-1.5 w-2/3 rounded-full bg-white/50" />
      </div>

      {/* Main card: the brand mark itself, front and center */}
      <div className="relative w-56 h-64 sm:w-64 sm:h-72 rounded-[2rem] rotate-[-3deg] shadow-[0_40px_80px_-30px_rgba(108,79,209,0.55)] bg-brand-gradient flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <span className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -left-8 -bottom-12 w-28 h-28 rounded-full bg-black/10" />
        <span className="relative w-12 h-12 rounded-full bg-white/90 flex items-center justify-center mb-4">
          <Sparkles size={20} className="text-[#6C4FD1]" />
        </span>
        <p className="relative font-[family-name:var(--font-display)] italic text-2xl sm:text-3xl text-white leading-tight">
          Make it
          <br />
          magical.
        </p>
      </div>

      {/* Floating palette sticker */}
      <div className="hidden sm:flex absolute -bottom-4 left-1/2 -translate-x-1/2 items-center gap-1.5 bg-white rounded-full shadow-[0_16px_28px_-10px_rgba(23,22,27,0.3)] px-3 py-2 rotate-2">
        {SWATCHES.map((c) => (
          <span key={c} className="w-3.5 h-3.5 rounded-full" style={{ background: c }} />
        ))}
      </div>

      {/* Floating tool badge */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-6 w-14 h-14 rounded-2xl flex items-center justify-center rotate-6 hover:rotate-0 transition-transform duration-300 bg-[#17161B] shadow-[0_16px_28px_-8px_rgba(23,22,27,0.5)]">
        <Wand2 size={22} className="text-white" />
      </div>
    </div>
  );
}
