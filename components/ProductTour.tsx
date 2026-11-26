'use client';
// "See it in action" — real screenshots of the tools (captured from the live
// site at 2x), one tab per tool, with what it does in a sentence and a link
// to open it. Used on the About and Tutorials pages.
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const TOUR = [
  { id: 'packaging', name: 'Packaging', href: '/packaging-dieline', img: '/tour/packaging.webp', w: 2000, h: 1250,
    text: 'Pick a box style — tuck end, crash lock, gable, pillow, mailer, trays — enter the size, and design straight on the dieline. Cut and crease lines stay on their own locked layer; download the print PDF, the dieline for the die maker and a packaging specification.' },
  { id: 'textile', name: 'Textile', href: '/textile-studio', img: '/tour/textile.webp', w: 2000, h: 1250,
    text: 'Polos, T-shirts, jerseys, kurtis, churidars and frocks as real pattern pieces from body measurements and sizes XS–XXXL. Add team names and numbers, see the fabric you need, and download full-size patterns, DXF and a garment specification.' },
  { id: 'photo', name: 'Photo Studio', href: '/photo-studio', img: '/tour/photo-studio.webp', w: 2000, h: 1250,
    text: 'Layers, light and colour adjustments, filters and looks, retouching, clone brush and face shaping with a big before-and-after view. Export JPG, PNG, WebP or a CMYK file for print.' },
  { id: 'patterns', name: 'Pattern Design', href: '/patterns', img: '/tour/patterns.webp', w: 2000, h: 1250,
    text: 'Seamless repeats — grid, brick, half-drop, mirror, kaleidoscope — from 160+ motifs or your own drawing, plus rangoli and mandala. Download a seamless tile as SVG or vector PDF, or keep designing with it.' },
  { id: 'trace', name: 'Image Trace', href: '/trace', img: '/tour/image-trace.webp', w: 2000, h: 806,
    text: 'Turn a logo, sketch or photo into clean vector shapes — black and white, line art or up to 32 colours. Download SVG or PDF, or edit the shapes in the design editor.' },
  { id: 'background', name: 'Background Remover', href: '/remove-background', img: '/tour/background-remover.webp', w: 2000, h: 806,
    text: 'Remove the background from one photo or sixty at once — transparent, white or any colour. It runs on your device: your photos are never uploaded.' },
  { id: 'layout', name: 'Print Layout', href: '/print-layout', img: '/tour/print-layout.webp', w: 2000, h: 1250,
    text: 'Put business cards, labels or photos many-up on a sheet with crop marks, or make a booklet. The Pro studio adds imposition, bleeds, creep and step-and-repeat.' },
  { id: 'size', name: 'Print Size & Binding', href: '/print-size-calculator', img: '/tour/print-size.webp', w: 2000, h: 1250,
    text: 'Spine width and the full cover spread for perfect bound, saddle stitch, hardcover, wire-O and spiral books, plus folding layouts, paper sizes, DPI and bleed — then open the cover in the editor at exactly that size.' },
] as const;

export function ProductTour({ heading = 'See it in action', intro }: { heading?: string; intro?: string }) {
  const [i, setI] = useState(0);
  const t = TOUR[i];
  return (
    <section aria-labelledby="tour" className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="tour" className="text-2xl sm:text-3xl font-semibold tracking-tight">{heading}</h2>
          <p className="mt-2 text-mt-muted max-w-2xl">{intro ?? 'Real screens from the studio. Every tool works in your browser, without an account.'}</p>
        </div>
      </div>
      <div role="tablist" aria-label="Tools" className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TOUR.map((x, k) => (
          <button key={x.id} role="tab" aria-selected={k === i} onClick={() => setI(k)}
            className={`shrink-0 h-10 px-4 rounded-full text-[14px] font-semibold border transition-colors ${k === i ? 'bg-mt-ink text-mt-bg border-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'}`}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-[28px] border border-mt-border bg-mt-surface overflow-hidden shadow-[0_24px_60px_-30px_rgba(22,22,31,0.35)]">
        <div className="flex items-center gap-1.5 px-4 h-10 border-b border-mt-border bg-mt-surface2/60" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#F2708F]/80" /><span className="h-2.5 w-2.5 rounded-full bg-[#DDE23B]/90" /><span className="h-2.5 w-2.5 rounded-full bg-[#5DCCB8]/90" />
          <span className="ml-3 text-[12px] text-mt-faint truncate">magicaltouchdesign.com{t.href}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={t.id} src={t.img} alt={`${t.name} on Magical Touch Design`} width={t.w} height={t.h} className="w-full h-auto" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-[15px] text-mt-muted leading-relaxed max-w-3xl"><span className="font-semibold text-mt-ink">{t.name}.</span> {t.text}</p>
        <Link href={t.href} className="h-11 px-5 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center gap-2 justify-self-start">Open {t.name} <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}
