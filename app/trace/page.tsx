import type { Metadata } from 'next';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ImageTrace } from '@/components/trace/ImageTrace';

const TITLE = 'Image Trace — Convert Images to Vector SVG Free';
const DESC = 'Turn photos, sketches and logos into editable vector shapes: black & white, line drawing, or 3, 4, 6, 8 and 16 colours. Download SVG or edit the paths in the design editor.';
const URL = `${SITE_URL}/trace`;

export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

const FAQ: [string, string][] = [
  ['What does Image Trace do?', 'It redraws a picture as vector shapes — one shape per colour — so it stays sharp at any size and every colour can be changed.'],
  ['Which setting should I use?', 'Black & white for stamps and silhouettes, Line drawing for sketches, Logo for flat artwork, and 6–16 colours for illustrations and photos.'],
  ['Is my picture uploaded?', 'No. Tracing runs in your browser and the picture never leaves your device.'],
  ['Can I edit the result?', 'Yes. “Edit as vectors” opens every colour as an editable path in the design editor, where you can change colours, edit points, combine shapes and add text.'],
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
        </header>
        <div className="mt-8"><ImageTrace /></div>
        <dl className="mt-14 max-w-3xl divide-y divide-mt-border">
          {FAQ.map(([q, a]) => (<div key={q} className="py-4"><dt className="font-semibold">{q}</dt><dd className="mt-1 text-[15px] text-mt-muted leading-relaxed">{a}</dd></div>))}
        </dl>
      </div>
    </SeoShell>
  );
}
