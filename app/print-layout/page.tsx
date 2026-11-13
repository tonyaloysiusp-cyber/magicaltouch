import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PrintLayout } from '@/components/tools/PrintLayout';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Print & Production: many-up sheets (business cards, stickers, labels,
// photos) and saddle-stitch booklets from the customer's own PDF.
const PATH = '/print-layout';
const TITLE = 'Business Card Sheet & Booklet Imposition — Print Layout Tool';
const DESC = 'Put business cards, stickers, labels or photos many-up on A4, A3 or SRA3 with bleed and crop marks, front and back lined up — or turn a PDF into a saddle-stitch booklet. Free, in your browser.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/print-size.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['How many business cards fit on an A4 sheet?', 'With 3 mm bleed, no gap and an 8 mm printer margin, 85 × 55 mm cards fit 8 or 10 per A4 sheet depending on margins; the tool works out the best fit (upright or turned) and shows it before you download.'],
  ['Will my text and vectors stay sharp?', 'Yes. Your PDF pages are placed into the sheet as vectors — text stays text and shapes stay shapes. Nothing is turned into a picture.'],
  ['How do I print double-sided business cards?', 'Upload a two-page PDF (front, then back) and tick “Page 2 is the back”. The back side is mirrored so every card lines up with its front when printed double-sided.'],
  ['How does booklet imposition work?', 'Upload all pages in reading order. They are paired on sheets for saddle-stitch printing — the cover with the last page, and so on — with blank pages added to make a multiple of 4. Print double-sided, flip on the short edge, fold and staple.'],
  ['Are my files uploaded?', 'No. Everything happens in your browser; your PDF never leaves your device.'],
];
const STEPS: [string, string][] = [
  ['Choose your file', 'A PDF from the editor (with bleed) or a JPG/PNG.'],
  ['Pick the layout', 'Many-up sheet with item and sheet size, or a booklet.'],
  ['Check the preview', 'See how many fit, the bleed and the crop marks — or the page order.'],
  ['Download the PDF', 'A real vector print file, ready for your printer.'],
];
export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/print-size.webp" path={PATH} name="Print Layout" eyebrow="Many-up · Crop marks · Booklets" h1="Print layout: business card sheets & booklets" intro="Repeat your business card, sticker or photo on a print sheet with bleed and crop marks — or turn a PDF into a fold-and-staple booklet." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <PrintLayout />
    </ToolPage>
  );
}
