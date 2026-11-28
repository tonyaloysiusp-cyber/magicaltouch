'use client';
// Admin → Posts & Google. The one place for everything we post: the 7
// official designs (download + caption for Google Business, Instagram,
// Facebook, LinkedIn and X), share links, our social profiles, and the
// picture Google shows for the site.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { GooglePictureManager } from '@/components/admin/seo/GooglePictureManager';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { NETWORKS, parseSocial, shareLinks, SocialLinks } from '@/lib/social';
import { BRAND_POSTS, postCaption } from '@/lib/brandPosts';

const SITE = 'https://magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

export default function AdminPostsPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [links, setLinks] = useState<SocialLinks>({});
  const [saved, setSaved] = useState<SocialLinks>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) { router.push('/login?next=/admin/posts'); return; }
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) { setState('denied'); return; }
      setState('ok');
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle();
      const v = parseSocial((data as any)?.value); setLinks(v); setSaved(v);
    })().catch(() => setState('ok'));
  }, [router]);

  const copy = (id: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  const save = async () => {
    const clean: SocialLinks = {};
    for (const n of NETWORKS) {
      const v = (links[n.id] || '').trim();
      if (!v) continue;
      if (!/^https:\/\/\S+$/.test(v)) return flash(`${n.name}: paste the full address starting with https://`);
      clean[n.id] = v;
    }
    const { error } = await supabase.from('site_settings').upsert({ key: 'social_links', value: JSON.stringify(clean), updated_at: new Date().toISOString() });
    if (error) return flash(error.message);
    setSaved(clean); flash('Saved — the footer shows them now.');
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/" className="text-sm text-mt-accent hover:underline">Back to the site</Link></main>;

  return (
    <AdminShell active="posts" title="Posts & Google" accent="Posts" subtitle="Everything you post, in one place: 7 official designs with captions, share links, your social profiles and the picture Google shows.">
      <div className="flex flex-col gap-6">
        {msg && <p className="rounded-2xl bg-mt-accentsoft px-4 py-2.5 text-sm text-[#4B2FB0]" role="status">{msg}</p>}

        <section className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex-1 text-lg font-semibold">Official posts <span className="text-[13px] font-normal text-mt-muted">7 designs · 1080 × 1080</span></h2>
            <a href="https://business.google.com/posts" target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}>Open Google Business posts <ExternalLink size={13} /></a>
          </div>
          <p className="mt-1 text-[13px] text-mt-muted">Square works everywhere: Google Business, Instagram, Facebook, LinkedIn and X. Download the picture, copy the caption, post.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {BRAND_POSTS.map((p) => (
              <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-mt-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/posts/${p.id}.webp`} alt={p.title} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="text-[13px] font-semibold">{p.title}</p>
                  <p className="line-clamp-3 text-[12px] text-mt-muted">{p.caption}</p>
                  <div className="mt-auto flex gap-2">
                    <a href={`/posts/${p.id}.jpg`} download className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center gap-1.5"><Download size={13} /> Download</a>
                    <button onClick={() => copy(p.id, postCaption(p))} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5">{copied === p.id ? <Check size={13} /> : <Copy size={13} />} Caption</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Share2 size={18} /> Share the site</h2>
          <p className="mt-1 text-[13px] text-mt-muted">Opens each network’s own share box with the link filled in.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shareLinks(SITE, 'Design anything — free for everyone. No login, no watermark.').map((s) => <a key={s.id} href={s.href} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}>{s.name}</a>)}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Your social profiles <span className="text-mt-muted font-normal text-[13px]">{Object.keys(saved).length}/{NETWORKS.length}</span></h2>
          <p className="mt-1 text-[13px] text-mt-muted">Shown in the footer of every page and given to Google, which links them to your brand. Leave empty to hide.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {NETWORKS.map((n) => (
              <label key={n.id} className="text-[12px] text-mt-muted">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: n.color }} />{n.name}</span>
                <input className={field} value={links[n.id] || ''} onChange={(e) => setLinks({ ...links, [n.id]: e.target.value })} placeholder={n.placeholder} inputMode="url" />
              </label>
            ))}
          </div>
          <button onClick={save} disabled={JSON.stringify(links) === JSON.stringify(saved)} className={`${btn} mt-4 bg-mt-primary text-mt-onprimary`}><Check size={14} /> Save profiles</button>
        </section>

        <GooglePictureManager flash={flash} />
      </div>
    </AdminShell>
  );
}
