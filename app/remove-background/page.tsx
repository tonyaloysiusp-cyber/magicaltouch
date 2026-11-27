import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { BulkRemover } from '@/components/tools/BulkRemover';

// Free background remover: its own page because so many people search for
// it. Works in bulk, runs on the visitor's device, nothing is uploaded.
const TITLE = 'Free Background Remover — Remove Image Backgrounds Online, in Bulk';
const DESC = 'Remove the background from photos for free — one or 60 at once. Transparent PNG, white or any colour. Runs in your browser: your photos are never uploaded. No sign-up, no watermark.';
const URL = `${SITE_URL}/remove-background`;

export const metadata: Metadata = {
  title: fitTitle(`${TITLE}`),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/remove-background.webp`, width: 960, height: 540 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: [string, string][] = [
  ['Is the background remover really free?', 'Yes. There is no sign-up, no limit on how many days you use it and no watermark on your pictures.'],
  ['Are my photos uploaded?', 'No. The background is removed by a small model that runs inside your browser. Your photos never leave your device and we do not store them.'],
  ['Can I remove backgrounds from many photos at once?', 'Yes — choose or drop up to 60 photos. They are done one after another, then you can download them all in one ZIP file or save them straight into a folder.'],
  ['What file do I get?', 'A transparent PNG, or a JPG with a white or coloured background if you choose one. Large photos keep their size up to 4096 pixels.'],
  ['What works best?', 'Clear photos of people, products, pets and objects. Use the Edge slider for sharper or softer edges. For fine touch-ups, open the photo in our free Photo Studio.'],
];

export default function RemoveBackgroundPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Free Background Remover — Magical Touch Design', applicationCategory: 'MultimediaApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo-google.png` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Free background remover', item: URL }] },
  ];
  return (
    <ToolShell path="/remove-background" h1={'Remove backgrounds free — one photo or a whole folder'} name="Background Remover" sub="Transparent PNG, white or any colour — on your device"
      about={<ToolAbout intro="Transparent PNG, white or any colour background. Runs on your device — your photos are never uploaded. No sign-up, no watermark." steps={[['Add photos', 'Choose or drop up to 60 photos — people, products, pets, logos.'], ['Backgrounds go', 'The subject is found on your device and the rest is removed. Tap Edit on any photo to restore or erase areas with a brush.'], ['Save', 'Download one, all in a ZIP, or save them straight into a folder.']]} faq={FAQ} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <BulkRemover />
    </ToolShell>
  );
}
