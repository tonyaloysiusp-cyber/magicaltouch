import { Download, FileText } from 'lucide-react';

// Free PDF guides on /tutorials (files in public/guides, made from real
// screenshots of the site). Static: no database needed.
export const GUIDES = [
  { slug: 'magical-touch-design-handbook', title: 'The Complete Handbook', pages: 50, size: '8.2 MB', what: 'Every tool with real screenshots: templates, the design editor, Photo Studio with face & sculpt, background remover, passport photos, packaging, textile, print, patterns and trace.', featured: true },
  { slug: 'design-editor-guide', title: 'Design Editor guide', pages: 22, size: '4.4 MB', what: 'Getting started, templates, every panel, the text toolbar and effects, write and translate, draw, brand, QR and barcodes, print & cut, the Move dialog, resize, export and Pro mode.' },
  { slug: 'photo-studio-guide', title: 'Photo Studio guide', pages: 13, size: '2.4 MB', what: 'Adjust, portrait retouch, face & sculpt with a real before and after, colour, filters, brushes, selections, layers, the Move dialog, crop and export.' },
  { slug: 'background-remover-guide', title: 'Background & Passport guide', pages: 5, size: '0.7 MB', what: 'Remove backgrounds from one photo or sixty, and make passport, visa and exam photos at the exact size.' },
  { slug: 'packaging-guide', title: 'Packaging Design guide', pages: 8, size: '0.8 MB', what: 'Box styles and ends, size and board, designing on the dieline, artwork rules and the files for the printer and die maker.' },
  { slug: 'textile-guide', title: 'Textile Design guide', pages: 7, size: '0.7 MB', what: 'Garments as pattern pieces: sizes and measurements, team names and numbers, fabric and production files.' },
  { slug: 'print-production-guide', title: 'Print Production guide', pages: 7, size: '0.9 MB', what: 'Print basics and checklist, Print Layout, booklets and the Print Size & Binding calculator.' },
  { slug: 'patterns-trace-guide', title: 'Patterns & Trace guide', pages: 5, size: '0.7 MB', what: 'Seamless repeats, rangoli and mandala, and turning pictures into clean vectors.' },
];

export function PdfGuides() {
  return (
    <section className="mt-container pt-4 pb-14 sm:pb-20" aria-labelledby="guides-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#3B82C4]">Free PDF guides</p>
          <h2 id="guides-title" className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight">Learn every tool — download and keep</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-mt-muted">Illustrated, step-by-step manuals with real screenshots. Read them on your phone, tablet or print them.</p>
        </div>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GUIDES.map((g) => (
          <li key={g.slug} className={`rounded-3xl border ${g.featured ? 'border-[#3B82C4]/50 ring-1 ring-[#3B82C4]/25' : 'border-mt-border'} bg-mt-surface overflow-hidden flex flex-col`}>
            <a href={`/guides/${g.slug}.pdf?v=4`} target="_blank" rel="noreferrer" className="block bg-mt-surface2 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/guides/${g.slug}.webp?v=4`} alt={`${g.title} — cover`} loading="lazy" className="mx-auto h-56 w-auto rounded-lg shadow-[0_10px_24px_-10px_rgba(9,9,11,0.35)]" />
            </a>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-[16px] font-semibold text-mt-ink">{g.title}</h3>
              <p className="mt-1 text-[13px] text-mt-muted leading-relaxed flex-1">{g.what}</p>
              <p className="mt-2 text-[12px] text-mt-faint inline-flex items-center gap-1"><FileText size={12} /> PDF · {g.pages} pages · {g.size}</p>
              <a href={`/guides/${g.slug}.pdf?v=4`} download className="mt-3 h-10 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-1.5">
                <Download size={15} /> Download PDF
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
