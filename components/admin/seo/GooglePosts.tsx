'use client';

// Admin → SEO → Google posts: posters and videos published as their own
// pages (/showcase/<slug>) so Google Images, Google Videos and search show
// them — like the "Free Online Design Tool & 5,450+ templates" result.
//  · See every post, which are Active (live) or Draft, posters vs videos
//  · Edit title, description, hashtags (#magicaltouchdesign …), link
//  · Picture from an editable design (always its latest version — "Edit
//    design" opens the editor), or an uploaded image; videos by upload
//  · Google preview of how the result looks
//  · Saving an Active post refreshes the page and sends it to search engines

import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, Image as ImageIcon, Loader2, PenLine, Plus, Search, Upload, Video, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api/client';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
export const SUGGESTED_TAGS = ['magicaltouchdesign', 'magicaltouch', 'magicaltemplatedesign', 'graphicdesign', 'onlinedesigntool', 'freetemplates', 'templatedesign', 'designtemplates', 'posterdesign', 'flyerdesign', 'invitationdesign', 'birthdaytemplate', 'businesscard', 'resumetemplate', 'socialmediapost', 'canvaalternative', 'smallbusiness', 'tamilnadu', 'india'];

interface Post {
  id: string; slug: string; kind: 'image' | 'video'; title: string; description: string; hashtags: string[]; template_id: string | null;
  image_url: string | null; video_url: string | null; link: string | null; status: 'draft' | 'active'; sort: number; published_at: string | null;
  templates?: { preview: string | null; thumbnail: string | null; name: string; width: number; height: number } | null;
}
const EMPTY: Omit<Post, 'id'> = { slug: '', kind: 'image', title: '', description: '', hashtags: ['magicaltouchdesign', 'magicaltouch', 'graphicdesign', 'onlinedesigntool'], template_id: null, image_url: null, video_url: null, link: '/templates', status: 'draft', sort: 0, published_at: null };
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const picOf = (p: Partial<Post>) => p.templates?.preview || p.templates?.thumbnail || p.image_url || '';

export function GooglePosts({ flash }: { flash: (m: string) => void }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [show, setShow] = useState<'all' | 'active' | 'draft' | 'image' | 'video'>('all');
  const [edit, setEdit] = useState<(Partial<Post> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: string; name: string; preview: string | null; thumbnail: string | null }[]>([]);
  const [tag, setTag] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('site_posts').select('*, templates(preview,thumbnail,name,width,height)').order('sort').order('published_at', { ascending: false });
    if (error) flash(error.message);
    setPosts((data as Post[]) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setFound([]);
    const h = setTimeout(async () => {
      const { data } = await supabase.from('templates').select('id,name,preview,thumbnail').ilike('name', `%${term.replace(/[%,()]/g, ' ')}%`).limit(12);
      setFound((data as any[]) || []);
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const list = useMemo(() => (posts || []).filter((p) => show === 'all' || p.status === show || p.kind === show), [posts, show]);
  const counts = useMemo(() => {
    const a = posts || [];
    return { all: a.length, active: a.filter((p) => p.status === 'active').length, draft: a.filter((p) => p.status === 'draft').length, image: a.filter((p) => p.kind === 'image').length, video: a.filter((p) => p.kind === 'video').length };
  }, [posts]);

  const upload = async (file: File, kind: 'image' | 'video') => {
    setBusy(true);
    const ext = (file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    const path = `posts/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('template-media').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    setBusy(false);
    if (error) return flash(error.message);
    const url = supabase.storage.from('template-media').getPublicUrl(path).data.publicUrl;
    setEdit((e) => (e ? (kind === 'video' ? { ...e, video_url: url, kind: 'video' } : { ...e, image_url: url, template_id: null, templates: null }) : e));
  };

  const save = async (patch?: Partial<Post>, row?: Post) => {
    const e = { ...(row || edit), ...(patch || {}) } as Partial<Post>;
    if (!e.title?.trim()) return flash('Add a title.');
    if (!e.template_id && !e.image_url) return flash('Pick a design or upload a picture.');
    if (e.kind === 'video' && !e.video_url) return flash('Upload the video.');
    const slug = e.slug || slugify(e.title);
    const rec = {
      slug, kind: e.kind || 'image', title: e.title.trim(), description: (e.description || '').trim(), hashtags: (e.hashtags || []).map((h) => h.replace(/^#/, '').toLowerCase()).filter(Boolean),
      template_id: e.template_id || null, image_url: e.image_url || null, video_url: e.video_url || null, link: e.link || '/templates', status: e.status || 'draft', sort: e.sort || 0,
      published_at: e.status === 'active' ? e.published_at || new Date().toISOString() : e.published_at || null, updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const { error } = e.id ? await supabase.from('site_posts').update(rec).eq('id', e.id) : await supabase.from('site_posts').insert(rec);
    if (!error) {
      const r: any = await apiFetch('/api/admin/site-posts', { method: 'POST', body: JSON.stringify({ slug, status: rec.status }) }).catch(() => null);
      flash(rec.status === 'active' ? `Live at /showcase/${slug}${r?.sent ? ' — sent to search engines.' : '.'}` : 'Saved as draft.');
      if (!row) setEdit(null);
      load();
    } else flash(error.message);
    setBusy(false);
  };
  const remove = async (p: Post) => {
    if (!window.confirm(`Delete “${p.title}”? Its page goes offline.`)) return;
    const { error } = await supabase.from('site_posts').delete().eq('id', p.id);
    if (error) return flash(error.message);
    await apiFetch('/api/admin/site-posts', { method: 'POST', body: JSON.stringify({ slug: p.slug, status: 'draft' }) }).catch(() => null);
    setEdit(null); load();
  };
  const addTag = (t: string) => { const v = t.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); if (v && edit && !(edit.hashtags || []).includes(v)) setEdit({ ...edit, hashtags: [...(edit.hashtags || []), v] }); setTag(''); };

  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-lg font-semibold">Google posts — posters & videos</h2>
            <p className="text-[13px] text-mt-muted">Each post is its own page on your site (<b>/showcase</b>) with the picture or video, title, description and hashtags — built so Google Images, Google Videos and search can show it. Only <b>Active</b> posts are public.</p>
          </div>
          <a href="/showcase" target="_blank" className={`${btn} border border-mt-border`}><ExternalLink size={14} /> Showcase page</a>
          <button onClick={() => setEdit({ ...EMPTY })} className={`${btn} bg-mt-primary text-mt-onprimary`}><Plus size={14} /> New post</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['all', 'All'], ['active', 'Active'], ['draft', 'Draft'], ['image', 'Posters'], ['video', 'Videos']] as const).map(([id, l]) => (
            <button key={id} onClick={() => setShow(id)} className={`h-8 px-3 rounded-full text-[12px] border ${show === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l} {counts[id]}</button>
          ))}
        </div>
        {posts === null ? <p className="mt-4 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p> : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className="rounded-2xl border border-mt-border overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-mt-surface2 grid place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={picOf(p)} alt={p.title} loading="lazy" className="max-h-full max-w-full object-contain" />
                  <span className={`absolute top-2 left-2 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-mt-ink/70 text-white'}`}>{p.status === 'active' ? 'Active' : 'Draft'}</span>
                  <span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-mt-ink inline-flex items-center gap-1">{p.kind === 'video' ? <Video size={11} /> : <ImageIcon size={11} />}{p.kind === 'video' ? 'Video' : 'Poster'}</span>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1.5">
                  <p className="text-[14px] font-semibold leading-snug">{p.title}</p>
                  <p className="text-[12px] text-[#3B82C4] line-clamp-1">{p.hashtags.map((h) => `#${h}`).join(' ')}</p>
                  <div className="mt-auto pt-2 flex flex-wrap gap-2">
                    <button onClick={() => setEdit(p)} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center gap-1.5"><PenLine size={13} /> Edit</button>
                    <button onClick={() => save({ status: p.status === 'active' ? 'draft' : 'active' }, p)} disabled={busy} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5">{p.status === 'active' ? <><EyeOff size={13} /> Unpublish</> : <><Eye size={13} /> Publish</>}</button>
                    {p.status === 'active' && <a href={`/showcase/${p.slug}`} target="_blank" className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5"><ExternalLink size={13} /> View</a>}
                  </div>
                </div>
              </li>
            ))}
            {!list.length && <li className="text-[13px] text-mt-muted">Nothing here yet.</li>}
          </ul>
        )}
      </section>

      {edit && (
        <div className="fixed inset-0 z-[120] bg-black/50 grid place-items-center p-3" role="dialog" aria-modal="true" onClick={() => setEdit(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-mt-surface border border-mt-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold flex-1">{edit.id ? 'Edit post' : 'New post'}</h3>
              <button onClick={() => setEdit(null)} className="h-9 w-9 rounded-full grid place-items-center hover:bg-mt-surface2" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid gap-2 content-start">
                <div className="flex gap-2">
                  {(['image', 'video'] as const).map((k) => <button key={k} onClick={() => setEdit({ ...edit, kind: k })} className={`h-8 px-3 rounded-full text-[12px] border ${edit.kind === k ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{k === 'image' ? 'Poster / picture' : 'Video'}</button>)}
                </div>
                <label className="text-[12px] text-mt-muted">Title (shown on Google)<input className={field} value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={110} placeholder="Free birthday invitation templates — Magical Touch Design" /></label>
                <label className="text-[12px] text-mt-muted">Description<textarea className={`${field} h-24 py-2`} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={600} placeholder="What people see and search for…" /></label>
                <div className="text-[12px] text-mt-muted">Hashtags & keywords
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(edit.hashtags || []).map((h) => <span key={h} className="h-7 pl-2.5 pr-1 rounded-full bg-mt-surface2 text-[12px] text-[#3B82C4] inline-flex items-center gap-1">#{h}<button onClick={() => setEdit({ ...edit, hashtags: (edit.hashtags || []).filter((x) => x !== h) })} aria-label={`Remove ${h}`} className="h-5 w-5 grid place-items-center"><X size={11} /></button></span>)}
                  </div>
                  <input className={`${field} mt-1`} value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTag(tag); } }} placeholder="Type a hashtag and press Enter" />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {SUGGESTED_TAGS.filter((s) => !(edit.hashtags || []).includes(s)).slice(0, 12).map((s) => <button key={s} onClick={() => addTag(s)} className="h-6 px-2 rounded-full border border-mt-border text-[11px] text-mt-muted hover:text-mt-ink">+#{s}</button>)}
                  </div>
                </div>
                <label className="text-[12px] text-mt-muted">Button link on the page<input className={field} value={edit.link || ''} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="/templates" /></label>
                <label className="text-[12px] text-mt-muted">Page address<input className={field} value={edit.slug || slugify(edit.title || '')} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-mt-muted">Status</span>
                  {(['active', 'draft'] as const).map((s) => <button key={s} onClick={() => setEdit({ ...edit, status: s })} className={`h-8 px-3 rounded-full text-[12px] border ${edit.status === s ? (s === 'active' ? 'bg-emerald-600 text-white border-transparent' : 'bg-mt-ink text-mt-bg border-transparent') : 'border-mt-border text-mt-muted'}`}>{s === 'active' ? 'Active (live)' : 'Draft'}</button>)}
                </div>
              </div>
              <div className="grid gap-3 content-start">
                <div className="rounded-2xl bg-mt-surface2 aspect-[4/3] grid place-items-center overflow-hidden">
                  {edit.kind === 'video' && edit.video_url ? <video src={edit.video_url} poster={picOf(edit) || undefined} controls className="max-h-full max-w-full" />
                    : picOf(edit) ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={picOf(edit)} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[13px] text-mt-faint">No picture yet</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {edit.template_id && <a href={`/editor?templateId=${edit.template_id}&editTemplate=1`} target="_blank" className={`${btn} border border-mt-border`}><PenLine size={14} /> Edit design</a>}
                  <label className={`${btn} border border-mt-border cursor-pointer`}><Upload size={14} /> {edit.kind === 'video' ? 'Cover picture' : 'Upload picture'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'image')} /></label>
                  {edit.kind === 'video' && <label className={`${btn} border border-mt-border cursor-pointer`}><Video size={14} /> Upload video<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'video')} /></label>}
                  {busy && <Loader2 size={16} className="animate-spin self-center" />}
                </div>
                <label className="relative"><Search size={14} className="absolute left-3 top-3 text-mt-faint" /><input className={`${field} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or use a design / template (e.g. promo, birthday)" /></label>
                {found.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {found.map((f) => (
                      <button key={f.id} onClick={() => setEdit({ ...edit, template_id: f.id, image_url: null, templates: { preview: f.preview, thumbnail: f.thumbnail, name: f.name, width: 0, height: 0 } })} title={f.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.thumbnail || f.preview || ''} alt={f.name} className={`h-16 w-14 rounded-lg object-cover border ${edit.template_id === f.id ? 'border-mt-ink border-2' : 'border-mt-border'}`} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="rounded-2xl border border-mt-border p-3">
                  <p className="text-[11px] text-mt-faint mb-2">How it can look on Google</p>
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#4D5156]">magicaltouchdesign.com › showcase</p>
                      <p className="text-[16px] text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug line-clamp-2">{edit.title || 'Your title'} | Magical Touch Design</p>
                      <p className="text-[12px] text-[#4D5156] dark:text-mt-muted line-clamp-2">{edit.description || 'Your description'} {(edit.hashtags || []).map((h) => `#${h}`).join(' ')}</p>
                    </div>
                    {picOf(edit) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={picOf(edit)} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => save()} disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {edit.status === 'active' ? 'Save & publish' : 'Save draft'}</button>
              {edit.id && edit.status === 'active' && <a href={`${SITE}/showcase/${edit.slug}`} target="_blank" className={`${btn} border border-mt-border`}><ExternalLink size={14} /> View page</a>}
              {edit.id && <button onClick={() => remove(edit as Post)} className={`${btn} text-rose-600 border border-rose-600/30 ml-auto`}>Delete</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
