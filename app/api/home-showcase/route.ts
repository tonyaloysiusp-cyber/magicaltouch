import { NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { allPages } from '@/lib/allPages';

// The home page's "Template showcase" needs only counts and the first few
// templates of each category — not the whole 8,000+ list. Built here once
// (cached 5 minutes at Vercel) so the home page downloads ~1/20 of the data.
// Same compact row format as /api/public-templates (lib/templatesData expandList).
export const revalidate = 300;

const SELECT = 'id, name, category, width, height, color1, color2, sort_order, thumbnail, slug, category_id, is_featured, preview, orientation';
const COLS = ['id', 'name', 'category', 'width', 'height', 'color1', 'color2', 'sort_order', 'thumbnail', 'slug', 'category_id', 'is_featured', 'preview', 'orientation'] as const;
const DIR = '/templates/collection/';
const PER = 15;

const short = (t: string | null) => (t && t.startsWith(DIR) ? `~${t.slice(DIR.length)}` : t);

export async function GET() {
  const sb = createAnonSupabaseClient();
  const { data, error } = await allPages<any>((from, to) =>
    sb
      .from('templates')
      .select(SELECT)
      .eq('status', 'published')
      .not('canvas_json', 'is', null)
      .not('thumbnail', 'is', null)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id')
      .range(from, to),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const all = data || [];
  const counts: Record<string, number> = {};
  const keep: any[] = [];
  const shown: Record<string, number> = {};
  all.forEach((r: any, i: number) => {
    const k = r.category_id || r.category || '';
    counts[k] = (counts[k] || 0) + 1;
    if (i < 24 || (shown[k] || 0) < PER) {
      shown[k] = (shown[k] || 0) + 1;
      keep.push(r);
    }
  });
  const rows = keep.map((r) =>
    COLS.map((c) => {
      if (c === 'thumbnail' || c === 'preview') return short(r[c]);
      if (c === 'is_featured') return r[c] ? 1 : 0;
      return r[c] ?? null;
    }),
  );
  return NextResponse.json({ v: 2, cols: COLS, rows, counts, total: all.length }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
