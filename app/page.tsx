import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import { HomePage } from '@/components/home/HomePage';

const baseMetadata: Metadata = {
  title: { absolute: 'Free Online Design Tool & 1,000+ Templates — No Watermark | Magical Touch Design' },
  description:
    'Design anything with 1,000+ free templates: Instagram posts, flyers, posters, menus, invitations, certificates and business cards. Edit online and download print-ready PDF, PNG or JPG.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Magical Touch Design — Design anything. Make it magical.',
    description: '1,000+ free, editable templates and a full online design studio — every feature free, no watermark. Used worldwide.',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'Magical Touch Design' }],
  },
};

// The template count in the text follows the real library ("1,850+").
// Render next to the database (Supabase, Mumbai) for faster first visits.
export const preferredRegion = 'bom1';

export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

export default function Page() {
  return <HomePage />;
}
