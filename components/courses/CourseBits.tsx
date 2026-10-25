'use client';

import { STATUS_LABEL, STATUS_TONE, LearnerStatus, CourseLevel } from '@/lib/courses';

export const GRADIENT = 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B)';

export function StatusBadge({ status, className = '' }: { status: LearnerStatus; className?: string }) {
  const label = status === 'approved' ? 'Approved · awaiting release' : STATUS_LABEL[status];
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${STATUS_TONE[status]} ${className}`}>{label}</span>;
}

export function LevelBadge({ level }: { level: CourseLevel }) {
  const tone = level === 'Beginner' ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : level === 'Intermediate' ? 'border-sky-500/40 text-sky-700 dark:text-sky-300' : 'border-violet-500/40 text-violet-700 dark:text-violet-300';
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[12px] font-semibold ${tone}`}>{level}</span>;
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-mt-surface2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label || 'Lessons completed'}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: GRADIENT }} />
      </div>
      <span className="text-[12px] text-mt-muted tabular-nums whitespace-nowrap">{done}/{total} lessons</span>
    </div>
  );
}
