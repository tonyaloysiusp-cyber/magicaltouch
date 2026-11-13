import type { Metadata } from 'next';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ColourExplorer } from '@/components/colours/ColourExplorer';

const TITLE = 'Colour Palette Generator — Colour Wheel, Contrast & Gradients';
const DESC = 'Free colour palette generator with a colour wheel: complementary, analogous, triadic, split and tetradic harmonies with HEX, RGB, HSL and CMYK, a WCAG contrast checker, gradient builder and palettes you can export for Adobe (.ase), CSS or Inkscape.';
const URL = `${SITE_URL}/colours`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
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
    <SeoShell active="tools">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/free-design-tools', label: 'Free tools' }, { label: 'Colour Explorer' }]} />
        <header className="mt-4 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Colour Explorer</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Find colours that work together</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">Start from one colour on the wheel and get balanced palettes with HEX, RGB, HSL and CMYK. Check text contrast, build gradients, browse palette collections, export swatches, and use any palette in the editor or Pattern Studio.</p>
          <a href="/editor?w=1080&h=1080&panel=colours" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-mt-border px-4 text-[14px] font-semibold hover:border-mt-ink/40">Use it inside the design editor (Colours panel) →</a>
        </header>
        <div className="mt-8"><ColourExplorer /></div>
        <section aria-labelledby="faq" className="mt-16 max-w-3xl">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-4 divide-y divide-mt-border rounded-2xl border border-mt-border">
            {FAQ.map(([q, a]) => <details key={q} className="group p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-mt-muted leading-relaxed">{a}</p></details>)}
          </div>
        </section>
      </div>
    </SeoShell>
  );
}
