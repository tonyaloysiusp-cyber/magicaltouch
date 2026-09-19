import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: 'Magical Touch — Create. Design. Make It Magical.',
  description:
    'A simple, powerful design workspace for creators, businesses and professionals. Design social posts, print materials and more — free to use.',
  openGraph: {
    title: 'Magical Touch — Create. Design. Make It Magical.',
    description:
      'A simple, powerful design workspace for creators, businesses and professionals. Design social posts, print materials and more — free to use.',
    images: ['/logo.png'],
  },
};

export default function Page() {
  return <HomePage />;
}
