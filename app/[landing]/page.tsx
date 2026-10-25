import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, searchTemplates } from '@/lib/seo';
import { LANDINGS, landingBySlug, Landing } from '@/lib/landings';

// Keyword landing pages: /free-flyer-maker, /christmas-templates, ...
// Only the slugs in lib/landings.ts exist; anything else is a 404.
export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return LANDINGS.map((l) => ({ landing: l.slug }));
}

export function generateMetadata({ params }: { params: { landing: string } }): Metadata {
  const l = landingBySlug(params.landing);
  if (!l) return {};
  const url = `${SITE_URL}/${l.slug}`;
  return {
    title: { absolute: `${l.title} | ${SITE_NAME}` },
    description: l.description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: l.title, description: l.description, siteName: SITE_NAME, images: [`${SITE_URL}/og-image.png`] },
    twitter: { card: 'summary_large_image', title: l.title, description: l.description, images: [`${SITE_URL}/og-image.png`] },
  };
}

export default async function LandingPage({ params }: { params: { landing: string } }) {
  const found = landingBySlug(params.landing);
  if (!found) notFound();
  const l = found as Landing;
  const items = await searchTemplates(l.terms, 40);
  const url = `${SITE_URL}/${l.slug}`;
  const steps = [
    ['Pick a template', `Browse the ${l.thing} designs below and open the one you like.`],
    ['Make it yours', 'Click any text to change it, swap the photos for your own, and adjust colours and fonts.'],
    ['Download or share', 'Download a print-ready PDF, or a PNG / JPG for WhatsApp, Instagram and email.'],
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: l.h1,
      description: l.description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.slice(0, 30).map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/templates/${t.slug}`, name: t.name })) },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to make a ${l.thing} for free`,
      step: steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: l.h1, item: url },
      ],
    },
  ];
  const related = l.related.map(landingBySlug).filter(Boolean) as Landing[];
  return (
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/free-design-tools', label: 'Free design tools' }, { label: l.h1 }]} />
        <header className="mt-4 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">{l.h1}</h1>
          {l.intro.map((p, i) => (
            <p key={i} className="mt-4 text-[15px] sm:text-base text-mt-muted leading-relaxed">{p}</p>
          ))}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#templates" className="h-12 px-6 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center">Browse {items.length || ''} free {l.thing} templates</a>
            <Link href="/create" className="h-12 px-6 rounded-2xl border border-mt-border font-semibold inline-flex items-center hover:bg-mt-surface2">Start from a blank page</Link>
          </div>
        </header>

        <section id="templates" className="mt-12 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-semibold">Free {l.thing} templates</h2>
          {items.length ? (
            <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {items.map((r) => (
                <li key={r.id}>
                  <Link href={`/templates/${r.slug}`} className="block group">
                    <div className="aspect-[4/5] rounded-2xl border border-mt-border bg-mt-surface2 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumbnail || r.preview || ''} alt={`${r.name} — free ${l.thing} template`} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform" />
                    </div>
                    <p className="mt-2 text-[13px] font-medium line-clamp-2">{r.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-mt-muted">
              New designs are on the way. Meanwhile, <Link href="/templates" className="underline">browse all templates</Link>.
            </p>
          )}
          <p className="mt-6"><Link href={`/templates?q=${encodeURIComponent(l.terms[0])}`} className="text-[14px] font-medium underline underline-offset-4">See every {l.thing} template →</Link></p>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">How to make a {l.thing} for free</h2>
            <ol className="mt-5 space-y-4">
              {steps.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="shrink-0 h-8 w-8 rounded-full bg-mt-primary text-mt-onprimary inline-flex items-center justify-center text-sm font-semibold">{i + 1}</span>
                  <div><p className="font-semibold">{t}</p><p className="text-mt-muted text-[14px] mt-1">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Popular uses</h2>
            <ul className="mt-5 grid sm:grid-cols-2 gap-2">
              {l.uses.map((u) => (
                <li key={u} className="rounded-xl border border-mt-border px-4 py-3 text-[14px]">{u}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-semibold">Frequently asked questions</h2>
          <div className="mt-5 divide-y divide-mt-border border-y border-mt-border">
            {l.faqs.map(([q, a]) => (
              <details key={q} className="py-4 group">
                <summary className="cursor-pointer font-medium list-none flex justify-between gap-4">{q}<span className="text-mt-muted group-open:rotate-45 transition-transform">+</span></summary>
                <p className="mt-2 text-mt-muted text-[14px] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <nav aria-label="Related" className="mt-14">
            <h2 className="text-lg font-semibold">You might also need</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}><Link href={`/${r.slug}`} className="inline-flex px-4 py-2 rounded-full border border-mt-border text-[14px] hover:bg-mt-surface2">{r.h1}</Link></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </SeoShell>
  );
}
