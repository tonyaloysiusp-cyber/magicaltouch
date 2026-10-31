import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoShell, UseTemplateButton, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, SeoTemplate, getAllPublishedTemplates, getTemplateBySlug, getRelatedTemplates, templateDescription, sizeLabel, formatLabel, categorySlug } from '@/lib/seo';

// One page per template, so each design can be found on Google
// ("free birthday poster template", "restaurant menu template"…).
export const revalidate = 3600;
export const dynamicParams = true;
// Render next to the database (Supabase, Mumbai): visitors measured 5–17 s
// on first visits when each page was made on demand far from the data.
export const preferredRegion = 'bom1';

// Build the first template pages in gallery order ahead of time, so Google and visitors get them instantly. The rest are
// made on first visit — quickly, next to the database — and cached. Kept to
// 500 so a deploy stays well inside Vercel's 45-minute build limit (all
// ~1,900 took about 40 minutes).
const PREBUILD = 500;
export async function generateStaticParams() {
  const all = await getAllPublishedTemplates().catch(() => []);
  return all.slice(0, PREBUILD).map((t) => ({ slug: t.slug }));
}

const abs = (u?: string | null) => (!u ? null : u.startsWith('http') ? u : `${SITE_URL}${u}`);
/** "Sage Kids Party Invitation" → "Sage Kids Party Invitation Template", so searches for "… template" match. */
const withTemplate = (name: string) => (/template/i.test(name) ? name : `${name} Template`);

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTemplateBySlug(params.slug);
  if (!t) return { title: 'Template not found', robots: { index: false } };
  const title = `${withTemplate(t.name)} — Free & Editable`;
  const description = templateDescription(t);
  const url = `${SITE_URL}/templates/${t.slug}`;
  const image = abs(t.preview || t.thumbnail) || `${SITE_URL}/api/og`;
  return {
    title,
    description,
    keywords: [t.name, `${t.category} template`, 'free template', 'online design', ...(t.search_keywords || '').split(',').map((s) => s.trim()).filter(Boolean)].slice(0, 15),
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title, description, siteName: SITE_NAME, images: [{ url: image, alt: `${withTemplate(t.name)} — ${t.category}` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function TemplatePage({ params }: { params: { slug: string } }) {
  const found = await getTemplateBySlug(params.slug);
  if (!found) notFound();
  const t = found as SeoTemplate;
  const related = await getRelatedTemplates(t, 8);
  const url = `${SITE_URL}/templates/${t.slug}`;
  const catUrl = `/templates/category/${categorySlug(t.category)}`;
  const tags = (t.tags || []).filter((x) => !/^style:|pages$/.test(x)).slice(0, 8);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: t.name,
      description: templateDescription(t),
      url,
      image: abs(t.preview || t.thumbnail),
      genre: t.category,
      keywords: [...tags, ...(t.search_keywords || '').split(',').map((s) => s.trim())].filter(Boolean).join(', '),
      isAccessibleForFree: true,
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.png` },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    },
    // Image licence details: Google Images can show the picture with a
    // "Licensable" label and link people straight to this free template.
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      contentUrl: abs(t.preview || t.thumbnail),
      thumbnailUrl: abs(t.thumbnail || t.preview),
      name: withTemplate(t.name),
      caption: `${withTemplate(t.name)} — free ${t.category.toLowerCase()} template you can edit online`,
      license: `${SITE_URL}/terms`,
      acquireLicensePage: url,
      creditText: SITE_NAME,
      creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      copyrightNotice: `© ${SITE_NAME}`,
      width: t.width,
      height: t.height,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Templates', item: `${SITE_URL}/templates` },
        { '@type': 'ListItem', position: 3, name: t.category, item: `${SITE_URL}${catUrl}` },
        { '@type': 'ListItem', position: 4, name: t.name, item: url },
      ],
    },
  ];
  return (
    <SeoShell active="templates">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/templates', label: 'Templates' }, { href: catUrl, label: t.category }, { label: t.name }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
          <div className="rounded-3xl border border-mt-border bg-mt-surface2 p-4 sm:p-6 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.preview || t.thumbnail || ''} alt={`${t.name} — editable ${t.category.toLowerCase()} template`} width={Math.min(1300, t.width)} height={Math.round((Math.min(1300, t.width) * t.height) / t.width)} className="max-h-[78vh] w-auto max-w-full h-auto rounded-xl shadow-lg" />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mt-muted">{t.category} template · Free</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">{t.name}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-mt-muted">{templateDescription(t)}</p>
            <div className="mt-6">
              <UseTemplateButton id={t.id} width={t.width} height={t.height} premium={t.is_free === false} />
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-[14px]">
              <div><dt className="text-mt-muted text-[12px]">Format</dt><dd className="font-semibold">{formatLabel(t.width, t.height)}</dd></div>
              <div><dt className="text-mt-muted text-[12px]">Size</dt><dd className="font-semibold">{sizeLabel(t.width, t.height)}</dd></div>
              <div><dt className="text-mt-muted text-[12px]">Download as</dt><dd className="font-semibold">PDF, PNG, JPG, WebP, TIFF</dd></div>
              <div><dt className="text-mt-muted text-[12px]">Price</dt><dd className="font-semibold">Free</dd></div>
            </dl>
            <h2 className="mt-8 text-lg font-semibold">How to use this template</h2>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-[14px] text-mt-muted">
              <li>Click “Use this template” — it opens in the free online editor.</li>
              <li>Change the words, colours, fonts and photos (upload your own or pick from the library).</li>
              <li>Download a print-ready PDF or a picture for social media, or print it directly.</li>
            </ol>
            {tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {tags.map((x) => (
                  <span key={x} className="px-3 py-1 rounded-full border border-mt-border text-[12px] text-mt-muted">{x}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">More {t.category.toLowerCase()} templates</h2>
              <Link href={catUrl} className="text-[14px] font-semibold text-mt-accent hover:underline">See all →</Link>
            </div>
            <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/templates/${r.slug}`} className="block group">
                    <div className="aspect-[4/5] rounded-2xl border border-mt-border bg-mt-surface2 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumbnail || r.preview || ''} alt={r.name} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform" />
                    </div>
                    <p className="mt-2 text-[13px] font-medium line-clamp-2">{r.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </SeoShell>
  );
}
