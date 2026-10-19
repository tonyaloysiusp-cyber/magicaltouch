import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create a Design — Pick a Size and Start', description: 'Start a new design at any size: Instagram post, story, A4 flyer, poster, business card, presentation or your own custom size.', alternates: { canonical: '/create' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
