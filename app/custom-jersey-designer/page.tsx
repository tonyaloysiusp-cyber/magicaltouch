import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { GarmentDesigner } from '@/components/garments/GarmentDesigner';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Jersey designer: football, cricket and basketball kits with every player's
// name, number and size, and one print-ready PDF for the whole team.
const PATH = '/custom-jersey-designer';
const TITLE = 'Custom Jersey Designer — Team Names, Numbers & Print-Ready PDF';
const DESC = 'Design football, cricket and basketball jerseys online. Pick a style, colours, sash, hoops or stripes, add logos and every player’s name, number and size, then download one print-ready vector PDF for sublimation.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/jersey.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['How do I put a different name and number on every jersey?', 'Design the kit once, then add the players — type them, paste a list or import a CSV with name, number and size. Every shirt gets its own name, number and size; the master design never changes.'],
  ['Can I download the whole team as one print file?', 'Yes. “Download print PDF” nests every selected player’s pieces on your roll width — fronts, backs, sleeves and collars at real size with bleed, cut lines and a label on each piece — in one vector PDF. Long orders continue on extra pages.'],
  ['Which jersey styles can I design?', 'Football jerseys, cricket jerseys with a polo collar and basketball vests, with sash, hoops, stripes, pinstripes, side panels, chevron, shoulder yoke, half-and-half or chest band graphics, plus an optional pattern.'],
  ['Are names and numbers editable vectors?', 'Names and numbers are turned into vector outlines in the font you choose, so they print sharply at any size and need no font on the printer’s computer.'],
  ['Are the garment shapes exact for my factory?', 'They are standard block patterns in sizes Kids to 3XL. Check them against your own patterns or your printer’s templates before a full production run.'],
];
const STEPS: [string, string][] = [
  ['Design the kit', 'Choose a style, colours, a body graphic and a pattern — or start from a ready design.'],
  ['Add logos and lettering', 'Chest and sponsor logos, front text, the font and where names and numbers sit.'],
  ['Add the team', 'Type, paste or import names, numbers and sizes — mistakes are flagged.'],
  ['Download one print PDF', 'Every player’s pieces nested on the roll, ready for sublimation.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/jersey.webp" path={PATH} name="Custom Jersey Designer" eyebrow="Football · Cricket · Basketball" h1="Custom jersey designer" intro="Design one kit, add the whole team, and download a single print-ready PDF with every player’s name, number and size." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <GarmentDesigner kind="jersey" />
    </ToolPage>
  );
}
