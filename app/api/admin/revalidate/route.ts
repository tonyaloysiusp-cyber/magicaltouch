// Admin → Site health → "Refresh the site now": rebuilds every cached page
// (home, templates, landing pages, sitemap) on its next visit, so changes
// show at once instead of within the hour.

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser, ApiAuthError } from '@/lib/api/auth';

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser(req);
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!data?.is_admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof ApiAuthError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
