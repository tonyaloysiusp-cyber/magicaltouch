import type { Metadata } from 'next';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ImageTrace } from '@/components/trace/ImageTrace';

const TITLE = 'Image to Vector Converter — PNG & JPG to SVG Free';
const DESC = 'Convert images to vector free: PNG and JPG to SVG, logo vectorizer with clean curves and sharp corners, line art, black & white or 3–32 colours. Download SVG or PDF, or edit every shape.';
const URL = `${SITE_URL}/trace`;

export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

const FAQ: [string, string][] = [
  ['How do I convert a PNG or JPG to SVG?', 'Choose your picture, pick a preset (Logo — clean for logos, Black & white for stamps, Line art for sketches, or 3–32 colours for illustrations), then download SVG. It takes a second and runs in your browser.'],
  ['Is it good enough for logos?', 'Yes. The Logo preset cleans up stray pixels, ignores anti-aliased edges (no grey halo), enlarges small logos before tracing, keeps sharp corners sharp and fits smooth curves everywhere else.'],
  ['Can I edit each shape?', 'Turn on “Separate shapes” and every region becomes its own path, grouped by colour. In the editor, ungroup once for the colour layers and again for single shapes — recolour, move, edit points or delete.'],
  ['Which files can I download?', 'SVG (one group per colour), a vector PDF for print, or a PNG.'],
  ['Is my picture uploaded?', 'No. Tracing runs in your browser and the picture never leaves your device.'],
];

export default function TracePage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Image Trace — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <SeoShell active="tools">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { href: '/tools', label: 'Tools' }, { label: 'Image Trace' }]} />
        <header className="mt-4 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Image Trace</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Turn any picture into vectors</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">Black & white, line drawing, or 3 to 32 colours. Compare with the original, recolour each layer, then download SVG or edit every shape in the editor.</p>
          <a href="/editor?w=1080&h=1080&panel=trace" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-mt-border px-4 text-[14px] font-semibold hover:border-mt-ink/40">Use it inside the design editor (Trace panel) →</a>
        </header>
        <div className="mt-8"><ImageTrace /></div>
        <dl className="mt-14 max-w-3xl divide-y divide-mt-border">
          {FAQ.map(([q, a]) => (<div key={q} className="py-4"><dt className="font-semibold">{q}</dt><dd className="mt-1 text-[15px] text-mt-muted leading-relaxed">{a}</dd></div>))}
        </dl>
      </div>
    </SeoShell>
  );
}
