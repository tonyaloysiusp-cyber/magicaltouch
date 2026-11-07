import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import Link from 'next/link';
import { SeoShell } from '@/components/seo/SeoShell';
import type { ComponentType } from 'react';
import { BadgeCheck, Eraser, LayoutTemplate, Printer, SlidersHorizontal, Wand2 } from 'lucide-react';
import { SITE_URL, SITE_NAME, getSiteSetting } from '@/lib/seo';
import { companyProfile } from '@/lib/email/config';

// About Magical Touch Design — the online design platform (not an interior
// design company), its mission, what it offers and its founder & CEO.
// Only facts that are on the site already are written here. Story, vision
// and the founder's biography appear only once an admin writes them in
// Admin → About page (site_settings), so nothing is invented.

export const revalidate = 600;

const baseMetadata: Metadata = {
  title: { absolute: `About Magical Touch Design — Free Online Graphic Design Platform` },
  description:
    'Magical Touch Design is a free online design studio: 1,000+ professional templates, a powerful editor, a photo studio and a background remover — on any device. Founded by Tony Aloysius.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { type: 'website', url: `${SITE_URL}/about`, title: 'About Magical Touch Design', description: 'A free online graphic design platform — templates, editor and photo studio. Founder & CEO: Tony Aloysius.', siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

// The template count in the text follows the real library ("1,850+").
// Render next to the database (Supabase, Mumbai) for faster first visits.
export const preferredRegion = 'bom1';

export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

const PLATFORM: [string, string, Icon][] = [
  ['1,000+ templates', 'Every one editable, for print and screen', LayoutTemplate],
  ['Design editor', 'Text, photos, layers, pages, brand kits', Wand2],
  ['Photo Studio', 'Layers, retouch, filters, one-tap looks', SlidersHorizontal],
  ['Background remover', 'One photo or a hundred, on your device', Eraser],
  ['Print-ready files', 'Bleed, crop marks, true CMYK', Printer],
  ['Verified certificates', 'A unique code and QR check', BadgeCheck],
];
const PRINCIPLES: [string, string][] = [
  ['A studio, not a shortcut', 'Templates get you started; a real editor and photo studio let you finish like a professional.'],
  ['True to print', 'What you see on screen is what comes back from the print shop — bleed, crop marks and CMYK included.'],
  ['Free, without the catch', 'Every feature, every download. No watermark, no locked “pro” tools.'],
];
const DEFAULT_MISSION = 'To give every business, school and creator in the world the power to look professional — in minutes, at no cost.';
const paras = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export default async function AboutPage() {
  const label = await getTemplateCountLabel();
  const [story, vision, mission, founderBio] = await Promise.all(['about_story', 'about_vision', 'about_mission', 'about_founder_bio'].map((k) => getSiteSetting(k).catch(() => null)));
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      url: `${SITE_URL}/about`,
      name: 'About Magical Touch Design',
      mainEntity: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Tony Aloysius',
      jobTitle: 'Founder & CEO',
      nationality: { '@type': 'Country', name: 'India' },
      homeLocation: { '@type': 'Place', name: 'Tamil Nadu, India' },
      worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
  ];
  return (
    <SeoShell active="about">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-8 sm:py-14">
        <header className="max-w-3xl">
          <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-mt-muted">About Magical Touch Design</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.04]">
            Professional design,
            <br />
            <span className="mt-spectrum-text">made effortless.</span>
          </h1>
          <p className="mt-6 text-lg text-mt-muted leading-relaxed max-w-2xl">
            We build the design studio we always wanted: professional templates, a powerful editor and a photo studio — in your browser, on any device, free for everyone.
          </p>
          <div className="mt-8 h-1 w-28 rounded-full" style={{ background: 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)' }} aria-hidden />
        </header>

        <section aria-label="At a glance" className="mt-12 grid grid-cols-2 lg:grid-cols-4 rounded-3xl border border-mt-border divide-x divide-y lg:divide-y-0 divide-mt-border overflow-hidden">
          {[[label, 'editable templates'], ['100%', 'free — every feature'], ['0', 'watermarks'], ['Any device', 'computer, tablet, phone']].map(([n, l]) => (
            <div key={l} className="p-6 bg-mt-surface">
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight">{n}</p>
              <p className="mt-1 text-[13px] text-mt-muted">{l}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="different" className="mt-16">
          <h2 id="different" className="text-2xl sm:text-3xl font-semibold tracking-tight">What makes us different</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map(([t, d], i) => (
              <li key={t} className="rounded-3xl border border-mt-border p-6">
                <span className="text-[13px] font-semibold text-mt-faint tabular-nums">0{i + 1}</span>
                <p className="mt-3 text-[17px] font-semibold">{t}</p>
                <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="mission" className="mt-16 rounded-3xl p-8 sm:p-12 bg-mt-ink text-mt-bg">
          <p id="mission" className="text-[12px] font-semibold tracking-[0.22em] uppercase opacity-60">Our mission</p>
          {paras(mission || DEFAULT_MISSION).map((t, i) => <p key={i} className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight leading-snug max-w-4xl">{t}</p>)}
          {vision && <div className="mt-8 pt-6 border-t border-white/15 max-w-3xl"><p className="text-[12px] font-semibold tracking-[0.22em] uppercase opacity-60">Our vision</p>{paras(vision).map((t, i) => <p key={i} className="mt-3 text-[16px] leading-relaxed opacity-80">{t}</p>)}</div>}
        </section>

        <section aria-labelledby="platform" className="mt-16">
          <h2 id="platform" className="text-2xl sm:text-3xl font-semibold tracking-tight">One platform, everything included</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM.map(([t, d, I]) => (
              <li key={t} className="flex items-start gap-4 rounded-2xl border border-mt-border p-5">
                <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl bg-mt-surface2"><I size={20} strokeWidth={1.8} /></span>
                <span><span className="block font-semibold">{withCount(t, label)}</span><span className="block mt-1 text-[13px] text-mt-muted">{d}</span></span>
              </li>
            ))}
          </ul>
        </section>

        {story && (
          <section aria-labelledby="story" className="mt-16 max-w-3xl">
            <h2 id="story" className="text-2xl sm:text-3xl font-semibold tracking-tight">Our story</h2>
            {paras(story).map((t, i) => <p key={i} className="mt-4 text-[16px] text-mt-muted leading-relaxed">{t}</p>)}
          </section>
        )}

        <section aria-labelledby="founder" className="mt-16 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-mt-border p-8 bg-mt-surface flex flex-col sm:flex-row gap-6">
            <div className="h-20 w-20 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#F2708F,#A69BD3 35%,#35C2F1 65%,#8CC84B)' }} aria-hidden>TA</div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-mt-muted">Founder</p>
              <h2 id="founder" className="mt-2 text-2xl font-semibold">Tony Aloysius</h2>
              <p className="text-mt-muted">Founder &amp; CEO</p>
              {founderBio && paras(founderBio).map((t, i) => <p key={i} className="mt-4 text-[15px] leading-relaxed text-mt-muted">{t}</p>)}
            </div>
          </div>
          <div className="rounded-3xl border border-mt-border p-8 flex flex-col">
            <h2 className="text-2xl font-semibold">Let’s talk</h2>
            <p className="mt-2 text-mt-muted">Feedback, partnerships or press — write to{' '}
              <a href={`mailto:${companyProfile.officialEmail}`} className="font-semibold text-mt-ink underline underline-offset-2 break-all">{companyProfile.officialEmail}</a>.
            </p>
            <div className="mt-auto pt-6 flex flex-wrap gap-3">
              <Link href="/templates" className="h-11 px-5 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center">Start designing</Link>
              <Link href="/contact" className="h-11 px-5 rounded-2xl border border-mt-border font-semibold inline-flex items-center hover:bg-mt-surface2">Contact us</Link>
            </div>
          </div>
        </section>
      </div>
    </SeoShell>
  );
}
