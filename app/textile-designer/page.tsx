import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { GarmentDesigner } from '@/components/garments/GarmentDesigner';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Textile Designer — one workspace for jerseys (football, cricket,
// basketball), polo T-shirts and round-neck T-shirts, with one shared
// production system (sizes, quantities, team lists, print-ready PDF).
// The old /custom-jersey-designer, /polo-shirt-designer and
// /custom-t-shirt-designer addresses redirect here (next.config.mjs).
const PATH = '/textile-designer';
const TITLE = 'Textile Designer — Jerseys, Polo & T-shirts with Team Print PDF';
const DESC = 'Design football, cricket and basketball jerseys, polo T-shirts and T-shirts in one textile workspace: colours, patterns, logos, names, numbers, sizes and quantities, then one print-ready vector PDF.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/jersey.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['Do you have free jersey design templates?', 'Yes — start from 12 ready jersey designs (sash, hoops, stripes, chevron, halftone, side panels and more) or any colour scheme, then click the shirt to change every colour, logo, name and number. Everything is free and downloads as a print-ready vector PDF.'],
  ['How do I put a different name and number on every jersey?', 'Design the kit once, then add the players — type them, paste a list or import a CSV with name, number and size. Every shirt gets its own name, number and size; the master design never changes.'],
  ['Can I download the whole team as one print file?', 'Yes. “Download print PDF” nests every selected player’s pieces on your roll width — fronts, backs, sleeves and collars at real size with bleed, cut lines and a label on each piece — in one vector PDF. Long orders continue on extra pages.'],
  ['Which jersey styles can I design?', 'Football jerseys, cricket jerseys with a polo collar and basketball vests, with sash, hoops, stripes, pinstripes, side panels, chevron, shoulder yoke, half-and-half or chest band graphics, plus an optional pattern.'],
  ['Are names and numbers editable vectors?', 'Names and numbers are turned into vector outlines in the font you choose, so they print sharply at any size and need no font on the printer’s computer.'],
  ['Are the garment shapes exact for my factory?', 'They are standard block patterns in sizes Kids to 3XL. Check them against your own patterns or your printer’s templates before a full production run.'],
  ['Can I order polos by size and quantity?', 'Yes. Leave “Same for everyone” on and enter how many of each size you need. The print PDF lays out every garment of every size on the roll.'],
  ['Where does my company logo go?', 'Add a chest logo and a larger front or sponsor print in the Logos step. Logos are placed at real size on the front piece.'],
  ['What kind of T-shirt print file do I get?', 'An all-over print layout: the front, back, sleeves and collar at real size with bleed and cut lines, nested on your roll width in one vector PDF — ready for sublimation or cut-and-sew printing.'],
  ['Can I switch between a jersey, a polo and a T-shirt?', 'Yes. The garment type is just a setting in the Textile Designer — switching it keeps your colours, pattern, logos, text, players, sizes and quantities.'],
  ['Can I use a pattern I made in Pattern Design?', 'Yes. Save it to My patterns in Pattern Design and pick it in the Textile Designer’s pattern list. Edit it later in Pattern Design and the Textile Designer offers the new version.'],
];
const STEPS: [string, string][] = [
  ['Choose the garment', 'Jersey (football, cricket, basketball), polo T-shirt or T-shirt; round or V-neck.'],
  ['Design it', 'Colours, body graphics, your saved patterns, logos and text — click the shirt to edit any part.'],
  ['Add the team or sizes', 'Names, numbers and sizes per player, or quantities per size — type, paste or import CSV.'],
  ['Download one print PDF', 'Every garment’s pieces nested on your roll width, ready for sublimation.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/jersey.webp" path={PATH} name="Textile Designer" eyebrow="Jerseys · Polo T-shirts · T-shirts" h1="Textile Designer" intro="Jerseys, polo T-shirts and T-shirts in one workspace — design once, add the team or sizes, and download one print-ready PDF." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <GarmentDesigner />
    </ToolPage>
  );
}
