'use client';

// Admin → SEO → Social. Social media integration without paid tools:
//  · Your profiles — saved once; shown in the site footer and given to
//    Google as "sameAs" (links your brand panel to them)
//  · Promo kit — ready posters and videos with a caption per channel
//  · Share any page — one tap opens each network's own share box
//  · Create your business profiles — sign-up links, pictures, bio
//  · Posts — plan, post to each network, mark posted

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NETWORKS, parseSocial, shareLinks, SocialLinks } from '@/lib/social';
import { PROMO_KIT, withTemplateCount } from '@/lib/promoKit';
import { useTemplateCountLabel } from '@/lib/templateCount';
import { SocialSetup } from './SocialSetup';
import { SocialPosts } from './SocialPosts';
import { BrandImages } from './BrandImages';
import { PromoVideoMaker } from './PromoVideoMaker';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';

export function Social({ flash }: { flash: (m: string) => void }) {
  const [links, setLinks] = useState<SocialLinks>({});
  const [saved, setSaved] = useState<SocialLinks>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [page, setPage] = useState('/');
  const count = useTemplateCountLabel();
  const [text, setText] = useState('');
  const shareText = text || `Free online design tool — ${count} templates, no watermark`;

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle().then(({ data }) => { const v = parseSocial((data as any)?.value); setLinks(v); setSaved(v); });
  }, []);

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
    setSaved(clean);
    flash('Saved — the footer shows them now, and Google links them to your brand within an hour.');
  };
  const copy = (id: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  const url = useMemo(() => (page.startsWith('http') ? page : `${SITE}${page.startsWith('/') ? '' : '/'}${page}`), [page]);
  const share = shareLinks(url, shareText);
  const dirty = JSON.stringify(links) !== JSON.stringify(saved);

  return (
    <>
      {Object.keys(saved).length < 4 && <SocialSetup />}
      <section className={card}>
        <h2 className="text-lg font-semibold">Your social profiles <span className="text-mt-muted font-normal text-[13px]">{Object.keys(saved).length}/{NETWORKS.length} connected</span></h2>
        <p className="mt-1 text-[13px] text-mt-muted">Paste each profile address. They appear in the footer of every page and are given to Google, which links them to your brand in search results. Leave empty to hide.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {NETWORKS.map((n) => (
            <label key={n.id} className="text-[12px] text-mt-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: n.color }} />{n.name}{saved[n.id] && <a href={saved[n.id]} target="_blank" rel="noreferrer" className="text-[#3B82C4]"><ExternalLink size={11} /></a>}</span>
              <input className={field} value={links[n.id] || ''} onChange={(e) => setLinks({ ...links, [n.id]: e.target.value })} placeholder={n.placeholder} inputMode="url" />
            </label>
          ))}
        </div>
        <button onClick={save} disabled={!dirty} className={`${btn} mt-4 bg-mt-primary text-mt-onprimary`}><Check size={14} /> Save profiles</button>
      </section>
      {Object.keys(saved).length >= 4 && <details className={card}><summary className="cursor-pointer text-[14px] font-semibold">Profile pictures, bio and sign-up links</summary><div className="mt-3"><SocialSetup /></div></details>}

      <BrandImages flash={flash} />
      <PromoVideoMaker />
      <section className={card}>
        <h2 className="text-lg font-semibold">Promo kit — posters & videos</h2>
        <p className="mt-1 text-[13px] text-mt-muted">Made from your own templates, in your brand colours. Download, copy the caption, post. For reels, add a trending sound inside Instagram or TikTok — it helps reach.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROMO_KIT.map((a) => (
            <li key={a.file} className="rounded-2xl border border-mt-border overflow-hidden flex flex-col">
              <div className="aspect-square bg-[#09090B] flex items-center justify-center">
                {a.kind === 'video'
                  ? <video src={a.file} muted loop playsInline controls preload="metadata" className="max-h-full max-w-full" />
                  : /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.file} alt={a.title} loading="lazy" className="max-h-full max-w-full object-contain" />}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="text-[13px] font-semibold">{a.title} <span className="font-normal text-mt-faint">· {a.size}</span></p>
                <p className="text-[12px] text-mt-muted">{a.channels.join(' · ')}</p>
                <div className="mt-auto flex gap-2">
                  <a href={a.file} download className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center gap-1.5"><Download size={13} /> Download</a>
                  <button onClick={() => copy(a.file, withTemplateCount(a.caption, count))} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5">{copied === a.file ? <Check size={13} /> : <Copy size={13} />} Caption</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Share2 size={18} /> Share a page</h2>
        <p className="mt-1 text-[13px] text-mt-muted">Opens each network’s own share box with the link and text filled in — post from your account in one tap.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-[12px] text-mt-muted">Page<input className={field} value={page} onChange={(e) => setPage(e.target.value)} placeholder="/free-flyer-maker" /></label>
          <label className="text-[12px] text-mt-muted">Text<input className={field} value={shareText} onChange={(e) => setText(e.target.value)} /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {share.map((s) => <a key={s.id} href={s.href} target="_blank" rel="noreferrer" className={`${btn} border border-mt-border`}>{s.name}</a>)}
        </div>
      </section>

      <SocialPosts flash={flash} />
    </>
  );
}
