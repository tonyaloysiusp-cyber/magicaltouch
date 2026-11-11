import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PatternStudio } from '@/components/patterns/PatternStudio';

// Pattern Studio: a real seamless-repeat generator (grid, brick, half-drop,
// mirror, rotational, radial, kaleidoscope, geometric, organic, random).
const TITLE = 'Free Pattern Maker — Seamless Repeat Patterns Online';
const DESC = 'Make seamless repeat patterns for free: grid, brick, half-drop, mirror, radial and kaleidoscope repeats. Preview on fabric and packaging, export SVG or PNG, or use it in a design.';
const URL = `${SITE_URL}/patterns`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: [string, string][] = [
  ['Are the patterns really seamless?', 'Yes. Every repeat is built as a tile whose edges join exactly with the next tile. Turn on “Show tile edges” to see where one tile meets the next.'],
  ['What is a half-drop repeat?', 'Every other column is moved down by half a tile. It hides the straight lines of a plain grid and is popular for wallpaper and fabric.'],
  ['Can I use my own artwork?', 'Yes. Upload a PNG, JPG, WebP or SVG drawing or logo, or type up to three letters, and it becomes the motif.'],
  ['Which files can I download?', 'A vector SVG of the full sheet, a single SVG tile for textile and print software, or a PNG at post, story, A4, banner or wallpaper size.'],
  ['Can I use the pattern in a design?', 'Yes — “Use in a design” opens the pattern as a background in the Magical Touch editor, where you can add text, photos and your logo.'],
];

export default function PatternsPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Pattern Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Pattern Studio', item: URL }] },
  ];
  return (
    <SeoShell active="tools">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/free-design-tools', label: 'Free tools' }, { label: 'Pattern Studio' }]} />
        <header className="mt-4 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Pattern Studio</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Seamless patterns, made in minutes</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">Pick a motif, choose how it repeats, then tune size, spacing, rotation and colour. See it on fabric, wallpaper and packaging, and export print-ready SVG or PNG.</p>
          <a href="/editor?w=1080&h=1080&panel=patterns" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-mt-border px-4 text-[14px] font-semibold hover:border-mt-ink/40">Use it inside the design editor (Patterns panel) →</a>
        </header>
        <div className="mt-8"><PatternStudio /></div>

        <section className="mt-16 grid gap-8 lg:grid-cols-2" aria-labelledby="faq">
          <div>
            <h2 id="faq" className="text-2xl font-semibold">Questions</h2>
            <dl className="mt-4 divide-y divide-mt-border">
              {FAQ.map(([q, a]) => (<div key={q} className="py-4"><dt className="font-semibold">{q}</dt><dd className="mt-1 text-[15px] text-mt-muted leading-relaxed">{a}</dd></div>))}
            </dl>
          </div>
          <div className="rounded-3xl border border-mt-border bg-mt-surface p-6 self-start">
            <h2 className="text-xl font-semibold">Repeat types explained</h2>
            <ul className="mt-3 space-y-2 text-[15px] text-mt-muted">
              <li><b className="text-mt-ink">Grid</b> — the classic block repeat.</li>
              <li><b className="text-mt-ink">Brick &amp; half-drop</b> — offset rows or columns, softer on large surfaces.</li>
              <li><b className="text-mt-ink">Mirror &amp; rotational</b> — symmetric repeats for tiles and textiles.</li>
              <li><b className="text-mt-ink">Radial &amp; kaleidoscope</b> — medallions and mandala-like motifs.</li>
              <li><b className="text-mt-ink">Geometric, organic &amp; random</b> — lattices and natural scatters.</li>
            </ul>
            <Link href="/templates" className="mt-5 inline-flex h-10 items-center rounded-full border border-mt-border px-4 text-[14px] font-semibold">Browse templates</Link>
          </div>
        </section>
      </div>
    </SeoShell>
  );
}
