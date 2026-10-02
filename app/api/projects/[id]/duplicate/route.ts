import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';

// POST /api/projects/:id/duplicate -- clone an owned design into a new
// row. Fixes a real bug in the previous client-side implementation:
// that code never selected or carried over `editor_type`, so
// duplicating a Photo Studio design silently produced a copy that
// reopened in Main Design instead.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser(request);

    let { data: source, error: fetchError } = await supabase
      .from('designs')
      .select('name, canvas_json, width, height, thumbnail, editor_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError?.message?.includes('editor_type')) {
      const retry = await supabase
        .from('designs')
        .select('name, canvas_json, width, height, thumbnail')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();
      if (!retry.error && retry.data) {
        source = { ...retry.data, editor_type: 'design' } as any;
        fetchError = null;
      } else {
        fetchError = retry.error;
      }
    }

    if (fetchError || !source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const insertPayload: Record<string, any> = {
      user_id: user.id,
      name: `${source.name} copy`,
      canvas_json: source.canvas_json,
      width: source.width,
      height: source.height,
      thumbnail: source.thumbnail,
      editor_type: source.editor_type || 'design',
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

    if (error || !data) return NextResponse.json({ error: error?.message || 'Duplicate failed' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/projects/[id]/duplicate failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
