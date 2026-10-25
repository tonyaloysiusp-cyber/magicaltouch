import { SITE_URL, getAllPublishedTemplates } from '@/lib/seo';

// Google Images sitemap: every template page with its preview image, so
// template pictures can show up (and link back) in image search.
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const rows = await getAllPublishedTemplates();
  const body = rows
    .filter((t) => t.preview || t.thumbnail)
    .map((t) => {
      const img = (t.preview || t.thumbnail) as string;
      const abs = img.startsWith('http') ? img : `${SITE_URL}${img}`;
      return `<url><loc>${SITE_URL}/templates/${esc(t.slug)}</loc><image:image><image:loc>${esc(abs)}</image:loc></image:image></url>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
