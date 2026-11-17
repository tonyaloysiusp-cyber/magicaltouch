import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ColourExplorer } from '@/components/colours/ColourExplorer';
import { GradientMaker } from '@/components/tools/GradientMaker';

const TITLE = 'Colour Palette Generator — Colour Wheel, Contrast & Gradients';
const DESC = 'Free colour palette generator with a colour wheel: complementary, analogous, triadic, split and tetradic harmonies with HEX, RGB, HSL and CMYK, a WCAG contrast checker, gradient builder and palettes you can export for Adobe (.ase), CSS or Inkscape.';
const URL = `${SITE_URL}/colours`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/colours.webp`, width: 960, height: 540 }] },
};

const FAQ: [string, string][] = [
  ['How do I find colours that go together?', 'Pick a colour on the wheel or type its HEX code, then choose a harmony — complementary, analogous, triadic, split-complementary, tetradic or monochrome. Every swatch shows HEX, RGB, HSL and CMYK.'],
  ['How do I check if text is readable on a colour?', 'Use the contrast checker: choose the text and background colours and it shows the contrast ratio with WCAG AA and AAA results for normal and large text.'],
  ['Can I use the palette in Illustrator or Photoshop?', 'Yes. Export a palette as an Adobe swatch file (.ase), as CSS variables, as JSON with HEX, RGB, CMYK and HSL, or as a GIMP / Inkscape palette (.gpl).'],
  ['Are the CMYK values exact?', 'They are calculated conversions from RGB, good for picking colours. For print-critical brand colours, check with your printer’s colour profile.'],
  ['Can I use a palette in my design?', 'Press “Use in the editor”: the palette is saved and appears in the editor’s Colours panel, where you can recolour the whole design or a selected shape.'],
];

export default function ColoursPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Colour Explorer — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Colour Explorer', item: URL }] },
  ];
  return (
    <ToolShell path="/colours" h1={'Find colours that work together'} name="Colour Explorer" sub="Palettes, harmonies, contrast and gradients"
      about={<ToolAbout intro="Start from one colour on the wheel and get balanced palettes with HEX, RGB, HSL and CMYK. Check text contrast, build gradients, browse palette collections, export swatches, and use any palette in the editor or Pattern Studio." faq={FAQ} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ColourExplorer />
      <section id="gradients" aria-labelledby="gradients-h" className="mt-8 scroll-mt-24"><h2 id="gradients-h" className="text-[15px] font-semibold mb-3">Gradient backgrounds</h2><GradientMaker /></section>
    </ToolShell>
  );
}
