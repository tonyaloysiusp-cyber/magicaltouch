import { NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { allPages } from '@/lib/allPages';

// The public template gallery list (no designs inside), built once and
// served from Vercel's cache for 5 minutes: every visitor gets it from a
// server close to them instead of each browser querying the database.
//
// Compact format (8,000+ templates): { v: 2, cols, rows } — each row is an
// array in `cols` order (no repeated field names), fields that are the
// same for every published template are left out, and picture paths are
// shortened ("~" = /templates/collection/, preview 1 = thumbnail with
// "-preview" before the extension). lib/templatesData.ts expands it.
export const revalidate = 300;

const SELECT =
  'id, name, category, width, height, color1, color2, sort_order, thumbnail, slug, description, category_id, tags, is_featured, is_free, preview, published_at, orientation, occasion, industry, search_keywords, hashtags';
const COLS = ['id', 'name', 'category', 'width', 'height', 'color1', 'color2', 'sort_order', 'thumbnail', 'slug', 'description', 'category_id', 'tags', 'is_featured', 'is_free', 'preview', 'published_at', 'orientation', 'occasion', 'industry', 'search_keywords', 'hashtags'] as const;
const DIR = '/templates/collection/';

function shortThumb(t: string | null) {
  return t && t.startsWith(DIR) ? `~${t.slice(DIR.length)}` : t;
}
function shortPreview(thumb: string | null, preview: string | null) {
  if (!preview) return null;
  if (thumb) {
    const i = thumb.lastIndexOf('.');
    if (i > 0 && preview === `${thumb.slice(0, i)}-preview${thumb.slice(i)}`) return 1;
  }
  return shortThumb(preview);
}

export async function GET() {
  const sb = createAnonSupabaseClient();
  // Every published template (the database returns 1,000 rows per request).
  const { data, error } = await allPages<any>((from, to) =>
    sb
      .from('templates')
      .select(SELECT)
      .eq('status', 'published')
      .not('canvas_json', 'is', null)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('id')
      .range(from, to),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  const rows = (data || []).map((r: any) =>
    COLS.map((c) => {
      if (c === 'thumbnail') return shortThumb(r.thumbnail);
      if (c === 'preview') return shortPreview(r.thumbnail, r.preview);
      if (c === 'tags') return r.tags && r.tags.length ? r.tags : null;
      if (c === 'is_featured' || c === 'is_free') return r[c] ? 1 : 0;
      return r[c] ?? null;
    }),
  );
  return NextResponse.json({ v: 2, cols: COLS, rows }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
