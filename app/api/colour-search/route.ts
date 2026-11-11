import { NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { allPages } from '@/lib/allPages';
import { deltaE, normHex } from '@/lib/colour';

// Templates whose main colours are closest to the colours asked for
// (perceptual distance, CIE Lab). The small colour index is kept in memory
// for ten minutes, so each search costs no database work.
export const dynamic = 'force-dynamic';

type Row = { slug: string; name: string; thumbnail: string | null; color1: string | null; color2: string | null; width: number; height: number };
let cache: { at: number; rows: Row[] } | null = null;

async function index(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.rows;
  const sb = createAnonSupabaseClient();
  const { data } = await allPages<Row>((from, to) =>
    sb.from('templates').select('slug, name, thumbnail, color1, color2, width, height').eq('status', 'published').not('thumbnail', 'is', null).order('id').range(from, to),
  );
  const rows = (data || []).filter((r) => normHex(r.color1 || '') || normHex(r.color2 || ''));
  cache = { at: Date.now(), rows };
  return rows;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const want = u.searchParams.getAll('hex').map((h) => normHex(h)).filter(Boolean).slice(0, 3) as string[];
  if (!want.length) return NextResponse.json({ error: 'Add ?hex=RRGGBB' }, { status: 400 });
  const limit = Math.min(48, Math.max(1, Number(u.searchParams.get('limit')) || 24));
  const rows = await index();
  const scored = rows.map((r) => {
    const have = [normHex(r.color1 || ''), normHex(r.color2 || '')].filter(Boolean) as string[];
    // Each wanted colour finds its best match; the score is the average.
    const s = want.reduce((sum, w) => sum + Math.min(...have.map((h) => deltaE(w, h))), 0) / want.length;
    return { r, s };
  });
  scored.sort((a, b) => a.s - b.s);
  const out = scored.slice(0, limit).map(({ r, s }) => ({ slug: r.slug, name: r.name, thumbnail: r.thumbnail, colors: [r.color1, r.color2].filter(Boolean), w: r.width, h: r.height, distance: Math.round(s) }));
  return NextResponse.json({ colors: want, templates: out }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
