import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';

// GET /api/projects/:id -- the only route that returns the full
// document (canvas_json). The dashboard list route deliberately never
// does (Part 116: load the full document only when the editor opens).
// `.eq('user_id', user.id)` means a request for someone else's design
// id returns zero rows -- a clean 404, not a 403 that would confirm
// the id exists at all.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser(request);
    const { data, error } = await supabase
      .from('designs')
      .select('id, name, width, height, updated_at, thumbnail, editor_type, canvas_json')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('GET /api/projects/[id] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/projects/:id -- rename and/or save (canvas_json/thumbnail/
// dimensions). The ownership filter is part of the UPDATE's own WHERE
// clause, not a separate fetch-then-check step: an update that matches
// zero rows (wrong id, or someone else's design) is indistinguishable
// from "not found," which is what gets returned.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string') patch.name = body.name.trim() || 'Untitled';
    if ('canvas_json' in body) patch.canvas_json = body.canvas_json;
    if ('thumbnail' in body) patch.thumbnail = body.thumbnail;
    if (Number.isFinite(body.width)) patch.width = body.width;
    if (Number.isFinite(body.height)) patch.height = body.height;
    if (body.editor_type === 'photo-studio' || body.editor_type === 'design') patch.editor_type = body.editor_type;

    let { data, error } = await supabase
      .from('designs')
      .update(patch)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, name, width, height, updated_at, thumbnail, editor_type')
      .single();

    if (error && 'thumbnail' in patch && error.message?.includes('thumbnail')) {
      const { thumbnail, ...withoutThumbnail } = patch;
      const retry = await supabase
        .from('designs')
        .update(withoutThumbnail)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select('id, name, width, height, updated_at')
        .single();
      data = retry.data as any;
      error = retry.error;
    }
    if (error && 'editor_type' in patch && error.message?.includes('editor_type')) {
      const { editor_type, ...withoutEditorType } = patch;
      const retry = await supabase
        .from('designs')
        .update(withoutEditorType)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select('id, name, width, height, updated_at, thumbnail')
        .single();
      data = retry.data as any;
      error = retry.error;
    }

    if (error || !data) {
      // PGRST116 = "no rows returned" -- the update matched nothing,
      // which for an .eq('user_id', ...)-scoped query means either a
      // bad id or a design that belongs to someone else. Either way,
      // the caller gets a 404, never a hint that the row exists.
      const status = error?.code === 'PGRST116' ? 404 : error ? 500 : 404;
      return NextResponse.json({ error: error?.message || 'Not found' }, { status });
    }
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('PATCH /api/projects/[id] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/projects/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser(request);
    const { error, count } = await supabase
      .from('designs')
      .delete({ count: 'exact' })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('DELETE /api/projects/[id] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
