import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/seo';
import { getTemplateCountLabel } from '@/lib/templateCountServer';
import { parseShareImage } from '@/lib/shareImage';

// GET /api/og — the site's share image (1200 × 630) in the Magical Touch
// brand: Poppins, the logo, the logo's spectrum, pastel washes (light) or
// black with a spectrum bar and glow (dark). Wording, theme and templates
// come from Admin → SEO → Social → "Share image"; {count} is the live count.
export const runtime = 'nodejs';
export const revalidate = 600;

const SPECTRUM = 'linear-gradient(90deg, #F2708F 0%, #A69BD3 22%, #35C2F1 45%, #5DCCB8 64%, #8CC84B 82%, #DDE23B 100%)';
const SPEC_TEXT = 'linear-gradient(90deg, #EC5F84 0%, #8E7FD0 30%, #1FAEE6 58%, #33B79C 80%, #6DB33A 100%)';

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

async function font(weight: number): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(`${SITE_URL}/api/font-file?family=Poppins&weight=${weight}`, { next: { revalidate: 86400 } } as RequestInit);
    return r.ok ? await r.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const absUrl = (u: string) => (u.startsWith('http') ? u : `${SITE_URL}${u}`);

export async function GET() {
  const [setting, label, f400, f600, f700] = await Promise.all([rest<{ value: string }[]>('site_settings?select=value&key=eq.share_image'), getTemplateCountLabel(), font(400), font(600), font(700)]);
  const s = parseShareImage(setting?.[0]?.value);
  const dark = s.theme === 'dark';
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
  const ink = dark ? '#FFFFFF' : '#09090B';
  const fonts = [f400 && { name: 'Poppins', data: f400, weight: 400 as const }, f600 && { name: 'Poppins', data: f600, weight: 600 as const }, f700 && { name: 'Poppins', data: f700, weight: 700 as const }].filter(Boolean) as any[];
  const spots = [[20, 30, -5], [255, 60, 5], [40, 330, 4], [270, 350, -4]];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Poppins', background: dark ? '#09090B' : '#FFFFFF' }}>
        {dark ? (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'radial-gradient(circle at 100% 60%, rgba(31,174,230,0.32), rgba(31,174,230,0) 55%), radial-gradient(circle at 0% 100%, rgba(124,58,237,0.38), rgba(124,58,237,0) 55%)' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 8, display: 'flex', backgroundImage: SPECTRUM }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(243,166,184,0.55), rgba(243,166,184,0) 60%), radial-gradient(circle at 100% 0%, rgba(140,203,255,0.55), rgba(140,203,255,0) 55%), radial-gradient(circle at 50% 110%, rgba(191,232,200,0.6), rgba(191,232,200,0) 60%)' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 60px', width: 640 }}>
          <img src={`${SITE_URL}${dark ? '/logo-white.png' : '/logo.png'}`} width={330} height={47} />
          <div style={{ fontSize: 64, fontWeight: 700, color: ink, marginTop: 30, lineHeight: 1.05, letterSpacing: -1 }}>{s.headline}</div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, backgroundImage: SPEC_TEXT, backgroundClip: 'text', color: 'transparent' }}>{s.highlight}</div>
          <div style={{ fontSize: 25, fontWeight: 400, color: dark ? 'rgba(255,255,255,0.8)' : '#52525B', marginTop: 22, lineHeight: 1.4, maxWidth: 560 }}>{sub}</div>
          <div style={{ width: 520, height: 6, borderRadius: 6, marginTop: 28, display: 'flex', backgroundImage: SPECTRUM }} />
          <div style={{ fontSize: 24, fontWeight: 600, color: ink, marginTop: 18 }}>{s.website}</div>
        </div>
        <div style={{ display: 'flex', position: 'relative', width: 560, height: 630 }}>
          {pics.map((src, i) => (
            <img key={src} src={src} width={230} height={280} style={{ position: 'absolute', left: spots[i][0], top: spots[i][1], objectFit: 'cover', borderRadius: 14, transform: `rotate(${spots[i][2]}deg)`, boxShadow: '0 18px 40px rgba(0,0,0,0.22)', border: '7px solid #FFFFFF' }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined, headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' } },
  );
}
