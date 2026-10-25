'use client';

// Courses and lessons (admins only): edit, show/hide, reorder, add, delete.
// "Starter content" marks lessons written from the existing tutorials that
// an admin should read and confirm before relying on them.

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CourseLevel, CourseWithLessons, Lesson, loadCourses, slugify } from '@/lib/courses';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const input = 'mt-1 w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-sm text-mt-ink';
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type CourseDraft = { id?: string; title: string; slug: string; summary: string; level: CourseLevel; objectives: string; certificate_title: string; final_task: string; prerequisite_slug: string };
type LessonDraft = { id?: string; course_id: string; title: string; slug: string; tool: string; minutes: number; intro: string; steps: string; task: string; try_href: string; try_label: string };

function StarterBadge() {
  return <span className="inline-flex items-center h-6 px-2 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">Starter content — review</span>;
}

export function CourseManager() {
  const [courses, setCourses] = useState<CourseWithLessons[] | null>(null);
  const [progressCount, setProgressCount] = useState<Record<string, number>>({});
  const [editCourse, setEditCourse] = useState<CourseDraft | null>(null);
  const [editLesson, setEditLesson] = useState<LessonDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cs, { data: pr }] = await Promise.all([loadCourses(supabase, { includeHidden: true }), supabase.from('course_progress').select('course_id')]);
    const n: Record<string, number> = {};
    ((pr as any[]) || []).forEach((p) => (n[p.course_id] = (n[p.course_id] || 0) + 1));
    setProgressCount(n);
    setCourses(cs);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => PromiseLike<{ error: any }> | Promise<{ error: any }>, ok: string) => {
    setBusy(true);
    setMsg(null);
    const { error } = await fn();
    setMsg(error ? { tone: 'err', text: error.message || String(error) } : { tone: 'ok', text: ok });
    await load();
    setBusy(false);
    return !error;
  };

  // ------------------------------------------------------------ courses
  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourse) return;
    const d = editCourse;
    if (d.title.trim().length < 3) return setMsg({ tone: 'err', text: 'Give the course a title (3+ characters).' });
    if (!SLUG_RE.test(d.slug)) return setMsg({ tone: 'err', text: 'The web address may use only lowercase letters, numbers and single hyphens.' });
    if (d.prerequisite_slug && d.prerequisite_slug === d.slug) return setMsg({ tone: 'err', text: 'A course cannot require itself.' });
    const row = { title: d.title.trim(), slug: d.slug, summary: d.summary.trim(), level: d.level, objectives: lines(d.objectives), certificate_title: d.certificate_title.trim(), final_task: d.final_task.trim(), prerequisite_slug: d.prerequisite_slug || null, updated_at: new Date().toISOString() };
    const ok = await act(
      () => (d.id ? supabase.from('courses').update(row).eq('id', d.id) : supabase.from('courses').insert({ ...row, visible: false, sort: (courses?.length || 0) + 1 })),
      d.id ? 'Course saved.' : 'Course added (hidden until you show it).',
    );
    if (ok) setEditCourse(null);
  };

  const move = <T extends { id: string; sort: number }>(table: 'courses' | 'course_lessons', list: T[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const order = [...list];
    [order[i], order[j]] = [order[j], order[i]];
    act(async () => {
      for (let k = 0; k < order.length; k++) {
        const { error } = await supabase.from(table).update({ sort: k + 1 }).eq('id', order[k].id);
        if (error) return { error };
      }
      return { error: null };
    }, 'Order saved.');
  };

  const deleteCourse = (c: CourseWithLessons) => {
    if (progressCount[c.id]) return setMsg({ tone: 'err', text: `${progressCount[c.id]} learner(s) have progress or certificates in this course, so it can’t be deleted. Hide it instead.` });
    if (!window.confirm(`Delete “${c.title}” and its ${c.lessons.length} lessons? This cannot be undone.`)) return;
    act(() => supabase.from('courses').delete().eq('id', c.id), 'Course deleted.');
  };

  // ------------------------------------------------------------ lessons
  const saveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLesson) return;
    const d = editLesson;
    if (d.title.trim().length < 3) return setMsg({ tone: 'err', text: 'Give the lesson a title (3+ characters).' });
    if (!SLUG_RE.test(d.slug)) return setMsg({ tone: 'err', text: 'The lesson web address may use only lowercase letters, numbers and single hyphens.' });
    if (!(d.minutes >= 1 && d.minutes <= 600)) return setMsg({ tone: 'err', text: 'Duration must be between 1 and 600 minutes.' });
    if (d.try_href && !/^\/[^\s]*$/.test(d.try_href)) return setMsg({ tone: 'err', text: 'The “Try it” link must be a page on this site, starting with / (for example /templates).' });
    const row = { title: d.title.trim(), slug: d.slug, tool: d.tool.trim(), minutes: Math.round(d.minutes), intro: d.intro.trim(), steps: lines(d.steps), task: d.task.trim(), try_href: d.try_href || '/templates', try_label: d.try_label.trim() || 'Try it', updated_at: new Date().toISOString() };
    const course = courses?.find((c) => c.id === d.course_id);
    const ok = await act(
      () => (d.id ? supabase.from('course_lessons').update(row).eq('id', d.id) : supabase.from('course_lessons').insert({ ...row, course_id: d.course_id, visible: false, sort: (course?.lessons.length || 0) + 1 })),
      d.id ? 'Lesson saved.' : 'Lesson added (hidden until you show it — learners will then need it for the certificate).',
    );
    if (ok) setEditLesson(null);
  };

  const toggleLesson = (l: Lesson) =>
    act(() => supabase.from('course_lessons').update({ visible: !l.visible }).eq('id', l.id), l.visible ? 'Lesson hidden — it no longer counts toward the certificate.' : 'Lesson shown — learners now need it for the certificate.');

  const deleteLesson = (l: Lesson) => {
    if (!window.confirm(`Delete the lesson “${l.title}”? This cannot be undone. (Hiding it keeps it for later.)`)) return;
    act(() => supabase.from('course_lessons').delete().eq('id', l.id), 'Lesson deleted.');
  };

  if (courses === null) return <div className={`${card} flex justify-center`}><Loader2 className="animate-spin text-mt-faint" aria-label="Loading" /></div>;

  const starter = courses.filter((c) => c.needs_review).length + courses.reduce((a, c) => a + c.lessons.filter((l) => l.needs_review).length, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-mt-muted max-w-2xl">
            Courses show on <a href="/tutorials" target="_blank" rel="noreferrer" className="underline">/tutorials</a> within a minute of saving. Only visible lessons count toward a certificate.
            {starter > 0 && <> <b className="text-mt-ink">{starter}</b> item{starter > 1 ? 's are' : ' is'} marked as starter content — please read and confirm them.</>}
          </p>
          <button className={`${btn} bg-mt-primary text-mt-onprimary`} onClick={() => setEditCourse({ title: '', slug: '', summary: '', level: 'Beginner', objectives: '', certificate_title: '', final_task: '', prerequisite_slug: '' })}><Plus size={14} /> New course</button>
        </div>
        {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`mt-3 text-[13px] ${msg.tone === 'err' ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{msg.text}</p>}
      </section>

      {editCourse && (
        <form onSubmit={saveCourse} className={card} aria-label={editCourse.id ? 'Edit course' : 'New course'}>
          <h3 className="text-lg font-semibold">{editCourse.id ? 'Edit course' : 'New course'}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-[13px] font-medium">Title<input required className={input} value={editCourse.title} onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value, slug: editCourse.id ? editCourse.slug : slugify(e.target.value) })} /></label>
            <label className="text-[13px] font-medium">Web address (/tutorials/…)<input required className={input} value={editCourse.slug} onChange={(e) => setEditCourse({ ...editCourse, slug: e.target.value.toLowerCase() })} /></label>
            <label className="text-[13px] font-medium sm:col-span-2">Short description<textarea className={input} rows={2} value={editCourse.summary} onChange={(e) => setEditCourse({ ...editCourse, summary: e.target.value })} /></label>
            <label className="text-[13px] font-medium">Level
              <select className={input} value={editCourse.level} onChange={(e) => setEditCourse({ ...editCourse, level: e.target.value as CourseLevel })}>
                <option>Beginner</option><option>Intermediate</option><option>Pro</option>
              </select>
            </label>
            <label className="text-[13px] font-medium">Requires this course’s certificate first
              <select className={input} value={editCourse.prerequisite_slug} onChange={(e) => setEditCourse({ ...editCourse, prerequisite_slug: e.target.value })}>
                <option value="">Nothing — open to everyone</option>
                {courses.filter((c) => c.slug !== editCourse.slug).map((c) => <option key={c.id} value={c.slug}>{c.title}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium sm:col-span-2">Learning objectives (one per line)<textarea className={input} rows={4} value={editCourse.objectives} onChange={(e) => setEditCourse({ ...editCourse, objectives: e.target.value })} /></label>
            <label className="text-[13px] font-medium">Title printed on the certificate<input className={input} value={editCourse.certificate_title} onChange={(e) => setEditCourse({ ...editCourse, certificate_title: e.target.value })} placeholder="Defaults to the course title" /></label>
            <label className="text-[13px] font-medium">Practice project (optional)<input className={input} value={editCourse.final_task} onChange={(e) => setEditCourse({ ...editCourse, final_task: e.target.value })} /></label>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy && <Loader2 size={14} className="animate-spin" />} Save course</button>
            <button type="button" onClick={() => setEditCourse(null)} className={`${btn} border border-mt-border`}>Cancel</button>
          </div>
        </form>
      )}

      {courses.length === 0 && <p className={`${card} text-mt-muted`}>No courses yet. Add your first course.</p>}

      {courses.map((c, i) => (
        <section key={c.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-mt-muted">{c.level}</span>
                {!c.visible && <span className="inline-flex items-center h-6 px-2 rounded-full bg-mt-surface2 text-[11px] font-semibold">Hidden</span>}
                {c.needs_review && <StarterBadge />}
              </div>
              <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
              <p className="text-[13px] text-mt-muted">/tutorials/{c.slug} · {c.lessons.filter((l) => l.visible).length} visible lessons · {progressCount[c.id] || 0} learners</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button aria-label={`Move ${c.title} up`} disabled={busy || i === 0} onClick={() => move('courses', courses, i, -1)} className={`${btn} border border-mt-border px-2.5`}><ArrowUp size={14} /></button>
              <button aria-label={`Move ${c.title} down`} disabled={busy || i === courses.length - 1} onClick={() => move('courses', courses, i, 1)} className={`${btn} border border-mt-border px-2.5`}><ArrowDown size={14} /></button>
              <button disabled={busy} onClick={() => act(() => supabase.from('courses').update({ visible: !c.visible }).eq('id', c.id), c.visible ? 'Course hidden.' : 'Course is now public.')} className={`${btn} border border-mt-border`}>{c.visible ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show</>}</button>
              <button onClick={() => setEditCourse({ id: c.id, title: c.title, slug: c.slug, summary: c.summary, level: c.level, objectives: c.objectives.join('\n'), certificate_title: c.certificate_title, final_task: c.final_task, prerequisite_slug: c.prerequisite_slug || '' })} className={`${btn} border border-mt-border`}><Pencil size={14} /> Edit</button>
              {c.needs_review && <button disabled={busy} onClick={() => act(() => supabase.from('courses').update({ needs_review: false }).eq('id', c.id), 'Course marked as reviewed.')} className={`${btn} border border-emerald-500/50 text-emerald-700 dark:text-emerald-300`}><ShieldCheck size={14} /> Mark reviewed</button>}
              <button disabled={busy} onClick={() => deleteCourse(c)} aria-label={`Delete ${c.title}`} className={`${btn} border border-mt-border text-rose-600`}><Trash2 size={14} /></button>
            </div>
          </div>

          <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="mt-4 text-[13px] font-semibold underline underline-offset-2">{open === c.id ? 'Hide lessons' : `Manage lessons (${c.lessons.length})`}</button>
          {open === c.id && (
            <div className="mt-3">
              <ol className="divide-y divide-mt-border rounded-2xl border border-mt-border">
                {c.lessons.map((l, j) => (
                  <li key={l.id} className="px-3 py-2.5 flex flex-wrap items-center gap-2">
                    <span className="flex-1 min-w-[180px] text-[14px]">
                      {j + 1}. {l.title} <span className="text-mt-muted text-[12px]">· {l.minutes} min</span>
                      {!l.visible && <span className="ml-2 text-[11px] font-semibold text-mt-muted">(hidden)</span>}
                      {l.needs_review && <span className="ml-2"><StarterBadge /></span>}
                    </span>
                    <button aria-label={`Move ${l.title} up`} disabled={busy || j === 0} onClick={() => move('course_lessons', c.lessons, j, -1)} className={`${btn} border border-mt-border px-2`}><ArrowUp size={13} /></button>
                    <button aria-label={`Move ${l.title} down`} disabled={busy || j === c.lessons.length - 1} onClick={() => move('course_lessons', c.lessons, j, 1)} className={`${btn} border border-mt-border px-2`}><ArrowDown size={13} /></button>
                    <button disabled={busy} onClick={() => toggleLesson(l)} aria-label={l.visible ? `Hide ${l.title}` : `Show ${l.title}`} className={`${btn} border border-mt-border px-2.5`}>{l.visible ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                    <button onClick={() => setEditLesson({ id: l.id, course_id: c.id, title: l.title, slug: l.slug, tool: l.tool, minutes: l.minutes, intro: l.intro, steps: l.steps.join('\n'), task: l.task, try_href: l.try_href, try_label: l.try_label })} className={`${btn} border border-mt-border px-2.5`} aria-label={`Edit ${l.title}`}><Pencil size={13} /></button>
                    {l.needs_review && <button disabled={busy} onClick={() => act(() => supabase.from('course_lessons').update({ needs_review: false }).eq('id', l.id), 'Lesson marked as reviewed.')} className={`${btn} border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 px-2.5`} aria-label={`Mark ${l.title} reviewed`}><ShieldCheck size={13} /></button>}
                    <button disabled={busy} onClick={() => deleteLesson(l)} className={`${btn} border border-mt-border text-rose-600 px-2.5`} aria-label={`Delete ${l.title}`}><Trash2 size={13} /></button>
                  </li>
                ))}
              </ol>
              <button onClick={() => setEditLesson({ course_id: c.id, title: '', slug: '', tool: '', minutes: 5, intro: '', steps: '', task: '', try_href: '/templates', try_label: 'Try it' })} className={`${btn} mt-3 border border-mt-border`}><Plus size={14} /> Add lesson</button>
            </div>
          )}

          {editLesson && editLesson.course_id === c.id && (
            <form onSubmit={saveLesson} className="mt-4 rounded-2xl border border-mt-border p-4" aria-label={editLesson.id ? 'Edit lesson' : 'New lesson'}>
              <h4 className="font-semibold">{editLesson.id ? 'Edit lesson' : 'New lesson'}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-[13px] font-medium">Title<input required className={input} value={editLesson.title} onChange={(e) => setEditLesson({ ...editLesson, title: e.target.value, slug: editLesson.id ? editLesson.slug : slugify(e.target.value) })} /></label>
                <label className="text-[13px] font-medium">Web address<input required className={input} value={editLesson.slug} onChange={(e) => setEditLesson({ ...editLesson, slug: e.target.value.toLowerCase() })} /></label>
                <label className="text-[13px] font-medium">Tool / topic<input className={input} value={editLesson.tool} onChange={(e) => setEditLesson({ ...editLesson, tool: e.target.value })} /></label>
                <label className="text-[13px] font-medium">Minutes<input type="number" min={1} max={600} className={input} value={editLesson.minutes} onChange={(e) => setEditLesson({ ...editLesson, minutes: Number(e.target.value) })} /></label>
                <label className="text-[13px] font-medium sm:col-span-2">Introduction<textarea className={input} rows={2} value={editLesson.intro} onChange={(e) => setEditLesson({ ...editLesson, intro: e.target.value })} /></label>
                <label className="text-[13px] font-medium sm:col-span-2">Steps (one per line)<textarea className={input} rows={5} value={editLesson.steps} onChange={(e) => setEditLesson({ ...editLesson, steps: e.target.value })} /></label>
                <label className="text-[13px] font-medium sm:col-span-2">Task<input className={input} value={editLesson.task} onChange={(e) => setEditLesson({ ...editLesson, task: e.target.value })} /></label>
                <label className="text-[13px] font-medium">“Try it” link (page on this site)<input className={input} value={editLesson.try_href} onChange={(e) => setEditLesson({ ...editLesson, try_href: e.target.value })} /></label>
                <label className="text-[13px] font-medium">“Try it” button text<input className={input} value={editLesson.try_label} onChange={(e) => setEditLesson({ ...editLesson, try_label: e.target.value })} /></label>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy && <Loader2 size={14} className="animate-spin" />} Save lesson</button>
                <button type="button" onClick={() => setEditLesson(null)} className={`${btn} border border-mt-border`}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      ))}
    </div>
  );
}
