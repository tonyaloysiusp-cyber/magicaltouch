'use client';

// Course page and lesson page. Lesson content is rendered from server data;
// progress (ticks, status, certificate) is the learner's own row.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, Clock, Loader2, Lock, PlayCircle, Square, SquareCheck } from 'lucide-react';
import { CourseWithLessons, Lesson, doneCount, formatMinutes, learnerStatus, totalMinutes } from '@/lib/courses';
import { saveCompleted, useLearner, Learner } from './useLearner';
import { LevelBadge, ProgressBar, StatusBadge } from './CourseBits';
import { CertificatePanel } from './CertificatePanel';

export interface PrereqInfo { id: string; title: string; slug: string }

function useCourseState(course: CourseWithLessons, me: Learner, prerequisite: PrereqInfo | null) {
  const row = me.progress[course.id];
  const status = learnerStatus(row, course.lessons);
  const done = doneCount(row, course.lessons);
  const completed = new Set(row?.completed_lessons || []);
  const locked = status === 'pending' || status === 'approved' || status === 'released';
  const prerequisiteApproved = !prerequisite || me.progress[prerequisite.id]?.status === 'approved';
  const next = course.lessons.find((l) => !completed.has(l.id)) || course.lessons[0];
  // Lessons open one after another: a lesson unlocks when every lesson
  // before it is complete (signed-in learners; visitors can read them all).
  const firstOpen = course.lessons.findIndex((l) => !completed.has(l.id));
  const isLessonLocked = (i: number) => !!me.userId && firstOpen !== -1 && i > firstOpen;
  return { row, status, done, completed, locked, prerequisiteApproved, next, isLessonLocked };
}

export function CourseDetail({ course, prerequisite }: { course: CourseWithLessons; prerequisite: PrereqInfo | null }) {
  const me = useLearner();
  const s = useCourseState(course, me, prerequisite);
  const mins = totalMinutes(course.lessons);
  const startLabel = s.status === 'not_started' || !me.userId ? 'Start course' : s.done < course.lessons.length ? 'Continue' : 'Review lessons';

  return (
    <div className="mt-container py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-[13px] text-mt-muted">
        <Link href="/tutorials" className="hover:underline">Tutorials</Link> <ChevronRight size={12} className="inline" aria-hidden /> <span className="text-mt-ink">{course.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={course.level} />
            {me.userId && <StatusBadge status={s.status} />}
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">{course.title}</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed max-w-2xl">{course.summary}</p>
          <p className="mt-4 text-[14px] text-mt-muted inline-flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><BookOpen size={15} aria-hidden /> {course.lessons.length} lessons</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden /> about {formatMinutes(mins)}</span>
            {prerequisite && <span>Follows: <Link href={`/tutorials/${prerequisite.slug}`} className="underline underline-offset-2">{prerequisite.title}</Link></span>}
          </p>
          {me.userId && course.lessons.length > 0 && <div className="mt-5 max-w-xl"><ProgressBar done={s.done} total={course.lessons.length} /></div>}
          {course.lessons.length > 0 && (
            <Link href={`/tutorials/${course.slug}/${s.next.slug}`} className="mt-6 h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2">
              <PlayCircle size={17} aria-hidden /> {startLabel}
            </Link>
          )}
          {me.error && <p role="alert" className="mt-4 text-[14px] text-rose-600">{me.error}</p>}

          {course.objectives.length > 0 && (
            <section aria-labelledby="obj" className="mt-10">
              <h2 id="obj" className="text-xl font-semibold">What you will learn</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {course.objectives.map((o) => <li key={o} className="flex gap-2 text-[15px]"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />{o}</li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="content" className="mt-10">
            <h2 id="content" className="text-xl font-semibold">Course content</h2>
            {course.lessons.length === 0 ? (
              <p className="mt-3 text-mt-muted">Lessons for this course are coming soon.</p>
            ) : (
              <ol className="mt-3 divide-y divide-mt-border rounded-2xl border border-mt-border overflow-hidden">
                {course.lessons.map((l, i) => {
                  const ok = s.completed.has(l.id);
                  const shut = s.isLessonLocked(i);
                  return (
                    <li key={l.id}>
                      <Link href={`/tutorials/${course.slug}/${l.slug}`} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-mt-surface2 ${shut ? 'opacity-60' : ''}`}>
                        {ok ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="Completed" /> : shut ? <Lock size={18} className="shrink-0 text-mt-faint" aria-label="Locked — finish the lessons before it" /> : <Circle size={20} className="shrink-0 text-mt-faint" aria-label="Not completed" />}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-medium">{i + 1}. {l.title}</span>
                          <span className="block text-[13px] text-mt-muted truncate">{l.tool}</span>
                        </span>
                        <span className="text-[13px] text-mt-muted tabular-nums whitespace-nowrap">{l.minutes} min</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          {me.ready ? (
            <CertificatePanel
              course={course}
              row={s.row}
              status={s.status}
              signedIn={!!me.userId}
              profileName={me.profileName}
              email={me.email}
              prerequisite={prerequisite}
              prerequisiteApproved={s.prerequisiteApproved}
              remaining={course.lessons.length - s.done}
              onChange={me.setRow}
            />
          ) : (
            <div className="rounded-3xl border border-mt-border p-8 flex justify-center text-mt-faint" aria-busy="true"><Loader2 className="animate-spin" aria-label="Loading your progress" /></div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function LessonView({ course, lesson, prerequisite }: { course: CourseWithLessons; lesson: Lesson; prerequisite: PrereqInfo | null }) {
  const me = useLearner();
  const s = useCourseState(course, me, prerequisite);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const idx = course.lessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? course.lessons[idx - 1] : null;
  const next = idx < course.lessons.length - 1 ? course.lessons[idx + 1] : null;
  const isDone = s.completed.has(lesson.id);
  const lessonLocked = s.isLessonLocked(idx);
  const firstOpenLesson = course.lessons.find((l) => !s.completed.has(l.id));

  // The lesson's tasks: every step, the practice task, and opening the tool.
  // All must be ticked before the lesson can be marked complete. Ticks are
  // kept on this device (they are only a guide; completion is saved online).
  const tasks: { id: string; text: string }[] = [
    ...lesson.steps.map((st, i) => ({ id: `s${i}`, text: st })),
    ...(lesson.task ? [{ id: 'task', text: `Practice task: ${lesson.task}` }] : []),
  ];
  const tickKey = `mt:lessonTasks:${lesson.id}`;
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [triedTool, setTriedTool] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(tickKey) || '{}');
      setTicks(saved.ticks || {});
      setTriedTool(!!saved.tried);
    } catch {}
  }, [tickKey]);
  const persist = (t: Record<string, boolean>, tried: boolean) => {
    try { localStorage.setItem(tickKey, JSON.stringify({ ticks: t, tried })); } catch {}
  };
  const tick = (id: string) => setTicks((t) => { const n = { ...t, [id]: !t[id] }; persist(n, triedTool); return n; });
  const markTried = () => { setTriedTool(true); persist(ticks, true); };
  const needTool = !!lesson.try_href;
  const tasksDone = tasks.filter((t) => ticks[t.id]).length + (needTool && triedTool ? 1 : 0);
  const tasksTotal = tasks.length + (needTool ? 1 : 0);
  const ready = isDone || tasksDone >= tasksTotal;

  const toggle = async () => {
    if (!me.userId || s.locked || lessonLocked) return;
    if (!isDone && !ready) { setErr('Tick every task above first — then you can mark the lesson complete.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const list = isDone ? [...s.completed].filter((x) => x !== lesson.id) : [...s.completed, lesson.id];
      me.setRow(await saveCompleted(me.userId, course.id, s.row, list));
    } catch (e: any) {
      setErr(e?.message || 'Could not save. Please try again.');
    }
    setBusy(false);
  };

  const allDone = me.userId && s.done === course.lessons.length;

  return (
    <div className="mt-container py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-[13px] text-mt-muted">
        <Link href="/tutorials" className="hover:underline">Tutorials</Link> <ChevronRight size={12} className="inline" aria-hidden />{' '}
        <Link href={`/tutorials/${course.slug}`} className="hover:underline">{course.title}</Link> <ChevronRight size={12} className="inline" aria-hidden />{' '}
        <span className="text-mt-ink">Lesson {idx + 1}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-24 order-2 lg:order-1">
          <details className="group rounded-2xl border border-mt-border lg:open:block" open>
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 lg:cursor-default">
              <span className="font-semibold text-[15px]">Lessons</span>
            </summary>
            {me.userId && <div className="px-4 pb-3"><ProgressBar done={s.done} total={course.lessons.length} /></div>}
            <ol className="border-t border-mt-border">
              {course.lessons.map((l, i) => {
                const ok = s.completed.has(l.id);
                const here = l.id === lesson.id;
                const shut = s.isLessonLocked(i);
                return (
                  <li key={l.id}>
                    <Link href={`/tutorials/${course.slug}/${l.slug}`} aria-current={here ? 'page' : undefined} className={`flex items-start gap-2.5 px-4 py-2.5 text-[14px] ${here ? 'bg-mt-surface2 font-semibold' : 'hover:bg-mt-surface2'} ${shut && !here ? 'opacity-60' : ''}`}>
                      {ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Completed" /> : shut ? <Lock size={15} className="mt-0.5 shrink-0 text-mt-faint" aria-label="Locked" /> : <Circle size={17} className="mt-0.5 shrink-0 text-mt-faint" aria-label="Not completed" />}
                      <span>{i + 1}. {l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </details>
        </aside>

        <article className="order-1 lg:order-2 max-w-3xl">
          <p className="text-[13px] text-mt-muted inline-flex flex-wrap items-center gap-2">
            Lesson {idx + 1} of {course.lessons.length} · {lesson.tool} · <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden /> {lesson.minutes} min</span>
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{lesson.title}</h1>
          {lesson.intro && <p className="mt-4 text-lg text-mt-muted leading-relaxed">{lesson.intro}</p>}

          {me.ready && lessonLocked && firstOpenLesson && (
            <div role="status" className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-[15px]">
              <p className="font-semibold inline-flex items-center gap-2"><Lock size={16} aria-hidden /> This lesson unlocks after the ones before it</p>
              <p className="mt-1 text-mt-muted">Finish the tasks in “{firstOpenLesson.title}” first, then come back.</p>
              <Link href={`/tutorials/${course.slug}/${firstOpenLesson.slug}`} className="mt-3 h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5">Go to {firstOpenLesson.title} <ArrowRight size={15} aria-hidden /></Link>
            </div>
          )}

          {lesson.steps.length > 0 && (
            <section aria-labelledby="steps" className="mt-8">
              <h2 id="steps" className="text-lg font-semibold">Steps</h2>
              <ol className="mt-3 space-y-3">
                {lesson.steps.map((st, i) => (
                  <li key={i} className="flex gap-3 text-[16px] leading-relaxed">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-mt-surface2 text-[13px] font-semibold inline-flex items-center justify-center" aria-hidden>{i + 1}</span>
                    <span className="pt-0.5">{st}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {lesson.task && (
            <section aria-labelledby="task" className="mt-8 rounded-2xl bg-mt-surface2 px-5 py-4">
              <h2 id="task" className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">Your task</h2>
              <p className="mt-1 text-[16px]">{lesson.task}</p>
              {lesson.try_href && (
                <a href={lesson.try_href} target="_blank" rel="noopener" onClick={markTried} className="mt-3 h-10 px-4 rounded-full border border-mt-border bg-mt-surface text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-bg">
                  <PlayCircle size={15} aria-hidden /> {lesson.try_label || 'Try it'}
                </a>
              )}
            </section>
          )}

          {me.userId && !lessonLocked && !isDone && tasksTotal > 0 && (
            <section aria-labelledby="checklist" className="mt-8 rounded-2xl border border-mt-border p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="checklist" className="text-lg font-semibold">Complete these tasks</h2>
                <span className="text-[13px] text-mt-muted tabular-nums">{tasksDone} of {tasksTotal} done</span>
              </div>
              <p className="mt-1 text-[14px] text-mt-muted">Do each one in the editor, then tick it. The next lesson opens when all are ticked and the lesson is marked complete.</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {needTool && (
                  <li>
                    <a href={lesson.try_href} target="_blank" rel="noopener" onClick={markTried} className="w-full flex items-start gap-3 rounded-xl px-2 py-2 text-left text-[15px] hover:bg-mt-surface2">
                      {triedTool ? <SquareCheck size={20} className="shrink-0 text-emerald-600" aria-hidden /> : <Square size={20} className="shrink-0 text-mt-faint" aria-hidden />}
                      <span className={triedTool ? 'text-mt-muted' : ''}>Open the tool: {lesson.try_label || 'Try it'} <span className="text-mt-faint">(opens in a new tab)</span></span>
                    </a>
                  </li>
                )}
                {tasks.map((t) => (
                  <li key={t.id}>
                    <button type="button" role="checkbox" aria-checked={!!ticks[t.id]} onClick={() => tick(t.id)} className="w-full flex items-start gap-3 rounded-xl px-2 py-2 text-left text-[15px] hover:bg-mt-surface2">
                      {ticks[t.id] ? <SquareCheck size={20} className="shrink-0 text-emerald-600" aria-hidden /> : <Square size={20} className="shrink-0 text-mt-faint" aria-hidden />}
                      <span className={ticks[t.id] ? 'text-mt-muted line-through decoration-mt-faint' : ''}>{t.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3"><ProgressBar done={tasksDone} total={tasksTotal} /></div>
            </section>
          )}

          <div className="mt-8 rounded-2xl border border-mt-border p-4 sm:p-5">
            {!me.ready ? (
              <Loader2 className="animate-spin text-mt-faint" aria-label="Loading your progress" />
            ) : !me.userId ? (
              <p className="text-[14px]"><Link href={`/login?next=/tutorials/${course.slug}/${lesson.slug}`} className="font-semibold underline underline-offset-2">Sign in</Link> to mark lessons complete and earn a certificate.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggle}
                  disabled={busy || s.locked || lessonLocked || (!isDone && !ready)}
                  aria-pressed={isDone}
                  className={`h-11 px-5 rounded-full text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60 ${isDone ? 'bg-emerald-600 text-white' : 'bg-mt-primary text-mt-onprimary'}`}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />} {isDone ? 'Completed' : 'Mark lesson complete'}
                </button>
                {isDone && !s.locked && <span className="text-[13px] text-mt-muted">Click again to mark it not done.</span>}
                {!isDone && !ready && !lessonLocked && <span className="text-[13px] text-mt-muted">Tick all {tasksTotal} tasks above to finish this lesson.</span>}
                {s.locked && <span className="text-[13px] text-mt-muted">Your certificate request is in — lessons are locked while it’s reviewed.</span>}
              </div>
            )}
            {err && <p role="alert" className="mt-3 text-[14px] text-rose-600">{err}</p>}
            {allDone && (
              <p className="mt-3 text-[14px]">
                🎉 You’ve finished every lesson. <Link href={`/tutorials/${course.slug}#cert-heading`} className="font-semibold underline underline-offset-2">Go to your certificate</Link>
              </p>
            )}
          </div>

          <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {prev ? (
              <Link href={`/tutorials/${course.slug}/${prev.slug}`} className="h-11 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-1.5 max-w-full">
                <ArrowLeft size={15} aria-hidden /> <span className="truncate">Previous: {prev.title}</span>
              </Link>
            ) : <span />}
            {next && me.userId && !isDone ? (
              <span title="Finish this lesson to unlock the next one" className="h-11 px-4 rounded-full border border-mt-border text-mt-muted text-[14px] font-semibold inline-flex items-center gap-1.5 max-w-full cursor-not-allowed">
                <Lock size={14} aria-hidden /> <span className="truncate">Next: {next.title}</span>
              </span>
            ) : next ? (
              <Link href={`/tutorials/${course.slug}/${next.slug}`} className="h-11 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5 max-w-full">
                <span className="truncate">Next: {next.title}</span> <ArrowRight size={15} aria-hidden />
              </Link>
            ) : (
              <Link href={`/tutorials/${course.slug}`} className="h-11 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-1.5">
                Back to course <ArrowRight size={15} aria-hidden />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
