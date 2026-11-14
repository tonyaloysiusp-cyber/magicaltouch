import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PrintLayoutWorkspace } from '@/components/tools/PrintLayoutWorkspace';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// Print & Production: many-up sheets (business cards, stickers, labels,
// photos) and saddle-stitch booklets from the customer's own PDF.
const PATH = '/print-layout';
const TITLE = 'PDF Imposition Online — N-up, Booklet, Step & Repeat, Crop Marks';
const DESC = 'Professional PDF imposition in your browser: booklets with creep, n-up and step & repeat with duplex, tiling, page shuffles, bleeds, trim and shift, stick-on numbers and masking tape, automation sequences and undo — vector PDF out, nothing uploaded.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/print-size.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};
const FAQ: [string, string][] = [
  ['What can the imposition studio do?', 'Booklets (saddle stitch with creep), n-up 2/4/6/8/9/16 or custom, step and repeat, join two pages, tile large pages, manual imposition by dragging pages, page shuffles (reverse, odd/even, cut & stack), insert, delete and rotate pages, define bleeds, adjust page sizes, trim and shift, stick on text, numbers and PDF pages, masking tape and peel off — each with its own settings, a preview, undo and redo.'],
  ['Does it check my PDF?', 'Yes. Opening a PDF shows its trim, bleed and media boxes, page rotation, fonts (and whether they are embedded), images, colour spaces, mixed page sizes, blank pages and likely printer marks, and uses the trim and bleed boxes automatically.'],
  ['Can I save a series of steps?', 'Yes — automation sequences record the commands you applied, so you can play them back on the next file. “Repeat last” runs the last command again.'],
  ['Which PDF do I get?', 'A print-ready PDF with pages kept as vectors (text and fonts untouched), an editable PDF with artwork, stick-ons, masking tape and marks on separate layers, front or back sides only, or a flattened picture PDF if your printer asks for one.'],
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
    <ToolPage image="/tools/thumbs/print-size.webp" path={PATH} name="Print Layout" eyebrow="Imposition · N-up · Booklets · Step & repeat" h1="Print layout & PDF imposition studio" intro="Open a PDF and impose it like a print shop: booklets with creep, n-up and step & repeat with duplex, tiling, shuffles, bleeds and marks — with preview, undo and automation. Or use the quick layout for business cards and photos." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}>
      <PrintLayoutWorkspace />
    </ToolPage>
  );
}
