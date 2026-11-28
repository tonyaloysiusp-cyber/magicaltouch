import { Download, FileText } from 'lucide-react';

// Free PDF guides on /tutorials (files in public/guides, made from real
// screenshots of the site). Static: no database needed.
export const GUIDES = [
  { slug: 'magical-touch-design-tutorial', title: 'Magical Touch Design — Complete Tutorial', pages: 60, size: '11.9 MB', what: 'One guide to every tool, with real screenshots: templates, the design editor (every panel, text effects, translate, draw, QR, print & cut, Move dialog, export, Pro mode), Photo Studio with face & sculpt, background remover and passport photos, packaging, textile, print, patterns and trace — plus every menu, scaling and units, and all keyboard shortcuts.', featured: true },
];
const CHAPTERS = ['Getting started & templates', 'Design Editor', 'Photo Studio', 'Photos & passports', 'Packaging', 'Textile', 'Print', 'Patterns & Trace', 'Menus, scaling & shortcuts'];

export function PdfGuides() {
  return (
    <section className="mt-container pt-4 pb-14 sm:pb-20" aria-labelledby="guides-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#3B82C4]">Free tutorial</p>
          <h2 id="guides-title" className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight">Every tool, every option — one guide</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-mt-muted">One illustrated, step-by-step tutorial with real screenshots. Read them on your phone, tablet or print them.</p>
        </div>
      </div>
      {GUIDES.map((g) => (
        <div key={g.slug} className="mt-6 grid overflow-hidden rounded-3xl border border-[#3B82C4]/40 bg-mt-surface ring-1 ring-[#3B82C4]/20 md:grid-cols-[300px_minmax(0,1fr)]">
          <a href={`/guides/${g.slug}.pdf?v=5`} target="_blank" rel="noreferrer" className="block bg-mt-surface2 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/guides/${g.slug}.webp?v=5`} alt={`${g.title} — cover`} loading="lazy" className="mx-auto h-72 w-auto rounded-lg shadow-[0_14px_30px_-12px_rgba(9,9,11,0.4)]" />
          </a>
          <div className="flex flex-col p-6">
            <h3 className="text-xl font-semibold text-mt-ink">{g.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-mt-muted">{g.what}</p>
            <ol className="mt-4 grid gap-x-6 gap-y-1.5 text-[13px] text-mt-ink sm:grid-cols-2 lg:grid-cols-3">
              {CHAPTERS.map((c, k) => <li key={c} className="flex gap-2"><span className="font-semibold text-[#3B82C4] tabular-nums">{k + 1}</span>{c}</li>)}
            </ol>
            <p className="mt-4 inline-flex items-center gap-1 text-[12px] text-mt-faint"><FileText size={12} /> PDF · {g.pages} pages · {g.size}</p>
            <a href={`/guides/${g.slug}.pdf?v=5`} download className="mt-3 inline-flex h-11 w-fit items-center justify-center gap-1.5 rounded-full bg-mt-primary px-6 text-[14px] font-semibold text-mt-onprimary">
              <Download size={15} /> Download the tutorial
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}
