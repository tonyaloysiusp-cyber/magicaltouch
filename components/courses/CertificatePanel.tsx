'use client';

// The certificate step of a course. Completing lessons never issues a
// certificate: the learner confirms the name to print, the request waits
// for an administrator, and the PDF can be downloaded only after release.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, Clock, Download, ExternalLink, Loader2, Lock, Pencil, Send, XCircle } from 'lucide-react';
import { CourseProgress, CourseWithLessons, LearnerStatus, nameProblem, normaliseName } from '@/lib/courses';
import { verifyUrl } from '@/lib/certificates';
import { downloadCertificate, requestCertificate } from './useLearner';
import { StatusBadge } from './CourseBits';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// A profile name that is just the email's first part (the default) or
// fails the name rules is not treated as a name.
function usableName(name: string, email?: string | null) {
  const n = normaliseName(name || '');
  if (!n || nameProblem(n)) return '';
  if (email && n.toLowerCase() === email.split('@')[0].toLowerCase()) return '';
  if (/[._]/.test(n)) return '';
  return n;
}

export function CertificatePanel({
  course, row, status, signedIn, profileName, email, prerequisite, prerequisiteApproved, remaining, onChange,
}: {
  course: CourseWithLessons;
  row: CourseProgress | undefined;
  status: LearnerStatus;
  signedIn: boolean;
  profileName: string;
  email?: string | null;
  prerequisite: { title: string; slug: string } | null;
  prerequisiteApproved: boolean;
  remaining: number;
  onChange: (row: CourseProgress) => void;
}) {
  const suggested = usableName(row?.learner_name || profileName, email);
  const [editing, setEditing] = useState(!suggested);
  const [name, setName] = useState(suggested);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dl, setDl] = useState(false);
  useEffect(() => {
    if (!touched && suggested) {
      setName(suggested);
      setEditing(false);
    }
  }, [suggested, touched]);

  const problem = nameProblem(name);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!row || problem) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await requestCertificate(row, normaliseName(name)));
    } catch (e: any) {
      setErr(e?.message || 'Could not send your request. Please try again.');
    }
    setBusy(false);
  };

  const download = async () => {
    if (!row?.certificate_path) return;
    setDl(true);
    setErr(null);
    try {
      window.location.href = await downloadCertificate(row.certificate_path);
    } catch (e: any) {
      setErr(e?.message || 'Could not download the certificate.');
    }
    setDl(false);
  };

  let content: React.ReactNode;
  if (!signedIn) {
    content = (
      <p className="text-[14px]">
        <Link href={`/login?next=/tutorials/${course.slug}`} className="font-semibold underline underline-offset-2">Sign in</Link> to save your progress and request a certificate when you finish.
      </p>
    );
  } else if (status === 'released' && row) {
    content = (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5">
        <p className="font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2"><Award size={18} aria-hidden /> Your certificate is ready</p>
        <dl className="mt-3 grid gap-1 text-[14px] sm:grid-cols-[160px_1fr]">
          <dt className="text-mt-muted">Awarded to</dt><dd className="font-semibold">{row.learner_name}</dd>
          <dt className="text-mt-muted">Certificate ID</dt><dd className="font-mono">{row.certificate_code}</dd>
          <dt className="text-mt-muted">Released</dt><dd>{fmt(row.released_at)}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={download} disabled={dl} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
            {dl ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />} Download certificate (PDF)
          </button>
          {row.certificate_code && (
            <a href={verifyUrl(row.certificate_code)} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-1.5">
              <ExternalLink size={15} aria-hidden /> Check it online
            </a>
          )}
        </div>
      </div>
    );
  } else if (status === 'approved' && row) {
    content = (
      <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-[14px] inline-flex items-start gap-2">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
        <span>Approved on {fmt(row.reviewed_at)} for <b>{row.learner_name}</b>. Your certificate is being prepared — you can download it here as soon as it is released.</span>
      </p>
    );
  } else if (status === 'pending' && row) {
    content = (
      <p className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[14px] inline-flex items-start gap-2">
        <Clock size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        <span>Requested on {fmt(row.requested_at)} for <b>{row.learner_name}</b>. Our team will review it — you’ll get an email when it’s approved. Need a different name? Email us before it’s approved.</span>
      </p>
    );
  } else if (remaining > 0) {
    content = <p className="text-[14px] text-mt-muted">Finish {remaining === course.lessons.length ? `all ${remaining} lessons` : `the last ${remaining} lesson${remaining > 1 ? 's' : ''}`} to request your certificate.</p>;
  } else if (prerequisite && !prerequisiteApproved) {
    content = (
      <p className="text-[14px] inline-flex items-start gap-2">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>You finished every lesson. To request this certificate, first get your <Link href={`/tutorials/${prerequisite.slug}`} className="font-semibold underline underline-offset-2">{prerequisite.title}</Link> certificate approved.</span>
      </p>
    );
  } else {
    content = (
      <form onSubmit={submit} noValidate className="max-w-xl">
        {status === 'rejected' && row?.review_note && (
          <p className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-[14px] inline-flex items-start gap-2" role="status">
            <XCircle size={17} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />
            <span><b>Your last request was not approved.</b> Reason: {row.review_note} You can correct it and request again.</span>
          </p>
        )}
        {!editing ? (
          <div className="rounded-2xl border border-mt-border p-4">
            <p className="text-[13px] text-mt-muted">Name on your certificate</p>
            <p className="mt-1 text-lg font-semibold">{name}</p>
            <button type="button" onClick={() => { setEditing(true); setTouched(true); }} className="mt-2 text-[13px] font-semibold inline-flex items-center gap-1 underline underline-offset-2"><Pencil size={13} aria-hidden /> Change name</button>
          </div>
        ) : (
          <div>
            <label htmlFor="cert-name" className="block text-[14px] font-semibold">Your full name, exactly as it should appear on the certificate</label>
            {!suggested && <p className="mt-1 text-[13px] text-mt-muted">We don’t have your full name yet. Please type it below — it can’t be changed after the certificate is issued.</p>}
            <input
              id="cert-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setTouched(true); }}
              autoComplete="name"
              maxLength={80}
              aria-invalid={touched && !!problem}
              aria-describedby="cert-name-help"
              className={`mt-2 w-full h-11 rounded-xl border bg-mt-surface px-3 text-[15px] text-mt-ink ${touched && problem ? 'border-rose-500' : 'border-mt-input-border'}`}
              placeholder="e.g. Aisha Rahman"
            />
            <p id="cert-name-help" className={`mt-1 text-[13px] ${touched && problem ? 'text-rose-600' : 'text-mt-muted'}`}>{touched && problem ? problem : 'Use your first and last name. Letters, spaces, hyphens and apostrophes only.'}</p>
          </div>
        )}
        <button type="submit" disabled={busy || !!problem} className="mt-4 h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />} {status === 'rejected' ? 'Request again' : 'Request my certificate'}
        </button>
        <p className="mt-2 text-[12px] text-mt-muted">An administrator checks your progress and name before the certificate is issued.</p>
      </form>
    );
  }

  return (
    <section aria-labelledby="cert-heading" className="rounded-3xl border border-mt-border p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cert-heading" className="text-xl font-semibold inline-flex items-center gap-2"><Award size={20} aria-hidden /> Certificate</h2>
        {signedIn && <StatusBadge status={status} />}
      </div>
      <p className="mt-1 text-[14px] text-mt-muted">{course.certificate_title || course.title}</p>
      {course.final_task && <p className="mt-3 text-[14px] text-mt-muted"><b className="text-mt-ink">Practice project:</b> {course.final_task}</p>}
      <div className="mt-5" aria-live="polite">{content}</div>
      {err && <p role="alert" className="mt-3 text-[14px] text-rose-600">{err}</p>}
    </section>
  );
}
