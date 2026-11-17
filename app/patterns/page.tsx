import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PatternWorkspace } from '@/components/patterns/PatternWorkspace';

// Pattern Studio: a real seamless-repeat generator (grid, brick, half-drop,
// mirror, rotational, radial, kaleidoscope, geometric, organic, random).
const TITLE = 'Pattern Maker — Seamless Patterns, Rangoli & Mandala Designs';
const DESC = 'Free pattern maker: seamless grid, brick, half-drop, mirror and kaleidoscope repeats from 130+ vector shapes, plus rangoli and mandala designs. Download vector SVG, PDF or PNG.';
const URL = `${SITE_URL}/patterns`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/patterns.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: [string, string][] = [
  ['Can I make a rangoli or mandala here?', 'Yes — choose “Rangoli & Mandala”. Draw once and it repeats around the centre, add rings of petals and dots, set the symmetry, start from a Diwali rangoli, and download it as vector SVG, PDF, PNG or JPEG.'],
  ['Can I use my pattern on a jersey or wallpaper?', 'Save it to My patterns: it then appears in the Textile Designer and the Wallpaper Designer. Edit it here later and they offer the new version. Everything stays on your device.'],
  ['Are the patterns really seamless?', 'Yes. Every repeat is built as a tile whose edges join exactly with the next tile. Turn on “Show tile edges” to see where one tile meets the next.'],
  ['What is a half-drop repeat?', 'Every other column is moved down by half a tile. It hides the straight lines of a plain grid and is popular for wallpaper and fabric.'],
  ['Can I use my own artwork?', 'Yes. Upload a PNG, JPG, WebP or SVG drawing or logo, or type up to three letters, and it becomes the motif.'],
  ['Which files can I download?', 'SVG vector (one editable path per motif — opens in Illustrator, Figma and Inkscape), a vector PDF for print, a seamless tile SVG for textile software, or a PNG — each with or without a background.'],
  ['How many shapes are there?', 'Over 130 original vector motifs in 8 groups — basic, geometric, stars, floral, nature, celebration, ornament and lines — plus your own letters or image.'],
  ['Can I edit the pattern in a design?', 'Yes — “Edit in a design” opens the pattern in the editor as real vector shapes, grouped. Ungroup it to recolour, move or delete single motifs.'],
  ['Can I keep my patterns?', 'Yes — save them to My patterns, rename, duplicate, download, and back them up to a file to move to another device.'],
];

export default function PatternsPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Pattern Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Pattern Studio', item: URL }] },
  ];
  return (
    <ToolShell path="/patterns" h1={'Pattern Design — seamless patterns, rangoli & mandala'} name="Pattern Design" sub="Seamless repeats, rangoli & mandala → SVG, PDF, PNG"
      about={<ToolAbout intro="Pick from 130+ vector shapes, choose how it repeats, then tune size, spacing, rotation and colour. See it on fabric and packaging, and download vector SVG, PDF or PNG." faq={FAQ} extra={<div className="rounded-2xl border border-mt-border bg-mt-surface p-5 max-w-3xl"><h2 className="text-[15px] font-semibold">Repeat types</h2><p className="mt-1 text-[14px] text-mt-muted">Grid, brick and half-drop, mirror and rotational, radial and kaleidoscope, geometric, organic and random scatters.</p></div>} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PatternWorkspace />
    </ToolShell>
  );
}
