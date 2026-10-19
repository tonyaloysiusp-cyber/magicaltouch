import type { Metadata } from 'next';

export const metadata: Metadata = { title: { absolute: 'Magical Touch Design' }, robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
