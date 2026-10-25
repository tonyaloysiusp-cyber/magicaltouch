'use client';

// Tutorial submissions (admins only): learners finish a level and submit a
// design. Approve → a verified certificate is issued, its PDF is stored for
// the learner, and the next level unlocks. Or send it back with a note.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, Check, Loader2, RotateCcw, GraduationCap } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { newCertificateCode } from '@/lib/certificates';
import { packageCertificates } from '@/lib/certificatesBulk';
import { LEVELS, LevelId, levelById } from '@/lib/tutorials';

interface Row { id: string; user_id: string; level: LevelId; completed_tasks: string[]; status: string; learner_name: string | null; work_name: string | null; work_preview: string | null; review_note: string | null; certificate_code: string | null; submitted_at: string | null; reviewed_at: string | null; updated_at: string }
interface Master { id: string; name: string; tags: string[]; canvas_json: any }

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

export default function TutorialAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [rows, setRows] = useState<Row[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [masterId, setMasterId] = useState('');
  const [filter, setFilter] = useState<'submitted' | 'approved' | 'rejected' | 'in_progress'>('submitted');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('tutorial_progress').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('templates').select('id, name, tags, canvas_json').contains('tags', ['certificate-master']).order('name'),
    ]);
    setRows((r as Row[]) || []);
    const ms = ((m as Master[]) || []).sort((a, b) => Number((b.tags || []).includes('secure')) - Number((a.tags || []).includes('secure')));
    setMasters(ms);
    setMasterId((id) => id || (ms.find((x) => /Achievement/.test(x.name)) || ms[0])?.id || '');
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin/tutorials');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
      setState('ok');
    })();
  }, [router, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [rows]);

  const approve = async (r: Row) => {
    const master = masters.find((m) => m.id === masterId);
    if (!master) return setMsg('Choose a certificate design first.');
    setBusy(r.id);
    setMsg(null);
    try {
      const lv = levelById(r.level);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: issue, error } = await supabase
        .from('certificate_issues')
        .insert({ code: newCertificateCode(), recipient: (r.learner_name || 'Learner').trim(), title: lv.certificateTitle, description: `Completed all ${lv.lessons.length} lessons and the final project`, issued_on: new Date().toISOString().slice(0, 10), template_id: master.id, created_by: user?.id })
        .select('*')
        .single();
      if (error || !issue) throw new Error(error?.message || 'Could not issue the certificate.');
      const { blob } = await packageCertificates(master.canvas_json, [issue as any], 'pdf');
      const path = `${r.user_id}/${(issue as any).code}.pdf`;
      const up = await supabase.storage.from('certificates').upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (up.error) throw new Error(up.error.message);
      await supabase.from('tutorial_progress').update({ status: 'approved', certificate_code: (issue as any).code, certificate_path: path, review_note: notes[r.id] || null, reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', r.id);
      setMsg(`Approved — certificate ${(issue as any).code} issued to ${r.learner_name}.`);
      await load();
    } catch (e: any) {
      setMsg(`Could not approve: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const reject = async (r: Row) => {
    setBusy(r.id);
    await supabase.from('tutorial_progress').update({ status: 'rejected', review_note: notes[r.id] || 'Please improve the design and submit again.', reviewed_at: new Date().toISOString() }).eq('id', r.id);
    await load();
    setBusy(null);
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  const list = rows.filter((r) => r.status === filter);
  return (
    <AdminShell active="tutorials" title="Tutorial certificates" accent="Tutorial" subtitle="Learners finish a level and submit a design. Approve it to issue their verified certificate and unlock the next level.">
      <div className="flex flex-col gap-6">
        <section className={card}>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              {(['submitted', 'approved', 'rejected', 'in_progress'] as const).map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`h-8 px-3 rounded-full text-[13px] border ${filter === s ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted'}`}>
                  {s === 'submitted' ? 'Waiting for review' : s === 'in_progress' ? 'Learning' : s[0].toUpperCase() + s.slice(1)} <span className="opacity-60">{counts[s] || 0}</span>
                </button>
              ))}
            </div>
            <label className="text-[12px] text-mt-muted inline-flex items-center gap-2">Certificate design
              <select value={masterId} onChange={(e) => setMasterId(e.target.value)} className="h-9 rounded-xl border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink">
                {masters.map((m) => <option key={m.id} value={m.id}>{m.name.replace(/^MT Brand · /, '')}</option>)}
              </select>
            </label>
          </div>
          {msg && <p className="mt-3 text-[13px] text-mt-ink">{msg}</p>}
        </section>

        {list.length === 0 && <p className={`${card} text-mt-muted`}>Nothing here yet.</p>}
        {list.map((r) => {
          const lv = levelById(r.level);
          const done = r.completed_tasks.filter((t) => lv.lessons.some((x) => x.id === t)).length;
          return (
            <section key={r.id} className={`${card} grid gap-5 md:grid-cols-[260px_1fr]`}>
              <div className="rounded-2xl bg-mt-surface2 border border-mt-border aspect-[4/3] flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.work_preview ? <img src={r.work_preview} alt={r.work_name || 'Submitted design'} className="max-h-full max-w-full object-contain" /> : <GraduationCap size={28} className="text-mt-faint" />}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold">{r.learner_name || 'Learner'} <span className="text-mt-muted font-normal text-[14px]">· {lv.name}</span></p>
                <p className="text-[13px] text-mt-muted">Design: <b className="text-mt-ink">{r.work_name || '—'}</b> · tasks {done}/{lv.lessons.length}{r.submitted_at ? ` · submitted ${new Date(r.submitted_at).toLocaleString('en-GB')}` : ''}</p>
                <p className="text-[13px] text-mt-muted">Final project: {lv.finalTask}</p>
                {r.certificate_code && <p className="text-[13px]">Certificate <span className="font-mono">{r.certificate_code}</span></p>}
                {r.status === 'submitted' && (
                  <>
                    <input value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Note to the learner (optional)" className="mt-1 h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink" />
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy === r.id} onClick={() => approve(r)} className={`${btn} bg-emerald-600 text-white`}>{busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve & issue certificate</button>
                      <button disabled={busy === r.id} onClick={() => reject(r)} className={`${btn} border border-mt-border text-mt-ink`}><RotateCcw size={14} /> Send back</button>
                    </div>
                  </>
                )}
                {r.status === 'approved' && <p className="text-[13px] text-emerald-600 inline-flex items-center gap-1.5"><Award size={14} /> Approved{r.reviewed_at ? ` ${new Date(r.reviewed_at).toLocaleDateString('en-GB')}` : ''}</p>}
                {r.status === 'rejected' && r.review_note && <p className="text-[13px] text-amber-600">Sent back: {r.review_note}</p>}
              </div>
            </section>
          );
        })}
        <p className="text-[12px] text-mt-muted">Levels: {LEVELS.map((l) => l.name).join(' → ')}. Certificates appear in Verified certificates too.</p>
      </div>
    </AdminShell>
  );
}
