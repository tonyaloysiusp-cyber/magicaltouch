import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { TextileStudio } from '@/components/garments/TextileStudio';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Textile Studio — T-shirts, polos, kurta / kameez, chudidar, dupatta and
// running fabric in one professional workspace, with embroidery.
const PATH = '/textile-studio';
const TITLE = 'Textile Studio — Kurta, Chudidar, T-shirt & Embroidery Design';
const DESC = 'Design T-shirts, polos, kurtas, chudidars, dupattas and fabric prints with Illustrator-style tools. Draft pieces from your own measurements, add embroidery and download print-ready PDF, DST embroidery files and a tech pack.';
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
];
const STEPS: [string, string][] = [
  ['Choose the garment', 'T-shirt, polo, kurta / kameez, chudidar, dupatta or fabric length.'],
  ['Set the size', 'Standard sizes and quantities, or your own measurements for made-to-measure pieces.'],
  ['Design and embroider', 'Illustrator-style tools on the real pieces, and an embroidery workspace with real stitches.'],
  ['Download production files', 'Print-ready PDF / SVG, DST embroidery file and a tech pack.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/jersey.webp" path={PATH} name="Textile Studio" eyebrow="Kurta · Chudidar · T-shirt · Embroidery" h1="Textile Studio" intro="One professional workspace for garments and embroidery — from your measurements to print-ready files." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <TextileStudio />
    </ToolPage>
  );
}
