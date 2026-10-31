import { SITE_URL, getAllPublishedTemplates } from '@/lib/seo';
import { getActivePosts, postImage, abs } from '@/lib/sitePosts';

// Google Images sitemap: every template page with its preview image, so
// template pictures can show up (and link back) in image search.
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const [rows, posts] = await Promise.all([getAllPublishedTemplates(), getActivePosts()]);
  // Google posts first (posters with an image, videos with video details).
  const postXml = posts.map((p) => {
    const img = postImage(p);
    const url = `${SITE_URL}/showcase/${esc(p.slug)}`;
    if (p.kind === 'video' && p.video_url && img)
      return `<url><loc>${url}</loc><video:video><video:thumbnail_loc>${esc(img)}</video:thumbnail_loc><video:title>${esc(p.title)}</video:title><video:description>${esc(p.description.slice(0, 2000))}</video:description><video:content_loc>${esc(abs(p.video_url) as string)}</video:content_loc>${p.hashtags.slice(0, 32).map((h) => `<video:tag>${esc(h)}</video:tag>`).join('')}</video:video></url>`;
    return img ? `<url><loc>${url}</loc><image:image><image:loc>${esc(img)}</image:loc></image:image></url>` : '';
  }).filter(Boolean);
  const body = postXml.join('\n') + '\n' + rows
    .filter((t) => t.preview || t.thumbnail)
    .map((t) => {
      const img = (t.preview || t.thumbnail) as string;
      const abs = img.startsWith('http') ? img : `${SITE_URL}${img}`;
      return `<url><loc>${SITE_URL}/templates/${esc(t.slug)}</loc><image:image><image:loc>${esc(abs)}</image:loc></image:image></url>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
