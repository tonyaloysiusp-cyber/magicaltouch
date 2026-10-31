import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/seo';
import { getTemplateCountLabel } from '@/lib/templateCountServer';
import { parseShareImage } from '@/lib/shareImage';

// GET /api/og — the site's share image (1200 × 630), drawn live: wording and
// colours from Admin → SEO → Social → "Share image", the live template count,
// and real template previews. Used by every page that has no image of its own.
export const runtime = 'nodejs';
export const revalidate = 600;

async function rest<T>(path: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600, tags: ['template-count'] } } as RequestInit);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

const absUrl = (u: string) => (u.startsWith('http') ? u : `${SITE_URL}${u}`);

export async function GET() {
  const [setting, label] = await Promise.all([rest<{ value: string }[]>('site_settings?select=value&key=eq.share_image'), getTemplateCountLabel()]);
  const s = parseShareImage(setting?.[0]?.value);
  const slugs = s.templates.length ? s.templates : null;
  const rows = await rest<{ slug: string; preview: string | null; thumbnail: string | null }[]>(
    slugs
      ? `templates?select=slug,preview,thumbnail&status=eq.published&slug=in.(${slugs.join(',')})`
      : 'templates?select=slug,preview,thumbnail&status=eq.published&is_featured=eq.true&width=eq.1080&height=eq.1350&order=sort_order.asc&limit=4',
  );
  const pics = (rows || [])
    .sort((a, b) => (slugs ? slugs.indexOf(a.slug) - slugs.indexOf(b.slug) : 0))
    .map((r) => r.preview || r.thumbnail)
    .filter(Boolean)
    .slice(0, 4)
    .map((u) => absUrl(u as string));
  const sub = s.sub.replace(/\{count\}/g, label);
  const tilt = [-6, 4, -3, 6];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: s.bg, fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 420, background: s.accent, opacity: 0.12, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 64px', width: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={`${SITE_URL}/brand/profile-picture.png`} width={52} height={52} style={{ borderRadius: 52 }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1F1A2E', letterSpacing: 1 }}>{s.kicker}</div>
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, color: '#14111F', marginTop: 34, lineHeight: 1.05 }}>{s.headline}</div>
          <div style={{ fontSize: 66, fontWeight: 800, color: s.accent, lineHeight: 1.1 }}>{s.highlight}</div>
          <div style={{ fontSize: 26, color: '#4B4660', marginTop: 26, lineHeight: 1.4, maxWidth: 540 }}>{sub}</div>
          <div style={{ display: 'flex', marginTop: 34 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', background: s.accent, padding: '12px 24px', borderRadius: 40 }}>{s.website}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 520, alignContent: 'center', justifyContent: 'center', gap: 18, paddingRight: 30 }}>
          {pics.map((src, i) => (
            <img key={src} src={src} width={210} height={262} style={{ objectFit: 'cover', borderRadius: 18, transform: `rotate(${tilt[i]}deg)`, boxShadow: '0 18px 40px rgba(0,0,0,0.18)', border: '6px solid #FFFFFF' }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' } },
  );
}
