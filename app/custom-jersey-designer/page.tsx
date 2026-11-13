import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PatternStudio } from '@/components/patterns/PatternStudio';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// One landing page for jersey and T-shirt design: it opens Pattern Studio on
// the "Apparel & team kits" workspace (the real tool, not a demo).
const PATH = '/custom-jersey-designer';
const TITLE = 'Custom Jersey Designer & T-shirt Design Maker — Team Names and Numbers';
const DESC = 'Design custom football, cricket and basketball jerseys or pattern T-shirts online: colours, patterns, team and sponsor logos, then add every player’s name, number and size from a list or CSV and download print-ready vector SVG or PDF files for sublimation.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  keywords: ['custom jersey designer', 'jersey design maker', 't-shirt design maker', 'football jersey design', 'cricket jersey design', 'basketball jersey design', 'team kit designer', 'sublimation jersey print file', 'jersey name and number'],
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};
const FAQ: [string, string][] = [
  ['How do I put a different name and number on every jersey?', 'Design the kit once, then add the players — type them in, paste a list or import a CSV with name, number and size. Each player gets their own file with their name and number; the master design stays the same.'],
  ['Which files do I get for printing?', 'For each player: a vector SVG and a vector PDF with every garment piece at real size for their size, with bleed and magenta cut lines. “Download all” gives a ZIP with every player’s SVG and PDF plus the roster.'],
  ['Can I design T-shirts as well as jerseys?', 'Yes — choose T-shirt, football jersey, cricket / polo shirt or basketball vest, then set body, sleeve and collar colours and a pattern.'],
  ['Are names and numbers editable vectors?', 'Names and numbers are turned into vector outlines in the font you choose, so they print sharply at any size and need no font on the printer’s computer.'],
  ['Are the garment shapes exact for my factory?', 'They are standard block patterns in sizes Kids to 3XL. Check them against your own patterns or your printer’s templates before a full production run.'],
];
const STEPS: [string, string][] = [
  ['Design the kit', 'Pick the garment, colours, pattern, font and logos.'],
  ['Add players', 'Type, paste or import a CSV of names, numbers and sizes — mistakes are flagged.'],
  ['Check each shirt', 'Preview any player front and back.'],
  ['Download print files', 'Vector SVG and PDF per player, or everyone as a ZIP.'],
];
export default function Page() {
  return (
    <ToolPage path={PATH} name="Custom Jersey Designer" eyebrow="Jerseys · T-shirts · Team kits" h1="Custom jersey designer & T-shirt maker" intro="Design one kit, add the whole team, and get a print-ready file for every player — names, numbers and sizes filled in automatically." description={DESC} steps={STEPS} faq={FAQ} related={[{ href: '/patterns', label: 'Seamless pattern maker' }, ...RELATED_TOOLS.filter((r) => r.href !== '/patterns')]}>
      <PatternStudio initialTab="kits" />
    </ToolPage>
  );
}
