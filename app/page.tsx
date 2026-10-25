import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: { absolute: 'Free Online Design Tool & 1,000+ Templates — No Watermark | Magical Touch Design' },
  description:
    'Design anything with 1,000+ free templates: Instagram posts, flyers, posters, menus, invitations, certificates and business cards. Edit online and download print-ready PDF, PNG or JPG.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Magical Touch Design — Design anything. Make it magical.',
    description: '1,000+ free, editable templates and a simple online design studio. Made in Dubai.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Magical Touch Design' }],
  },
};

export default function Page() {
  return <HomePage />;
}
