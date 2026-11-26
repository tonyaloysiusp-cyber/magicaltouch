import type { Metadata } from 'next';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { SeoShell } from '@/components/seo/SeoShell';
import { Box, Eraser, FileText, Grid3x3, Languages, LayoutTemplate, PenTool, Printer, Ruler, Shirt, SlidersHorizontal, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SITE_URL, SITE_NAME, getSiteSetting, fitTitle, fitDescription } from '@/lib/seo';
import { companyProfile } from '@/lib/email/config';
import { ProductTour } from '@/components/ProductTour';

// About Magical Touch Design — the online design platform (not an interior
// design company), its mission, what it offers and its founder & CEO.
// Only facts that are on the site already are written here. Story, vision
// and the founder's biography appear only once an admin writes them in
// Admin → About page (site_settings), so nothing is invented.

export const revalidate = 600;

const baseMetadata: Metadata = {
  title: fitTitle(`About Magical Touch Design — Free Online Graphic Design Platform`),
  description: fitDescription('Magical Touch Design is a free online design and print studio: 1,000+ templates, a design editor, Photo Studio, packaging dielines, textile patterns and print tools — no account needed. Founded by Tony Aloysius.'),
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { type: 'website', url: `${SITE_URL}/about`, title: 'About Magical Touch Design', description: 'A free online design and print studio — templates, editor, Photo Studio, packaging and textile. No account needed. Founder & CEO: Tony Aloysius.', siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

// The template count in the text follows the real library ("1,850+").
// Render next to the database (Supabase, Mumbai) for faster first visits.
export const preferredRegion = 'bom1';

export async function generateMetadata(): Promise<Metadata> {
  const label = await getTemplateCountLabel();
  return JSON.parse(withCount(JSON.stringify(baseMetadata), label));
}

const PLATFORM: [string, string, Icon][] = [
  ['1,000+ templates', 'Posters, posts, cards, menus, certificates — all editable', LayoutTemplate],
  ['Design editor', 'Text, photos, shapes, layers, pages, brand kit, data merge', Wand2],
  ['Photo Studio', 'Layers, filters, retouch and face shaping with before / after', SlidersHorizontal],
  ['Packaging', 'Box dielines by size, design on the die, specification sheet', Box],
  ['Textile', 'Garment pattern pieces by measurement, team names and numbers', Shirt],
  ['Pattern Design', 'Seamless repeats, rangoli and mandala as vectors', Grid3x3],
  ['Image Trace', 'Logos and sketches to clean SVG and PDF vectors', PenTool],
  ['Background remover', 'One photo or sixty — it runs on your device', Eraser],
  ['Print tools', 'Imposition, booklets, spine width and cover size', Ruler],
  ['Print-ready files', 'True CMYK, bleed, crop marks; text stays vector', Printer],
  ['17+ languages', 'Tamil, Malayalam, Hindi, Arabic, Chinese and more', Languages],
  ['Technical documents', 'A branded job sheet with every export, for printers', FileText],
];
const PRINCIPLES: [string, string][] = [
  ['A studio, not a shortcut', 'Templates get you started; a real editor, Photo Studio and production tools let you finish like a professional.'],
  ['True to print', 'CMYK colour, bleed and crop marks, and text that stays real vector type in the PDF — what you see is what comes back from the press.'],
  ['Free, without the catch', 'Every tool and every download, with no watermark and no account needed. Open a tool and start.'],
  ['Your files stay with you', 'Designs save as files on your own device. Background removal, tracing and photo edits run in your browser — nothing is uploaded.'],
];
const DEFAULT_MISSION = 'To give every business, school and creator in the world the power to look professional — in minutes, at no cost.';
const paras = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
type Icon = LucideIcon;

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
      <PageHero
        align="center"
        eyebrow="About Magical Touch Design"
        title="Professional design, made effortless."
        accent="made effortless"
        subtitle="A complete design and print studio in your browser: templates, a design editor, Photo Studio, packaging, textile, patterns and print tools — on any device, free for everyone, no account needed."
      />
      <div className="mt-container py-8 sm:py-12">
        <section aria-label="At a glance" className=" grid grid-cols-2 lg:grid-cols-4 rounded-3xl border border-mt-border divide-x divide-y lg:divide-y-0 divide-mt-border overflow-hidden">
          {[[label, 'editable templates'], ['10', 'design & print tools'], ['17+', 'languages & scripts'], ['0', 'accounts needed']].map(([n, l]) => (
            <div key={l} className="p-6 bg-mt-surface">
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight">{n}</p>
              <p className="mt-1 text-[13px] text-mt-muted">{l}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="different" className="mt-16">
          <h2 id="different" className="text-2xl sm:text-3xl font-semibold tracking-tight">What makes us different</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(([t, d], i) => (
              <li key={t} className="rounded-3xl border border-mt-border p-6">
                <span className="text-[13px] font-semibold text-mt-faint tabular-nums">0{i + 1}</span>
                <p className="mt-3 text-[17px] font-semibold">{t}</p>
                <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <ProductTour />

        <section aria-labelledby="mission" className="mt-16 rounded-3xl p-8 sm:p-12 bg-mt-ink text-mt-bg">
          <p id="mission" className="text-[12px] font-semibold tracking-[0.22em] uppercase opacity-60">Our mission</p>
          {(() => { const [first, ...rest] = paras(mission || DEFAULT_MISSION); return <>
            <p className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight leading-snug max-w-4xl">{first}</p>
            {rest.length > 0 && <details className="mt-4 max-w-3xl group"><summary className="cursor-pointer text-[13px] font-semibold opacity-70 hover:opacity-100 list-none">Read more <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary>{rest.map((t, i) => <p key={i} className="mt-3 text-[16px] leading-relaxed opacity-80">{t}</p>)}</details>}
          </>; })()}
          {vision && (() => { const [first, ...rest] = paras(vision); return (
            <div className="mt-8 pt-6 border-t border-white/15 max-w-3xl">
              <p className="text-[12px] font-semibold tracking-[0.22em] uppercase opacity-60">Our vision</p>
              <p className="mt-3 text-[17px] leading-relaxed opacity-90">{first}</p>
              {rest.length > 0 && <details className="mt-3 group"><summary className="cursor-pointer text-[13px] font-semibold opacity-70 hover:opacity-100 list-none">Read more <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary>{rest.map((t, i) => <p key={i} className="mt-3 text-[15px] leading-relaxed opacity-75">{t}</p>)}</details>}
            </div>
          ); })()}
        </section>

        <section aria-labelledby="platform" className="mt-16">
          <h2 id="platform" className="text-2xl sm:text-3xl font-semibold tracking-tight">Everything included, free</h2>
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
