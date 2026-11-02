import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { MockupGallery } from '@/components/tools/MockupGallery';
import { PRO_SCENES } from '@/lib/mockupsPro';

const N = PRO_SCENES.length;
const TITLE = `Free Mockup Generator — ${N}+ Photo & Product Mockups`;
const DESC = `Put your design or logo on ${N}+ realistic mockups: phones, laptops, frames, posters, flyers, business cards, books, mugs, T-shirts, tote bags and packaging. Free, no sign-up, made on your device.`;
const URL = `${SITE_URL}/mockups`;

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | ${SITE_NAME}` },
  description: DESC,
  keywords: ['mockup generator', 'free mockups', 'logo mockup', 'poster mockup', 'phone mockup', 'business card mockup', 't-shirt mockup', 'mug mockup', 'frame mockup', 'magical touch design'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: [string, string][] = [
  ['Are the mockups free to use?', 'Yes — for your own and your clients’ work, including commercial use. The photos come from free, copyright-free (CC0 / free-licence) collections and the studio scenes are drawn by us.'],
  ['Is my design uploaded?', 'No. Every mockup is made inside your browser. Your design or logo never leaves your device.'],
  ['Can I use just a logo?', 'Yes — choose “Logo only”, pick a background colour, and your logo appears on every mockup.'],
  ['Can I download many at once?', 'Tick the mockups you want, then download them in one ZIP or as a presentation PDF to send to a client.'],
];

export default function MockupsPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Free Mockup Generator — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo-google.png` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <SeoShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'Mockups' }]} />
        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">{N}+ free <span className="mt-spectrum-text">mockups</span> for your design or logo</h1>
          <p className="mt-3 text-[16px] text-mt-muted">Real photos and studio scenes — phones, laptops, frames, flyers, cards, books, mugs, T-shirts and boxes. Upload once and see it everywhere.</p>
        </div>
        <div className="mt-8"><MockupGallery /></div>
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
          <dl className="mt-4 divide-y divide-mt-border">
            {FAQ.map(([q, a]) => <div key={q} className="py-4"><dt className="text-[15px] font-semibold">{q}</dt><dd className="mt-1 text-[14px] text-mt-muted">{a}</dd></div>)}
          </dl>
          <p className="mt-6 text-[14px] text-mt-muted">Need a design first? Start from thousands of <Link href="/templates" className="text-mt-accent hover:underline">free templates</Link>, or cut out a photo with the <Link href="/remove-background" className="text-mt-accent hover:underline">free background remover</Link>.</p>
        </section>
      </div>
    </SeoShell>
  );
}
