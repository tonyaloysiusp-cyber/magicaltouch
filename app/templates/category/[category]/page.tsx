import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryLanding } from '@/components/seo/CategoryLanding';
import { SITE_URL, SITE_NAME, getCategories, getTemplatesInCategory, getSubcategories, fitTitle, fitDescription } from '@/lib/seo';

// A landing page per category ("Free Wedding templates"), with links to its
// sub-categories, every template page in it and its popular hashtags.
export const revalidate = 3600;
export const dynamicParams = true;
export const preferredRegion = 'bom1';

export async function generateStaticParams() {
  const cats = await getCategories().catch(() => []);
  return cats.map((c) => ({ category: c.slug }));
}

async function resolve(slug: string) {
  const cats = await getCategories();
  return { cat: cats.find((c) => c.slug === slug), cats };
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const { cat } = await resolve(params.category);
  if (!cat) return { title: 'Templates', robots: { index: false } };
  const title = `${cat.count}+ Free ${cat.name} Templates – Edit Online`;
  const description = `Browse ${cat.count} free, editable ${cat.name.toLowerCase()} templates. Customise them online in minutes and download print-ready PDF, PNG or JPG — no design skills needed.`;
  const url = `${SITE_URL}/templates/category/${cat.slug}`;
  return { title: fitTitle(`${title}`), description: fitDescription(description), alternates: { canonical: url }, openGraph: { type: 'website', url, title, description, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] } };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const { cat: found, cats } = await resolve(params.category);
  if (!found) notFound();
  const cat = found as { name: string; slug: string; count: number };
  const [items, subs] = await Promise.all([getTemplatesInCategory(cat.name), getSubcategories().catch(() => [])]);
  return (
    <CategoryLanding
      name={cat.name}
      slug={cat.slug}
      count={cat.count}
      rows={items}
      links={cats.map((c) => ({ href: `/templates/category/${c.slug}`, label: c.name, count: c.count, active: c.slug === cat.slug }))}
      subLinks={subs.filter((s) => s.parentSlug === cat.slug).map((s) => ({ href: `/templates/category/${s.parentSlug}/${s.slug}`, label: s.name, count: s.count }))}
    />
  );
}
