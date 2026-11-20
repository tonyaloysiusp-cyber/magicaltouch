import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { BarcodeStudio } from '@/components/barcode/BarcodeStudio';

const TITLE = 'Free Barcode Generator — EAN-13, UPC-A, EAN-8 & ITF-14 Vector PDF';
const DESC = 'Make retail and carton barcodes with the correct GS1 check digit: EAN-13, UPC-A, EAN-8 and ITF-14 at the right size and quiet zones, with bar width reduction. Download vector PDF (100 % K), SVG or high-resolution PNG.';
const URL = `${SITE_URL}/barcode-generator`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };

const FAQ: [string, string][] = [
  ['Do I get a barcode number here?', 'No — numbers (GTINs) come from GS1 in your country. Enter yours and this tool draws the barcode correctly.'],
  ['What is the check digit?', 'The last digit is calculated from the others. Type the number without it and it is added, or type the full number and it is checked.'],
  ['What size should my barcode be?', '100 % (37.29 × 25.9 mm for EAN-13) is the nominal size; GS1 allows 80–200 %. Smaller than 80 % may not scan at the till.'],
  ['What is bar width reduction?', 'Ink spreads on press and makes bars fatter. Your printer may ask for the bars to be made slightly thinner (often 0.02–0.04 mm on offset).'],
  ['Which file should I use?', 'The vector PDF or SVG for print — they stay sharp at any size and the PDF prints the bars in 100 % black only. Use PNG only where vectors are not accepted.'],
];

export default function BarcodePage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Barcode Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <ToolShell path="/barcode-generator" h1="Retail barcodes, sized for the till." name="Barcode Studio" sub="EAN-13, UPC-A, EAN-8 and ITF-14 — vector PDF, SVG and PNG"
      about={<ToolAbout intro="Type your GTIN, pick the barcode type and size, and download a vector barcode ready for packaging and labels. The check digit is calculated or verified for you." faq={FAQ} related={[{ href: '/packaging-dieline', label: 'Packaging Dieline Studio' }, { href: '/pdf-preflight', label: 'PDF Preflight Inspector' }, { href: '/print-layout', label: 'Print Layout' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <BarcodeStudio />
    </ToolShell>
  );
}
