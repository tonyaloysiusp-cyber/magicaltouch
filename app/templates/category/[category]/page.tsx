import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, getCategories, getTemplatesInCategory } from '@/lib/seo';

// A landing page per category ("Free Menus templates"), linking to every
// template page in it.
export const revalidate = 3600;
export const dynamicParams = true;

async function resolve(slug: string) {
  const cats = await getCategories();
  return { cat: cats.find((c) => c.slug === slug), cats };
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const { cat } = await resolve(params.category);
  if (!cat) return { title: 'Templates', robots: { index: false } };
  const title = `${cat.count}+ Free ${cat.name} Templates`;
  const description = `Browse ${cat.count} free, editable ${cat.name.toLowerCase()} templates. Customise them online in minutes and download print-ready PDF, PNG or JPG — no design skills needed.`;
  const url = `${SITE_URL}/templates/category/${cat.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { type: 'website', url, title, description, siteName: SITE_NAME, images: [`${SITE_URL}/og-image.png`] } };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const { cat: found, cats } = await resolve(params.category);
  if (!found) notFound();
  const cat = found as { name: string; slug: string; count: number };
  const items = await getTemplatesInCategory(cat.name);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Free ${cat.name} templates`,
    url: `${SITE_URL}/templates/category/${cat.slug}`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.slice(0, 50).map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/templates/${t.slug}`, name: t.name })) },
  };
  return (
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/templates', label: 'Templates' }, { label: cat.name }]} />
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Free {cat.name} templates</h1>
        <p className="mt-3 max-w-2xl text-mt-muted">{cat.count} editable {cat.name.toLowerCase()} designs. Pick one, change the words, colours and photos online, and download it ready to print or share.</p>
        <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link key={c.slug} href={`/templates/category/${c.slug}`} className={`px-3.5 py-1.5 rounded-full border text-[13px] ${c.slug === cat.slug ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
              {c.name} <span className="opacity-60">({c.count})</span>
            </Link>
          ))}
        </nav>
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/templates/${r.slug}`} className="block group">
                <div className="aspect-[4/5] rounded-2xl border border-mt-border bg-mt-surface2 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail || r.preview || ''} alt={`${r.name} template`} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform" />
                </div>
                <p className="mt-2 text-[13px] font-medium line-clamp-2">{r.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SeoShell>
  );
}
