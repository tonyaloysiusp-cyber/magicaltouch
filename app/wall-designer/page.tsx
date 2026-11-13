import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { WallDesigner } from '@/components/wall/WallDesigner';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Wall designer: wall posters in standard print sizes, and wallpaper / wall
// patterns of any size split into print strips.
const PATH = '/wall-designer';
const TITLE = 'Wall Poster & Wallpaper Designer — Print Sizes and Wall Strips';
const DESC = 'Design wall posters in A3, A2, A1, A0, 50×70 and 24×36 sizes, previewed to scale on a wall, or custom wallpaper and wall patterns of any size split into numbered print strips as a vector PDF.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/wall.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['What poster sizes can I design?', 'A3, A2, A1 and A0, 50 × 70 cm, 70 × 100 cm, 18 × 24 in and 24 × 36 in, portrait or landscape, or any custom size in millimetres. The poster opens in the design editor at that exact size with bleed and a safe area.'],
  ['How big will my poster look on the wall?', 'The preview draws your poster to scale on a 3.6 m wall next to a sofa and a 1.7 m person, so you can choose the right size before printing.'],
  ['How does the wallpaper print file work?', 'Enter your wall’s width and height and the roll width. The design is split into numbered strips with an overlap and alignment marks, and you download them together as one vector PDF.'],
  ['Can I use my own pattern on the wall?', 'Yes. Design a pattern in Pattern Studio and it appears in the wall pattern picker as “Latest from Pattern Studio”, along with any patterns you saved.'],
];
const STEPS: [string, string][] = [
  ['Choose poster or wallpaper', 'A framed-size poster, or a pattern that covers the wall.'],
  ['Set the size', 'Standard poster sizes, or your wall’s width and height.'],
  ['Design it', 'Open the poster in the editor, or pick a pattern and add lettering.'],
  ['Download for print', 'Print-ready PDF — poster with bleed, or wallpaper in numbered strips.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/wall.webp" path={PATH} name="Wall Designer" eyebrow="Wall posters · Wallpaper · Wall patterns" h1="Wall poster & wallpaper designer" intro="Design a wall poster at the exact print size, or cover a whole wall with a pattern split into ready-to-print strips." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <WallDesigner />
    </ToolPage>
  );
}
