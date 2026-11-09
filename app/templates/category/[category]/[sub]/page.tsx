import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryLanding, subFull } from '@/components/seo/CategoryLanding';
import { SITE_URL, SITE_NAME, getSubcategories, getTemplatesInSubcategory } from '@/lib/seo';

// Sub-category landing pages: /templates/category/wedding/invitation,
// /templates/category/business/business-card, …
export const revalidate = 3600;
export const dynamicParams = true;
export const preferredRegion = 'bom1';

async function resolve(category: string, sub: string) {
  const subs = await getSubcategories();
  return { s: subs.find((x) => x.parentSlug === category && x.slug === sub), subs };
}

export async function generateMetadata({ params }: { params: { category: string; sub: string } }): Promise<Metadata> {
  const { s } = await resolve(params.category, params.sub);
  if (!s) return { title: 'Templates', robots: { index: false } };
  const full = subFull({ name: s.parent, slug: s.parentSlug }, s.name);
  const title = `${s.count}+ Free ${full} Templates – Edit Online`;
  const description = `${s.count} free, editable ${full.toLowerCase()} templates. Personalise the words, colours and photos online and download print-ready PDF, PNG or JPG.`;
  const url = `${SITE_URL}/templates/category/${s.parentSlug}/${s.slug}`;
  return { title: { absolute: `${title} | ${SITE_NAME}` }, description, alternates: { canonical: url }, openGraph: { type: 'website', url, title, description, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] } };
}

export default async function SubCategoryPage({ params }: { params: { category: string; sub: string } }) {
  const { s, subs } = await resolve(params.category, params.sub);
  if (!s) notFound();
  const rows = await getTemplatesInSubcategory(s.id);
  const siblings = subs.filter((x) => x.parentSlug === s.parentSlug);
  return (
    <CategoryLanding
      name={s.name}
      parent={{ name: s.parent, slug: s.parentSlug }}
      slug={s.slug}
      count={s.count}
      rows={rows}
      links={siblings.map((x) => ({ href: `/templates/category/${x.parentSlug}/${x.slug}`, label: x.name, count: x.count, active: x.id === s.id }))}
    />
  );
}
