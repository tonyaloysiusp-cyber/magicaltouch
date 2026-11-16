import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { TextileWorkspace } from '@/components/garments/TextileWorkspace';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Textile Studio — T-shirts, polos, kurta / kameez, chudidar, dupatta and
// running fabric in one professional workspace, with embroidery.
const PATH = '/textile-studio';
const TITLE = 'Textile Design Studio — Jerseys, T-shirts, Kurta & Embroidery';
const DESC = 'Design jerseys, polos, T-shirts, kurtas, chudidars, dupattas and fabric panels in one textile workspace: names, numbers and sizes, pieces from your measurements, embroidery with DST files, print-ready PDF and tech packs.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/jersey.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['Can I make a kurta or chudidar pattern from my own measurements?', 'Yes. Choose Kurta / kameez or Chudidar, type the measurements in cm (bust, waist, hip, shoulder, lengths, armhole, sleeve…) and the pieces are drafted from them. Nothing is guessed: a piece only appears once every body measurement is filled in. Sew a test garment before cutting good fabric.'],
  ['Which neck and sleeve styles can I choose?', 'Kurta necks: round, V, boat and square. Sleeves: sleeveless, cap, short, elbow, three-quarter and full.'],
  ['Can I design embroidery and get a machine file?', 'Yes. Add lettering, motifs or your own SVG, choose fill, satin or running stitches with density, angle and underlay, see the real stitches as thread, and download a Tajima DST or Melco EXP file with a thread list.'],
  ['What print files do I get?', 'A vector PDF (or SVG) with every piece at real size, bleed, magenta cut lines and registration marks, nested on your roll width to save fabric — plus a tech pack PDF with the flat sketch, measurements, pieces, colours and embroidery.'],
  ['Are my measurements and designs uploaded?', 'No. Measurements, projects and designs stay on your device. Save the project as a .mtd file to keep it.'],
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
  ['Choose the garment', 'T-shirt, polo, kurta / kameez, chudidar, dupatta or fabric length.'],
  ['Set the size', 'Standard sizes and quantities, or your own measurements for made-to-measure pieces.'],
  ['Design and embroider', 'Illustrator-style tools on the real pieces, and an embroidery workspace with real stitches.'],
  ['Download production files', 'Print-ready PDF / SVG, DST embroidery file and a tech pack.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/jersey.webp" path={PATH} name="Textile Design Studio" eyebrow="Jerseys · T-shirts · Kurta · Chudidar · Embroidery" h1="Textile Design Studio" intro="One workspace for team kits, everyday garments, made-to-measure clothes and embroidery — Simple or Professional mode, print-ready files at the end." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <TextileWorkspace />
    </ToolPage>
  );
}
