import { NextRequest, NextResponse } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';
import { certificateRejectedEmail, certificateReleasedEmail, certificateRequestedEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { firstNameFor } from '@/lib/email/firstName';
import { companyProfile as C } from '@/lib/email/config';
import { verifyUrl } from '@/lib/certificates';

export const runtime = 'nodejs';

// POST /api/courses/notify { progressId, event }
//   requested — the learner themself, right after asking for a certificate
//   released / rejected — administrators only, after deciding
// The email goes to the learner's own account address, and only says what
// the row in the database already says (the database decides the status).
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const progressId = typeof body.progressId === 'string' ? body.progressId : '';
    const event = body.event as 'requested' | 'released' | 'rejected';
    if (!/^[0-9a-f-]{36}$/i.test(progressId) || !['requested', 'released', 'rejected'].includes(event)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // RLS: learners can read only their own row, admins any row.
    const { data: row } = await supabase
      .from('course_progress')
      .select('id, user_id, status, learner_name, review_note, certificate_code, requested_at, released_at, courses(title, slug)')
      .eq('id', progressId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const course = (row as any).courses as { title: string; slug: string };
    const courseUrl = `${C.website}/tutorials/${course.slug}`;

    let to: string | null = null;
    let profileName: string | null = null;
    if (event === 'requested') {
      if (row.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      // Only just after the request was made — no resending on demand.
      if (row.status !== 'pending' || !row.requested_at || Date.now() - new Date(row.requested_at).getTime() > 10 * 60 * 1000) {
        return NextResponse.json({ sent: false, reason: 'not-pending' });
      }
      to = user.email || null;
      const { data: prof } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
      profileName = (prof as any)?.name || null;
    } else {
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!(me as any)?.is_admin) return NextResponse.json({ error: 'Administrators only' }, { status: 403 });
      if (event === 'released' && !(row.status === 'approved' && row.released_at)) return NextResponse.json({ sent: false, reason: 'not-released' });
      if (event === 'rejected' && row.status !== 'rejected') return NextResponse.json({ sent: false, reason: 'not-rejected' });
      const { data: users } = await supabase.rpc('admin_list_users', { p_search: null });
      const u = ((users as any[]) || []).find((x) => x.user_id === row.user_id);
      to = u?.email || null;
      profileName = u?.name || null;
    }
    if (!to) return NextResponse.json({ sent: false, reason: 'no-email' });

    const data = {
      firstName: firstNameFor(row.learner_name || profileName, to),
      courseTitle: course.title,
      courseUrl,
      certificateName: row.learner_name,
      certificateCode: row.certificate_code,
      verifyUrl: row.certificate_code ? verifyUrl(row.certificate_code) : null,
      reason: row.review_note,
    };
    const email = event === 'requested' ? certificateRequestedEmail(data) : event === 'released' ? certificateReleasedEmail(data) : certificateRejectedEmail(data);
    try {
      await sendEmail(to, email);
    } catch (e) {
      console.error('Course email failed:', e);
      return NextResponse.json({ sent: false, reason: 'send-failed' });
    }
    return NextResponse.json({ sent: true });
  } catch (e) {
    if (e instanceof ApiAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
