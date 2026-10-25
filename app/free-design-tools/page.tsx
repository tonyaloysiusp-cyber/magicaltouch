import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { ALL_LANDINGS } from '@/lib/landings';

// Hub linking every keyword landing page (good for users and crawlers).
export const metadata: Metadata = {
  title: { absolute: `Free Design Tools — Flyer, Poster, Invitation & Resume Makers | ${SITE_NAME}` },
  description: 'All of Magical Touch’s free online design makers in one place: flyers, posters, invitations, resumes, business cards, menus, certificates, social posts and seasonal templates.',
  alternates: { canonical: `${SITE_URL}/free-design-tools` },
};

export default function FreeToolsPage() {
  const all = ALL_LANDINGS();
  const features = all.filter((l) => l.ctaHref && !l.lang);
  const tools = all.filter((l) => !l.seasonal && !l.ctaHref && !l.lang && !l.country);
  const countries = all.filter((l) => l.country);
  const seasonal = all.filter((l) => l.seasonal);
  const arabic = all.filter((l) => l.lang === 'ar');
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
        <h2 className="mt-10 text-xl font-semibold">Tools — every feature free</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{features.map((l) => <Card key={l.slug} {...l} />)}</ul>
        <h2 className="mt-12 text-xl font-semibold">Makers</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{tools.map((l) => <Card key={l.slug} {...l} />)}</ul>
        <h2 className="mt-12 text-xl font-semibold">Seasonal & festivals</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{seasonal.map((l) => <Card key={l.slug} {...l} />)}</ul>
        <h2 className="mt-12 text-xl font-semibold">By country</h2>
        <ul className="mt-4 flex flex-wrap gap-2">{countries.map((l) => <li key={l.slug}><Link href={`/${l.slug}`} className="inline-flex px-4 py-2 rounded-full border border-mt-border text-[14px] hover:bg-mt-surface2">{l.country}</Link></li>)}</ul>
        <h2 className="mt-12 text-xl font-semibold" lang="ar" dir="rtl">بالعربي</h2>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" lang="ar" dir="rtl">{arabic.map((l) => <Card key={l.slug} {...l} />)}</ul>
      </div>
    </SeoShell>
  );
}
