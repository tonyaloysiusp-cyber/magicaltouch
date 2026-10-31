import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
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
    'Magical Touch Design is a free online graphic design platform: 1,000+ templates, a full design editor, a photo studio and free tutorials. Founded by Tony Aloysius, Founder & CEO.',
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

const OFFER = [
  ['1,000+ professional templates', 'Flyers, posters, invitations, resumes, menus, certificates, business cards, brand kits and social media posts — all editable.'],
  ['A full design editor', 'Text, fonts, colours, photos, shapes, layers, pages, brand kits and undo/redo, right in the browser.'],
  ['Photo Studio', 'One-tap enhance and looks, crop, retouch, layers, selections, filters and background removal.'],
  ['Print-ready output', 'PDF with bleed and crop marks, true CMYK PDF and TIFF, plus PNG, JPG and WebP.'],
  ['Verified certificates', 'Certificates with a unique code and QR check, so anyone can confirm they are genuine.'],
  ['Free tutorials & courses', 'Step-by-step lessons from beginner to pro, with a certificate reviewed by our team when you finish.'],
  ['English and Arabic', 'Arabic fonts and right-to-left text alongside hundreds of Latin typefaces.'],
];
const DEFAULT_MISSION = 'To give every small business, school and creator the tools to look their best — with professional templates, an editor that is easy on day one, and print-ready results they can trust.';
const paras = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);

const VALUES = [
  ['Free for everyone', 'Every template, tool and download is free. No watermark and no premium tier holding features back.'],
  ['Simple first', 'Anyone can make something beautiful in minutes; professionals can go further in Pro mode.'],
  ['Made for print and screen', 'Designs that look right on a phone and come out right at the print shop.'],
  ['Privacy', 'Photo tools such as background removal run on your own device.'],
];

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
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'About' }]} />

        <header className="mt-6 max-w-3xl">
          <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-mt-muted">About us</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Design anything.
            <br />
            <span className="mt-spectrum-text">Make it magical.</span>
          </h1>
          <p className="mt-6 text-lg text-mt-muted leading-relaxed">
            Magical Touch Design is an online graphic design platform. We help small businesses, students, teachers, event planners and creators make professional designs — flyers, posters, invitations, certificates, resumes and social media posts — without expensive software or design training.
          </p>
          <p className="mt-4 text-[15px] text-mt-muted leading-relaxed">
            Everything happens in the browser, on any computer, tablet or phone, and every feature is free. We are a design software platform — not an interior design or decoration company.
          </p>
        </header>

        <section aria-label="At a glance" className="mt-12 grid gap-4 sm:grid-cols-2 max-w-3xl">
          {[[label, 'free, editable templates'], ['100%', 'free — no watermark']].map(([n, l]) => (
            <div key={l} className="rounded-3xl border border-mt-border p-6">
              <p className="text-4xl font-semibold tracking-tight">{n}</p>
              <p className="mt-1 text-mt-muted">{l}</p>
            </div>
          ))}
        </section>

        {story && (
          <section aria-labelledby="story" className="mt-16 max-w-3xl">
            <h2 id="story" className="text-2xl sm:text-3xl font-semibold tracking-tight">Our story</h2>
            {paras(story).map((t, i) => <p key={i} className="mt-4 text-[16px] text-mt-muted leading-relaxed">{t}</p>)}
          </section>
        )}

        <section aria-labelledby="mission" className={`mt-16 grid gap-6 ${vision ? 'md:grid-cols-2' : ''}`}>
          <div className="rounded-3xl border border-mt-border p-7 bg-mt-surface">
            <h2 id="mission" className="text-2xl font-semibold tracking-tight">Our mission</h2>
            {paras(mission || DEFAULT_MISSION).map((t, i) => <p key={i} className="mt-4 text-[16px] text-mt-muted leading-relaxed">{t}</p>)}
          </div>
          {vision && (
            <div className="rounded-3xl border border-mt-border p-7 bg-mt-surface">
              <h2 className="text-2xl font-semibold tracking-tight">Our vision</h2>
              {paras(vision).map((t, i) => <p key={i} className="mt-4 text-[16px] text-mt-muted leading-relaxed">{t}</p>)}
            </div>
          )}
        </section>

        <section aria-labelledby="offer" className="mt-16">
          <h2 id="offer" className="text-2xl sm:text-3xl font-semibold tracking-tight">What we offer</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFER.map(([t0, d]) => [withCount(t0, label), d]).map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-mt-border p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="founder" className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
          <div className="rounded-3xl border border-mt-border p-8 bg-mt-surface">
            <p className="text-[13px] font-semibold tracking-[0.2em] uppercase text-mt-muted">Founder</p>
            <div className="mt-4 h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#F2708F,#A69BD3 35%,#35C2F1 65%,#8CC84B)' }} aria-hidden>
              TA
            </div>
            <h2 id="founder" className="mt-5 text-2xl font-semibold">Tony Aloysius</h2>
            <p className="text-mt-muted">Founder &amp; CEO, {SITE_NAME}</p>
            <p className="text-[13px] text-mt-faint">Tamil Nadu, India</p>
            {founderBio && paras(founderBio).map((t, i) => <p key={i} className="mt-4 text-[15px] leading-relaxed text-mt-muted">{t}</p>)}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Why choose us</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {VALUES.map(([t, d]) => (
                <li key={t} className="rounded-2xl border border-mt-border p-4">
                  <p className="font-semibold text-[15px]">{t}</p>
                  <p className="mt-1.5 text-[13px] text-mt-muted leading-relaxed">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="contact" className="mt-16 rounded-3xl border border-mt-border p-8">
          <h2 id="contact" className="text-2xl font-semibold">Get in touch</h2>
          <p className="mt-2 text-mt-muted">
            Questions, feedback or partnership ideas? Write to our official address,{' '}
            <a href={`mailto:${companyProfile.officialEmail}`} className="font-semibold text-mt-ink underline underline-offset-2 break-all">{companyProfile.officialEmail}</a>, or use the{' '}
            <Link href="/contact" className="font-semibold text-mt-ink underline underline-offset-2">contact form</Link>.
          </p>
        </section>

        <section className="mt-16 rounded-3xl border border-mt-border p-8 sm:p-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Start designing — it’s free</h2>
            <p className="mt-2 text-mt-muted">Pick a template, make it yours and download it in minutes.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/templates" className="h-12 px-6 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center">Browse templates</Link>
            <Link href="/tutorials" className="h-12 px-6 rounded-2xl border border-mt-border font-semibold inline-flex items-center hover:bg-mt-surface2">Learn with tutorials</Link>
            <Link href="/contact" className="h-12 px-6 rounded-2xl border border-mt-border font-semibold inline-flex items-center hover:bg-mt-surface2">Contact us</Link>
          </div>
        </section>
      </div>
    </SeoShell>
  );
}
