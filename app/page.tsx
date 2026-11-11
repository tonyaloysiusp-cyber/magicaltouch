import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import { HomePage } from '@/components/home/HomePage';
import { getGooglePicture } from '@/lib/googlePictureServer';
import { SITE_URL, fitTitle, fitDescription } from '@/lib/seo';

const baseMetadata: Metadata = {
  title: fitTitle('Free Online Design Studio & Templates'),
  description: fitDescription('Design anything with 1,000+ free templates: Instagram posts, flyers, posters, menus, invitations, certificates and business cards. Edit online and download print-ready PDF, PNG or JPG.'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Magical Touch Design — Design anything. Make it magical.',
    description: fitDescription('1,000+ free, editable templates and a full online design studio — every feature free, no watermark. Used worldwide.'),
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'Magical Touch Design' }],
  },
};

// The template count in the text follows the real library ("1,850+").
// Render next to the database (Supabase, Mumbai) for faster first visits.
export const preferredRegion = 'bom1';

export async function generateMetadata(): Promise<Metadata> {
  const [label, pic] = await Promise.all([getTemplateCountLabel(), getGooglePicture()]);
  const meta: Metadata = JSON.parse(withCount(JSON.stringify(baseMetadata), label));
  // Admin → SEO & Google → Google picture: the picture next to our result.
  if (!pic) return meta;
  const image = { url: pic.url, alt: pic.alt };
  return { ...meta, openGraph: { ...meta.openGraph, images: [image, ...((baseMetadata.openGraph?.images as any[]) || [])] }, twitter: { card: 'summary_large_image', images: [pic.url] }, other: { thumbnail: pic.url } };
}

export default async function Page() {
  const pic = await getGooglePicture();
  // The page's main picture for Google (the film is hidden from Google in robots.txt).
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: 'Magical Touch Design — Free Online Design Tool & Templates',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    primaryImageOfPage: { '@type': 'ImageObject', url: pic ? pic.url : `${SITE_URL}/api/og`, caption: pic?.alt || 'Magical Touch Design' },
    image: pic ? pic.url : `${SITE_URL}/api/og`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <HomePage />
    </>
  );
}
