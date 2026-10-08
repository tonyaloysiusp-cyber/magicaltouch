'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  LayoutTemplate,
  Shapes,
  Type,
  Image as ImageIcon,
  Palette,
  Upload,
  Undo2,
  Redo2,
  Search,
  Bold,
  Italic,
  AlignCenter,
  Square,
  AlignLeft,
  Download,
  Eye,
  Lock,
} from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { BrandRibbon } from './BrandRibbon';

// Real templates from the library, shown inside a working replica of the
// editor. Picking one in the side panel puts it on the canvas.
const DESIGNS = [
  { slug: 'balloon-bash-invitation', name: "Mia's 6th birthday invite", w: 1050, h: 1500 },
  { slug: 'summer-music-festival', name: 'Summer music festival poster', w: 1200, h: 1800 },
  { slug: 'classic-wedding-invitation', name: 'Sophia & Liam wedding invite', w: 1050, h: 1500 },
  { slug: 'black-friday-deals', name: 'Black Friday sale post', w: 1080, h: 1350 },
  { slug: 'classic-restaurant-menu', name: 'The Olive Room menu', w: 1240, h: 1754 },
  { slug: 'neon-glow-birthday-party', name: 'Neon birthday party post', w: 1080, h: 1350 },
];

// The logo's colours, used as the colour panel's swatches; the chosen
// one becomes the selection colour on the canvas.
const SWATCHES = ['#35C2F1', '#F2708F', '#A69BD3', '#5DCCB8', '#8CC84B', '#09090B'];

const RAIL = [
  { icon: LayoutTemplate, label: 'Templates' },
  { icon: Shapes, label: 'Elements' },
  { icon: Type, label: 'Text' },
  { icon: ImageIcon, label: 'Photos' },
  { icon: Palette, label: 'Brand' },
  { icon: Upload, label: 'Uploads' },
];

const LAYERS = [
  { icon: Type, name: 'Heading' },
  { icon: AlignLeft, name: 'Details' },
  { icon: ImageIcon, name: 'Artwork' },
  { icon: Square, name: 'Background', locked: true },
];

export function WorkspaceHero() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [swatch, setSwatch] = useState(SWATCHES[0]);

  // Gently cycle through the designs until the visitor picks one.
  useEffect(() => {
    if (touched || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % DESIGNS.length), 3800);
    return () => window.clearInterval(id);
  }, [touched]);

  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  const d = DESIGNS[active];

  return (
    <section className="relative overflow-hidden bg-mt-bg">
      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] font-medium text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[5.25rem] tracking-[-0.035em] text-mt-ink">
          Design anything.
          <br />
          Make it{' '}
          <span className="relative inline-block">
            <span className="mt-spectrum-text">magical.</span>
            <Sparkle className="absolute -top-3 -right-5 sm:-top-5 sm:-right-8 w-6 h-6 sm:w-9 sm:h-9" />
          </span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-mt-muted max-w-xl mx-auto leading-relaxed">
          Start from 175+ professional templates or a blank canvas, then change every word, colour and photo. Free, right in your browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={goToCreate}
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full bg-mt-primary text-mt-onprimary hover:-translate-y-0.5 transition-transform"
          >
            Start designing <ArrowRight size={15} />
          </button>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-full border border-mt-border text-mt-ink hover:border-mt-ink/40 transition-colors"
          >
            Browse templates
          </Link>
        </div>
      </div>

      {/* The workspace, with the brand ribbon sweeping behind it */}
      <div className="relative mt-16 sm:mt-24 pb-16 sm:pb-24">
        <BrandRibbon className="absolute left-1/2 -translate-x-1/2 -top-8 sm:-top-36 w-[1000px] sm:w-[1700px] max-w-none pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6">
          <div className="rounded-[20px] sm:rounded-[24px] p-px mt-spectrum shadow-[0_50px_100px_-40px_rgba(9,9,11,0.35)] dark:shadow-[0_50px_120px_-40px_rgba(53,194,241,0.25)]">
            <div className="rounded-[19px] sm:rounded-[23px] overflow-hidden bg-mt-surface text-left">
              {/* Top bar */}
              <div className="h-12 flex items-center gap-3 px-3 sm:px-4 border-b border-mt-border">
                <span className="w-6 h-6 rounded-md mt-spectrum shrink-0" aria-hidden />
                <span className="text-[13px] font-medium text-mt-ink truncate">{d.name}</span>
                <span className="hidden md:flex items-center gap-1 ml-3 text-mt-faint">
                  <Undo2 size={15} />
                  <Redo2 size={15} className="ml-1.5" />
                </span>
                <span className="ml-auto hidden sm:inline text-xs text-mt-faint tabular-nums">
                  {d.w} × {d.h} px
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-mt-muted border border-mt-border rounded-full px-3 py-1.5">
                  <Eye size={13} /> Preview
                </span>
                <span className="ml-auto sm:ml-0 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-mt-primary text-mt-onprimary">
                  <Download size={13} /> Download
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[72px_230px_1fr] lg:grid-cols-[72px_240px_1fr_220px]">
                {/* Tool rail */}
                <div className="hidden md:flex flex-col items-center gap-1 py-3 border-r border-mt-border">
                  {RAIL.map((r, i) => (
                    <span
                      key={r.label}
                      className={`w-14 py-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-medium ${
                        i === 0 ? 'mt-active-blue border border-transparent text-mt-ink' : 'text-mt-faint'
                      }`}
                    >
                      <r.icon size={17} />
                      {r.label}
                    </span>
                  ))}
                </div>

                {/* Templates panel */}
                <div className="hidden md:block p-3 border-r border-mt-border">
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-mt-border text-xs text-mt-faint">
                    <Search size={14} /> Search templates
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {DESIGNS.map((t, i) => (
                      <button
                        key={t.slug}
                        onClick={() => pick(i)}
                        aria-label={`Put ${t.name} on the canvas`}
                        aria-pressed={i === active}
                        className={`relative h-[118px] rounded-lg overflow-hidden bg-mt-surface2 transition-shadow ${
                          i === active ? 'ring-2 ring-offset-2 ring-offset-mt-surface' : 'ring-1 ring-mt-border hover:ring-mt-ink/30'
                        }`}
                        style={i === active ? ({ ['--tw-ring-color' as any]: swatch } as React.CSSProperties) : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/templates/collection/${t.slug}.jpg`} alt="" className="w-full h-full object-cover object-top" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative bg-mt-studio h-[360px] sm:h-[460px] lg:h-[520px] flex items-center justify-center overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-60 dark:opacity-40"
                    style={{
                      backgroundImage: 'radial-gradient(rgb(var(--mt-border)) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }}
                    aria-hidden
                  />
                  <div className="relative h-[78%]" style={{ aspectRatio: `${d.w} / ${d.h}` }}>
                    {DESIGNS.map((t, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={t.slug}
                        src={`/templates/collection/${t.slug}.jpg`}
                        alt={i === active ? t.name : ''}
                        className={`absolute inset-0 w-full h-full object-cover shadow-[0_24px_50px_-20px_rgba(9,9,11,0.45)] transition-opacity duration-500 ${
                          i === active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}
                    {/* Selection */}
                    <div className="absolute -inset-1.5 border-[1.5px] pointer-events-none" style={{ borderColor: swatch }}>
                      {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
                        <span key={pos} className={`absolute ${pos} w-2 h-2 rounded-[2px] bg-white border-[1.5px]`} style={{ borderColor: swatch }} />
                      ))}
                    </div>
                    {/* Floating text toolbar */}
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1 rounded-xl border border-mt-border bg-mt-surface px-1.5 py-1 shadow-lg text-mt-ink">
                      <span className="text-xs font-medium px-2 py-1 rounded-md border border-mt-border">Unbounded</span>
                      <span className="text-xs tabular-nums px-2 py-1 rounded-md border border-mt-border">64</span>
                      <span className="p-1.5 rounded-md mt-active-blue border border-transparent"><Bold size={13} /></span>
                      <span className="p-1.5 text-mt-muted"><Italic size={13} /></span>
                      <span className="p-1.5 text-mt-muted"><AlignCenter size={13} /></span>
                      <span className="w-5 h-5 rounded-full mx-1 ring-1 ring-mt-border" style={{ background: swatch }} />
                    </div>
                  </div>
                </div>

                {/* Properties */}
                <div className="hidden lg:block p-4 border-l border-mt-border">
                  <p className="text-xs font-semibold text-mt-ink">Colour</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSwatch(c)}
                        aria-label={`Use colour ${c}`}
                        aria-pressed={c === swatch}
                        className={`w-7 h-7 rounded-full ring-offset-2 ring-offset-mt-surface transition-shadow ${
                          c === swatch ? 'ring-2 ring-mt-ink' : 'ring-1 ring-black/10 dark:ring-white/15'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 h-2 rounded-full mt-spectrum relative">
                    <span className="absolute top-1/2 left-[45%] -translate-y-1/2 w-4 h-4 rounded-full bg-white ring-1 ring-black/15 shadow" />
                  </div>

                  <p className="mt-6 text-xs font-semibold text-mt-ink">Opacity</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-mt-border relative">
                      <span className="absolute inset-y-0 left-0 w-[86%] rounded-full bg-mt-ink" />
                    </div>
                    <span className="text-xs tabular-nums text-mt-muted">86%</span>
                  </div>

                  <p className="mt-6 text-xs font-semibold text-mt-ink">Layers</p>
                  <ul className="mt-2 space-y-1">
                    {LAYERS.map((l, i) => (
                      <li
                        key={l.name}
                        className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border ${
                          i === 0 ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-muted'
                        }`}
                      >
                        <l.icon size={14} />
                        {l.name}
                        {l.locked && <Lock size={12} className="ml-auto text-mt-faint" />}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Phones and small tablets: the template picker sits under the canvas */}
              <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar p-3 border-t border-mt-border">
                {DESIGNS.map((t, i) => (
                  <button
                    key={t.slug}
                    onClick={() => pick(i)}
                    aria-label={`Put ${t.name} on the canvas`}
                    aria-pressed={i === active}
                    className={`shrink-0 w-14 h-20 rounded-md overflow-hidden ${i === active ? 'ring-2 ring-offset-2 ring-offset-mt-surface' : 'ring-1 ring-mt-border'}`}
                    style={i === active ? ({ ['--tw-ring-color' as any]: swatch } as React.CSSProperties) : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/templates/collection/${t.slug}.jpg`} alt="" className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// The four-point star from the logo, in the brand spectrum.
function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="mt-sparkle" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F2708F" />
          <stop offset="0.5" stopColor="#35C2F1" />
          <stop offset="1" stopColor="#8CC84B" />
        </linearGradient>
      </defs>
      <path d="M20 0C21.5 12 28 18.5 40 20C28 21.5 21.5 28 20 40C18.5 28 12 21.5 0 20C12 18.5 18.5 12 20 0Z" fill="url(#mt-sparkle)" />
    </svg>
  );
}
