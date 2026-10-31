// Posts on Google (/showcase): read on the server with the public key —
// only active posts are visible to it (RLS). A post made from an editable
// design always shows that design's latest picture.

import { SITE_URL } from '@/lib/seo';

export interface SitePost {
  id: string; slug: string; kind: 'image' | 'video'; title: string; description: string; hashtags: string[];
  template_id: string | null; image_url: string | null; video_url: string | null; link: string | null;
  status: string; sort: number; published_at: string | null; updated_at: string;
  width?: number | null; height?: number | null;
}

export const POSTS_TAG = 'site-posts';
async function rpc<T>(slug: string | null): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    // public_site_posts (migration 0041) resolves each post's picture.
    const r = await fetch(`${url}/rest/v1/rpc/public_site_posts`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }), next: { revalidate: 600, tags: [POSTS_TAG] } } as RequestInit);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export const abs = (u?: string | null) => (!u ? null : u.startsWith('http') ? u : `${SITE_URL}${u}`);
/** The post's picture: its design's latest preview, or the image address. */
export const postImage = (p: SitePost) => abs(p.image_url);
export const hashtagText = (tags: string[]) => tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ');

export async function getActivePosts(): Promise<SitePost[]> {
  return (await rpc<SitePost[]>(null)) || [];
}
export async function getPost(slug: string): Promise<SitePost | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const rows = await rpc<SitePost[]>(slug);
  return rows?.[0] || null;
}
