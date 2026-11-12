import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { MandalaMaker } from '@/components/tools/MandalaMaker';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

const PATH = '/rangoli-mandala-maker';
const TITLE = 'Rangoli Design Maker & Mandala Generator — Free Online';
const DESC = 'Create rangoli designs and mandalas online free: draw once and it repeats around the centre, add rings of flowers, petals and dots, or get a ready Diwali rangoli. Download SVG, PNG or PDF.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  keywords: ['rangoli design maker', 'rangoli designs', 'mandala maker', 'mandala generator', 'diwali rangoli', 'kolam design', 'mandala art online'],
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};
const FAQ: [string, string][] = [
  ['How do I make a rangoli design online?', 'Press “Surprise me” for a ready design, or draw on the canvas — every stroke repeats around the centre. Add rings of petals, flowers and dots, choose the floor colour, then download.'],
  ['Can I make a mandala for colouring?', 'Yes. Turn on “Outline only” for rings, draw in black on white and download a PDF or PNG to print and colour.'],
  ['Is the download a vector?', 'Yes — the SVG is a clean vector you can scale to any size, cut on a plotter or edit in Illustrator, Inkscape or our editor.'],
  ['Can I use it for Diwali, Pongal or Onam posts?', 'Yes. Use “Use in a design” to open your rangoli in the editor, add greetings and your logo, and share it as a post or print it.'],
];
const STEPS: [string, string][] = [
  ['Start', 'Press “Surprise me” for a ready rangoli, or start from a blank floor.'],
  ['Draw with symmetry', 'Choose 4 to 24 repeats and mirror — draw once, it repeats around the centre.'],
  ['Add rings', 'Petals, flowers, paisley, lotus and dots, sized and spaced as you like.'],
  ['Download or design', 'SVG, PNG or PDF — or open it in the editor to add text.'],
];
export default function Page() {
  return (
    <ToolPage path={PATH} name="Rangoli & Mandala Maker" eyebrow="Rangoli · Mandala · Kolam" h1="Rangoli design maker & mandala generator" intro="Draw once and watch it bloom around the centre. Make Diwali rangolis, kolams and mandala art in minutes — then download a crisp vector or use it in a greeting." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <MandalaMaker />
    </ToolPage>
  );
}
