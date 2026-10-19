import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign Up Free', description: 'Create a free Magical Touch Design account and start designing with 1,000+ templates.', alternates: { canonical: '/signup' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
