import { Poppins } from 'next/font/google';
import './globals.css';
import { ChunkRecovery } from '@/components/ChunkRecovery';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

import type { Metadata, Viewport } from 'next';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Magical Touch Design — Free Online Design Templates & Editor', template: '%s | Magical Touch Design' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['free design templates', 'online graphic design', 'flyer maker', 'poster maker', 'instagram post templates', 'menu templates', 'invitation maker', 'certificate maker', 'business card design', 'Dubai design', 'UAE'],
  openGraph: { type: 'website', siteName: SITE_NAME, url: SITE_URL, title: 'Magical Touch Design — Free Online Design Templates & Editor', description: SITE_DESCRIPTION, images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Magical Touch Design' }], locale: 'en_AE' },
  twitter: { card: 'summary_large_image', title: 'Magical Touch Design — Free Online Design Templates', description: SITE_DESCRIPTION, images: ['/og-image.png'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#000000' }] };

// Who we are, for Google's knowledge panel and the site-search box.
const ORG_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: 'hello@magicaltouchdesign.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Dubai', addressCountry: 'AE' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/templates?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web browser',
    url: SITE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved day/night theme before the first paint, on
            every page, so nothing flashes in the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('appTheme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className={poppins.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }} />
        <ChunkRecovery />
        {children}
      </body>
    </html>
  );
}
