'use client';

// Admin → SEO → Social → "Create your business profiles".
// Everything needed to open each business profile in a few minutes, in the
// same words everywhere (consistent name, bio, website and location help
// Google connect them to the brand): sign-up link, ready profile picture
// and covers, and copy buttons for each field. Accounts must be created by
// the owner — then paste each profile address in "Your social profiles".

import { useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { useTemplateCountLabel } from '@/lib/templateCount';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';

const details = (count: string): [string, string][] => [
  ['Business name', 'Magical Touch Design'],
  ['Username', 'magicaltouchdesign'],
  ['Category', 'Graphic designer · Software / design tool'],
  ['Website', SITE],
  ['Location', 'Tamil Nadu, India — serving customers worldwide'],
  ['Founder', 'Tony Aloysius — Founder & CEO'],
  ['Short bio (150)', `Free online design tool ✨ ${count} templates · flyers, posters, invitations, posts · no watermark · print-ready PDF 👇`],
  ['Long description', 'Magical Touch Design is a free online graphic design tool from Tamil Nadu, India, for creators and small businesses worldwide. Pick from {count} templates — flyers, posters, invitations, resumes, menus, certificates and social media posts — edit text, fonts, colours and photos in your browser, and download a print-ready PDF, PNG or JPG with no watermark.'],
  ['Hashtags', '#magicaltouchdesign #freedesign #graphicdesign #templates #flyerdesign #postermaker #smallbusiness #tamilnadu #india'],
];

const NETS: { name: string; url: string; tip: string; cover?: string }[] = [
  { name: 'Instagram (business)', url: 'https://www.instagram.com/accounts/emailsignup/', tip: 'Sign up → Settings → Account type → Switch to professional → Business. Category “Graphic designer”.' },
  { name: 'Facebook Page', url: 'https://www.facebook.com/pages/create', tip: 'Create a Page (not a profile). Link it to Instagram under Settings → Linked accounts.', cover: '/brand/cover-facebook-1640x624.png' },
  { name: 'LinkedIn Page', url: 'https://www.linkedin.com/company/setup/new/', tip: 'Company → Small business. Add the founder as admin and post weekly.', cover: '/brand/cover-linkedin-1584x396.png' },
  { name: 'YouTube channel', url: 'https://www.youtube.com/create_channel', tip: 'Use a brand account. Post the tutorial reels as Shorts.', cover: '/brand/cover-1500x500.png' },
  { name: 'Pinterest business', url: 'https://www.pinterest.com/business/create/', tip: 'Claim the website (Settings → Claimed accounts) so every pin links back.' },
  { name: 'X', url: 'https://x.com/i/flow/signup', tip: 'Pin a post with the promo video.', cover: '/brand/cover-1500x500.png' },
  { name: 'Threads', url: 'https://www.threads.net/', tip: 'Opens with your Instagram account — one tap.' },
  { name: 'WhatsApp channel', url: 'https://www.whatsapp.com/channels', tip: 'WhatsApp → Updates → Channels → Create. Share new templates weekly.' },
];

export function SocialSetup() {
  const count = useTemplateCountLabel();
  const DETAILS = details(count).map(([k, v]) => [k, v.replace(/\{count\}/g, count)] as [string, string]);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (k: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(null), 1500); });
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Create your business profiles</h2>
      <p className="mt-1 text-[13px] text-mt-muted">About 5 minutes each. Use the same name, picture, bio and website everywhere — Google uses that to connect them to your brand. Then paste each profile address below in <b>Your social profiles</b>.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-mt-border p-4">
          <p className="text-[13px] font-semibold">Pictures</p>
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/profile-picture.png" alt="Profile picture" className="h-20 w-20 rounded-full border border-mt-border" />
            <div className="flex flex-col gap-1.5 text-[12px]">
              <a href="/brand/profile-picture.png" download className="inline-flex items-center gap-1.5 font-semibold"><Download size={13} /> Profile picture (1080 × 1080)</a>
              <a href="/brand/cover-1500x500.png" download className="inline-flex items-center gap-1.5"><Download size={13} /> Cover 1500 × 500 (X, YouTube)</a>
              <a href="/brand/cover-facebook-1640x624.png" download className="inline-flex items-center gap-1.5"><Download size={13} /> Facebook cover</a>
              <a href="/brand/cover-linkedin-1584x396.png" download className="inline-flex items-center gap-1.5"><Download size={13} /> LinkedIn cover</a>
            </div>
          </div>
          <p className="mt-4 text-[13px] font-semibold">Profile details</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {DETAILS.map(([k, v]) => (
              <li key={k} className="flex items-start gap-2 text-[12px]">
                <span className="w-28 shrink-0 text-mt-faint">{k}</span>
                <span className="flex-1 text-mt-ink line-clamp-2">{v}</span>
                <button onClick={() => copy(k, v)} className="shrink-0 h-7 w-7 rounded-full border border-mt-border grid place-items-center" aria-label={`Copy ${k}`}>{copied === k ? <Check size={12} /> : <Copy size={12} />}</button>
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 content-start">
          {NETS.map((n) => (
            <li key={n.name} className="rounded-2xl border border-mt-border p-3 flex flex-col gap-1.5">
              <a href={n.url} target="_blank" rel="noreferrer" className="text-[14px] font-semibold inline-flex items-center gap-1.5">{n.name} <ExternalLink size={12} /></a>
              <p className="text-[12px] text-mt-muted">{n.tip}</p>
            </li>
          ))}
          <li className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 sm:col-span-2">
            <a href="https://business.google.com/create" target="_blank" rel="noreferrer" className="text-[14px] font-semibold inline-flex items-center gap-1.5">Google Business Profile <ExternalLink size={12} /></a>
            <p className="text-[12px] text-mt-muted">Google only gives these to businesses that meet customers in person or deliver to an area. A purely online tool isn’t eligible — if you offer design services in Tamil Nadu, add it as a <b>service-area business</b> (address hidden). Otherwise skip it: verifying Google Search Console and linking the profiles above is what builds your brand panel on Google.</p>
          </li>
        </ul>
      </div>
    </section>
  );
}
