import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';
import { runLandingCheck } from '@/lib/landingCheck';
import { ALL_LANDINGS } from '@/lib/landings';

// Admin → SEO → Page health.
//  GET                                  statuses, settings, last run
//  POST { action: 'check' }             check every page now (and clean up if on)
//  POST { action: 'settings', on, days } auto-cleanup on/off and monitoring days
//  POST { action: 'remove', slug, del }  switch a page off (or delete it) by hand
//  POST { action: 'restore', slug }     bring a removed page back
export const runtime = 'nodejs';
export const maxDuration = 120;
export const preferredRegion = 'bom1';

/** Deletes the Admin copy (seo_pages row) of every page marked deleted — run with the admin's session. */
async function purge(supabase: any, rows: any[]) {
  const slugs = rows.filter((s) => s.deleted_at).map((s) => s.slug);
  if (slugs.length) await supabase.from('seo_pages').delete().in('slug', slugs);
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const [{ data, error }, { data: log }] = await Promise.all([
      supabase.rpc('landing_data'),
      supabase.from('site_settings').select('value').eq('key', 'landing_lifecycle_log').maybeSingle(),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const names = new Map(ALL_LANDINGS().map((l) => [l.slug, l.h1]));
    let last = null;
    try { last = log?.value ? JSON.parse(log.value) : null; } catch {}
    const raw = ((data as any).status || []) as any[];
    await purge(supabase, raw);
    const status = raw.map((s: any) => ({ ...s, status: s.deleted_at ? 'deleted' : s.status, h1: names.get(s.slug) || s.snapshot?.h1 || s.slug.replace(/-/g, ' ') }));
    return NextResponse.json({ status, settings: (data as any).settings, googleSince: (data as any).google_since, last });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not load' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin(request);
    const b = await request.json().catch(() => ({}));
    const slug = typeof b?.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug) ? b.slug : null;
    if (b?.action === 'check') {
      const r = await runLandingCheck(supabase, null, true);
      const { data } = await supabase.rpc('landing_data');
      await purge(supabase, (data as any)?.status || []);
      return NextResponse.json(r);
    }
    if (b?.action === 'settings') {
      const value = JSON.stringify({ on: !!b.on, days: Math.max(7, Math.min(90, Number(b.days) || 14)) });
      const { error } = await supabase.from('site_settings').upsert({ key: 'landing_lifecycle', value, updated_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (b?.action === 'remove' && slug) {
      const kind = ALL_LANDINGS().some((l) => l.slug === slug) ? 'builtin' : 'custom';
      const { data, error } = await supabase.rpc('landing_apply', { p_token: null, p_rows: [], p_remove: [{ slug, kind, reason: b.del ? 'Deleted by an admin' : 'Switched off by an admin', delete: !!b.del }], p_summary: null });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (b.del) await supabase.from('seo_pages').delete().eq('slug', slug);
      return NextResponse.json(data);
    }
    if (b?.action === 'restore' && slug) {
      const { data, error } = await supabase.rpc('landing_restore', { p_slug: slug });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: (err as any)?.message || 'Failed' }, { status: 500 });
  }
}
