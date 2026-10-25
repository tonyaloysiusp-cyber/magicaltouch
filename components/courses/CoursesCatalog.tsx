'use client';

// Course cards. Course content comes from the server (so search engines
// can read it); the learner's own status is added in the browser.

import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Lock } from 'lucide-react';
import { CourseWithLessons, doneCount, formatMinutes, learnerStatus, totalMinutes } from '@/lib/courses';
import { useLearner } from './useLearner';
import { LevelBadge, ProgressBar, StatusBadge } from './CourseBits';

export function CoursesCatalog({ courses }: { courses: CourseWithLessons[] }) {
  const me = useLearner();
  const bySlug = new Map(courses.map((c) => [c.slug, c]));

  return (
    <div className="mt-container py-8 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-mt-muted">Tutorials &amp; courses</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">Learn design, step by step</h1>
        <p className="mt-4 text-lg text-mt-muted leading-relaxed">
          Short, hands-on lessons that teach Magical Touch Design from your first template to pro photo editing. Finish every lesson in a course, then ask for a certificate — our team reviews each request before it is issued.
        </p>
        {me.ready && !me.userId && (
          <p className="mt-4 text-[14px] text-mt-muted">
            Anyone can read the lessons. <Link href="/login?next=/tutorials" className="font-semibold text-mt-ink underline underline-offset-2">Sign in</Link> or{' '}
            <Link href="/signup?next=/tutorials" className="font-semibold text-mt-ink underline underline-offset-2">create a free account</Link> to track your progress and request certificates.
          </p>
        )}
        {me.error && <p role="alert" className="mt-4 text-[14px] text-rose-600">{me.error}</p>}
      </header>

      {courses.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-mt-border p-10 text-center text-mt-muted">
          <BookOpen className="mx-auto mb-3" size={28} aria-hidden />
          No courses are published yet. Please check back soon.
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const p = me.progress[c.id];
            const status = learnerStatus(p, c.lessons);
            const done = doneCount(p, c.lessons);
            const pre = c.prerequisite_slug ? bySlug.get(c.prerequisite_slug) : null;
            const preApproved = !pre || me.progress[pre.id]?.status === 'approved';
            const cta = status === 'not_started' ? 'Start course' : status === 'in_progress' ? 'Continue' : status === 'released' ? 'View certificate' : 'Open course';
            return (
              <li key={c.id} className="rounded-3xl border border-mt-border bg-mt-surface p-6 flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <LevelBadge level={c.level} />
                  {me.userId && <StatusBadge status={status} />}
                </div>
                <h2 className="mt-4 text-xl font-semibold leading-snug">
                  <Link href={`/tutorials/${c.slug}`} className="hover:underline underline-offset-4">{c.title}</Link>
                </h2>
                <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{c.summary}</p>
                <p className="mt-3 text-[13px] text-mt-muted inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><BookOpen size={14} aria-hidden /> {c.lessons.length} lessons</span>
                  <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> {formatMinutes(totalMinutes(c.lessons))}</span>
                </p>
                {c.objectives.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">You will learn</p>
                    <ul className="mt-2 space-y-1 text-[14px]">
                      {c.objectives.slice(0, 4).map((o) => <li key={o} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-mt-ink/60 shrink-0" />{o}</li>)}
                      {c.objectives.length > 4 && <li className="text-mt-muted text-[13px]">+ {c.objectives.length - 4} more</li>}
                    </ul>
                  </div>
                )}
                {pre && !preApproved && (
                  <p className="mt-4 text-[13px] text-mt-muted inline-flex items-start gap-1.5"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden /> Certificate needs the “{pre.title}” certificate first. You can still read every lesson.</p>
                )}
                <div className="mt-auto pt-5 flex flex-col gap-4">
                  {me.userId && c.lessons.length > 0 && <ProgressBar done={done} total={c.lessons.length} label={`${c.title} progress`} />}
                  <Link href={`/tutorials/${c.slug}`} className="self-start h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5">
                    {cta} <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
