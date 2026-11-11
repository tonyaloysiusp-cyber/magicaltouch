import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import { fitTitle } from '@/lib/seo';

const baseMetadata: Metadata = { title: { absolute: fitTitle('Free Templates — Posters, Flyers, Posts & Menus').absolute, template: '%s' }, description: 'Browse 1,000+ free, editable templates: social posts, flyers, posters, menus, invitations, certificates and business cards. Download PDF, PNG or JPG.', alternates: { canonical: '/templates' } };

// The template count in the text follows the real library ("1,850+").
export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
