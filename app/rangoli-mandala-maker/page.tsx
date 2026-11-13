import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { MandalaMaker } from '@/components/tools/MandalaMaker';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

const PATH = '/rangoli-mandala-maker';
const TITLE = 'Rangoli Design Maker & Mandala Generator — Free Online';
const DESC = 'Create rangoli designs and mandalas online free in a few guided steps: pick a Diwali, floral or geometric starting design, choose 4- to 24-fold symmetry, add petals, dots, lines and borders, recolour, and download SVG, vector PDF, PNG or JPEG.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  keywords: ['rangoli design maker', 'rangoli designs', 'mandala maker', 'mandala generator', 'diwali rangoli', 'kolam design', 'mandala art online'],
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};
const FAQ: [string, string][] = [
  ['How do I make a rangoli design online?', 'Follow the seven steps: choose rangoli, Diwali, floral or mandala, pick one of the starting designs, set the symmetry, add petals, dots, lines or a border, choose a palette and download. You can also draw — every stroke repeats around the centre.'],
  ['Can I make a mandala for colouring?', 'Yes. Pick “Mandala” and the “Ink on paper” palette, set rings to “Outline only” under More settings, and download a vector PDF to print and colour.'],
  ['Is the download a vector?', 'Yes — the SVG and the PDF are clean vectors you can scale to any size, cut on a plotter or edit in Illustrator, Inkscape or our editor. PNG and JPEG are also available.'],
  ['Can I undo, rotate or duplicate parts?', 'Yes. Every change can be undone and redone; each layer can be rotated, resized, recoloured with a gradient, duplicated, hidden or deleted.'],
  ['Can I use it for Diwali, Pongal or Onam posts?', 'Yes. Use “Use in a design” to open your rangoli in the editor, add greetings and your logo, and share it as a post or print it.'],
];
const STEPS: [string, string][] = [
  ['Choose what to make', 'Rangoli, Diwali rangoli, floral rangoli, mandala, geometric mandala or your own symmetry.'],
  ['Pick a starting design', 'Six ready designs for each kind — or press “Surprise me”.'],
  ['Set symmetry and add elements', '4- to 24-fold (or custom); petals, flowers, dots, lines and decorative borders.'],
  ['Colour, fine-tune and download', 'Ready palettes and gradients, layer editing, then SVG, vector PDF, PNG or JPEG.'],
];
export default function Page() {
  return (
    <ToolPage path={PATH} name="Rangoli & Mandala Maker" eyebrow="Rangoli · Mandala · Kolam" h1="Rangoli design maker & mandala generator" intro="Draw once and watch it bloom around the centre. Make Diwali rangolis, kolams and mandala art in minutes — then download a crisp vector or use it in a greeting." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <MandalaMaker />
    </ToolPage>
  );
}
