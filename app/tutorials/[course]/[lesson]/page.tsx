import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeoShell } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { loadCourse } from '@/lib/courses';
import { LessonView } from '@/components/courses/CourseDetail';

export const revalidate = 60;

async function getData(courseSlug: string, lessonSlug: string) {
  const sb = createAnonSupabaseClient();
  const course = await loadCourse(sb, courseSlug).catch(() => null);
  const lesson = course?.lessons.find((l) => l.slug === lessonSlug);
  if (!course || !lesson) return null;
  let prerequisite: { id: string; title: string; slug: string } | null = null;
  if (course.prerequisite_slug) {
    const { data } = await sb.from('courses').select('id, title, slug').eq('slug', course.prerequisite_slug).eq('visible', true).maybeSingle();
    prerequisite = (data as { id: string; title: string; slug: string } | null) || null;
  }
  return { course, lesson, prerequisite };
}

export async function generateMetadata({ params }: { params: { course: string; lesson: string } }): Promise<Metadata> {
  const d = await getData(params.course, params.lesson);
  if (!d) return { title: 'Lesson not found', robots: { index: false } };
  const url = `${SITE_URL}/tutorials/${d.course.slug}/${d.lesson.slug}`;
  return {
    title: { absolute: `${d.lesson.title} — ${d.course.title} | Magical Touch Design` },
    description: (d.lesson.intro || d.course.summary).slice(0, 300),
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: d.lesson.title, description: d.lesson.intro, siteName: SITE_NAME, images: [`${SITE_URL}/og-image.png`] },
  };
}

export default async function LessonPage({ params }: { params: { course: string; lesson: string } }) {
  const d = await getData(params.course, params.lesson);
  if (!d) return notFound();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: d.lesson.title,
    description: d.lesson.intro,
    totalTime: `PT${d.lesson.minutes}M`,
    step: d.lesson.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    isPartOf: { '@type': 'Course', name: d.course.title, url: `${SITE_URL}/tutorials/${d.course.slug}` },
  };
  return (
    <SeoShell active="tutorials">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LessonView course={d.course} lesson={d.lesson} prerequisite={d.prerequisite} />
    </SeoShell>
  );
}
