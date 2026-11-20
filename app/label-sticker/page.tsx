import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { StickerDesigner } from '@/components/wall/StickerDesigner';

const TITLE = 'Sticker & Label Maker — Contour Cut Lines (CutContour) for Print-and-Cut';
const DESC = 'Turn any PNG into stickers or labels with a contour cut line (or round, rounded or rectangular labels), a white border or bleed, and sheets laid out for print-and-cut with registration marks. PDF with a CutContour spot colour, and SVG.';
const URL = `${SITE_URL}/label-sticker`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };
const FAQ: [string, string][] = [
  ['How is the contour made?', 'From the picture’s transparency: everything that is not see-through is the sticker, grown by the border you choose, traced as one smooth outer line (holes are not cut).'],
  ['What is CutContour?', 'A named spot colour most print-and-cut RIPs (Roland, Mimaki, Summa, HP and others) use to find the cut line. In the PDF the line overprints, so it never prints.'],
  ['White border or cut inside?', 'White border adds paper around the art. Cut inside puts the line slightly inside the art so there is no white edge (the art acts as bleed).'],
  ['Which sheets can I use?', 'A4, A3, SRA3 and more — stickers are fitted automatically (turned when more fit), with three corner registration marks for the cutter.'],
];
export default function LabelStickerPage() {
  const ld = [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Label & Sticker Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return (
    <ToolShell path="/label-sticker" h1="Stickers and labels, cut to shape." name="Label & Sticker Studio" sub="Contour cut lines, label shapes and print-and-cut sheets"
      about={<ToolAbout intro="Open a PNG, choose the size and the cut — contour, round, rounded or rectangle — and download a sheet ready for print-and-cut: the artwork plus a CutContour spot line and registration marks." faq={FAQ} related={[{ href: '/packaging-dieline', label: 'Packaging Dieline Studio' }, { href: '/barcode-generator', label: 'Barcode Studio' }, { href: '/remove-background', label: 'Background Remover' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <StickerDesigner />
    </ToolShell>
  );
}
