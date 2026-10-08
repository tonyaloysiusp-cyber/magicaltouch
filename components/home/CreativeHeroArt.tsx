'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, Wand2, Layers, Palette } from 'lucide-react';

const SWATCHES = ['#EC1E79', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#7ED33E', '#C4DA3B'];

// Real templates from the library, fanned out in 3D.
const CARDS = [
  { slug: 'summer-music-festival', x: -190, y: 30, z: -120, r: -14, w: 150, ratio: 1.5 },
  { slug: 'classic-wedding-invitation', x: 170, y: 40, z: -110, r: 12, w: 140, ratio: 1.43 },
  { slug: 'eighteen-neon-night', x: -95, y: -120, z: -40, r: -8, w: 130, ratio: 1 },
  { slug: 'black-friday-deals', x: 120, y: -125, z: -30, r: 9, w: 132, ratio: 1.25 },
  { slug: 'balloon-bash-invitation', x: 0, y: 10, z: 60, r: -3, w: 190, ratio: 1.43 },
];

// The hero's 3D stage: real template cards floating on a tilted plane
// that gently follows the pointer, with glowing brand-gradient orbs and
// glass "tool" chips. Transform-only animation, so it stays smooth.
export function CreativeHeroArt() {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty('--ry', `${(-14 + dx * 14).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(10 - dy * 10).toFixed(2)}deg`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="relative h-[440px] sm:h-[520px] flex items-center justify-center [perspective:1400px]">
      {/* Glowing brand orbs */}
      <div className="pointer-events-none absolute -top-6 left-6 w-56 h-56 rounded-full bg-[#EC1E79]/30 blur-3xl animate-bg-float-a" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#3FA9E8]/30 blur-3xl animate-bg-float-b" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-[#7ED33E]/20 blur-3xl animate-bg-float-a" />

      {/* Rotating gradient ring (3D) */}
      <div
        className="pointer-events-none absolute w-[420px] h-[420px] rounded-full opacity-60 animate-mt-spin-slow"
        style={{
          background: 'conic-gradient(from 0deg, #EC1E79, #8B6FC4, #3FA9E8, #4FC8C0, #7ED33E, #C4DA3B, #EC1E79)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
          transform: 'rotateX(68deg)',
        }}
      />

      <div
        ref={stage}
        className="relative w-full h-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: 'rotateX(var(--rx, 10deg)) rotateY(var(--ry, -14deg))' }}
      >
        {CARDS.map((c, i) => (
          <div
            key={c.slug}
            className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
            style={{ transform: `translate3d(${c.x - c.w / 2}px, ${c.y - (c.w * c.ratio) / 2}px, ${c.z}px)` }}
          >
            <div className="animate-mt-float" style={{ ['--r' as any]: `${c.r}deg`, animationDelay: `${i * -1.3}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/templates/collection/${c.slug}.jpg`}
                alt=""
                width={c.w}
                height={Math.round(c.w * c.ratio)}
                className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_60px_-20px_rgba(23,20,42,0.55)] object-cover"
                style={{ width: c.w, height: c.w * c.ratio }}
              />
            </div>
          </div>
        ))}

        {/* Glass tool chips floating in front */}
        <div className="absolute left-[8%] top-[14%] [transform:translateZ(120px)]">
          <div className="mt-glass border border-mt-border rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl animate-mt-float">
            <span className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center"><Wand2 size={14} className="text-white" /></span>
            <span className="text-xs font-semibold text-mt-ink">Magic edit</span>
          </div>
        </div>
        <div className="absolute right-[6%] top-[46%] [transform:translateZ(140px)]">
          <div className="mt-glass border border-mt-border rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl animate-mt-float" style={{ animationDelay: '-2s' }}>
            <Layers size={15} className="text-mt-accent" />
            <span className="text-xs font-semibold text-mt-ink">200+ templates</span>
          </div>
        </div>
        <div className="absolute left-[30%] bottom-[6%] mt-glass border border-mt-border rounded-full px-3 py-2 flex items-center gap-1.5 shadow-xl [transform:translateZ(100px)]">
          <Palette size={14} className="text-mt-accent mr-1" />
          {SWATCHES.map((c) => (
            <span key={c} className="w-3.5 h-3.5 rounded-full ring-2 ring-white/60" style={{ background: c }} />
          ))}
        </div>
        <div className="absolute right-[18%] top-[6%] w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-xl [transform:translateZ(160px)_rotate(8deg)]">
          <Sparkles size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}
