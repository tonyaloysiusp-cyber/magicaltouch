import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';

const baseMetadata: Metadata = { title: { absolute: 'Free Design Templates — 1,000+ Editable Posters, Flyers, Posts & Menus | Magical Touch Design', template: '%s | Magical Touch Design' }, description: 'Browse 1,000+ free, editable templates: Instagram posts and stories, flyers, posters, menus, invitations, certificates, business cards and more. Customise online and download PDF, PNG or JPG.', alternates: { canonical: '/templates' } };

// The template count in the text follows the real library ("1,850+").
export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
