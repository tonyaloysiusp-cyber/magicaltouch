import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PdfPreflight } from '@/components/preflight/PdfPreflight';

const TITLE = 'Free PDF Preflight Checker — Bleed, Fonts, DPI, CMYK & Spot Colours';
const DESC = 'Check a PDF for print in your browser: TrimBox and bleed, embedded fonts, real image resolution at placed size, RGB vs CMYK, spot colours, output intent, overprint, transparency, small text and thin lines — with a report PDF.';
const URL = `${SITE_URL}/pdf-preflight`;

export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME },
};

const FAQ: [string, string][] = [
  ['Is my PDF uploaded?', 'No. The PDF is read in your browser and is never uploaded or changed.'],
  ['What does it check?', 'Page size, TrimBox and BleedBox (bleed amount), whether every font is embedded, each image’s resolution at the size it is placed, colour spaces (RGB, CMYK, grey, ICC, spot), the output intent, overprint, transparency, the smallest text and the thinnest lines.'],
  ['What is the difference between the PDF/X-1a and PDF/X-4 style checks?', 'The CMYK check (like PDF/X-1a) wants CMYK or spot colour only and no live transparency. The modern check (like PDF/X-4) allows RGB/ICC colour and transparency as long as an output intent tells the printer how to convert.'],
  ['Does “Ready” guarantee my print?', 'It means none of the checks found a problem. Always follow your printer’s own specification and check a proof.'],
  ['Does it fix the file?', 'No — it never alters your artwork. Each finding says what to change in your design software.'],
];

export default function PreflightPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'PDF Preflight Inspector — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <ToolShell path="/pdf-preflight" h1="Check your PDF before it goes to print." name="PDF Preflight Inspector" sub="Bleed, fonts, image resolution, colour and spot checks"
      about={<ToolAbout intro="Drop any PDF to see whether it is ready for press: page boxes and bleed, embedded fonts, real image resolution, colour spaces and spot colours, output intent, overprint, transparency, small text and thin lines. Download a report for your printer or client." steps={[['Drop a PDF', 'From any design software.'], ['Choose the output', 'CMYK press, modern press (PDF/X-4 style) or screen.'], ['Read the findings', 'Ready, warnings and errors with the page and how to fix it.'], ['Share the report', 'Download a branded report PDF.']]} faq={FAQ} related={[{ href: '/print-size-calculator', label: 'Print Size & Binding Calculator' }, { href: '/packaging-dieline', label: 'Packaging Dieline Studio' }, { href: '/print-layout', label: 'Print Layout' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PdfPreflight />
    </ToolShell>
  );
}
