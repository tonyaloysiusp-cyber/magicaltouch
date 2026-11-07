import { Download, FileText } from 'lucide-react';

// Free PDF guides on /tutorials (files in public/guides, made from real
// screenshots of the site). Static: no database needed.
export const GUIDES = [
  { slug: 'magical-touch-design-handbook', title: 'The Complete Handbook', pages: 34, size: '5.0 MB', what: 'Every tool in one guide: the design editor, background remover and Photo Studio.', featured: true },
  { slug: 'design-editor-guide', title: 'Design Editor guide', pages: 12, size: '1.9 MB', what: 'Templates, text and pro text effects, photos, elements, brand kit, pages, resizing and print-ready downloads.' },
  { slug: 'background-remover-guide', title: 'Background Remover guide', pages: 8, size: '1.2 MB', what: 'One photo or sixty, then touch up every edge with Restore and Erase.' },
  { slug: 'photo-studio-guide', title: 'Photo Studio guide', pages: 19, size: '3.3 MB', what: 'Every tool explained: adjust, colour, looks, filters, retouch, selections, layers, live text effects, crop and export.' },
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
            <a href={`/guides/${g.slug}.pdf?v=2`} target="_blank" rel="noreferrer" className="block bg-mt-surface2 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/guides/${g.slug}.webp?v=2`} alt={`${g.title} — cover`} loading="lazy" className="mx-auto h-56 w-auto rounded-lg shadow-[0_10px_24px_-10px_rgba(9,9,11,0.35)]" />
            </a>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-[16px] font-semibold text-mt-ink">{g.title}</h3>
              <p className="mt-1 text-[13px] text-mt-muted leading-relaxed flex-1">{g.what}</p>
              <p className="mt-2 text-[12px] text-mt-faint inline-flex items-center gap-1"><FileText size={12} /> PDF · {g.pages} pages · {g.size}</p>
              <a href={`/guides/${g.slug}.pdf?v=2`} download className="mt-3 h-10 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-1.5">
                <Download size={15} /> Download PDF
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
