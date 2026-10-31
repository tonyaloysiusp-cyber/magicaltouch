import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/admin';
import { COUNT_TAG } from '@/lib/templateCountServer';

// POST /api/count-refresh — makes every page show the new template count at
// once. Called by the database whenever templates are added, published,
// unpublished or deleted (trigger in migration 0039, with the private cron
// token), and by "Refresh now" in Admin → Templates (admin session).
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token');
  let ok = false;
  if (token) {
    // The database checks the token (the same check every cron route uses).
    const { error } = await createAnonSupabaseClient().rpc('landing_data', { p_token: token });
    ok = !error;
  } else {
    try { await requireAdmin(request); ok = true; } catch { ok = false; }
  }
  if (!ok) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  revalidateTag(COUNT_TAG);
  revalidatePath('/', 'layout');
  revalidatePath('/api/public-templates');
  revalidatePath('/api/og');
  return NextResponse.json({ refreshed: true, at: new Date().toISOString() });
}
