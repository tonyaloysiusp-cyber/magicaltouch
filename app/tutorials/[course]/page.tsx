import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeoShell } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { loadCourse, totalMinutes } from '@/lib/courses';
import { CourseDetail } from '@/components/courses/CourseDetail';

export const revalidate = 60;

async function getData(slug: string) {
  const sb = createAnonSupabaseClient();
  const course = await loadCourse(sb, slug).catch(() => null);
  if (!course) return null;
  let prerequisite: { id: string; title: string; slug: string } | null = null;
  if (course.prerequisite_slug) {
    const { data } = await sb.from('courses').select('id, title, slug').eq('slug', course.prerequisite_slug).eq('visible', true).maybeSingle();
    prerequisite = (data as { id: string; title: string; slug: string } | null) || null;
  }
  return { course, prerequisite };
}

export async function generateMetadata({ params }: { params: { course: string } }): Promise<Metadata> {
  const d = await getData(params.course);
  if (!d) return { title: 'Course not found', robots: { index: false } };
  const url = `${SITE_URL}/tutorials/${d.course.slug}`;
  return {
    title: { absolute: `${d.course.title} — Free Design Course | Magical Touch Design` },
    description: `${d.course.summary} ${d.course.lessons.length} short lessons. Free, with a reviewed certificate.`.slice(0, 300),
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: d.course.title, description: d.course.summary, siteName: SITE_NAME, images: [`${SITE_URL}/og-image.png`] },
  };
}

export default async function CoursePage({ params }: { params: { course: string } }) {
  const d = await getData(params.course);
  if (!d) return notFound();
  const { course, prerequisite } = d;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary,
    url: `${SITE_URL}/tutorials/${course.slug}`,
    provider: { '@type': 'Organization', name: SITE_NAME, sameAs: SITE_URL },
    isAccessibleForFree: true,
    educationalLevel: course.level,
    teaches: course.objectives,
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${totalMinutes(course.lessons)}M` },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
  };
  return (
    <SeoShell active="tutorials">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CourseDetail course={course} prerequisite={prerequisite} />
    </SeoShell>
  );
}
