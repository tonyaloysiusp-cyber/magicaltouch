import { NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { allPages } from '@/lib/allPages';

// The public template gallery list (no designs inside), built once and
// served from Vercel's cache for 5 minutes: every visitor gets it from a
// server close to them instead of each browser querying the database.
export const revalidate = 300;

const COLS =
  'id, name, category, width, height, color1, color2, sort_order, thumbnail, rights_status, slug, description, category_id, tags, status, is_featured, is_free, unit, dpi, color_mode, preview, current_version, published_at, orientation, occasion, industry, language, search_keywords';

export async function GET() {
  const sb = createAnonSupabaseClient();
  // Every published template (the database returns 1,000 rows per request).
  const { data, error } = await allPages<any>((from, to) =>
    sb
      .from('templates')
      .select(COLS)
      .eq('status', 'published')
      .not('canvas_json', 'is', null)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id')
      .range(from, to),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
