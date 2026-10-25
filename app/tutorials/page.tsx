import type { Metadata } from 'next';
import { SeoShell } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { LEVELS } from '@/lib/tutorials';
import { TutorialsClient } from '@/components/tutorials/TutorialsClient';

export const metadata: Metadata = {
  title: { absolute: 'Free Graphic Design Tutorials — Beginner to Pro, With Certificates | Magical Touch Design' },
  description:
    'Learn graphic design step by step, free: 18 hands-on lessons in three levels — Beginner, Intermediate and Pro — covering templates, text, photos, brand kits, Photo Studio, print PDFs and more. Earn a verified certificate for each level.',
  alternates: { canonical: `${SITE_URL}/tutorials` },
  openGraph: { type: 'website', url: `${SITE_URL}/tutorials`, title: 'Free design tutorials — Beginner to Pro', description: 'Hands-on lessons with tasks and a verified certificate for every level.', siteName: SITE_NAME, images: [`${SITE_URL}/og-image.png`] },
};

export default function TutorialsPage() {
  const jsonLd = LEVELS.map((l) => ({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${l.name} — Graphic design with Magical Touch`,
    description: l.summary,
    provider: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
    isAccessibleForFree: true,
    educationalLevel: l.badge,
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${l.lessons.reduce((a, x) => a + x.minutes, 0)}M` },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
  }));
  return (
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TutorialsClient />
    </SeoShell>
  );
}
