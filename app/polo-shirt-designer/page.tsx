import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { GarmentDesigner } from '@/components/garments/GarmentDesigner';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Polo T-shirt designer: uniforms and staff polos, by size and quantity or
// personalised, with one print-ready PDF for the order.
const PATH = '/polo-shirt-designer';
const TITLE = 'Polo T-shirt Designer — Custom Uniform Polos with Print-Ready PDF';
const DESC = 'Design custom polo T-shirts for staff, school and team uniforms: collar and placket colours, chest bands and logos, sizes and quantities or names and numbers, then download one print-ready vector PDF.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/polo.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['Can I order polos by size and quantity?', 'Yes. Leave “Same for everyone” on and enter how many of each size you need. The print PDF lays out every garment of every size on the roll.'],
  ['Can each polo have a name?', 'Switch to “Names & numbers” in the lettering step and add a row per person — the name goes on the back and the file is labelled per person.'],
  ['Where does my company logo go?', 'Add a chest logo and a larger front or sponsor print in the Logos step. Logos are placed at real size on the front piece.'],
  ['Which files do I get?', 'One vector PDF with every piece at real size with bleed and cut lines, an SVG of the same layout, and optionally a separate file set for every garment.'],
];
const STEPS: [string, string][] = [
  ['Design the polo', 'Body, sleeve, collar and trim colours, plus a chest band or other graphic.'],
  ['Add your logo', 'Chest logo, front print and optional text.'],
  ['Sizes or names', 'Quantities per size, or one row per person with their name.'],
  ['Download the print PDF', 'Every polo nested on your roll width, ready to print.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/polo.webp" path={PATH} name="Polo T-shirt Designer" eyebrow="Uniforms · Staff · Schools" h1="Polo T-shirt designer" intro="Design branded polo T-shirts, set sizes and quantities, and download one print-ready file for the whole order." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <GarmentDesigner kind="polo" />
    </ToolPage>
  );
}
