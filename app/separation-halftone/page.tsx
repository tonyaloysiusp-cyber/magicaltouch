import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { SeparationStudio } from '@/components/separation/SeparationStudio';

const TITLE = 'Colour Separation & Halftone Films — Screen Printing and CMYK';
const DESC = 'Separate artwork into spot-colour plates for screen printing (with white underbase for dark garments) or CMYK process plates with an ink-limit check, then make halftone films at your LPI, angle and dot shape. Vector film PDF and SVG with registration marks — on your device.';
const URL = `${SITE_URL}/separation-halftone`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };

const FAQ: [string, string][] = [
  ['How are spot colours picked?', 'The picture is reduced to the number of inks you choose by colour clustering (k-means) — the same picture always gives the same inks. Each ink becomes one film.'],
  ['What is the white underbase?', 'On dark garments a white layer is printed first so the colours stay bright. It covers every printed area and is choked (shrunk) a little so it hides under the colours.'],
  ['Which LPI should I use?', 'Screen printing usually uses 35–65 lpi depending on mesh (45 lpi on 230 mesh is common). Offset on coated paper uses about 150 lpi, newsprint about 85.'],
  ['Why different angles?', 'Each plate gets its own screen angle so the dots do not make a moiré pattern. Process defaults are C 15°, M 75°, Y 0°, K 45°; you can change any plate.'],
  ['Are the films vectors?', 'Halftone films are vector dots in a PDF or SVG at 1:1, with registration marks and a label. Solid (non-halftone) plates are exact 1:1 bitmaps.'],
];

export default function SeparationPage() {
  const ld = [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Separation & Halftone Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return (
    <ToolShell path="/separation-halftone" h1="Separations and films, ready for the screen." name="Separation & Halftone Studio" sub="Spot or CMYK plates, underbase, halftone films"
      about={<ToolAbout intro="Open your artwork, choose spot colours for screen printing or CMYK process, set the print size, screen ruling, angles and dot shape, and download one film per ink." steps={[['Open artwork', 'PNG or JPG — transparent PNGs work best for garments.'], ['Separate', 'Spot inks (with optional underbase) or CMYK with the ink-limit map.'], ['Set the screen', 'LPI, angle per plate and dot shape.'], ['Print films', 'One PDF with every film, or each plate as SVG.']]} faq={FAQ} related={[{ href: '/textile-studio', label: 'Textile Design Studio' }, { href: '/trace', label: 'Image Trace' }, { href: '/pdf-preflight', label: 'PDF Preflight Inspector' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SeparationStudio />
    </ToolShell>
  );
}
