import type { Metadata } from 'next';

export const metadata: Metadata = { title: { absolute: 'Free Design Templates — 1,000+ Editable Posters, Flyers, Posts & Menus | Magical Touch Design', template: '%s | Magical Touch Design' }, description: 'Browse 1,000+ free, editable templates: Instagram posts and stories, flyers, posters, menus, invitations, certificates, business cards and more. Customise online and download PDF, PNG or JPG.', alternates: { canonical: '/templates' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
