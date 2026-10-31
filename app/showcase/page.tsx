import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { getActivePosts, postImage, hashtagText } from '@/lib/sitePosts';

// /showcase — every active post from Admin → SEO → Google posts: brand
// posters and videos, each linking to its own page Google can show.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Showcase — Posters, Videos & Free Template Designs',
  description: 'Posters, videos and design ideas from Magical Touch Design — the free online design tool with thousands of editable templates. #magicaltouchdesign #graphicdesign #onlinedesigntool',
  alternates: { canonical: `${SITE_URL}/showcase` },
  openGraph: { type: 'website', url: `${SITE_URL}/showcase`, title: `Showcase | ${SITE_NAME}`, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

export default async function Showcase() {
  const posts = await getActivePosts();
  return (
    <SeoShell>
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'Showcase' }]} />
        <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">Showcase</h1>
        <p className="mt-2 text-mt-muted max-w-2xl">Posters, videos and ideas from {SITE_NAME}. Every design here is made with our free templates — open one and make it yours.</p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-3xl border border-mt-border overflow-hidden bg-mt-surface">
              <Link href={`/showcase/${p.slug}`} className="block">
                <div className="aspect-[4/3] bg-mt-surface2 grid place-items-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={postImage(p) || ''} alt={p.title} loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-mt-faint">{p.kind === 'video' ? 'Video' : 'Poster'}</p>
                  <h2 className="mt-1 text-[16px] font-semibold leading-snug">{p.title}</h2>
                  <p className="mt-1 text-[12px] text-[#3B82C4] line-clamp-1">{hashtagText(p.hashtags)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SeoShell>
  );
}
