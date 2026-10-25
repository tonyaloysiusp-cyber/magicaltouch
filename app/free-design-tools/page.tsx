import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { LANDINGS } from '@/lib/landings';

// Hub linking every keyword landing page (good for users and crawlers).
export const metadata: Metadata = {
  title: { absolute: `Free Design Tools — Flyer, Poster, Invitation & Resume Makers | ${SITE_NAME}` },
  description: 'All of Magical Touch’s free online design makers in one place: flyers, posters, invitations, resumes, business cards, menus, certificates, social posts and seasonal templates.',
  alternates: { canonical: `${SITE_URL}/free-design-tools` },
};

export default function FreeToolsPage() {
  const tools = LANDINGS.filter((l) => !l.seasonal);
  const seasonal = LANDINGS.filter((l) => l.seasonal);
  const Card = ({ slug, h1, description }: { slug: string; h1: string; description: string }) => (
    <li>
      <Link href={`/${slug}`} className="block h-full rounded-2xl border border-mt-border p-5 hover:bg-mt-surface2 transition-colors">
        <p className="font-semibold">{h1}</p>
        <p className="mt-2 text-[13px] text-mt-muted line-clamp-3">{description}</p>
      </Link>
    </li>
  );
  return (
    <SeoShell>
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'Free design tools' }]} />
        <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">Free design tools</h1>
        <p className="mt-4 max-w-2xl text-mt-muted">Everything you need to design for your business, events and celebrations — free, in your browser, with print-ready downloads.</p>
        <h2 className="mt-10 text-xl font-semibold">Makers</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{tools.map((l) => <Card key={l.slug} {...l} />)}</ul>
        <h2 className="mt-12 text-xl font-semibold">Seasonal & festivals</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{seasonal.map((l) => <Card key={l.slug} {...l} />)}</ul>
      </div>
    </SeoShell>
  );
}
