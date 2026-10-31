import type { Metadata } from 'next';
import { SeoShell } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { loadCourses, totalMinutes } from '@/lib/courses';
import { CoursesCatalog } from '@/components/courses/CoursesCatalog';

// Course content is managed in Admin → Courses; refreshed every minute.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: 'Free Graphic Design Tutorials & Courses — Beginner to Pro | Magical Touch Design' },
  description:
    'Learn graphic design step by step, free: short hands-on lessons in Beginner, Intermediate and Pro courses — templates, text, photos, brand kits, Photo Studio and print-ready PDFs. Request a reviewed certificate when you finish.',
  alternates: { canonical: `${SITE_URL}/tutorials` },
  openGraph: { type: 'website', url: `${SITE_URL}/tutorials`, title: 'Free design tutorials & courses — Beginner to Pro', description: 'Hands-on lessons with a reviewed certificate for every course.', siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

export default async function TutorialsPage() {
  const courses = await loadCourses(createAnonSupabaseClient()).catch(() => []);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: c.summary,
        url: `${SITE_URL}/tutorials/${c.slug}`,
        provider: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
        isAccessibleForFree: true,
        educationalLevel: c.level,
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${totalMinutes(c.lessons)}M` },
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
      },
    })),
  };
  return (
    <SeoShell active="tutorials">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CoursesCatalog courses={courses} />
    </SeoShell>
  );
}
