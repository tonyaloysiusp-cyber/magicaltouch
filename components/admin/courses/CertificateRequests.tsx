'use client';

// Certificate requests (admins only). The database refuses anything out
// of order: approve only pending requests, reject only with a reason,
// release only after approval, and one certificate per learner per course.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Check, Download, ExternalLink, Loader2, RefreshCw, Rocket, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { newCertificateCode, verifyUrl } from '@/lib/certificates';
import { packageCertificates } from '@/lib/certificatesBulk';
import type { CourseProgress } from '@/lib/courses';

interface Row extends CourseProgress {
  courses: { id: string; title: string; slug: string; certificate_title: string; prerequisite_slug: string | null } | null;
}
interface Master { id: string; name: string; tags: string[]; canvas_json: any }
type Filter = 'pending' | 'approved' | 'released' | 'rejected' | 'in_progress';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const filterOf = (r: Row): Filter => (r.status === 'approved' ? (r.released_at ? 'released' : 'approved') : r.status);
const LABEL: Record<Filter, string> = { pending: 'Pending approval', approved: 'Approved · not released', released: 'Released', rejected: 'Rejected', in_progress: 'Learning' };

async function notify(progressId: string, event: 'released' | 'rejected') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const r = await fetch('/api/courses/notify', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ progressId, event }) });
    const j = await r.json().catch(() => ({}));
    return !!j.sent;
  } catch {
    return false;
  }
}

export function CertificateRequests({ onCount }: { onCount?: (n: number) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [lessonIds, setLessonIds] = useState<Record<string, string[]>>({});
  const [emails, setEmails] = useState<Record<string, { email: string; name: string }>>({});
  const [masters, setMasters] = useState<Master[]>([]);
  const [masterId, setMasterId] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    const [{ data: r, error }, { data: ls }, { data: m }, { data: us }] = await Promise.all([
      supabase.from('course_progress').select('*, courses(id, title, slug, certificate_title, prerequisite_slug)').order('updated_at', { ascending: false }).limit(1000),
      supabase.from('course_lessons').select('id, course_id, visible'),
      supabase.from('templates').select('id, name, tags, canvas_json').contains('tags', ['certificate-master']).order('name'),
      supabase.rpc('admin_list_users', { p_search: null }),
    ]);
    if (error) {
      setLoadErr(error.message);
      setRows([]);
      return;
    }
    const map: Record<string, string[]> = {};
    ((ls as any[]) || []).forEach((l) => { if (l.visible) (map[l.course_id] ||= []).push(l.id); });
    setLessonIds(map);
    const em: Record<string, { email: string; name: string }> = {};
    ((us as any[]) || []).forEach((u) => (em[u.user_id] = { email: u.email, name: u.name }));
    setEmails(em);
    setRows((r as Row[]) || []);
    onCount?.(((r as Row[]) || []).filter((x) => x.status === 'pending').length);
    const ms = ((m as Master[]) || []).sort((a, b) => Number((b.tags || []).includes('secure')) - Number((a.tags || []).includes('secure')));
    setMasters(ms);
    setMasterId((id) => id || ms[0]?.id || '');
  }, [onCount]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (rows || []).forEach((r) => (c[filterOf(r)] = (c[filterOf(r)] || 0) + 1));
    return c;
  }, [rows]);

  const verified = (r: Row) => {
    const need = lessonIds[r.course_id] || [];
    const have = new Set(r.completed_lessons || []);
    return { done: need.filter((x) => have.has(x)).length, total: need.length };
  };
  const prereqOk = (r: Row) => {
    const pre = r.courses?.prerequisite_slug;
    if (!pre) return true;
    return (rows || []).some((x) => x.user_id === r.user_id && x.courses?.slug === pre && x.status === 'approved');
  };

  const run = async (id: string, fn: () => Promise<string>) => {
    setBusy(id);
    setMsg(null);
    try {
      setMsg({ tone: 'ok', text: await fn() });
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.message || String(e) });
    }
    await load();
    setBusy(null);
  };

  const approve = (r: Row) =>
    run(r.id, async () => {
      const { error } = await supabase.from('course_progress').update({ status: 'approved' }).eq('id', r.id);
      if (error) throw error;
      return `Approved ${r.learner_name}. Release the certificate when you are ready.`;
    });

  const reject = (r: Row) => {
    const reason = (reasons[r.id] || '').trim();
    if (reason.length < 5) return setMsg({ tone: 'err', text: 'Write a short reason (at least 5 characters) so the learner knows what to fix.' });
    return run(r.id, async () => {
      const { error } = await supabase.from('course_progress').update({ status: 'rejected', review_note: reason }).eq('id', r.id);
      if (error) throw error;
      setRejecting(null);
      const sent = await notify(r.id, 'rejected');
      return `Rejected ${r.learner_name}'s request${sent ? ' and emailed the reason' : ' (email not sent — check the email settings)'}.`;
    });
  };

  // Issue (once), render the PDF, store it privately for the learner, then release.
  const release = (r0: Row, alsoApprove = false) =>
    run(r0.id, async () => {
      const master = masters.find((m) => m.id === masterId);
      if (!master) throw new Error('Choose a certificate design first.');
      if (alsoApprove) {
        const { error } = await supabase.from('course_progress').update({ status: 'approved' }).eq('id', r0.id);
        if (error) throw error;
      }
      const { data: fresh, error: fe } = await supabase.from('course_progress').select('*, courses(id, title, slug, certificate_title, prerequisite_slug)').eq('id', r0.id).single();
      if (fe || !fresh) throw new Error(fe?.message || 'Request not found.');
      const r = fresh as Row;
      if (r.status !== 'approved') throw new Error('Approve the request first.');
      if (r.released_at) return 'Already released.';
      const course = r.courses!;
      let issue: any = null;
      if (r.certificate_code) {
        const { data } = await supabase.from('certificate_issues').select('*').eq('code', r.certificate_code).maybeSingle();
        issue = data;
      }
      if (!issue) {
        const { data: { user } } = await supabase.auth.getUser();
        const completed = (r.requested_at || new Date().toISOString()).slice(0, 10);
        const total = (lessonIds[r.course_id] || []).length;
        const { data, error } = await supabase
          .from('certificate_issues')
          .insert({ code: r.certificate_code || newCertificateCode(), recipient: r.learner_name, title: course.certificate_title || course.title, description: `Completed all ${total} lessons of “${course.title}”`, issued_on: completed, template_id: master.id, created_by: user?.id })
          .select('*')
          .single();
        if (error || !data) throw new Error(error?.message || 'Could not issue the certificate.');
        issue = data;
        // Locks the code to this request: the database refuses a second one.
        const { error: e2 } = await supabase.from('course_progress').update({ certificate_code: issue.code }).eq('id', r.id);
        if (e2) throw e2;
      }
      const { blob } = await packageCertificates(master.canvas_json, [issue], 'pdf');
      const path = `${r.user_id}/${issue.code}.pdf`;
      const up = await supabase.storage.from('certificates').upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { error: e3 } = await supabase.from('course_progress').update({ certificate_path: path, released_at: new Date().toISOString() }).eq('id', r.id);
      if (e3) throw e3;
      const sent = await notify(r.id, 'released');
      return `Released certificate ${issue.code} to ${r.learner_name}${sent ? ' and emailed them' : ' (email not sent — check the email settings)'}.`;
    });

  const openPdf = async (r: Row) => {
    if (!r.certificate_path) return;
    const { data } = await supabase.storage.from('certificates').createSignedUrl(r.certificate_path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  const list = (rows || []).filter((r) => filterOf(r) === filter).filter((r) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return `${r.learner_name || ''} ${emails[r.user_id]?.email || ''} ${r.courses?.title || ''} ${r.certificate_code || ''}`.toLowerCase().includes(n);
  });

  return (
    <div className="flex flex-col gap-5">
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Request status">
            {(['pending', 'approved', 'released', 'rejected', 'in_progress'] as Filter[]).map((s) => (
              <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`h-8 px-3 rounded-full text-[13px] border ${filter === s ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted'}`}>
                {LABEL[s]} <span className="opacity-60">{counts[s] || 0}</span>
              </button>
            ))}
          </div>
          <button onClick={load} className={`${btn} border border-mt-border`} aria-label="Refresh"><RefreshCw size={14} /> Refresh</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[200px]">
            <span className="sr-only">Search requests</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, course or certificate ID" className="w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface pl-9 pr-3 text-sm text-mt-ink" />
          </label>
          <label className="text-[12px] text-mt-muted inline-flex items-center gap-2">Certificate design
            <select value={masterId} onChange={(e) => setMasterId(e.target.value)} className="h-10 rounded-xl border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink max-w-[260px]">
              {masters.length === 0 && <option value="">No certificate designs found</option>}
              {masters.map((m) => <option key={m.id} value={m.id}>{m.name.replace(/^MT Brand · /, '')}{(m.tags || []).includes('secure') ? ' (secure)' : ''}</option>)}
            </select>
          </label>
        </div>
        {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`mt-3 text-[13px] ${msg.tone === 'err' ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{msg.text}</p>}
        {loadErr && <p role="alert" className="mt-3 text-[13px] text-rose-600">Could not load requests: {loadErr}</p>}
      </section>

      {rows === null ? (
        <div className={`${card} flex justify-center`}><Loader2 className="animate-spin text-mt-faint" aria-label="Loading" /></div>
      ) : list.length === 0 ? (
        <p className={`${card} text-mt-muted`}>{filter === 'pending' ? 'No certificate requests are waiting. 🎉' : 'Nothing here.'}</p>
      ) : (
        list.map((r) => {
          const v = verified(r);
          const complete = v.total > 0 && v.done === v.total;
          const pre = prereqOk(r);
          const who = emails[r.user_id];
          const b = busy === r.id;
          return (
            <section key={r.id} className={card} aria-label={`Request from ${r.learner_name || who?.name || 'learner'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{r.learner_name || <span className="text-mt-muted">No name yet</span>}</p>
                  <p className="text-[13px] text-mt-muted truncate">{who?.email || 'unknown email'}{who?.name && who.name !== r.learner_name ? ` · profile name “${who.name}”` : ''}</p>
                </div>
                <span className="text-[12px] text-mt-muted">{LABEL[filterOf(r)]}</span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-[170px_1fr]">
                <dt className="text-mt-muted">Course</dt><dd className="font-medium">{r.courses?.title}</dd>
                <dt className="text-mt-muted">Lessons completed</dt>
                <dd className={complete ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-rose-600 font-semibold'}>{v.done} of {v.total} {complete ? '✓ verified' : '— incomplete'}</dd>
                {r.courses?.prerequisite_slug && (<><dt className="text-mt-muted">Previous level</dt><dd className={pre ? '' : 'text-rose-600'}>{pre ? 'Approved ✓' : 'Not approved'}</dd></>)}
                <dt className="text-mt-muted">Requested</dt><dd>{fmt(r.requested_at)}</dd>
                {r.reviewed_at && (<><dt className="text-mt-muted">Reviewed</dt><dd>{fmt(r.reviewed_at)}</dd></>)}
                {r.released_at && (<><dt className="text-mt-muted">Released</dt><dd>{fmt(r.released_at)}</dd></>)}
                {r.certificate_code && (<><dt className="text-mt-muted">Certificate ID</dt><dd className="font-mono">{r.certificate_code}</dd></>)}
                {r.status === 'rejected' && r.review_note && (<><dt className="text-mt-muted">Reason given</dt><dd>{r.review_note}</dd></>)}
              </dl>

              {r.status === 'pending' && (
                <div className="mt-5 flex flex-col gap-3">
                  {rejecting === r.id ? (
                    <div className="rounded-2xl border border-rose-500/40 p-4">
                      <label htmlFor={`reason-${r.id}`} className="text-[13px] font-semibold">Reason for rejecting (sent to the learner)</label>
                      <textarea id={`reason-${r.id}`} value={reasons[r.id] || ''} onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })} rows={3} maxLength={500} placeholder="e.g. Please enter your full legal name, not a nickname." className="mt-2 w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-sm text-mt-ink" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button disabled={b} onClick={() => reject(r)} className={`${btn} bg-rose-600 text-white`}>{b ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Reject request</button>
                        <button disabled={b} onClick={() => setRejecting(null)} className={`${btn} border border-mt-border`}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button disabled={b || !complete || !pre || !r.learner_name} onClick={() => approve(r)} className={`${btn} bg-emerald-600 text-white`}>{b ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
                      <button disabled={b || !complete || !pre || !r.learner_name || !masterId} onClick={() => release(r, true)} className={`${btn} bg-mt-primary text-mt-onprimary`}><Rocket size={14} /> Approve &amp; release</button>
                      <button disabled={b} onClick={() => setRejecting(r.id)} className={`${btn} border border-mt-border text-mt-ink`}><X size={14} /> Reject…</button>
                    </div>
                  )}
                  {(!complete || !pre) && <p className="text-[12px] text-rose-600">Approval is blocked: the learner’s record no longer meets the course requirements.</p>}
                </div>
              )}
              {filterOf(r) === 'approved' && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button disabled={b || !masterId} onClick={() => release(r)} className={`${btn} bg-mt-primary text-mt-onprimary`}>{b ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />} Generate &amp; release certificate</button>
                  <span className="text-[12px] text-mt-muted">The learner can download it only after release.</span>
                </div>
              )}
              {filterOf(r) === 'released' && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => openPdf(r)} className={`${btn} border border-mt-border`}><Download size={14} /> PDF</button>
                  {r.certificate_code && <a href={verifyUrl(r.certificate_code)} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}><ExternalLink size={14} /> Verify page</a>}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
