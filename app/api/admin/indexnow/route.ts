import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { submitIndexNow } from '@/lib/indexnow';

// Admin → SEO & promotion → "Send to search engines": submits every URL in
// the sitemap (or a given list) to Bing, Yandex and the shared IndexNow
// endpoint, which then shares them with other participating engines.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const r = await submitIndexNow(Array.isArray(body?.urls) ? body.urls : undefined);
    if (r.results.some((x) => x.ok)) await supabase.rpc('cron_mark_indexnow', { p_token: null });
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not submit' }, { status: 500 });
  }
}
