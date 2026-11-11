'use client';

// "The studio" — a light, corporate bento of four tiles you can use:
// recolour a brand post with a palette, compare a photo before and after
// in Photo Studio, see how a print file is set up (trim, bleed, safe area),
// and the file formats you can export.

import { useState } from 'react';
import { Cloud, HardDrive, UserRound } from 'lucide-react';
import { Reveal } from './Reveal';

// Same picture through a hue filter, so the swatches and picture agree.
const BASE = ['#14233B', '#E3A72F', '#F4F1EA'];
const PALETTES = [
  { name: 'Navy & gold', filter: 'none' },
  { name: 'Emerald', filter: 'hue-rotate(-60deg) saturate(1.05)' },
  { name: 'Plum', filter: 'hue-rotate(55deg) saturate(0.95)' },
  { name: 'Terracotta', filter: 'hue-rotate(160deg) saturate(0.9)' },
  { name: 'Graphite', filter: 'grayscale(1) contrast(1.1)' },
];

const FORMATS = [
  ['PDF', 'Vector print'],
  ['Print PDF', 'CMYK, bleed, marks'],
  ['PNG', 'Sharp, transparent'],
  ['JPG', 'Light, for sharing'],
  ['WebP', 'For websites'],
  ['MP4', 'Animated posts'],
];

const SAVE = [
  { icon: HardDrive, title: 'This device' },
  { icon: Cloud, title: 'Your cloud drive' },
  { icon: UserRound, title: 'Your account' },
];

const tile = 'relative h-full overflow-hidden rounded-[28px] border border-mt-border bg-mt-surface p-6 sm:p-8 shadow-[0_1px_0_rgba(15,23,42,0.03)]';

export function StudioTools() {
  const [pal, setPal] = useState(0);
  const [split, setSplit] = useState(52);

  return (
    <section id="features" className="relative border-y border-mt-border bg-mt-surface2/50">
      <div className="mt-container py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#3B82C4]">The studio</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] font-medium text-3xl sm:text-[2.9rem] leading-[1.08] tracking-[-0.03em] max-w-2xl text-mt-ink">
                Everything your brand needs, in one studio.
              </h2>
            </div>
            <p className="text-mt-muted text-base sm:text-lg max-w-sm leading-relaxed">From the first idea to a print-ready file — without switching apps. Try the tiles below.</p>
          </div>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Recolour */}
          <Reveal className="lg:col-span-7">
            <article className={tile}>
              <div className="grid gap-7 sm:grid-cols-[1fr_210px] sm:items-center">
                <div className="relative mx-auto w-full max-w-[380px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/templates/collection/pro-northline-consulting-free-consultation-post.webp"
                    alt={`A consulting post in the ${PALETTES[pal].name} palette`}
                    loading="lazy"
                    className="relative w-full aspect-square object-cover rounded-2xl ring-1 ring-black/5 shadow-[0_24px_50px_-24px_rgba(15,23,42,0.45)] transition-[filter] duration-500"
                    style={{ filter: PALETTES[pal].filter }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-mt-ink">Your brand colours, in one tap</h3>
                  <p className="mt-2 text-sm text-mt-muted leading-relaxed">Save your palette once and apply it to any template. Text stays readable.</p>
                  <div role="radiogroup" aria-label="Colour palette" className="mt-5 flex flex-wrap gap-2">
                    {PALETTES.map((p, i) => (
                      <button
                        key={p.name}
                        role="radio"
                        aria-checked={pal === i}
                        onClick={() => setPal(i)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${pal === i ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border text-mt-ink hover:border-mt-ink/40'}`}
                      >
                        <span className="flex -space-x-1" aria-hidden>
                          {BASE.map((c) => <i key={c} className="block h-3.5 w-3.5 rounded-full ring-2 ring-mt-surface" style={{ background: c, filter: p.filter }} />)}
                        </span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Photo Studio */}
          <Reveal className="lg:col-span-5 lg:row-span-2" delayMs={80}>
            <article className={`${tile} flex flex-col`}>
              <h3 className="text-xl font-semibold text-mt-ink">Photo Studio</h3>
              <p className="mt-2 text-sm text-mt-muted leading-relaxed">Light, colour and retouching, then drop the photo straight into your design. Drag the handle.</p>
              <div className="relative mt-6 flex-1 min-h-[320px] rounded-[20px] overflow-hidden ring-1 ring-black/5 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/templates/photos/pro/city.jpg" alt="A city skyline after editing in Photo Studio" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/templates/photos/pro/city.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'saturate(0.25) brightness(0.72) contrast(0.85)' }} />
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">Before</span>
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#0B0B0F] backdrop-blur">After</span>
                <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,.7)]" style={{ left: `${split}%` }}>
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0B0B0F] shadow-xl text-[13px] font-bold">↔</span>
                </div>
                <input type="range" min={4} max={96} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Compare before and after" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[12px] text-mt-muted">
                {['Enhance', 'Retouch', 'Cut-out', 'Looks'].map((t) => <span key={t} className="rounded-xl border border-mt-border py-2">{t}</span>)}
              </div>
            </article>
          </Reveal>

          {/* Print production */}
          <Reveal className="lg:col-span-4" delayMs={120}>
            <article className={tile}>
              <h3 className="text-xl font-semibold text-mt-ink">Made for the print shop</h3>
              <p className="mt-2 text-sm text-mt-muted leading-relaxed">Every print template is set up the way printers ask for it.</p>
              <div className="mt-6 flex items-center gap-5">
                <svg viewBox="0 0 120 150" className="w-28 shrink-0" aria-hidden>
                  <rect x="6" y="6" width="108" height="138" fill="#3B82C4" opacity=".12" />
                  <rect x="14" y="14" width="92" height="122" className="fill-mt-surface" stroke="#1E3A5F" strokeWidth="1.2" />
                  <rect x="24" y="24" width="72" height="102" fill="none" stroke="#3B82C4" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M0 14h8M0 136h8M112 14h8M112 136h8M14 0v8M106 0v8M14 142v8M106 142v8" className="stroke-mt-ink" strokeWidth="1" />
                </svg>
                <ul className="space-y-2.5 text-[13px]">
                  <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#3B82C4]/25" /> <b className="font-semibold text-mt-ink">Bleed</b> <span className="text-mt-muted">3 mm</span></li>
                  <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm border border-[#1E3A5F]" /> <b className="font-semibold text-mt-ink">Trim</b> <span className="text-mt-muted">final size</span></li>
                  <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm border border-dashed border-[#3B82C4]" /> <b className="font-semibold text-mt-ink">Safe area</b> <span className="text-mt-muted">text inside</span></li>
                  <li className="flex items-center gap-2"><i className="h-2.5 w-2.5 border-t border-l border-mt-ink" /> <b className="font-semibold text-mt-ink">Crop marks</b></li>
                </ul>
              </div>
            </article>
          </Reveal>

          {/* Formats + saving */}
          <Reveal className="lg:col-span-3" delayMs={160}>
            <article className={tile}>
              <h3 className="text-xl font-semibold text-mt-ink">Any format</h3>
              <ul className="mt-4 divide-y divide-mt-border text-[13px]">
                {FORMATS.map(([e, n]) => (
                  <li key={e} className="flex items-center justify-between py-2"><span className="font-semibold text-mt-ink">{e}</span><span className="text-mt-muted">{n}</span></li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                {SAVE.map((s) => (
                  <span key={s.title} title={s.title} className="flex-1 inline-flex flex-col items-center gap-1 rounded-xl border border-mt-border py-2 text-[10.5px] text-mt-muted"><s.icon size={15} className="text-mt-ink" aria-hidden />{s.title.replace('Your ', '')}</span>
                ))}
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
