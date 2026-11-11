import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
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
  keywords: ['remove background', 'background remover', 'free background remover', 'remove bg', 'transparent background', 'bulk background removal', 'remove background from image', 'png maker', 'magical touch design'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: [string, string][] = [
  ['Is the background remover really free?', 'Yes. There is no sign-up, no limit on how many days you use it and no watermark on your pictures.'],
  ['Are my photos uploaded?', 'No. The background is removed by a small AI model that runs inside your browser. Your photos never leave your device and we do not store them.'],
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
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'Free background remover' }]} />
        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">Remove backgrounds <span className="mt-spectrum-text">free</span> — one photo or a whole folder</h1>
          <p className="mt-3 text-[16px] text-mt-muted">Transparent PNG, white or any colour background. Runs on your device — your photos are never uploaded. No sign-up, no watermark.</p>
        </div>
        <div className="mt-8"><BulkRemover /></div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[['1. Add photos', 'Choose or drop up to 60 photos — people, products, pets, logos.'], ['2. Backgrounds go', 'The AI finds the subject and removes the rest. Tap ✎ Edit on any photo to restore or erase areas with a brush.'], ['3. Save', 'Download one, all in a ZIP, or save them straight into a folder.']].map(([h, p]) => (
            <div key={h} className="rounded-3xl border border-mt-border bg-mt-surface p-5"><h2 className="text-[16px] font-semibold">{h}</h2><p className="mt-1 text-[14px] text-mt-muted">{p}</p></div>
          ))}
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
          <dl className="mt-4 divide-y divide-mt-border">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-4"><dt className="text-[15px] font-semibold">{q}</dt><dd className="mt-1 text-[14px] text-mt-muted">{a}</dd></div>
            ))}
          </dl>
          <p className="mt-6 text-[14px] text-mt-muted">Need more? Fine-tune edges with brushes in the free <Link href="/photo-studio" className="text-mt-accent hover:underline">Photo Studio</Link>, or put your cut-out photo on one of thousands of <Link href="/templates" className="text-mt-accent hover:underline">free templates</Link>.</p>
        </section>
      </div>
    </SeoShell>
  );
}
