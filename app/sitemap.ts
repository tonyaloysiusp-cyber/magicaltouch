import type { MetadataRoute } from 'next';
import { SITE_URL, getAllPublishedTemplates, categorySlug, getPublishedSeoPages, getHiddenLandings, getLandingRedirects, getSubcategories } from '@/lib/seo';
import { ALL_LANDINGS } from '@/lib/landings';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { loadCourses } from '@/lib/courses';
import { getActivePosts } from '@/lib/sitePosts';

// Rebuilt at most once an hour, so new templates appear without a deploy.
export const revalidate = 3600;

// Fixed "last changed" dates for pages whose content only changes with a
// release (a date that is always "now" teaches search engines to ignore it).
const PAGES_UPDATED = new Date('2026-11-13T00:00:00Z');
const LEGAL_UPDATED = new Date('2026-06-01T00:00:00Z');

// Standalone tools (one strong landing page each).
const TOOL_PAGES = ['create', 'photo-studio', 'trace', 'patterns', 'textile-designer', 'wallpaper-designer', 'print-size-calculator', 'print-layout', 'remove-background', 'passport-photo-maker', 'colours'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Pages linked to the gallery are left out (their address only redirects).
  const [hiddenSet, redirects] = await Promise.all([getHiddenLandings(), getLandingRedirects()]);
  const hidden = new Set([...Array.from(hiddenSet), ...Array.from(redirects.keys())]);
  const seen = new Set<string>();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/templates`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/tools`, lastModified: PAGES_UPDATED, changeFrequency: 'monthly', priority: 0.9 },
    ...TOOL_PAGES.map((t) => ({ url: `${SITE_URL}/${t}`, lastModified: PAGES_UPDATED, changeFrequency: 'monthly' as const, priority: 0.85 })),
    { url: `${SITE_URL}/contact`, lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/about`, lastModified: PAGES_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/tutorials`, lastModified: PAGES_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/free-design-tools`, lastModified: PAGES_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    ...ALL_LANDINGS().filter((l) => !hidden.has(l.slug) && !seen.has(l.slug) && seen.add(l.slug)).map((l) => ({ url: `${SITE_URL}/${l.slug}`, lastModified: PAGES_UPDATED, changeFrequency: 'weekly' as const, priority: l.seasonal ? 0.8 : 0.9 })),
  ];
  (await getPublishedSeoPages()).filter((p) => !seen.has(p.slug) && !hidden.has(p.slug)).forEach((p) => pages.push({ url: `${SITE_URL}/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly', priority: 0.85 }));
  (await loadCourses(createAnonSupabaseClient()).catch(() => [])).forEach((c) => {
    pages.push({ url: `${SITE_URL}/tutorials/${c.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
    c.lessons.forEach((l) => pages.push({ url: `${SITE_URL}/tutorials/${c.slug}/${l.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 }));
  });
  pages.push({ url: `${SITE_URL}/showcase`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  (await getActivePosts()).forEach((p) => pages.push({ url: `${SITE_URL}/showcase/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly', priority: 0.85 }));
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
  // Sub-category pages (Wedding → Invitation, Business → Business Card, …).
  (await getSubcategories().catch(() => [])).filter((s) => s.count >= 4).forEach((s) => pages.push({ url: `${SITE_URL}/templates/category/${s.parentSlug}/${s.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 }));
  // Hashtag pages with enough templates to be useful.
  const tagCount = new Map<string, number>();
  templates.forEach((t) => (t.hashtags || []).forEach((h) => tagCount.set(h, (tagCount.get(h) || 0) + 1)));
  // Only strong tag pages (12+ templates, top 600) — thin tag pages stay out.
  [...tagCount.entries()].filter(([h, n]) => n >= 12 && /^[a-z0-9]{3,30}$/.test(h)).sort((a, b) => b[1] - a[1]).slice(0, 600)
    .forEach(([h]) => pages.push({ url: `${SITE_URL}/templates/tag/${h}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 }));
  return pages;
}
