import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact Us', description: 'Get in touch with Magical Touch Design in Dubai — questions, feedback, custom designs and partnerships.', alternates: { canonical: '/contact' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
