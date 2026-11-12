import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PrintCalculator } from '@/components/tools/PrintCalculator';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PAPER_SIZES, pxFor, inFor } from '@/lib/printSizes';

const PATH = '/print-size-calculator';
const TITLE = 'Print Size & Bleed Calculator — A4 Size in Pixels, DPI';
const DESC = 'A4 size in pixels, inches and mm at 300 DPI, plus every paper, visiting card and poster size, with 3 mm bleed and safe area. Find how big your photo can print, then design at that size.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  keywords: ['a4 size in pixels', 'print size calculator', 'bleed calculator', 'dpi calculator', 'visiting card size', 'business card size in pixels', 'poster size in pixels'],
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};
const FAQ: [string, string][] = [
  ['What is A4 size in pixels?', 'A4 is 210 × 297 mm: 2480 × 3508 pixels at 300 DPI, 1240 × 1754 at 150 DPI and 794 × 1123 at 96 DPI. With 3 mm bleed it is 2551 × 3579 pixels at 300 DPI.'],
  ['What is bleed in printing?', 'Bleed is extra artwork (usually 3 mm, or 0.125 in) beyond the edge of the page, so there is no white line when the printer trims the paper. Keep text inside the safe area, about 5 mm in from the edge.'],
  ['What is the visiting card size in India?', '3.5 × 2 inches (88.9 × 50.8 mm) — 1050 × 600 pixels at 300 DPI. In the UK and Europe business cards are 85 × 55 mm.'],
  ['What DPI should I use for printing?', '300 DPI for flyers, cards and brochures; 150 DPI is enough for large posters and banners seen from a distance; 72–96 DPI is for screens.'],
];
const STEPS: [string, string][] = [
  ['Choose a size', 'A0–A6, Letter, visiting cards, posters, roll-ups — or any custom size.'],
  ['Pick DPI and bleed', '300 DPI and 3 mm bleed for most print jobs.'],
  ['Read the numbers', 'Pixels, inches, mm and points — with bleed and safe area drawn to scale.'],
  ['Design at that size', 'One click opens the editor at exactly that size.'],
];
const POPULAR = ['a4', 'a5', 'a3', 'a6', 'dl', 'letter', 'bc-in', 'bc-uk', 'card57', 'poster1824', 'rollup'];
export default function Page() {
  return (
    <ToolPage path={PATH} name="Print Size Calculator" eyebrow="Print sizes · Bleed · DPI" h1="Print size & bleed calculator" intro="Every paper, card and poster size in mm, inches and pixels at any DPI — with bleed and safe area — so your files print sharp and nothing gets cut off." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}
      extra={(
        <section className="mt-16" aria-labelledby="table">
          <h2 id="table" className="text-2xl font-semibold">Popular print sizes in pixels</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-mt-border">
            <table className="w-full text-[14px]">
              <thead className="bg-mt-surface2 text-left"><tr><th className="p-3">Size</th><th className="p-3">mm</th><th className="p-3">inches</th><th className="p-3">300 DPI</th><th className="p-3">150 DPI</th><th className="p-3">With 3 mm bleed (300 DPI)</th></tr></thead>
              <tbody>{POPULAR.map((id) => { const p = PAPER_SIZES.find((x) => x.id === id)!; return (
                <tr key={id} className="border-t border-mt-border"><td className="p-3">{p.label}</td><td className="p-3 tabular-nums">{p.w} × {p.h}</td><td className="p-3 tabular-nums">{inFor(p.w)} × {inFor(p.h)}</td><td className="p-3 tabular-nums">{pxFor(p.w, 300)} × {pxFor(p.h, 300)}</td><td className="p-3 tabular-nums">{pxFor(p.w, 150)} × {pxFor(p.h, 150)}</td><td className="p-3 tabular-nums">{pxFor(p.w + 6, 300)} × {pxFor(p.h + 6, 300)}</td></tr>
              ); })}</tbody>
            </table>
          </div>
        </section>
      )}>
      <PrintCalculator />
    </ToolPage>
  );
}
