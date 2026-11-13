import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const DESC = 'Free online photo editor: remove blemishes, smooth skin, enlarge eyes, change hair colour, curves, layers, filters and background removal — in your browser.';
export const metadata: Metadata = {
  title: 'Free Online Photo Editor — Photo Studio',
  description: DESC,
  alternates: { canonical: '/photo-studio' },
  openGraph: { type: 'website', url: `${SITE_URL}/photo-studio`, title: 'Free Online Photo Editor — Photo Studio', description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/photo-studio.webp`, width: 960, height: 540 }] },
};

const LD = {
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: `Photo Studio — ${SITE_NAME}`, applicationCategory: 'PhotographyApplication',
  operatingSystem: 'Any (web browser)', url: `${SITE_URL}/photo-studio`, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: ['Light and colour adjustments', 'Retouch and heal', 'Selections and masks', 'Layers', 'Live text effects', 'Looks and filters', 'Crop and straighten', 'Background removal', 'PNG, JPG and WebP export'],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
      <h1 className="sr-only">Photo Studio — free online photo editor</h1>
      {children}
    </>
  );
}
