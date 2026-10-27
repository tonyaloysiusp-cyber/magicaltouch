import type { MetadataRoute } from 'next';
import { SITE_URL, getAllPublishedTemplates, categorySlug, getPublishedSeoPages, getHiddenLandings } from '@/lib/seo';
import { ALL_LANDINGS } from '@/lib/landings';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { loadCourses } from '@/lib/courses';

// Rebuilt at most once an hour, so new templates appear without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const hidden = await getHiddenLandings();
  const seen = new Set<string>();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/templates`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/create`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/photo-studio`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/verify`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/tutorials`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/free-design-tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...ALL_LANDINGS().filter((l) => !hidden.has(l.slug) && !seen.has(l.slug) && seen.add(l.slug)).map((l) => ({ url: `${SITE_URL}/${l.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: l.seasonal ? 0.8 : 0.9 })),
  ];
  (await getPublishedSeoPages()).filter((p) => !seen.has(p.slug) && !hidden.has(p.slug)).forEach((p) => pages.push({ url: `${SITE_URL}/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly', priority: 0.85 }));
  (await loadCourses(createAnonSupabaseClient()).catch(() => [])).forEach((c) => {
    pages.push({ url: `${SITE_URL}/tutorials/${c.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
    c.lessons.forEach((l) => pages.push({ url: `${SITE_URL}/tutorials/${c.slug}/${l.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 }));
  });
  const templates = await getAllPublishedTemplates();
  const cats = new Set<string>();
  templates.forEach((t) => {
    cats.add(t.category);
    pages.push({
      url: `${SITE_URL}/templates/${t.slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });
  cats.forEach((c) => pages.push({ url: `${SITE_URL}/templates/category/${categorySlug(c)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 }));
  return pages;
}
