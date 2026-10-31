import { Poppins } from 'next/font/google';
import './globals.css';
import { ChunkRecovery } from '@/components/ChunkRecovery';
import { VisitCounter } from '@/components/VisitCounter';
import { TemplateCountProvider } from '@/lib/templateCount';
import { getCountStyle, getTemplateCount, getTemplateCountLabel, withCount } from '@/lib/templateCountServer';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

import type { Metadata, Viewport } from 'next';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, getSiteSetting } from '@/lib/seo';
import { parseSocial } from '@/lib/social';

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Magical Touch Design — Free Online Design Templates & Editor', template: '%s | Magical Touch Design' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['free design templates', 'online graphic design', 'flyer maker', 'poster maker', 'instagram post templates', 'menu templates', 'invitation maker', 'certificate maker', 'business card design', 'free online design tool', 'free canva alternative', 'resume maker', 'photo editor online'],
  openGraph: { type: 'website', siteName: SITE_NAME, url: SITE_URL, title: 'Magical Touch Design — Free Online Design Templates & Editor', description: SITE_DESCRIPTION, images: [{ url: '/api/og', width: 1200, height: 630, alt: 'Magical Touch Design' }], locale: 'en_US', alternateLocale: ['en_GB', 'en_IN', 'en_CA', 'en_AU', 'en_AE', 'ar_AE'] },
  twitter: { card: 'summary_large_image', title: 'Magical Touch Design — Free Online Design Templates', description: SITE_DESCRIPTION, images: ['/api/og'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: false },
};

// The Google Search Console code is set from Admin → SEO & promotion.
export async function generateMetadata(): Promise<Metadata> {
  const [google, bing, label] = await Promise.all([getSiteSetting('google_verification'), getSiteSetting('bing_verification'), getTemplateCountLabel()]);
  const description = withCount(SITE_DESCRIPTION, label);
  const meta: Metadata = { ...baseMetadata, description, openGraph: { ...baseMetadata.openGraph, description }, twitter: { ...baseMetadata.twitter, description } };
  // Bing Webmaster Tools code, also set from Admin → SEO → Search engines.
  const verification: Metadata['verification'] = { ...(google ? { google } : {}), ...(bing ? { other: { 'msvalidate.01': bing } } : {}) };
  return google || bing ? { ...meta, verification } : meta;
}

export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#000000' }] };

// Who we are, for Google's knowledge panel and the site-search box.
const ORG_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ['Magical Touch', 'MagicalTouchDesign', 'magicaltouchdesign.com'],
    description: 'Free online graphic design platform: 1,000+ templates, a design editor and a photo studio. Not an interior design company.',
    slogan: 'Design anything. Make it magical.',
    knowsAbout: ['Graphic design', 'Design templates', 'Online photo editing', 'Print design', 'Social media design'],
    founder: { '@type': 'Person', name: 'Tony Aloysius', jobTitle: 'Founder & CEO' },
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: 'hello@magicaltouchdesign.com',
    address: { '@type': 'PostalAddress', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
    areaServed: 'Worldwide',
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
    featureList: ['1,000+ free templates', 'Online design editor', 'Photo editor', 'Background removal', 'Print-ready PDF with bleed', 'CMYK PDF and TIFF export', 'No watermark'],
    availableLanguage: ['English', 'Arabic'],
  },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, label, countStyle] = await Promise.all([getTemplateCount(), getTemplateCountLabel(), getCountStyle()]);
  // Social profiles from Admin → SEO → Social: tells Google they belong to us.
  const sameAs = Object.values(parseSocial(await getSiteSetting('social_links')));
  const orgLd = sameAs.length ? ORG_JSON_LD.map((o, i) => (i === 0 ? { ...o, sameAs } : o)) : ORG_JSON_LD;
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: withCount(JSON.stringify(orgLd), label) }} />
        <ChunkRecovery />
        <VisitCounter />
        <TemplateCountProvider value={count} style={countStyle}>{children}</TemplateCountProvider>
      </body>
    </html>
  );
}
