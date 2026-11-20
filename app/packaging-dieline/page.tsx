import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PackagingStudio } from '@/components/packaging/PackagingStudio';

const TITLE = 'Free Box Dieline Generator — Tuck End, Tray, Mailer & FEFCO 0201';
const DESC = 'Make packaging dielines from your box size and board: reverse and straight tuck end, seal end, sleeve, tray, tray with lid and corrugated FEFCO 0201 / 0200. 1:1 vector PDF with CutContour and Crease spot colours, artwork template with bleed and SVG.';
const URL = `${SITE_URL}/packaging-dieline`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME },
};

const FAQ: [string, string][] = [
  ['What is in the dieline PDF?', 'The flat box at 100 % size: cut lines in the spot colour CutContour (magenta) and fold lines in the spot colour Crease (cyan, dashed). Both are set to overprint so they never knock out your artwork, plus a spec box with the inside size, board, knife and crease lengths.'],
  ['What is the artwork template?', 'The same dieline with a light blue bleed band and panel names. Put your artwork on it and run backgrounds to the outer edge of the band.'],
  ['Inside or outside size?', 'Enter the size of the product space (inside). If you only know the outside size, switch to Outside size and the board thickness is taken off.'],
  ['Which board thickness should I use?', 'Folding cartons are usually 0.35–0.6 mm board; corrugated E-flute is about 1.5 mm, B-flute 3 mm, C-flute 4 mm and double wall about 7 mm. Ask your printer for the exact caliper.'],
  ['Can I send it straight to a die maker?', 'The dieline uses standard carton allowances. Always make a sample and confirm the final dieline with your die maker before cutting steel.'],
  ['Can I design the box here?', 'Yes — Design on this dieline opens the editor with the dieline as a locked guide layer at the right size. Hide the dieline layers before exporting the print file.'],
];

export default function PackagingPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Packaging Dieline Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Packaging Dieline Studio', item: URL }] },
  ];
  return (
    <ToolShell path="/packaging-dieline" h1="Box dielines, ready for the die maker." name="Packaging Dieline Studio" sub="Cartons, trays and corrugated boxes — cut & crease vector PDF"
      about={<ToolAbout intro="Pick a box style, enter the inside size and the board, and download a 1:1 vector dieline with cut and crease spot colours, an artwork template with bleed, or an SVG — or open it in the editor and design the box." steps={[['Pick a style', 'Tuck end, seal end, sleeve, tray, lid or corrugated FEFCO 0201 / 0200.'], ['Enter the size', 'Inside length, width and depth in mm or inches, and the board.'], ['Check the net', 'Toggle cut, crease, bleed and panel labels; see knife length and sheets per sheet size.'], ['Download', 'Dieline PDF, artwork template, SVG — or design on it in the editor.']]} faq={FAQ} related={[{ href: '/print-size-calculator', label: 'Print Size & Binding Calculator' }, { href: '/print-layout', label: 'Print Layout (many-up)' }, { href: '/create', label: 'Design Editor' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PackagingStudio />
    </ToolShell>
  );
}
