import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const DESC = 'Free online photo editor: adjust light and colour, retouch, select and mask, layers, live text effects, looks and filters, crop and export. Remove backgrounds too — your photos stay on your device.';
export const metadata: Metadata = {
  title: 'Free Online Photo Editor — Photo Studio',
  description: DESC,
  alternates: { canonical: '/photo-studio' },
  openGraph: { type: 'website', url: `${SITE_URL}/photo-studio`, title: 'Free Online Photo Editor — Photo Studio', description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
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
