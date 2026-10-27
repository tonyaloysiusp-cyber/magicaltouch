import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';

const baseMetadata: Metadata = { title: 'Sign Up Free', description: 'Create a free Magical Touch Design account and start designing with 1,000+ templates.', alternates: { canonical: '/signup' } };

// The template count in the text follows the real library ("1,850+").
export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
