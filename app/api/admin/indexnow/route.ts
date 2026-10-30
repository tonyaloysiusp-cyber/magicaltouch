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
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await submitIndexNow(Array.isArray(body?.urls) ? body.urls : undefined));
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not submit' }, { status: 500 });
  }
}
