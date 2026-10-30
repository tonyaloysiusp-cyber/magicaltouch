'use client';

// Festival planner (Admin → Festivals & occasions → "Plan & schedule").
//  · Auto plan: one tap builds the posting sequence (teaser → day → thank
//    you) across Instagram, stories, Facebook, LinkedIn, WhatsApp, Pinterest
//  · Manual: add, edit or delete any post yourself
//  · Each post: date, channel, caption to copy, "Make the design" (opens the
//    AI Studio with the right brief and size) and "Posted" tick
//  · Template ideas for the occasion and 40+ free creative tools

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, Copy, ExternalLink, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildPlan, CHANNELS, CHANNEL_FORMAT, PlanPost, studioTopic } from '@/lib/occasionPlan';
import { FREE_TOOLS, FREE_TOOL_COUNT } from '@/lib/freeTools';

const field = 'w-full h-9 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-[13px] text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

interface Occ { id: string; name: string; occasion_date: string; region: string; ideas: string | null }
interface Post { id: string; name: string; status: 'todo' | 'doing' | 'done'; meta: PlanPost & { occasion_id: string } }

const IDEAS = ['greeting post', 'story', 'offer / sale post', 'WhatsApp status', 'greeting card', 'LinkedIn company greeting', 'poster for print', 'invitation'];
const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const studio = (topic: string) => `/admin/templates?claude=${encodeURIComponent(topic)}`;

export function OccasionPlanner({ occasion, onClose, flash }: { occasion: Occ; onClose: () => void; flash: (m: string) => void }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [adding, setAdding] = useState<PlanPost | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'plan' | 'ideas' | 'tools'>('plan');

  const load = async () => {
    const { data } = await supabase.from('promo_items').select('id,name,status,meta').eq('kind', 'post').eq('meta->>occasion_id', occasion.id);
    setPosts(((data as Post[]) || []).sort((a, b) => a.meta.post_on.localeCompare(b.meta.post_on)));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [occasion.id]);

  const insert = async (list: PlanPost[]) => {
    if (!list.length) return;
    const { error } = await supabase.from('promo_items').insert(list.map((p) => ({ kind: 'post', name: p.title, status: 'todo', meta: { ...p, occasion_id: occasion.id } })));
    if (error) return flash(error.message);
    load();
  };
  const autoPlan = async () => {
    const have = new Set((posts || []).map((p) => `${p.meta.post_on}|${p.meta.channel}`));
    const plan = buildPlan(occasion).filter((p) => !have.has(`${p.post_on}|${p.channel}`));
    if (!plan.length) return flash('Nothing to add — the plan is already scheduled (or the dates have passed).');
    await insert(plan);
    flash(`${plan.length} posts scheduled for ${occasion.name}.`);
  };
  const setStatus = async (p: Post) => { await supabase.from('promo_items').update({ status: p.status === 'done' ? 'todo' : 'done', updated_at: new Date().toISOString() }).eq('id', p.id); load(); };
  const remove = async (p: Post) => { await supabase.from('promo_items').delete().eq('id', p.id); load(); };
  const saveManual = async () => {
    if (!adding || !adding.post_on || !adding.title.trim()) return flash('Add a title and a date.');
    await insert([{ ...adding, title: adding.title.trim(), format: CHANNEL_FORMAT[adding.channel] }]);
    setAdding(null);
  };
  const copy = (id: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  const done = (posts || []).filter((p) => p.status === 'done').length;
  const calendarLink = useMemo(() => {
    const d = occasion.occasion_date.replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${occasion.name} — post day`)}&dates=${d}/${d}&details=${encodeURIComponent('Posting plan: Admin → Festivals & occasions')}`;
  }, [occasion]);

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Plan ${occasion.name}`} className="bg-mt-surface text-mt-ink w-full sm:max-w-4xl max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 h-14 border-b border-mt-border shrink-0">
          <div className="flex-1 min-w-0"><h2 className="font-semibold truncate">{occasion.name}</h2><p className="text-[12px] text-mt-faint">{fmtDay(occasion.occasion_date)} · {occasion.region}</p></div>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        <div className="px-5 pt-3 flex gap-2 overflow-x-auto mt-scroll shrink-0">
          {([['plan', `Posting plan${posts?.length ? ` · ${done}/${posts.length}` : ''}`], ['ideas', 'Template ideas'], ['tools', `${FREE_TOOL_COUNT} free tools`]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 h-8 px-3 rounded-full text-[12px] border ${tab === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {tab === 'plan' && (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={autoPlan} className={`${btn} bg-mt-primary text-mt-onprimary`}><Wand2 size={14} /> {posts?.length ? 'Add missing posts' : 'Auto-plan all posts'}</button>
                <button onClick={() => setAdding({ title: '', post_on: occasion.occasion_date, channel: 'Instagram', format: 'post45', caption: '' })} className={`${btn} border border-mt-border`}><Plus size={14} /> Add a post myself</button>
                <a href={calendarLink} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}><CalendarPlus size={14} /> Add to Google Calendar</a>
              </div>
              <p className="mt-2 text-[12px] text-mt-muted">Auto-plan schedules a teaser, a templates announcement, a LinkedIn post, a countdown, the day itself and a thank-you. Edit captions freely; tick each one when posted. To post automatically, paste them into Meta Business Suite or Buffer (free) — see Free tools.</p>

              {adding && (
                <div className="mt-4 rounded-2xl border border-mt-border p-4 grid gap-2 sm:grid-cols-3">
                  <label className="text-[12px] text-mt-muted sm:col-span-3">Title<input className={field} value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder={`${occasion.name} — offer post`} /></label>
                  <label className="text-[12px] text-mt-muted">Date<input type="date" className={field} value={adding.post_on} onChange={(e) => setAdding({ ...adding, post_on: e.target.value })} /></label>
                  <label className="text-[12px] text-mt-muted sm:col-span-2">Channel<select className={field} value={adding.channel} onChange={(e) => setAdding({ ...adding, channel: e.target.value as PlanPost['channel'] })}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></label>
                  <label className="text-[12px] text-mt-muted sm:col-span-3">Caption<textarea rows={3} className={`${field} h-auto py-2`} value={adding.caption} onChange={(e) => setAdding({ ...adding, caption: e.target.value })} /></label>
                  <div className="sm:col-span-3 flex gap-2"><button onClick={saveManual} className={`${btn} bg-mt-primary text-mt-onprimary`}><Check size={14} /> Save post</button><button onClick={() => setAdding(null)} className={`${btn} text-mt-muted`}>Cancel</button></div>
                </div>
              )}

              <ul className="mt-4 flex flex-col gap-2">
                {(posts || []).map((p) => (
                  <li key={p.id} className={`rounded-2xl border border-mt-border p-3 ${p.status === 'done' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => setStatus(p)} aria-label={p.status === 'done' ? 'Mark not posted' : 'Mark posted'} className={`mt-0.5 h-6 w-6 shrink-0 rounded-md border inline-flex items-center justify-center ${p.status === 'done' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-mt-border'}`}>{p.status === 'done' && <Check size={14} />}</button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-mt-faint">{fmtDay(p.meta.post_on)} · {p.meta.channel}</p>
                        <p className={`text-[14px] font-medium ${p.status === 'done' ? 'line-through' : ''}`}>{p.name}</p>
                        {p.meta.caption && <p className="mt-1 text-[13px] text-mt-muted whitespace-pre-wrap line-clamp-3">{p.meta.caption}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a href={studio(studioTopic(occasion, { channel: p.meta.channel, title: p.name }))} target="_blank" className="h-8 px-3 rounded-full bg-[#D97757] text-white text-[12px] font-semibold inline-flex items-center gap-1.5"><Sparkles size={13} /> Make the design</a>
                          {p.meta.caption && <button onClick={() => copy(p.id, p.meta.caption)} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5">{copied === p.id ? <Check size={13} /> : <Copy size={13} />} Caption</button>}
                          <button onClick={() => remove(p)} className="h-8 px-3 rounded-full text-[12px] text-rose-600 inline-flex items-center gap-1.5"><Trash2 size={13} /> Remove</button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {posts && !posts.length && !adding && <li className="py-8 text-center text-[13px] text-mt-muted">No posts scheduled yet — tap <b>Auto-plan all posts</b>.</li>}
              </ul>
            </>
          )}

          {tab === 'ideas' && (
            <>
              <p className="text-[13px] text-mt-muted">Tap an idea to open the AI Studio with the brief filled in. {occasion.ideas && <>Your notes: <i>{occasion.ideas}</i></>}</p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {[...(occasion.ideas || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean), ...IDEAS].filter((v, i, a) => a.indexOf(v) === i).map((idea) => (
                  <li key={idea}><a href={studio(`${occasion.name} ${idea}`)} target="_blank" className="flex items-center gap-2 rounded-xl border border-mt-border px-3 py-2.5 text-[13px] hover:bg-mt-surface2"><Sparkles size={14} className="text-[#D97757]" /> {occasion.name} — {idea}<ExternalLink size={12} className="ml-auto text-mt-faint" /></a></li>
                ))}
              </ul>
            </>
          )}

          {tab === 'tools' && (
            <div className="flex flex-col gap-5">
              {FREE_TOOLS.map((g) => (
                <section key={g.id}>
                  <h3 className="text-[13px] font-semibold">{g.title}</h3>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-2">
                    {g.tools.map((t) => (
                      <li key={t.name}><a href={t.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-mt-border px-3 py-2 hover:bg-mt-surface2"><span className="text-[13px] font-medium inline-flex items-center gap-1">{t.name} <ExternalLink size={11} className="text-mt-faint" /></span><span className="block text-[12px] text-mt-muted">{t.what}</span></a></li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
