import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { WallWorkspace } from '@/components/wall/WallWorkspace';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Wallpaper & Wall Sticker Designer (replaces the Wall Poster & Wallpaper tool).
const PATH = '/wallpaper-designer';
const TITLE = 'Wallpaper & Wall Sticker Designer — Print Strips and Cut Lines';
const DESC = 'Design custom wallpaper from seamless patterns, split into numbered print strips with an installation order, or make wall stickers with contour cut lines and print-and-cut sheets. Vector PDF, SVG and PNG — all on your device.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/wall.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['How does the wallpaper print file work?', 'Enter your wall’s width and height and the roll or panel width. The design is split into numbered strips with an overlap and alignment marks, listed in installation order. Download one PDF with every strip, a ZIP of separate numbered panels (PDF and SVG), or a full-wall PNG.'],
  ['Can I use my own pattern?', 'Yes. Every pattern you save in Pattern Design — including rangoli and mandala designs — appears in the wallpaper pattern picker. Edit it in Pattern Design and the new version is offered here.'],
  ['How many rolls do I need?', 'The rolls calculator works out drops per roll and the number of rolls from your wall size, roll width and length, and pattern repeat, with a waste allowance.'],
  ['How are wall sticker cut lines made?', 'Upload a PNG with a transparent background and the cut line follows the shape, with a white border of the width you choose — or cuts just inside the art when you want bleed. The cut line is a separate magenta vector path for your cutter.'],
  ['Can I print many stickers on one sheet?', 'Yes. Choose A4, A3, SRA3 or another sheet, the margin, gap and quantity; stickers are laid out automatically (turned when more fit) with registration marks for print-and-cut machines.'],
  ['Are my files uploaded?', 'No. Everything is made in your browser and saved on your device.'],
];
const STEPS: [string, string][] = [
  ['Choose wallpaper or stickers', 'Cover a wall with a pattern, or make cut-out wall stickers.'],
  ['Set the size', 'Your wall’s width and height, or the sticker size and sheet.'],
  ['Pick the design', 'A pattern from your library, or your own artwork.'],
  ['Download for print', 'Numbered wallpaper strips, or a sticker sheet with cut lines.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/wall.webp" path={PATH} name="Wallpaper & Wall Sticker Designer" eyebrow="Wallpaper · Wall stickers · Print strips" h1="Wallpaper & wall sticker designer" intro="Cover a wall with your own pattern in ready-to-hang numbered strips, or make wall stickers with cut lines on print-and-cut sheets." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <WallWorkspace />
    </ToolPage>
  );
}
