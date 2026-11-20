import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { LaserPrep } from '@/components/laser/LaserPrep';

const TITLE = 'SVG to DXF for Laser & CNC — Cut and Score Layers in mm';
const DESC = 'Convert SVG to DXF for laser cutters, CNC routers, plotters and die makers: colours mapped to Cut, Score or Ignore, curves and arcs flattened accurately, layered DXF in millimetres and a hairline laser SVG, with cut length and time estimate.';
const URL = `${SITE_URL}/laser-cnc`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };
const FAQ: [string, string][] = [
  ['Which DXF version is it?', 'DXF R12 (AC1009) with polylines in millimetres — opened by AutoCAD, LibreCAD, LightBurn, RDWorks, Fusion, VCarve and most cutter software.'],
  ['Are curves accurate?', 'Curves and arcs are turned into short straight segments within 0.05 mm of the true shape, so circles and outlines keep their size.'],
  ['What about kerf?', 'The beam or bit width is not added — set kerf offset in your machine software.'],
  ['Is my file uploaded?', 'No — the SVG is read in your browser.'],
];
export default function LaserPage() {
  const ld = [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Laser & CNC Prep — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return (
    <ToolShell path="/laser-cnc" h1="From SVG to the laser in one step." name="Laser & CNC Prep" sub="Colour → cut / score, DXF in mm and hairline SVG"
      about={<ToolAbout intro="Open an SVG, choose what each colour does, and download a layered DXF or a laser-ready SVG with the total cut length and time." faq={FAQ} related={[{ href: '/packaging-dieline', label: 'Packaging Dieline Studio' }, { href: '/trace', label: 'Image Trace' }, { href: '/label-sticker', label: 'Label & Sticker Studio' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <LaserPrep />
    </ToolShell>
  );
}
