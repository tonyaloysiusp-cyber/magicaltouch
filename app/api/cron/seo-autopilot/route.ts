import { NextRequest, NextResponse } from 'next/server';
import { createAnonSupabaseClient } from '@/lib/supabase/server';
import { searchTemplates, SITE_URL } from '@/lib/seo';
import { analyze, autopilotActions, PerfData } from '@/lib/seoPerformance';
import { submitIndexNow } from '@/lib/indexnow';

// POST /api/cron/seo-autopilot — called every Monday morning by the
// database's scheduler (pg_cron + pg_net, migration 0032) with the private
// cron token, which the database checks. Does nothing unless an admin has
// switched the autopilot on in Admin → SEO → Performance. When on, it:
//  · publishes up to 3 new landing pages for strong demand (8+ templates)
//  · switches off landing pages that show no templates (reversible)
//  · sends new and in-season pages to Bing / IndexNow
//  · posts a summary to the admin inbox (it goes out in the daily e-mail)
export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'bom1';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-cron-token') || '';
  if (!token) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc('seo_perf_data', { p_token: token });
  if (error || !data) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  if ((data as PerfData).autopilot !== 'on') return NextResponse.json({ skipped: 'autopilot is off' });
  const a = await analyze(data as PerfData, async (t) => (await searchTemplates(t, 60)).length);
  const { actions, summary, newSlugs } = autopilotActions(a);
  const { data: res, error: e2 } = await supabase.rpc('seo_apply', { p_token: token, p_actions: actions, p_summary: summary });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  const urgent = a.update.filter((u) => u.urgent).map((u) => u.slug);
  const sent = newSlugs.length || urgent.length ? await submitIndexNow([...newSlugs, ...urgent].map((s) => `${SITE_URL}/${s}`)).catch(() => null) : null;
  return NextResponse.json({ ...(res as object), sent: sent?.submitted || 0 });
}
