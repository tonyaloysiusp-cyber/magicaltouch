import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Free Online Photo Editor — Photo Studio', description: 'Crop, retouch, adjust colours, remove backgrounds and add effects to your photos online. Your photos stay on your device.', alternates: { canonical: '/photo-studio' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
