import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { LargeFormatStudio } from '@/components/largeFormat/LargeFormatStudio';

const TITLE = 'Poster & Banner Tiling — Print Large on A4, A3 or a Roll (Vector PDF)';
const DESC = 'Split a large poster or banner into printable tiles on A4, A3, Letter or roll paper, with overlap, trim marks, labels and an assembly map. PDFs stay vector. Free, on your device.';
const URL = `${SITE_URL}/poster-tiling`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };
const FAQ: [string, string][] = [
  ['Will my PDF lose quality?', 'No — every tile embeds the original page as vectors, cropped to that tile, so text and shapes stay sharp at any size.'],
  ['What is overlap?', 'Each tile repeats a strip of its neighbour so you can glue or tape them without gaps. Dashed guides on each tile show where the next one lines up.'],
  ['What is the no-print edge?', 'Most desktop printers cannot print right to the paper edge — usually 3–6 mm. The tiles are planned inside that edge.'],
  ['How many sheets will I need?', 'The count updates as you change the poster size, paper, edge and overlap. “Fewest sheets” turns the paper whichever way needs fewer.'],
];
export default function PosterTilingPage() {
  const ld = [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Large Format Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return (
    <ToolShell path="/poster-tiling" h1="Print big on any printer." name="Large Format Studio" sub="Posters and banners tiled on A4, A3, Letter or a roll"
      about={<ToolAbout intro="Open a PDF or picture, choose the final poster size and your printer paper, and download one PDF with every tile — overlap, trim marks, labels and an assembly map included." faq={FAQ} related={[{ href: '/print-layout', label: 'Print Layout' }, { href: '/pdf-preflight', label: 'PDF Preflight Inspector' }, { href: '/print-size-calculator', label: 'Print Size Calculator' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <LargeFormatStudio />
    </ToolShell>
  );
}
