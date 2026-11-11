'use client';

// /tutorials — course catalogue. Course content comes from the server (so
// search engines can read it); the learner's own status is added in the
// browser.

import Link from 'next/link';
import { ArrowRight, Award, BookOpen, CheckCircle2, Clock, Download, GraduationCap, Layers, Lock, Sparkles, Wand2 } from 'lucide-react';
import { CourseWithLessons, CourseLevel, doneCount, formatMinutes, learnerStatus, totalMinutes } from '@/lib/courses';
import { useLearner } from './useLearner';
import { GRADIENT, ProgressBar, StatusBadge } from './CourseBits';

export const LEVEL_STYLE: Record<CourseLevel, { from: string; to: string; ink: string; icon: typeof Sparkles }> = {
  Beginner: { from: '#5DCCB8', to: '#8CC84B', ink: '#0F5F4F', icon: Sparkles },
  Intermediate: { from: '#35C2F1', to: '#A69BD3', ink: '#164E77', icon: Layers },
  Pro: { from: '#A69BD3', to: '#F2708F', ink: '#5B2A6E', icon: Wand2 },
};

export function CoursesCatalog({ courses }: { courses: CourseWithLessons[] }) {
  const me = useLearner();
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const lessons = courses.reduce((n, c) => n + c.lessons.length, 0);
  const minutes = courses.reduce((n, c) => n + totalMinutes(c.lessons), 0);
  const first = courses[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-mt-border">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" style={{ background: GRADIENT }} />
        <div aria-hidden className="absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full blur-3xl opacity-25 dark:opacity-20" style={{ background: 'radial-gradient(circle, #35C2F1, transparent 65%)' }} />
        <div className="mt-container relative py-12 sm:py-16 lg:py-20 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-mt-border bg-mt-surface/80 backdrop-blur px-3 py-1 text-[12px] font-semibold tracking-wide text-mt-muted">
              <GraduationCap size={14} aria-hidden /> Free tutorials &amp; courses
            </p>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05]">
              Learn design,<br className="hidden sm:block" /> <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#3B82C4,#A69BD3,#F2708F)' }}>step by step.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-mt-muted leading-relaxed">
              Short, hands-on lessons — from your first template to pro photo editing. Finish a course, then request a certificate; our team reviews every request before it is issued.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {first && (
                <Link href={`/tutorials/${first.slug}`} className="h-12 px-6 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2 shadow-[0_10px_30px_-12px_rgba(9,9,11,0.5)]">
                  Start learning free <ArrowRight size={16} aria-hidden />
                </Link>
              )}
              <a href="#guides-title" className="h-12 px-6 rounded-full border border-mt-border bg-mt-surface text-[15px] font-semibold inline-flex items-center gap-2 hover:border-mt-ink/40">
                <Download size={16} aria-hidden /> PDF guides
              </a>
            </div>
            {me.ready && !me.userId && (
              <p className="mt-5 text-[14px] text-mt-muted">
                Anyone can read the lessons. <Link href="/login?next=/tutorials" className="font-semibold text-mt-ink underline underline-offset-2">Sign in</Link> or{' '}
                <Link href="/signup?next=/tutorials" className="font-semibold text-mt-ink underline underline-offset-2">create a free account</Link> to track progress and earn certificates.
              </p>
            )}
            {me.error && <p role="alert" className="mt-4 text-[14px] text-rose-600">{me.error}</p>}

            {courses.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-mt-border bg-mt-border max-w-xl">
                {[
                  [String(courses.length), courses.length === 1 ? 'course' : 'courses'],
                  [String(lessons), 'lessons'],
                  [formatMinutes(minutes), 'in total'],
                  ['Free', 'certificates'],
                ].map(([v, l]) => (
                  <div key={l} className="bg-mt-surface px-4 py-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                    <dd className="text-[12px] text-mt-muted">{l}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Certificate preview */}
          <div aria-hidden className="relative mx-auto w-full max-w-[460px]">
            <div className="absolute -inset-3 rounded-[32px] opacity-60 blur-2xl" style={{ background: GRADIENT }} />
            <div className="relative rounded-[28px] p-[2px]" style={{ background: GRADIENT }}>
              <div className="rounded-[26px] bg-mt-surface px-7 py-8 sm:px-9 sm:py-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mt-muted">Certificate of completion</span>
                  <span className="grid h-12 w-12 place-items-center rounded-full text-white shadow-md" style={{ background: 'linear-gradient(135deg,#3B82C4,#A69BD3)' }}><Award size={22} /></span>
                </div>
                <p className="mt-8 text-[13px] text-mt-muted">This certifies that</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">Your Name</p>
                <div className="mt-3 h-px w-full bg-mt-border" />
                <p className="mt-4 text-[13px] text-mt-muted">has completed every lesson and the practice project of</p>
                <p className="mt-1 text-[17px] font-semibold">{first ? first.certificate_title || first.title : 'Design basics'}</p>
                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <div className="h-px w-28 bg-mt-ink/40" />
                    <p className="mt-1.5 text-[11px] text-mt-muted">Reviewed by Magical Touch Design</p>
                  </div>
                  <p className="text-[11px] font-mono text-mt-faint">MTD-0000-0000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="mt-container py-14 sm:py-20" aria-labelledby="courses-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#3B82C4]">Your learning path</p>
            <h2 id="courses-title" className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight">Pick a course and start in minutes</h2>
          </div>
          <p className="max-w-md text-[15px] text-mt-muted">Each lesson is a few minutes long and ends with a small task you do in the real editor.</p>
        </div>

        {courses.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-mt-border p-10 text-center text-mt-muted">
            <BookOpen className="mx-auto mb-3" size={28} aria-hidden />
            No courses are published yet. Please check back soon.
          </div>
        ) : (
          <ol className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((c, i) => {
              const p = me.progress[c.id];
              const status = learnerStatus(p, c.lessons);
              const done = doneCount(p, c.lessons);
              const pre = c.prerequisite_slug ? bySlug.get(c.prerequisite_slug) : null;
              const preApproved = !pre || me.progress[pre.id]?.status === 'approved';
              const cta = status === 'not_started' ? 'Start course' : status === 'in_progress' ? 'Continue' : status === 'released' ? 'View certificate' : 'Open course';
              const L = LEVEL_STYLE[c.level] || LEVEL_STYLE.Beginner;
              const Icon = L.icon;
              return (
                <li key={c.id} className="group relative rounded-3xl border border-mt-border bg-mt-surface overflow-hidden flex flex-col transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(9,9,11,0.45)]">
                  <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${L.from}, ${L.to})` }}>
                    <div aria-hidden className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.55) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                    <span aria-hidden className="absolute -right-2 -bottom-6 text-[120px] font-semibold leading-none text-white/25 tabular-nums select-none">{String(i + 1).padStart(2, '0')}</span>
                    <div className="absolute left-6 top-5 flex items-center gap-2">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/90 shadow-sm" style={{ color: L.ink }}><Icon size={20} aria-hidden /></span>
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold" style={{ color: L.ink }}>{c.level}</span>
                    </div>
                    {me.userId && <div className="absolute right-4 top-5 rounded-full bg-white/95 p-0.5 shadow-sm"><StatusBadge status={status} /></div>}
                    <p className="absolute left-6 bottom-4 text-[13px] font-medium text-white/95 inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><BookOpen size={14} aria-hidden /> {c.lessons.length} lessons</span>
                      <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> {formatMinutes(totalMinutes(c.lessons))}</span>
                    </p>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-semibold leading-snug">
                      <Link href={`/tutorials/${c.slug}`} className="after:absolute after:inset-0">{c.title}</Link>
                    </h3>
                    <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{c.summary}</p>
                    {c.objectives.length > 0 && (
                      <ul className="mt-4 space-y-1.5 text-[14px]">
                        {c.objectives.slice(0, 4).map((o) => (
                          <li key={o} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: L.from }} aria-hidden />{o}</li>
                        ))}
                        {c.objectives.length > 4 && <li className="pl-6 text-mt-muted text-[13px]">+ {c.objectives.length - 4} more</li>}
                      </ul>
                    )}
                    {pre && !preApproved && (
                      <p className="mt-4 rounded-xl bg-mt-surface2 px-3 py-2 text-[13px] text-mt-muted inline-flex items-start gap-1.5"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden /> Certificate needs “{pre.title}” first. Every lesson is open to read.</p>
                    )}
                    <div className="mt-auto pt-6 flex flex-col gap-4">
                      {me.userId && c.lessons.length > 0 && <ProgressBar done={done} total={c.lessons.length} label={`${c.title} progress`} />}
                      <span className="self-start h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5">
                        {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-mt-border bg-mt-surface2/60" aria-labelledby="how-title">
        <div className="mt-container py-14 sm:py-16">
          <h2 id="how-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: BookOpen, t: 'Learn by doing', d: 'Read a short lesson, then try it straight away in the editor or Photo Studio.' },
              { icon: CheckCircle2, t: 'Tick off each lesson', d: 'Sign in to save your progress on any device. Lessons open one after another.' },
              { icon: Award, t: 'Get your certificate', d: 'Finish the practice project and request a certificate. Our team reviews it and sends it to you.' },
            ].map(({ icon: I, t, d }, i) => (
              <li key={t} className="rounded-3xl border border-mt-border bg-mt-surface p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#3B82C4,#A69BD3)' }}><I size={18} aria-hidden /></span>
                  <span className="text-[12px] font-semibold text-mt-faint tabular-nums">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-1.5 text-[14px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[14px] text-mt-muted">Already have a certificate? <Link href="/verify" className="font-semibold text-mt-ink underline underline-offset-2">Check a certificate</Link></p>
        </div>
      </section>
    </div>
  );
}
