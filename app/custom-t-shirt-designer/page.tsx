import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { GarmentDesigner } from '@/components/garments/GarmentDesigner';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Custom T-shirt designer: an all-over printed round-neck T-shirt, by size
// and quantity or personalised, with one print-ready PDF.
const PATH = '/custom-t-shirt-designer';
const TITLE = 'Custom T-shirt Designer — All-Over Print T-shirts with Print-Ready PDF';
const DESC = 'Design custom round-neck T-shirts online: colours, stripes, bands and patterns, front text and logos, sizes and quantities or names, then download one print-ready vector PDF for sublimation or all-over printing.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/tshirt.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['What kind of T-shirt print file do I get?', 'An all-over print layout: the front, back, sleeves and collar at real size with bleed and cut lines, nested on your roll width in one vector PDF — ready for sublimation or cut-and-sew printing.'],
  ['Can I add text and a logo?', 'Yes. Type a front slogan in any of the fonts, place a chest logo and a large front print, and choose their size and position.'],
  ['Can I print different sizes in one file?', 'Enter how many of each size you need — Kids to 3XL — and every garment is laid out in the same PDF.'],
  ['Can I put names on the back?', 'Switch to “Names & numbers” in the lettering step to add one row per person with their name and number.'],
];
const STEPS: [string, string][] = [
  ['Design the T-shirt', 'Colours, a body graphic and an optional pattern.'],
  ['Add text and logos', 'Front slogan, chest logo and front print.'],
  ['Choose sizes', 'Quantities per size, or names and numbers per person.'],
  ['Download the print PDF', 'All pieces nested on the roll, ready to print.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/tshirt.webp" path={PATH} name="Custom T-shirt Designer" eyebrow="All-over print · Sublimation" h1="Custom T-shirt designer" intro="Design an all-over print T-shirt, choose the sizes, and download one print-ready PDF for the whole order." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <GarmentDesigner kind="tshirt" />
    </ToolPage>
  );
}
