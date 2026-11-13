import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { GradientMaker } from '@/components/tools/GradientMaker';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

const PATH = '/gradient-background-generator';
const TITLE = 'Gradient Background Generator — Mesh Gradients, Free';
const DESC = 'Make beautiful mesh gradient backgrounds free: drag colour spots, add grain, pick presets, then download a 4K wallpaper, Instagram or YouTube size PNG, a vector SVG or copy the CSS.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/gradients.webp`, width: 960, height: 540 }] },
};
const FAQ: [string, string][] = [
  ['What is a mesh gradient?', 'A soft blend of several colour spots instead of a straight line between two colours — the smooth, glowing backgrounds used by modern brands and apps.'],
  ['Which sizes can I download?', 'Desktop and 4K wallpapers, phone wallpaper, Instagram post and portrait, YouTube thumbnail, presentation and A4 print — as PNG, or as a vector SVG at any size.'],
  ['Can I use it on my website?', 'Yes — “Copy CSS” gives you the exact gradient as CSS to paste into your site.'],
  ['Can I add text on top?', 'Yes — “Use in a design” opens the gradient as a background in the editor.'],
];
const STEPS: [string, string][] = [
  ['Pick a preset', 'Aurora, sunset, spectrum, pastel, ocean — or shuffle for something new.'],
  ['Drag the colour spots', 'Move, recolour, add or remove spots and change their spread.'],
  ['Add grain', 'A touch of film grain for a premium, printed feel.'],
  ['Download', 'PNG at any size, vector SVG, CSS — or design on top of it.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/gradients.webp" path={PATH} name="Gradient Background Generator" eyebrow="Mesh gradients" h1="Gradient background generator" intro="Soft, glowing mesh gradients for wallpapers, posts, slides and websites. Drag the colours, add grain and download in seconds." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <GradientMaker />
    </ToolPage>
  );
}
