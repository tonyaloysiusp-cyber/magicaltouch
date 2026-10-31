import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { submitIndexNow } from '@/lib/indexnow';
import { SITE_URL } from '@/lib/seo';
import { POSTS_TAG } from '@/lib/sitePosts';

// POST /api/admin/site-posts { slug, status } — after a Google post is saved
// in Admin: refresh its page, the showcase and the sitemaps, and (when it is
// active) send the page to Bing / IndexNow so it is picked up in days.
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const b = await request.json().catch(() => ({}));
    const slug = typeof b?.slug === 'string' && /^[a-z0-9-]+$/.test(b.slug) ? b.slug : null;
    revalidateTag(POSTS_TAG);
    revalidatePath('/showcase');
    if (slug) revalidatePath(`/showcase/${slug}`);
    revalidatePath('/sitemap.xml');
    revalidatePath('/image-sitemap.xml');
    let sent = 0;
    if (slug && b.status === 'active') {
      const r = await submitIndexNow([`${SITE_URL}/showcase/${slug}`, `${SITE_URL}/showcase`]).catch(() => null);
      sent = r?.submitted || 0;
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not refresh' }, { status: 500 });
  }
}
