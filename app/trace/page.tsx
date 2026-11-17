import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { ImageTrace } from '@/components/trace/ImageTrace';

const TITLE = 'Image to Vector Converter — PNG & JPG to SVG Free';
const DESC = 'Convert images to vector free: PNG and JPG to SVG, logo vectorizer with clean curves and sharp corners, line art, black & white or 3–32 colours. Download SVG or PDF, or edit every shape.';
const URL = `${SITE_URL}/trace`;

export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/trace.webp`, width: 960, height: 540 }] },
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
    <ToolShell path="/trace" h1={'Turn any picture into vectors'} name="Image Trace" sub="Black & white, line art or up to 32 colours → SVG, PDF, editable shapes"
      about={<ToolAbout intro="Black & white, line drawing, or 3 to 32 colours. Compare with the original, recolour each layer, then download SVG or edit every shape in the editor — or use it inside the design editor's Trace panel." faq={FAQ} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ImageTrace />
    </ToolShell>
  );
}
