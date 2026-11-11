import type { Metadata } from 'next';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ColourExplorer } from '@/components/colours/ColourExplorer';

const TITLE = 'Colour Palette Generator & Explorer — HEX, RGB, CMYK';
const DESC = 'Build colour palettes from one colour: complementary, analogous, triadic and monochrome harmonies with HEX, RGB and CMYK values. Find templates in your colours.';
const URL = `${SITE_URL}/colours`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

export default function ColoursPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Colour Explorer — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
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
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">Start from one colour and get balanced palettes, with HEX, RGB and CMYK for print. Save the ones you like, turn them into a pattern, or find templates in the same colours.</p>
        </header>
        <div className="mt-8"><ColourExplorer /></div>
      </div>
    </SeoShell>
  );
}
