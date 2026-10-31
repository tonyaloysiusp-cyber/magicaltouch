'use client';

// Admin → SEO → Social → Posts: one place to plan and publish posts.
//  · Add a post: date, picture (promo kit or any image address), caption,
//    networks. Posts from the Festival planner show up here too.
//  · "Post now": copies the caption, downloads the picture and opens each
//    network's composer (share box where the network has one). Networks
//    don't let other sites post for you without their paid business APIs,
//    so the last tap is yours.
//  · Mark posted — it moves to "Done"; overdue posts are flagged.

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, Copy, Download, ExternalLink, Loader2, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PROMO_KIT, withTemplateCount } from '@/lib/promoKit';
import { useTemplateCountLabel } from '@/lib/templateCount';
import { shareLinks } from '@/lib/social';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const CHANNELS = ['Instagram', 'Facebook', 'LinkedIn', 'X', 'Threads', 'Pinterest', 'WhatsApp', 'YouTube'];
const COMPOSE: Record<string, string> = { Instagram: 'https://www.instagram.com/', YouTube: 'https://studio.youtube.com/' };

interface Post { id: string; name: string; url: string | null; notes: string | null; status: string; meta: any }
const today = () => new Date().toISOString().slice(0, 10);
const channelsOf = (p: Post): string[] => (Array.isArray(p.meta?.channels) ? p.meta.channels : p.meta?.channel ? [String(p.meta.channel)] : []);
const captionOf = (p: Post) => p.notes || p.meta?.caption || p.name;

export function SocialPosts({ flash }: { flash: (m: string) => void }) {
  const count = useTemplateCountLabel();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [form, setForm] = useState({ date: today(), image: PROMO_KIT[0]?.file || '', caption: '', channels: ['Instagram', 'Facebook'] as string[], link: '/' });
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('promo_items').select('id,name,url,notes,status,meta').eq('kind', 'post').order('created_at', { ascending: false }).limit(300);
    setPosts(((data as Post[]) || []).sort((a, b) => String(a.meta?.post_on || '').localeCompare(String(b.meta?.post_on || ''))));
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.caption.trim()) return flash('Write a caption first.');
    if (!form.channels.length) return flash('Pick at least one network.');
    setBusy(true);
    const { error } = await supabase.from('promo_items').insert({ kind: 'post', name: form.caption.trim().split('\n')[0].slice(0, 80), url: form.image || null, notes: form.caption.trim(), status: 'todo', meta: { post_on: form.date, channels: form.channels, link: form.link } });
    setBusy(false);
    if (error) return flash(error.message);
    setForm({ ...form, caption: '' });
    flash('Post planned.');
    load();
  };
  const mark = async (p: Post, status: 'todo' | 'done') => { await supabase.from('promo_items').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id); setOpen(null); load(); };
  const remove = async (p: Post) => { if (!window.confirm('Delete this post?')) return; await supabase.from('promo_items').delete().eq('id', p.id); load(); };
  const copy = (k: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(null), 1500); });

  const { upcoming, done, overdue } = useMemo(() => {
    const all = posts || [];
    const up = all.filter((p) => p.status !== 'done');
    return { upcoming: up, done: all.filter((p) => p.status === 'done').reverse(), overdue: up.filter((p) => (p.meta?.post_on || today()) < today()).length };
  }, [posts]);
  const list = showDone ? done : upcoming;
  const imgUrl = (u: string | null) => (u ? (u.startsWith('http') ? u : `${SITE}${u}`) : '');

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold flex-1">Posts</h2>
        <span className="text-[12px] text-mt-muted">{upcoming.length} to post{overdue ? <b className="text-rose-600"> · {overdue} overdue</b> : ''} · {done.length} done</span>
      </div>
      <p className="mt-1 text-[13px] text-mt-muted">Plan posts for every network here. Festival posts from the planner appear automatically. <b>Post now</b> copies the caption, downloads the picture and opens each network — you press Share.</p>

      {/* add */}
      <div className="mt-4 rounded-2xl border border-mt-border p-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="aspect-square rounded-xl bg-mt-surface2 overflow-hidden grid place-items-center">
          {form.image ? (/\.(mp4|webm)$/i.test(form.image) ? <video src={form.image} muted className="max-h-full" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.image} alt="" className="max-h-full max-w-full object-contain" />) : <span className="text-[12px] text-mt-faint">No picture</span>}
        </div>
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
            <label className="text-[12px] text-mt-muted">Date<input type="date" className={field} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="text-[12px] text-mt-muted">Picture<select className={field} value={PROMO_KIT.some((a) => a.file === form.image) ? form.image : ''} onChange={(e) => setForm({ ...form, image: e.target.value, caption: form.caption || withTemplateCount(PROMO_KIT.find((a) => a.file === e.target.value)?.caption || '', count) })}>
              <option value="">Other — paste address below</option>
              {PROMO_KIT.map((a) => <option key={a.file} value={a.file}>{a.title} ({a.size})</option>)}
            </select></label>
          </div>
          {!PROMO_KIT.some((a) => a.file === form.image) && <input className={field} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value.trim() })} placeholder="https://… image address (e.g. a template picture)" />}
          <textarea className={`${field} h-24 py-2`} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Caption with hashtags…" />
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => <button key={c} onClick={() => setForm({ ...form, channels: form.channels.includes(c) ? form.channels.filter((x) => x !== c) : [...form.channels, c] })} className={`h-8 px-3 rounded-full text-[12px] border ${form.channels.includes(c) ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{c}</button>)}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-[12px] text-mt-muted flex-1 min-w-[180px]">Link in the post<input className={field} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/free-flyer-maker" /></label>
            <button onClick={add} disabled={busy} className={`${btn} h-10 bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />} Plan post</button>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="mt-4 flex gap-2">
        <button onClick={() => setShowDone(false)} className={`h-8 px-3 rounded-full text-[12px] border ${!showDone ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>To post {upcoming.length}</button>
        <button onClick={() => setShowDone(true)} className={`h-8 px-3 rounded-full text-[12px] border ${showDone ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>Done {done.length}</button>
      </div>
      {posts === null ? <p className="mt-3 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p> : (
        <ul className="mt-3 divide-y divide-mt-border">
          {list.slice(0, 40).map((p) => {
            const late = p.status !== 'done' && (p.meta?.post_on || today()) < today();
            const link = `${SITE}${String(p.meta?.link || '/').startsWith('/') ? p.meta?.link || '/' : `/${p.meta?.link}`}`;
            const shares = shareLinks(link, captionOf(p), imgUrl(p.url));
            return (
              <li key={p.id} className="py-3">
                <div className="flex items-center gap-3">
                  {p.url && !/\.(mp4|webm)$/i.test(p.url) ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.url} alt="" className="h-12 w-12 rounded-lg object-cover border border-mt-border" /> : <span className="h-12 w-12 rounded-lg bg-mt-surface2" />}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium truncate">{p.name}</span>
                    <span className={`block text-[12px] ${late ? 'text-rose-600' : 'text-mt-muted'}`}>{p.meta?.post_on ? new Date(`${p.meta.post_on}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Any day'}{late ? ' · overdue' : ''} · {channelsOf(p).join(', ') || 'Any network'}</span>
                  </span>
                  {p.status !== 'done' ? <button onClick={() => setOpen(open === p.id ? null : p.id)} className={`${btn} bg-mt-primary text-mt-onprimary`}><Send size={14} /> Post now</button> : <button onClick={() => mark(p, 'todo')} className={`${btn} border border-mt-border`}>Undo</button>}
                  <button onClick={() => remove(p)} className="h-9 w-9 rounded-full grid place-items-center text-mt-muted hover:text-rose-600" aria-label="Delete post"><Trash2 size={15} /></button>
                </div>
                {open === p.id && (
                  <div className="mt-3 ml-[60px] rounded-2xl bg-mt-surface2 p-3 flex flex-col gap-2">
                    <p className="text-[13px] whitespace-pre-wrap text-mt-ink">{captionOf(p)}</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copy(p.id, `${captionOf(p)}\n\n${link}`)} className={`${btn} border border-mt-border`}>{copied === p.id ? <Check size={14} /> : <Copy size={14} />} 1. Copy caption</button>
                      {p.url && <a href={p.url} download className={`${btn} border border-mt-border`}><Download size={14} /> 2. Download picture</a>}
                    </div>
                    <p className="text-[12px] text-mt-muted">3. Open each network and paste:</p>
                    <div className="flex flex-wrap gap-2">
                      {(channelsOf(p).length ? channelsOf(p) : CHANNELS).map((c) => {
                        const href = COMPOSE[c] || shares.find((s) => s.name === c)?.href || '#';
                        return <a key={c} href={href} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}>{c} <ExternalLink size={12} /></a>;
                      })}
                    </div>
                    <button onClick={() => mark(p, 'done')} className={`${btn} self-start bg-emerald-600 text-white`}><Check size={14} /> Mark posted</button>
                  </div>
                )}
              </li>
            );
          })}
          {!list.length && <li className="py-3 text-[13px] text-mt-muted">{showDone ? 'Nothing posted yet.' : 'Nothing to post — plan one above, or use “Auto-plan” in the Festival planner.'}</li>}
        </ul>
      )}
    </section>
  );
}
