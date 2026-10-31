'use client';

// Admin → SEO → Free promotion. A plan, not just a list:
//  · ordered in three stages — Start here (Google can't rank what it can't
//    see), Listings (links from trusted sites), and Every week (social)
//  · each channel says how long it takes, what it brings, and the steps
//  · a listing kit with every text a directory asks for, ready to copy
// Progress is saved per channel (promo_items, kind = channel).

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTemplateCountLabel } from '@/lib/templateCount';

const SITE = 'https://www.magicaltouchdesign.com';
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';

interface Promo { id: string; kind: string; name: string; url: string | null; status: 'todo' | 'doing' | 'done'; notes: string | null; meta: any }
type Stage = 'start' | 'listings' | 'weekly';
interface Channel { name: string; url: string; stage: Stage; time: string; gives: string; steps: string[] }

const CH: Channel[] = [
  // ---------- start here
  { name: 'Google Search Console', url: 'https://search.google.com/search-console', stage: 'start', time: '10 min', gives: 'Google indexes the site; see which searches find you', steps: ['Add property → URL prefix → www.magicaltouchdesign.com', 'Choose “HTML tag”, paste it in SEO → Search engines, Save', 'Press Verify, then Sitemaps → submit sitemap.xml and image-sitemap.xml', 'URL inspection → paste the home page → Request indexing'] },
  { name: 'Bing Webmaster Tools', url: 'https://www.bing.com/webmasters', stage: 'start', time: '5 min', gives: 'Bing, Yahoo, DuckDuckGo and ChatGPT search', steps: ['Sign in → Import from Google Search Console', 'Check that sitemap.xml is listed', 'Back here: Search engines → Send now'] },
  { name: 'Google Business Profile', url: 'https://business.google.com', stage: 'start', time: '15 min', gives: 'Shows on Google Maps and brand searches', steps: ['Business name: Magical Touch Design', 'Category: Graphic designer (not interior designer)', 'Service area business — hide the address if you work from home', 'Add logo, cover, website and the short description below'] },
  { name: 'Pinterest', url: 'https://business.pinterest.com', stage: 'start', time: '20 min', gives: 'The biggest free traffic source for templates', steps: ['Create a free business account and claim the website', 'Make boards per type: Flyers, Invitations, Eid, Wedding…', 'Pin template previews; each pin links to its /templates/… page', 'Pin 5 a day — Pinterest rewards steady posting'] },
  // ---------- listings (backlinks)
  { name: 'Product Hunt', url: 'https://www.producthunt.com/posts/new', stage: 'listings', time: '45 min', gives: 'Launch-day spike and a strong link', steps: ['Prepare 4–5 screenshots and a 30-second demo video', 'Tagline (60 chars) and description from the kit below', 'Launch on a Tuesday–Thursday, 12:01 am Pacific', 'Share the launch link with friends and in groups that day'] },
  { name: 'AlternativeTo', url: 'https://alternativeto.net', stage: 'listings', time: '10 min', gives: 'People searching “Canva alternative”', steps: ['Add application → Web-based, Free', 'Mark as an alternative to Canva, Adobe Express, Photopea', 'Use the long description and 3 screenshots'] },
  { name: 'SaaSHub', url: 'https://www.saashub.com/submit', stage: 'listings', time: '10 min', gives: 'Free software listing + link', steps: ['Submit product, category Graphic Design', 'Add as alternative to Canva and Crello'] },
  { name: 'G2', url: 'https://sell.g2.com/create-a-profile', stage: 'listings', time: '15 min', gives: 'Trusted review site', steps: ['Create a free profile, category Graphic Design', 'Ask 5 happy users to leave a review'] },
  { name: 'Capterra', url: 'https://www.capterra.com/vendors/sign-up', stage: 'listings', time: '15 min', gives: 'Trusted software directory', steps: ['Free vendor listing, category Graphic Design Software', 'Pricing: Free'] },
  { name: 'SourceForge', url: 'https://sourceforge.net/software/add', stage: 'listings', time: '10 min', gives: 'Old, trusted domain link', steps: ['Add software → Web app, Free'] },
  { name: 'BetaList', url: 'https://betalist.com/submit', stage: 'listings', time: '10 min', gives: 'Early adopters', steps: ['Submit startup with tagline and one screenshot'] },
  { name: 'Indie Hackers', url: 'https://www.indiehackers.com/products', stage: 'listings', time: '15 min', gives: 'Founders community', steps: ['Add product page', 'Write a short story post about building it'] },
  { name: 'Crunchbase', url: 'https://www.crunchbase.com/add-new', stage: 'listings', time: '10 min', gives: 'Company knowledge panel signal', steps: ['Add organization: Magical Touch Design, Tamil Nadu, India, Founder Tony Aloysius'] },
  { name: 'Behance', url: 'https://www.behance.net', stage: 'listings', time: '30 min', gives: 'Designers + a portfolio link', steps: ['Post 3 template collections as projects', 'Link each project to its landing page'] },
  { name: 'Dribbble', url: 'https://dribbble.com', stage: 'listings', time: '20 min', gives: 'Designers + profile link', steps: ['Post your best templates as shots with the site link in the profile'] },
  { name: 'Figma Community', url: 'https://www.figma.com/community', stage: 'listings', time: '30 min', gives: 'Designer audience', steps: ['Publish a free mini template pack', 'Site link in profile and description'] },
  // ---------- weekly
  { name: 'Instagram', url: 'https://www.instagram.com', stage: 'weekly', time: '15 min/day', gives: 'Followers and template clicks', steps: ['Link in bio → the site (use a tracked link from Campaign links)', 'Post one template a day; reels of “edit in 30 seconds” do best', 'Use “Ads & posts” in Overview for ready captions'] },
  { name: 'Facebook Page & groups', url: 'https://www.facebook.com/pages/create', stage: 'weekly', time: '15 min/week', gives: 'Small-business owners', steps: ['Create the page with the same logo and description', 'Share helpful templates in small-business groups (no spam)'] },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/setup/new', stage: 'weekly', time: '15 min/week', gives: 'Businesses and HR teams', steps: ['Company page + founder posts about building the product', 'Post hiring, certificate and announcement templates'] },
  { name: 'YouTube', url: 'https://studio.youtube.com', stage: 'weekly', time: '1 hr/week', gives: 'How-to searches; videos rank on Google too', steps: ['Short tutorials: “How to make a flyer for free”', 'Link the matching landing page in the first line of the description'] },
  { name: 'Reddit', url: 'https://www.reddit.com', stage: 'weekly', time: '15 min/week', gives: 'Honest feedback and visitors', steps: ['Answer questions in r/graphic_design, r/smallbusiness, r/canva', 'Only link when it truly helps — no spam'] },
  { name: 'Quora', url: 'https://www.quora.com', stage: 'weekly', time: '15 min/week', gives: 'Long-lasting answers that rank on Google', steps: ['Answer “best free Canva alternative”, “how to make a flyer” questions'] },
  { name: 'WhatsApp Channel', url: 'https://www.whatsapp.com/channel', stage: 'weekly', time: '5 min/day', gives: 'Repeat visitors in the Gulf and India', steps: ['Create a channel; share one festival template before each occasion'] },
];
const STAGES: [Stage, string, string][] = [
  ['start', 'Start here — this week', 'Google and Bing can’t rank pages they haven’t seen. Do these first.'],
  ['listings', 'Listings — links from trusted sites', 'Each listing is a link to the site. Links are the biggest reason Google trusts a new site. Two or three a day.'],
  ['weekly', 'Every week — social', 'Regular posting brings visitors now while SEO builds up.'],
];

export function Promotion({ promo, reload }: { promo: Promo[]; reload: () => Promise<void> }) {
  const rows = promo.filter((p) => p.kind === 'channel');
  const byName = useMemo(() => new Map(rows.map((r) => [r.name, r])), [rows]);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const tpl = useTemplateCountLabel();

  // Add channels that aren't saved yet (first visit, or new ones in this list).
  useEffect(() => {
    const missing = CH.filter((c) => !byName.has(c.name));
    if (!missing.length) return;
    supabase.from('promo_items').insert(missing.map((c) => ({ kind: 'channel', name: c.name, url: c.url, notes: c.gives, status: 'todo' }))).then(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const setStatus = async (p: Promo | undefined, status: Promo['status']) => { if (!p) return; await supabase.from('promo_items').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id); reload(); };
  const copy = (id: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });

  const kit: [string, string][] = [
    ['Name', 'Magical Touch Design'],
    ['Website', SITE],
    ['Tagline (60)', 'Free online design tool — templates, editor, no watermark'],
    ['Short description (160)', `Free online design tool with ${tpl} templates for flyers, posters, invitations and social posts. Edit in your browser, download print-ready PDF — no watermark.`],
    ['Long description', `Magical Touch Design is a free online graphic design platform with ${tpl} professional templates for flyers, posters, invitations, resumes, menus, certificates, business cards and social media.\n\nEverything is free: the full editor (text, fonts, colours, layers, pages, brand kits), a photo studio with background removal, and print-ready export — PDF with bleed and crop marks, CMYK PDF and TIFF, plus PNG, JPG and WebP. There is no watermark and no paid tier.\n\nIt works in any browser on a computer, tablet or phone, supports English and Arabic, and includes free tutorials with certificates. Made in Tamil Nadu, India, for small businesses, students, teachers and creators everywhere.`],
    ['Category', 'Graphic Design Software · Design Tools · Productivity'],
    ['Tags', 'graphic design, templates, flyer maker, poster maker, invitation maker, canva alternative, free design tool, print design, social media design'],
    ['Pricing', 'Free (every feature, no watermark)'],
    ['Alternatives to', 'Canva, Adobe Express, Photopea, VistaCreate (Crello), Fotor'],
    ['Founder', 'Tony Aloysius — Founder & CEO, Tamil Nadu, India'],
    ['Contact', 'hello@magicaltouchdesign.com'],
  ];

  const done = CH.filter((c) => byName.get(c.name)?.status === 'done').length;
  return (
    <>
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2 flex-1"><Megaphone size={19} /> Free promotion plan</h2>
          <span className="text-[13px] text-mt-muted tabular-nums">{done}/{CH.length} done</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-mt-surface2 overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${(100 * done) / CH.length}%` }} /></div>
        <p className="mt-3 text-[13px] text-mt-muted">All free. Work top to bottom — mark each one done to keep track. Your listing texts are in the kit below.</p>
      </section>

      {STAGES.map(([stage, title, sub]) => {
        const items = CH.filter((c) => c.stage === stage);
        return (
          <section key={stage} className={card}>
            <h3 className="text-[16px] font-semibold">{title} <span className="text-mt-muted font-normal text-[13px]">{items.filter((c) => byName.get(c.name)?.status === 'done').length}/{items.length}</span></h3>
            <p className="text-[13px] text-mt-muted">{sub}</p>
            <ul className="mt-3 divide-y divide-mt-border">
              {items.map((c) => {
                const r = byName.get(c.name);
                const isDone = r?.status === 'done';
                const isOpen = open === c.name;
                return (
                  <li key={c.name} className="py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStatus(r, isDone ? 'todo' : 'done')} aria-label={`Mark ${c.name} ${isDone ? 'not done' : 'done'}`} className={`h-6 w-6 shrink-0 rounded-md border inline-flex items-center justify-center ${isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-mt-border'}`}>{isDone && <Check size={14} />}</button>
                      <button onClick={() => setOpen(isOpen ? null : c.name)} className="flex-1 min-w-0 text-left" aria-expanded={isOpen}>
                        <span className={`block text-[14px] font-medium ${isDone ? 'line-through text-mt-muted' : 'text-mt-ink'}`}>{c.name}</span>
                        <span className="block text-[12px] text-mt-muted truncate">{c.time} · {c.gives}</span>
                      </button>
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-[13px] text-[#3B82C4] inline-flex items-center gap-1 shrink-0">Open <ExternalLink size={13} /></a>
                      <ChevronDown size={16} className={`text-mt-faint shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isOpen && <ol className="mt-2 ml-9 list-decimal pl-4 text-[13px] text-mt-muted space-y-1">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className={card}>
        <h3 className="text-[16px] font-semibold">Listing kit — copy and paste</h3>
        <p className="text-[13px] text-mt-muted">Every text a directory or social profile asks for. Keep them identical everywhere — it helps Google connect the listings to the site.</p>
        <ul className="mt-3 divide-y divide-mt-border">
          {kit.map(([k, v]) => (
            <li key={k} className="py-2.5 flex gap-3 items-start">
              <span className="w-36 shrink-0 text-[12px] text-mt-muted pt-0.5">{k}</span>
              <span className="flex-1 min-w-0 text-[13px] whitespace-pre-wrap break-words">{v}</span>
              <button onClick={() => copy(k, v)} className="h-7 px-2.5 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1 shrink-0">{copied === k ? <Check size={12} /> : <Copy size={12} />}</button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
