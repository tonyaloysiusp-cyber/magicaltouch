import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';

// GET /api/projects -- list the CALLER'S OWN designs only, metadata
// only (never canvas_json: the dashboard must not load full design
// documents just to render a grid of cards). `.eq('user_id', user.id)`
// is an explicit app-level ownership filter, not just reliance on RLS.
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser(request);

    let { data, error } = await supabase
      .from('designs')
      .select('id, name, width, height, updated_at, thumbnail, editor_type')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      // thumbnail and/or editor_type columns may not exist yet on a DB
      // that predates those migrations -- retry with progressively
      // narrower selects rather than failing the whole list.
      const retryWithThumbOnly = await supabase
        .from('designs')
        .select('id, name, width, height, updated_at, thumbnail')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!retryWithThumbOnly.error) {
        data = (retryWithThumbOnly.data || []).map((d: any) => ({ ...d, editor_type: 'design' }));
        error = null;
      } else {
        const retryMinimal = await supabase
          .from('designs')
          .select('id, name, width, height, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        if (!retryMinimal.error) {
          data = (retryMinimal.data || []).map((d: any) => ({ ...d, thumbnail: null, editor_type: 'design' }));
          error = null;
        } else {
          error = retryMinimal.error;
        }
      }
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('GET /api/projects failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/projects -- create a new design owned by the caller.
// user_id is always forced to the authenticated caller server-side,
// regardless of anything the request body claims.
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    const insertPayload: Record<string, any> = {
      user_id: user.id,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled',
      width: Number.isFinite(body.width) ? body.width : 800,
      height: Number.isFinite(body.height) ? body.height : 600,
      canvas_json: body.canvas_json ?? null,
      thumbnail: body.thumbnail ?? null,
      editor_type: body.editor_type === 'photo-studio' ? 'photo-studio' : 'design',
      // Explicit, not relied on as a DB default/trigger -- matches the
      // PATCH and duplicate routes, and the client code this replaces.
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('designs')
      .insert(insertPayload)
      .select('id, name, width, height, updated_at, thumbnail, editor_type')
      .single();

    if (error?.message?.includes('editor_type')) {
      const { editor_type, ...withoutEditorType } = insertPayload;
      const retry = await supabase
        .from('designs')
        .insert(withoutEditorType)
        .select('id, name, width, height, updated_at, thumbnail')
        .single();
      if (!retry.error && retry.data) {
        data = { ...retry.data, editor_type: 'design' } as any;
        error = null;
      } else {
        error = retry.error;
      }
    }

    if (error || !data) return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/projects failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
