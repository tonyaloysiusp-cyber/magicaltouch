'use client';

// "One studio for every idea" — a dark studio band with four tiles you can
// actually play with: recolour an invitation, drag the Photo Studio
// before/after handle, follow a design to where it is saved, and fan out
// the export formats.

import { useState } from 'react';
import { Cloud, HardDrive, UserRound } from 'lucide-react';
import { Reveal } from './Reveal';

// The invitation's own colours (neon pink, neon cyan, night) — each palette
// is the same picture through a hue filter, so swatch and picture agree.
const BASE = ['#FF2FC8', '#2CE6F2', '#120A1F'];
const PALETTES = [
  { name: 'Neon', filter: 'none' },
  { name: 'Lime', filter: 'hue-rotate(150deg) saturate(1.1)' },
  { name: 'Ocean', filter: 'hue-rotate(260deg)' },
  { name: 'Sunset', filter: 'hue-rotate(60deg) saturate(1.2)' },
  { name: 'Mono', filter: 'grayscale(1) contrast(1.15)' },
];

const SAVE = [
  { icon: HardDrive, title: 'This device', body: 'A file on your computer, iPad or phone' },
  { icon: Cloud, title: 'Your cloud drive', body: 'A folder you choose' },
  { icon: UserRound, title: 'Your account', body: 'Open it anywhere' },
];

const FORMATS = [
  { ext: 'PNG', note: 'Sharp, transparent', c: '#35C2F1' },
  { ext: 'JPG', note: 'Small, for sharing', c: '#F2708F' },
  { ext: 'WebP', note: 'For websites', c: '#5DCCB8' },
  { ext: 'PDF', note: 'Vector, for print', c: '#A69BD3' },
  { ext: 'Print', note: 'CMYK PDF, bleed + marks', c: '#DDE23B' },
  { ext: 'TIFF', note: 'For print shops', c: '#8CC84B' },
];

const tile = 'relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8';

export function StudioTools() {
  const [pal, setPal] = useState(0);
  const [split, setSplit] = useState(50);

  return (
    <section id="features" className="mt-container py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[44px] bg-[#0B0B0F] text-white px-5 py-12 sm:px-10 sm:py-16 lg:px-14">
        {/* soft brand glow */}
        <span aria-hidden className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[#F2708F]/25 blur-[100px]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#35C2F1]/20 blur-[110px]" />

        <Reveal>
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-white/50">The studio</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.05] tracking-[-0.03em] max-w-2xl">
                One studio. <span className="mt-spectrum-text">Every idea.</span>
              </h2>
            </div>
            <p className="text-white/60 text-base sm:text-lg max-w-sm leading-relaxed">From template to finished file without switching apps. Try the tiles below.</p>
          </div>
        </Reveal>

        <div className="relative mt-10 sm:mt-14 grid gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Recolour — interactive */}
          <Reveal className="lg:col-span-7">
            <article className={tile}>
              <div className="grid gap-6 sm:grid-cols-[1fr_190px] sm:items-center">
                <div className="relative mx-auto w-full max-w-[340px]">
                  <div aria-hidden className="absolute inset-4 rounded-[24px] blur-2xl opacity-60 transition-[filter] duration-500" style={{ background: `linear-gradient(135deg, ${BASE[0]}, ${BASE[1]})`, filter: `${PALETTES[pal].filter} blur(28px)` }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/templates/collection/eighteen-neon-night.jpg"
                    alt={`A party invitation in the ${PALETTES[pal].name} colourway`}
                    loading="lazy"
                    className="relative w-full aspect-square object-cover rounded-[22px] ring-1 ring-white/15 transition-[filter] duration-500"
                    style={{ filter: PALETTES[pal].filter }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Change every colour</h3>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">Your brand, the season, the mood of the party — tap a palette.</p>
                  <div role="radiogroup" aria-label="Colour palette" className="mt-5 flex flex-wrap gap-2">
                    {PALETTES.map((p, i) => (
                      <button
                        key={p.name}
                        role="radio"
                        aria-checked={pal === i}
                        onClick={() => setPal(i)}
                        className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${pal === i ? 'border-white bg-white text-[#0B0B0F]' : 'border-white/15 text-white/80 hover:border-white/40'}`}
                      >
                        <span className="flex -space-x-1" aria-hidden>
                          {BASE.map((c) => <i key={c} className="block h-3.5 w-3.5 rounded-full ring-2 ring-[#0B0B0F]" style={{ background: c, filter: p.filter }} />)}
                        </span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Photo Studio — draggable before/after */}
          <Reveal className="lg:col-span-5 lg:row-span-2" delayMs={80}>
            <article className={`${tile} flex flex-col`}>
              <h3 className="text-xl font-semibold">Photo Studio</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">Crop, adjust and retouch, then drop the photo straight into your design. Drag the handle.</p>
              <div className="relative mt-6 flex-1 min-h-[320px] rounded-[20px] overflow-hidden ring-1 ring-white/15 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/templates/collection/summer-music-festival.jpg" alt="A festival poster after editing in Photo Studio" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/templates/collection/summer-music-festival.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'saturate(0.3) brightness(0.78) contrast(0.88) sepia(0.15)' }} />
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">Before</span>
                <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-[#0B0B0F] backdrop-blur">After</span>
                <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,.7)]" style={{ left: `${split}%` }}>
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0B0B0F] shadow-xl text-[13px] font-bold">↔</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={96}
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  aria-label="Compare before and after"
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[11px] text-white/60">
                {['Enhance', 'Retouch', 'Cut-out', 'Looks'].map((t) => <span key={t} className="rounded-xl border border-white/10 py-2">{t}</span>)}
              </div>
            </article>
          </Reveal>

          {/* Save anywhere — a path */}
          <Reveal className="lg:col-span-3" delayMs={120}>
            <article className={tile}>
              <h3 className="text-xl font-semibold">Save it where you like</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">Your designs stay yours.</p>
              <ol className="relative mt-6 space-y-5">
                <span aria-hidden className="absolute left-[17px] top-4 bottom-4 w-px bg-gradient-to-b from-[#F2708F] via-[#35C2F1] to-[#8CC84B]" />
                {SAVE.map((s) => (
                  <li key={s.title} className="relative flex items-center gap-3">
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B0B0F] ring-1 ring-white/20"><s.icon size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{s.title}</span>
                      <span className="block text-xs text-white/50">{s.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>

          {/* Formats — a fan of files */}
          <Reveal className="lg:col-span-4" delayMs={160}>
            <article className={tile}>
              <h3 className="text-xl font-semibold">Ready for print and social</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">Any size, from a 1080 × 1080 post to an A5 flyer.</p>
              <ul className="mt-6 grid grid-cols-3 gap-2.5">
                {FORMATS.map((f, i) => (
                  <li
                    key={f.ext}
                    className="group relative rounded-xl bg-white text-[#0B0B0F] px-2.5 pt-6 pb-2.5 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
                    style={{ transform: `rotate(${[-4, 2, -2, 3, -3, 2][i]}deg)` }}
                  >
                    <span aria-hidden className="absolute right-0 top-0 h-4 w-4 rounded-bl-md" style={{ background: `linear-gradient(225deg, #0B0B0F 50%, ${f.c} 50%)` }} />
                    <span aria-hidden className="absolute left-2.5 top-2.5 h-1.5 w-6 rounded-full" style={{ background: f.c }} />
                    <span className="block text-[15px] font-bold tracking-tight">{f.ext}</span>
                    <span className="block text-[10px] leading-tight text-black/55">{f.note}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
