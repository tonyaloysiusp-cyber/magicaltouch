import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log In', description: 'Log in to Magical Touch Design to open your designs and brand kit.', alternates: { canonical: '/login' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
