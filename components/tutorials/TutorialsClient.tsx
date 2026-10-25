'use client';

// Tutorials: three levels of hands-on lessons. Tick each task as you do it;
// when a level is complete, submit one design you made. An admin reviews it
// and issues a verified certificate, which unlocks the next level.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Check, ChevronRight, Clock, Download, ExternalLink, Loader2, Lock, PlayCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LEVELS, Level, LevelId } from '@/lib/tutorials';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { verifyUrl } from '@/lib/certificates';

interface Progress {
  id?: string;
  level: LevelId;
  completed_tasks: string[];
  status: 'in_progress' | 'submitted' | 'approved' | 'rejected';
  learner_name?: string | null;
  work_name?: string | null;
  review_note?: string | null;
  certificate_code?: string | null;
  certificate_path?: string | null;
}
interface DesignRow { id: string; name: string; thumbnail: string | null; canvas_json?: any; updated_at: string }

const LOCAL_KEY = 'mt:tutorials';
const emptyProgress = (level: LevelId): Progress => ({ level, completed_tasks: [], status: 'in_progress' });

function readLocal(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}
function writeLocal(v: Record<string, string[]>) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(v)); } catch {}
}

// A small JPEG of the chosen design for the reviewer.
async function previewFor(d: DesignRow): Promise<string | null> {
  if (d.thumbnail && /^data:image\//.test(d.thumbnail) && d.thumbnail.length < 400_000) return d.thumbnail;
  let json = d.canvas_json;
  if (!json) {
    const { data } = await supabase.from('designs').select('canvas_json').eq('id', d.id).maybeSingle();
    json = (data as any)?.canvas_json;
  }
  if (!json) return d.thumbnail || null;
  const pages = await renderTemplatePages(json, 900).catch(() => []);
  return pages[0]?.url || d.thumbnail || null;
}

export function TutorialsClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [progress, setProgress] = useState<Record<LevelId, Progress>>({ beginner: emptyProgress('beginner'), intermediate: emptyProgress('intermediate'), pro: emptyProgress('pro') });
  const [active, setActive] = useState<LevelId>('beginner');
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const base = { beginner: emptyProgress('beginner'), intermediate: emptyProgress('intermediate'), pro: emptyProgress('pro') } as Record<LevelId, Progress>;
    const local = readLocal();
    (Object.keys(base) as LevelId[]).forEach((k) => (base[k].completed_tasks = local[k] || []));
    if (user) {
      setUserId(user.id);
      const [{ data: rows }, { data: prof }] = await Promise.all([
        supabase.from('tutorial_progress').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('name, is_admin').eq('id', user.id).maybeSingle(),
      ]);
      setIsAdmin(!!(prof as any)?.is_admin);
      setProfileName(((prof as any)?.name as string) || '');
      ((rows as Progress[]) || []).forEach((r) => {
        // Merge ticks made before signing in.
        base[r.level] = { ...r, completed_tasks: [...new Set([...(r.completed_tasks || []), ...base[r.level].completed_tasks])] };
      });
    }
    setProgress(base);
    setReady(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const unlocked = (id: LevelId) => {
    if (isAdmin || id === 'beginner') return true;
    if (id === 'intermediate') return progress.beginner.status === 'approved';
    return progress.intermediate.status === 'approved';
  };

  const save = async (level: LevelId, patch: Partial<Progress>) => {
    const next = { ...progress[level], ...patch };
    setProgress((p) => ({ ...p, [level]: next }));
    writeLocal({ ...readLocal(), [level]: next.completed_tasks });
    if (!userId) return;
    const row = { user_id: userId, level, completed_tasks: next.completed_tasks, status: next.status === 'approved' ? 'approved' : next.status, updated_at: new Date().toISOString() } as any;
    if (patch.learner_name !== undefined) row.learner_name = patch.learner_name;
    if ((patch as any).work_name !== undefined) row.work_name = (patch as any).work_name;
    if ((patch as any).work_preview !== undefined) row.work_preview = (patch as any).work_preview;
    if ((patch as any).submitted_at !== undefined) row.submitted_at = (patch as any).submitted_at;
    if (next.status === 'approved') return; // locked once approved
    await supabase.from('tutorial_progress').upsert(row, { onConflict: 'user_id,level' });
  };

  const toggleTask = (level: LevelId, lessonId: string) => {
    const p = progress[level];
    if (p.status === 'approved' || p.status === 'submitted') return;
    const has = p.completed_tasks.includes(lessonId);
    save(level, { completed_tasks: has ? p.completed_tasks.filter((x) => x !== lessonId) : [...p.completed_tasks, lessonId] });
  };

  const level = LEVELS.find((l) => l.id === active)!;
  const totalDone = LEVELS.reduce((a, l) => a + progress[l.id].completed_tasks.filter((t) => l.lessons.some((x) => x.id === t)).length, 0);
  const totalLessons = LEVELS.reduce((a, l) => a + l.lessons.length, 0);

  return (
    <div className="mt-container py-6 sm:py-10">
      <header className="max-w-3xl">
        <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-mt-muted">Tutorials</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">Learn design, step by step</h1>
        <p className="mt-4 text-lg text-mt-muted leading-relaxed">Three levels — Beginner, Intermediate and Pro. Each lesson teaches one part of Magical Touch and ends with a small task. Finish a level, submit one design you made, and earn a verified certificate.</p>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-mt-surface2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(totalDone / totalLessons) * 100}%`, background: 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B)' }} /></div>
          <span className="text-[13px] text-mt-muted tabular-nums">{totalDone} / {totalLessons} tasks</span>
        </div>
        {!userId && ready && <p className="mt-3 text-[13px] text-mt-muted">Your ticks are saved on this device. <Link href="/login?next=/tutorials" className="font-semibold text-mt-ink underline">Sign in</Link> to keep your progress and get certificates.</p>}
      </header>

      <nav role="tablist" aria-label="Levels" className="mt-10 grid gap-3 sm:grid-cols-3">
        {LEVELS.map((l) => {
          const p = progress[l.id];
          const done = p.completed_tasks.filter((t) => l.lessons.some((x) => x.id === t)).length;
          const open = unlocked(l.id);
          return (
            <button key={l.id} role="tab" aria-selected={active === l.id} onClick={() => setActive(l.id)} className={`text-left rounded-2xl border p-4 transition-colors ${active === l.id ? 'border-mt-ink bg-mt-surface' : 'border-mt-border hover:bg-mt-surface2'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{l.name}</span>
                {p.status === 'approved' ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600"><Award size={14} /> Certified</span> : !open ? <Lock size={15} className="text-mt-faint" /> : <span className="text-[12px] text-mt-muted">{done}/{l.lessons.length}</span>}
              </span>
              <span className="mt-1 block text-[13px] text-mt-muted">{l.summary}</span>
            </button>
          );
        })}
      </nav>

      <LevelView key={level.id} level={level} progress={progress[level.id]} open={unlocked(level.id)} signedIn={!!userId} userId={userId} profileName={profileName} onToggle={(id) => toggleTask(level.id, id)} onSubmitted={load} save={save} />
    </div>
  );
}

function LevelView({ level, progress, open, signedIn, userId, profileName, onToggle, onSubmitted, save }: { level: Level; progress: Progress; open: boolean; signedIn: boolean; userId: string | null; profileName: string; onToggle: (id: string) => void; onSubmitted: () => void; save: (l: LevelId, p: any) => Promise<void> }) {
  const done = progress.completed_tasks.filter((t) => level.lessons.some((x) => x.id === t)).length;
  const complete = done === level.lessons.length;
  const prevName = level.id === 'intermediate' ? 'Beginner' : 'Intermediate';
  return (
    <section className="mt-8">
      {!open && (
        <p className="mb-5 rounded-2xl border border-mt-border bg-mt-surface2 px-4 py-3 text-[14px] text-mt-muted inline-flex items-center gap-2"><Lock size={15} /> You can read these lessons now. Tasks and the certificate open after your {prevName} certificate is approved.</p>
      )}
      <ol className="grid gap-4 lg:grid-cols-2">
        {level.lessons.map((ls, i) => {
          const ticked = progress.completed_tasks.includes(ls.id);
          return (
            <li key={ls.id} className={`rounded-3xl border p-5 sm:p-6 flex flex-col ${ticked ? 'border-emerald-500/50' : 'border-mt-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] text-mt-muted">Lesson {i + 1} · {ls.tool} · <Clock size={11} className="inline -mt-0.5" /> {ls.minutes} min</p>
                  <h2 className="mt-1 text-lg font-semibold">{ls.title}</h2>
                </div>
                {ticked && <span className="shrink-0 h-7 w-7 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center"><Check size={15} /></span>}
              </div>
              <p className="mt-2 text-[14px] text-mt-muted">{ls.intro}</p>
              <ol className="mt-3 space-y-1.5 text-[14px] list-decimal pl-5">
                {ls.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <div className="mt-4 rounded-2xl bg-mt-surface2 px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">Your task</p>
                <p className="mt-1 text-[14px]">{ls.task}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 mt-auto pt-4">
                <Link href={ls.tryHref} className="h-10 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-surface2"><PlayCircle size={15} /> {ls.tryLabel}</Link>
                <button type="button" disabled={!open || progress.status === 'approved' || progress.status === 'submitted'} onClick={() => onToggle(ls.id)} className={`h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 ${ticked ? 'bg-emerald-600 text-white' : 'bg-mt-primary text-mt-onprimary'}`}>
                  <Check size={15} /> {ticked ? 'Done' : 'I did this task'}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-3xl border border-mt-border p-6 sm:p-8">
        <h2 className="text-xl font-semibold inline-flex items-center gap-2"><Award size={20} /> {level.badge} certificate</h2>
        <p className="mt-2 text-[14px] text-mt-muted"><b className="text-mt-ink">Final project:</b> {level.finalTask}</p>
        <SubmitPanel level={level} progress={progress} open={open} complete={complete} signedIn={signedIn} userId={userId} profileName={profileName} save={save} onSubmitted={onSubmitted} />
      </div>
    </section>
  );
}

function SubmitPanel({ level, progress, open, complete, signedIn, userId, profileName, save, onSubmitted }: { level: Level; progress: Progress; open: boolean; complete: boolean; signedIn: boolean; userId: string | null; profileName: string; save: (l: LevelId, p: any) => Promise<void>; onSubmitted: () => void }) {
  const [designs, setDesigns] = useState<DesignRow[] | null>(null);
  const [pick, setPick] = useState<string>('');
  const [name, setName] = useState(progress.learner_name || profileName);
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useState(false);
  useEffect(() => setName((n) => n || progress.learner_name || profileName), [profileName, progress.learner_name]);

  const loadDesigns = async () => {
    const { data } = await supabase.from('designs').select('id, name, thumbnail, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(30);
    setDesigns((data as DesignRow[]) || []);
  };

  const submit = async () => {
    const d = designs?.find((x) => x.id === pick);
    if (!d || !name.trim()) return;
    setBusy(true);
    const work_preview = await previewFor(d);
    await save(level.id, { status: 'submitted', learner_name: name.trim(), work_name: d.name, work_preview, submitted_at: new Date().toISOString() });
    setBusy(false);
    onSubmitted();
  };

  const download = async () => {
    if (!progress.certificate_path) return;
    setDl(true);
    const { data } = await supabase.storage.from('certificates').createSignedUrl(progress.certificate_path, 120);
    setDl(false);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (progress.status === 'approved')
    return (
      <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-2"><Award size={18} /> Approved — congratulations{progress.learner_name ? `, ${progress.learner_name}` : ''}!</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {progress.certificate_path && <button onClick={download} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5">{dl ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download certificate (PDF)</button>}
          {progress.certificate_code && <a href={verifyUrl(progress.certificate_code)} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><ExternalLink size={15} /> Check it · {progress.certificate_code}</a>}
        </div>
      </div>
    );
  if (progress.status === 'submitted')
    return <p className="mt-5 rounded-2xl bg-mt-surface2 px-4 py-3 text-[14px]">Submitted “{progress.work_name}” — waiting for review. You’ll see your certificate here once it’s approved.</p>;
  if (!open) return <p className="mt-5 text-[14px] text-mt-muted">Unlocks after the previous level is approved.</p>;
  if (!complete) return <p className="mt-5 text-[14px] text-mt-muted">Finish all {level.lessons.length} tasks above to submit your final project.</p>;
  if (!signedIn) return <p className="mt-5 text-[14px]"><Link href="/login?next=/tutorials" className="font-semibold underline">Sign in</Link> to submit your final project and receive your certificate.</p>;
  return (
    <div className="mt-5">
      {progress.status === 'rejected' && <p className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-[14px]">Your last submission needs a little more work{progress.review_note ? `: ${progress.review_note}` : '.'} Improve it and submit again.</p>}
      <label className="block text-[13px] text-mt-muted max-w-md">Name on your certificate
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink" />
      </label>
      {designs === null ? (
        <button onClick={loadDesigns} className="mt-4 h-10 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5">Choose the design to submit <ChevronRight size={15} /></button>
      ) : designs.length === 0 ? (
        <p className="mt-4 text-[14px] text-mt-muted">You have no saved designs yet. Make your final project, save it, then come back.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {designs.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => setPick(d.id)} className={`w-full text-left rounded-2xl border p-2 ${pick === d.id ? 'border-mt-ink ring-2 ring-[#3B82C4]' : 'border-mt-border'}`}>
                <span className="block aspect-[4/5] rounded-xl bg-mt-surface2 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.thumbnail ? <img src={d.thumbnail} alt="" className="w-full h-full object-contain" /> : null}
                </span>
                <span className="mt-1.5 block text-[12px] font-medium truncate">{d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {designs && designs.length > 0 && (
        <button disabled={!pick || !name.trim() || busy} onClick={submit} className="mt-4 h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit for review</button>
      )}
    </div>
  );
}
