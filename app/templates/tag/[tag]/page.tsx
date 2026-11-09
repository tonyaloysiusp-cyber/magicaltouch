import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, getTemplatesByHashtag, relatedHashtags, hashtagTitle, categorySlug } from '@/lib/seo';

// One page per hashtag (/templates/tag/weddinginvitation): every template
// carrying it, related hashtags and categories. Made on first visit, cached.
export const revalidate = 3600;
export const dynamicParams = true;
export const preferredRegion = 'bom1';

const MIN_INDEX = 6; // fewer templates than this: page works but stays out of Google

const clean = (s: string) => decodeURIComponent(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export async function generateMetadata({ params }: { params: { tag: string } }): Promise<Metadata> {
  const tag = clean(params.tag);
  const rows = await getTemplatesByHashtag(tag);
  if (!rows.length) return { title: 'Templates', robots: { index: false } };
  const title = hashtagTitle(tag);
  const n = rows.length >= 240 ? '240+' : String(rows.length);
  const url = `${SITE_URL}/templates/tag/${tag}`;
  const desc = `${n} free, editable ${title.toLowerCase()} templates (#${tag}). Change the words, colours and photos online and download print-ready PDF, PNG or JPG — no design skills needed.`;
  return {
    title: { absolute: `${title} Templates – ${n} Free Editable Designs | ${SITE_NAME}` },
    description: desc,
    alternates: { canonical: url },
    robots: rows.length < MIN_INDEX ? { index: false, follow: true } : undefined,
    openGraph: { type: 'website', url, title: `${title} templates`, description: desc, siteName: SITE_NAME, images: rows[0]?.preview ? [rows[0].preview.startsWith('http') ? rows[0].preview : `${SITE_URL}${rows[0].preview}`] : [`${SITE_URL}/api/og`] },
  };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = clean(params.tag);
  const rows = await getTemplatesByHashtag(tag);
  if (!rows.length) notFound();
  const title = hashtagTitle(tag);
  const low = title.toLowerCase();
  const n = rows.length >= 240 ? '240+' : String(rows.length);
  const related = relatedHashtags(rows, [tag, 'magicaltouchdesign', 'magicaltouch', 'freetemplates'], 30);
  const cats = [...new Map(rows.map((r) => [r.category, (rows.filter((x) => x.category === r.category).length)])).entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const url = `${SITE_URL}/templates/tag/${tag}`;
  const faqs: [string, string][] = [
    [`Are these ${low} templates free?`, `Yes. Every ${low} template here is free to edit and download. You only need a free account to save your designs.`],
    [`Can I change the text, colours and photos?`, `Yes — click any word to type your own, swap the photos for yours, and change colours and fonts. Everything stays editable until you download.`],
    [`What formats can I download?`, `Download a print-ready PDF, or a PNG or JPG for WhatsApp, Instagram, Facebook and email. Social media sizes are ready to post.`],
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${title} templates`, url, description: `${n} free editable ${low} templates`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      mainEntity: { '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 40).map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/templates/${t.slug}`, name: t.name })) },
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Templates', item: `${SITE_URL}/templates` }, { '@type': 'ListItem', position: 3, name: `#${tag}`, item: url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <SeoShell active="templates">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/templates', label: 'Templates' }, { label: `#${tag}` }]} />
        <p className="mt-5 text-[13px] font-medium text-mt-primary">#{tag}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight">{title} templates</h1>
        <p className="mt-3 max-w-2xl text-mt-muted">
          {n} free, editable {low} designs. Pick one, change the words, colours and photos in your browser, and download it ready to print or post.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/templates?q=${encodeURIComponent(tag)}`} className="h-10 px-5 inline-flex items-center rounded-full bg-mt-primary text-mt-onprimary text-sm font-medium">Open in the template gallery</Link>
          <Link href="/editor" className="h-10 px-5 inline-flex items-center rounded-full border border-mt-border text-sm">Start from a blank page</Link>
        </div>

        <h2 className="sr-only">{title} templates</h2>
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/templates/${r.slug}`} className="block group">
                <div className="aspect-[4/5] rounded-2xl border border-mt-border bg-mt-surface2 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail || r.preview || ''} alt={`${r.name} – ${low} template`} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform" />
                </div>
                <p className="mt-2 text-[13px] font-medium line-clamp-2">{r.name}</p>
              </Link>
            </li>
          ))}
        </ul>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Related hashtags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.tag} href={`/templates/tag/${r.tag}`} className="px-3 py-1.5 rounded-full border border-mt-border text-[13px] text-mt-muted hover:text-mt-ink">#{r.tag}</Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Browse by category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cats.map(([c, k]) => (
              <Link key={c} href={`/templates/category/${categorySlug(c)}`} className="px-3 py-1.5 rounded-full border border-mt-border text-[13px] text-mt-muted hover:text-mt-ink">{c} <span className="opacity-60">({k})</span></Link>
            ))}
          </div>
        </section>

        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-semibold">How to make a {low} design</h2>
          <ol className="mt-3 space-y-2 text-mt-muted list-decimal pl-5">
            <li>Pick a {low} template above and open it in the free editor.</li>
            <li>Click any text to type your own, and drop in your photos and logo.</li>
            <li>Download a PDF to print, or a PNG / JPG to share on WhatsApp and social media.</li>
          </ol>
          <h2 className="mt-10 text-xl font-semibold">Frequently asked questions</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map(([q, a]) => (
              <div key={q}><dt className="font-medium">{q}</dt><dd className="mt-1 text-mt-muted">{a}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </SeoShell>
  );
}
