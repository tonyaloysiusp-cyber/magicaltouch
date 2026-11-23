import type { Metadata } from 'next';
import { RELATED_TOOLS } from '@/components/seo/ToolPage';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { TextileHub } from '@/components/textile/TextileHub';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Textile Studio — T-shirts, polos, kurta / kameez, chudidar, dupatta and
// running fabric in one professional workspace, with embroidery.
const PATH = '/textile-studio';
const TITLE = 'Textile Design Studio — Garment Patterns, Kurti, Polo & Jerseys';
const DESC = 'Design garments on real pattern pieces: polo, T-shirt, jersey, kurti, churidar, frock and dupatta templates drafted from a size or your measurements, in the full design editor. Print PDF, full-size and A4 tiled pattern PDFs, DXF and fabric length.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/textile.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['Can I make a kurti or churidar pattern from my own measurements?', 'Yes. Choose Custom in the Textile panel and type the body measurements in cm (bust, waist, hip, shoulder, lengths, armhole, sleeve…). The pieces are drafted from them. Sew a test garment before cutting good fabric.'],
  ['Which garments are there?', 'Polo, T-shirt, sports jersey, kurti / kameez, churidar, frock / dress and dupatta, each with ready sizes XS–3XL (where a size chart applies) or your own measurements.'],
  ['What happens when I click Customise?', 'The full design editor opens with the garment’s pattern pieces as editable artwork, laid out like the print file. The cut line, stitch line, grain line and notches are locked guides that never print.'],
  ['Does my design stretch when I change the size?', 'No. Backgrounds that fill a piece follow the piece; logos, text and pictures keep their proportions and their place on the piece.'],
  ['What files do I get?', 'A print PDF (artwork in CMYK, cut line as a spot colour), a full-size pattern PDF for a plotter, an A4 tiled pattern PDF with a test square, a DXF with cut, stitch, grain and notch layers, and the .mtd project.'],
  ['Where are team kits with names and numbers?', 'In the Team Kit Designer at /textile-designer.'],
  ['Are my measurements and designs uploaded?', 'No. They stay on your device. Save the project as a .mtd file to keep it.'],
];
const STEPS: [string, string][] = [
  ['Pick a template or garment', 'Polo, T-shirt, jersey, kurti, churidar, frock or dupatta.'],
  ['Customise', 'The editor opens with the pattern pieces laid out as the print file.'],
  ['Set the size', 'Ready size or your own measurements in the Textile panel.'],
  ['Download production files', 'Print PDF, pattern PDFs, DXF and fabric length.'],
];
export default function Page() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Textile Design Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: `${SITE_URL}${PATH}`, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <ToolShell variant="page" path={PATH} h1="Textile Design Studio" name="Textile Design Studio" sub="Garment patterns, templates and the full design editor"
      about={<ToolAbout intro="Garments on real pattern pieces: drafted from a size or your measurements and designed in the full editor." steps={STEPS} faq={FAQ} related={RELATED_TOOLS} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <TextileHub />
    </ToolShell>
  );
}
