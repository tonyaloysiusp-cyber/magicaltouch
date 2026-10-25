// Tutorials & courses: shared types, status rules and data loading.
//
// Courses and lessons live in the database (Admin → Courses). A learner's
// progress is one course_progress row per course. Every rule that matters
// (all lessons done, full name given, previous level approved, only admins
// approve / reject / release) is enforced by the course_progress_guard
// trigger in the database — the UI only mirrors it.

import type { SupabaseClient } from '@supabase/supabase-js';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Pro';

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: CourseLevel;
  objectives: string[];
  certificate_title: string;
  final_task: string;
  prerequisite_slug: string | null;
  visible: boolean;
  sort: number;
  needs_review?: boolean;
}

export interface Lesson {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  tool: string;
  minutes: number;
  intro: string;
  steps: string[];
  task: string;
  try_href: string;
  try_label: string;
  visible: boolean;
  sort: number;
  needs_review?: boolean;
}

export interface CourseWithLessons extends Course { lessons: Lesson[] }

export type DbStatus = 'in_progress' | 'pending' | 'approved' | 'rejected';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  completed_lessons: string[];
  status: DbStatus;
  learner_name: string | null;
  review_note: string | null;
  certificate_code: string | null;
  certificate_path: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  released_at: string | null;
  updated_at?: string;
}

// What a learner sees. "approved" = approved, certificate not released yet.
export type LearnerStatus = 'not_started' | 'in_progress' | 'completed' | 'pending' | 'approved' | 'released' | 'rejected';

export const STATUS_LABEL: Record<LearnerStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  pending: 'Pending Approval',
  approved: 'Approved',
  released: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_TONE: Record<LearnerStatus, string> = {
  not_started: 'bg-mt-surface2 text-mt-muted',
  in_progress: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  completed: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  pending: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  released: 'bg-emerald-600 text-white',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export function doneCount(p: Pick<CourseProgress, 'completed_lessons'> | null | undefined, lessons: Pick<Lesson, 'id'>[]) {
  if (!p) return 0;
  const set = new Set(p.completed_lessons || []);
  return lessons.filter((l) => set.has(l.id)).length;
}

export function learnerStatus(p: CourseProgress | null | undefined, lessons: Pick<Lesson, 'id'>[]): LearnerStatus {
  if (!p) return 'not_started';
  if (p.status === 'approved') return p.released_at && p.certificate_path ? 'released' : 'approved';
  if (p.status === 'pending') return 'pending';
  if (p.status === 'rejected') return 'rejected';
  const done = doneCount(p, lessons);
  if (lessons.length > 0 && done >= lessons.length) return 'completed';
  return done > 0 ? 'in_progress' : 'not_started';
}

export const totalMinutes = (lessons: Pick<Lesson, 'minutes'>[]) => lessons.reduce((a, l) => a + (l.minutes || 0), 0);
export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

// Same rule as the database: trimmed, single spaces, at least 3 characters,
// letters required, no digits or symbols that never appear in names.
export function normaliseName(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}
export function nameProblem(s: string): string | null {
  const n = normaliseName(s);
  if (n.length < 3) return 'Enter your full name as it should appear on the certificate.';
  if (n.length > 80) return 'That name is too long for a certificate (80 characters at most).';
  // RegExp from a string: tsconfig targets ES2017, which rejects \p{..} literals.
  if (!new RegExp('\\p{L}', 'u').test(n)) return 'A name needs letters.';
  if (/[0-9@#$%^*_=+<>{}\[\]|\\/~`]/.test(n)) return 'Use letters only — no numbers or symbols.';
  return null;
}

// ------------------------------------------------------------------ loading
const COURSE_COLS = 'id, slug, title, summary, level, objectives, certificate_title, final_task, prerequisite_slug, visible, sort, needs_review';
const LESSON_COLS = 'id, course_id, slug, title, tool, minutes, intro, steps, task, try_href, try_label, visible, sort, needs_review';

export async function loadCourses(sb: SupabaseClient, opts: { includeHidden?: boolean } = {}): Promise<CourseWithLessons[]> {
  let cq = sb.from('courses').select(COURSE_COLS).order('sort').order('title');
  let lq = sb.from('course_lessons').select(LESSON_COLS).order('sort').order('title');
  if (!opts.includeHidden) {
    cq = cq.eq('visible', true);
    lq = lq.eq('visible', true);
  }
  const [{ data: cs }, { data: ls }] = await Promise.all([cq, lq]);
  const lessons = (ls as Lesson[]) || [];
  return ((cs as Course[]) || []).map((c) => ({ ...c, objectives: c.objectives || [], lessons: lessons.filter((l) => l.course_id === c.id).map((l) => ({ ...l, steps: l.steps || [] })) }));
}

export async function loadCourse(sb: SupabaseClient, slug: string): Promise<CourseWithLessons | null> {
  const { data: c } = await sb.from('courses').select(COURSE_COLS).eq('slug', slug).eq('visible', true).maybeSingle();
  if (!c) return null;
  const { data: ls } = await sb.from('course_lessons').select(LESSON_COLS).eq('course_id', (c as Course).id).eq('visible', true).order('sort').order('title');
  return { ...(c as Course), objectives: (c as Course).objectives || [], lessons: ((ls as Lesson[]) || []).map((l) => ({ ...l, steps: l.steps || [] })) };
}

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
