import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { getActivePosts, getPost, postImage, hashtagText, abs } from '@/lib/sitePosts';

// One page per Google post: the big picture (or video), title, description
// and hashtags, with ImageObject / VideoObject data so Google Images and
// Google Videos can show it and link back here.
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getActivePosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPost(params.slug);
  if (!p) return { title: 'Not found', robots: { index: false } };
  const url = `${SITE_URL}/showcase/${p.slug}`;
  const img = postImage(p) || `${SITE_URL}/api/og`;
  const desc = `${p.description} ${hashtagText(p.hashtags)}`.slice(0, 300);
  return {
    title: { absolute: `${p.title} | ${SITE_NAME}` },
    description: desc,
    keywords: [...p.hashtags, 'magical touch design', 'free templates', 'online design tool'],
    alternates: { canonical: url },
    openGraph: p.kind === 'video' && p.video_url
      ? { type: 'video.other', url, title: p.title, description: desc, siteName: SITE_NAME, images: [{ url: img, alt: p.title }], videos: [{ url: abs(p.video_url) as string }] }
      : { type: 'website', url, title: p.title, description: desc, siteName: SITE_NAME, images: [{ url: img, alt: p.title }] },
    twitter: { card: 'summary_large_image', title: p.title, description: desc, images: [img] },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const url = `${SITE_URL}/showcase/${p.slug}`;
  const img = postImage(p);
  const more = (await getActivePosts()).filter((x) => x.slug !== p.slug).slice(0, 6);
  const media = p.kind === 'video' && p.video_url
    ? { '@context': 'https://schema.org', '@type': 'VideoObject', name: p.title, description: p.description, thumbnailUrl: img, contentUrl: abs(p.video_url), uploadDate: p.published_at || p.updated_at, embedUrl: url, publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } }, keywords: p.hashtags.join(', ') }
    : { '@context': 'https://schema.org', '@type': 'ImageObject', name: p.title, caption: p.description, contentUrl: img, license: `${SITE_URL}/terms`, acquireLicensePage: `${SITE_URL}${p.link || '/templates'}`, creditText: SITE_NAME, creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }, copyrightNotice: `© ${SITE_NAME}`, keywords: p.hashtags.join(', '), datePublished: p.published_at };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Showcase', item: `${SITE_URL}/showcase` }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] };
  return (
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([media, crumbs]) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/showcase', label: 'Showcase' }, { label: p.title }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
          <div className="rounded-3xl bg-mt-surface2 p-4 sm:p-6 grid place-items-center">
            {p.kind === 'video' && p.video_url ? (
              <video src={p.video_url} poster={img || undefined} controls playsInline className="max-h-[80vh] max-w-full rounded-2xl" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={img || ''} alt={`${p.title} — ${SITE_NAME}`} className="max-h-[80vh] max-w-full h-auto rounded-2xl shadow-lg" />
            )}
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mt-faint">{p.kind === 'video' ? 'Video' : 'Poster'} · {SITE_NAME}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{p.title}</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-mt-muted">{p.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.hashtags.map((h) => <li key={h} className="text-[13px] px-3 py-1 rounded-full bg-mt-surface2 text-[#3B82C4]">#{h}</li>)}
            </ul>
            <Link href={p.link || '/templates'} className="mt-6 inline-flex h-12 px-6 items-center rounded-full bg-mt-primary text-mt-onprimary font-semibold">Start designing free</Link>
          </div>
        </div>
        {more.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">More from the showcase</h2>
            <ul className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {more.map((m) => (
                <li key={m.id}><Link href={`/showcase/${m.slug}`} className="block rounded-2xl border border-mt-border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={postImage(m) || ''} alt={m.title} loading="lazy" className="aspect-square w-full object-cover" />
                </Link></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </SeoShell>
  );
}
