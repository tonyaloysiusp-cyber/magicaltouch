import { NextRequest, NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { runLandingCheck } from '@/lib/landingCheck';

// POST /api/cron/landing-check — every morning (pg_cron, migration 0033) with
// the private cron token, which the database checks. Checks every live
// landing page, records Working / Warming up / Not working, and removes
// not-working pages when auto-cleanup is on (Admin → SEO → Page health).
export const runtime = 'nodejs';
export const maxDuration = 120;
export const preferredRegion = 'bom1';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token') || '';
  if (!token) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  try {
    return NextResponse.json(await runLandingCheck(createAnonSupabaseClient(), token, true));
  } catch (e: any) {
    return NextResponse.json({ error: /not allowed/i.test(e?.message) ? 'Not allowed' : 'Check failed' }, { status: /not allowed/i.test(e?.message) ? 401 : 500 });
  }
}
