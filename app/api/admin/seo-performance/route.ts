import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { searchTemplates, SITE_URL } from '@/lib/seo';
import { analyze, autopilotActions, PerfData } from '@/lib/seoPerformance';
import { submitIndexNow } from '@/lib/indexnow';

// Admin → SEO → Performance.
//  GET  — what works, what's rising, what to add / update / switch off
//  POST { action: 'apply' }          — do the safe fixes now (same as the autopilot)
//  POST { action: 'autopilot', on }  — switch the weekly autopilot on or off
export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'bom1';

const count = async (terms: string[]) => (await searchTemplates(terms, 60)).length;

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const { data, error } = await supabase.rpc('seo_perf_data');
    if (error || !data) return NextResponse.json({ error: error?.message || 'No data' }, { status: 500 });
    return NextResponse.json(await analyze(data as PerfData, count));
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not analyse performance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'autopilot') {
      const { error } = await supabase.from('site_settings').upsert({ key: 'seo_autopilot', value: body.on ? 'on' : 'off', updated_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ on: !!body.on });
    }
    if (body?.action !== 'apply') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const { data } = await supabase.rpc('seo_perf_data');
    const a = await analyze(data as PerfData, count);
    const { actions, summary, newSlugs } = autopilotActions(a);
    const { data: res, error } = await supabase.rpc('seo_apply', { p_token: null, p_actions: actions, p_summary: summary });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const urgent = a.update.filter((u) => u.urgent).map((u) => u.slug);
    const sent = newSlugs.length || urgent.length ? await submitIndexNow([...newSlugs, ...urgent].map((s) => `${SITE_URL}/${s}`)).catch(() => null) : null;
    return NextResponse.json({ ...(res as object), summary, sent: sent?.submitted || 0 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not apply' }, { status: 500 });
  }
}
