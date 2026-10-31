import { NextRequest, NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { runLandingCheck } from '@/lib/landingCheck';
import { submitIndexNow } from '@/lib/indexnow';

// POST /api/cron/landing-check — every morning (pg_cron, migration 0033) with
// the private cron token, which the database checks. Checks every live
// landing page, records Working / Warming up / Not working, and removes
// not-working pages when auto-cleanup is on (Admin → SEO → Page health).
// Weekly it also sends every page to search engines (IndexNow).
export const runtime = 'nodejs';
export const maxDuration = 120;
export const preferredRegion = 'bom1';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token') || '';
  if (!token) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  try {
    const supabase = createAnonSupabaseClient();
    const result = await runLandingCheck(supabase, token, true);
    // Once a week, send every page to Bing / IndexNow automatically.
    let indexnow: number | null = null;
    const { data: last } = await supabase.from('site_settings').select('value').eq('key', 'indexnow_last').maybeSingle();
    const age = last?.value ? Date.now() - new Date(last.value).getTime() : Infinity;
    if (!(age < 6.5 * 86400000)) {
      const r = await submitIndexNow().catch(() => null);
      if (r?.results.some((x) => x.ok)) { await supabase.rpc('cron_mark_indexnow', { p_token: token }); indexnow = r.submitted; }
    }
    return NextResponse.json({ ...result, indexnow });
  } catch (e: any) {
    return NextResponse.json({ error: /not allowed/i.test(e?.message) ? 'Not allowed' : 'Check failed' }, { status: /not allowed/i.test(e?.message) ? 401 : 500 });
  }
}
