import type { Metadata } from 'next';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { VariableDataStudio } from '@/components/vdp/VariableDataStudio';

const TITLE = 'Variable Data Printing — Badges, Certificates & Numbered Tickets from Excel';
const DESC = 'Make one personalised design per spreadsheet row: name badges, certificates, numbered tickets and cards. Paste from Excel or open a CSV, place {Name} fields and serial numbers, and download a print-ready PDF (one per page or many per sheet with crop marks).';
const URL = `${SITE_URL}/variable-data`;
export const metadata: Metadata = { title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL }, openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME } };
const FAQ: [string, string][] = [
  ['How do I add my list?', 'Paste straight from Excel or Google Sheets (the first row is the column names) or open a CSV file. Each row becomes one design.'],
  ['How do fields work?', 'Type text with column names in braces — {Name}, {Company} — and they are filled from each row. {#0001} gives serial numbers starting at 1 with four digits.'],
  ['Can I use my own design as the background?', 'Yes — add a PDF (it stays vector) or a picture as the artwork; the text is printed on top.'],
  ['Will the fonts print correctly?', 'Every text is turned into outlines from the real font file, so the printer does not need the font. Colours are converted to CMYK.'],
  ['Can I print many on one sheet?', 'Choose “Many per sheet”, pick A4, A3, SRA3 or Letter and the gap; designs are laid out with crop marks.'],
];
export default function VdpPage() {
  const ld = [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Variable Data Studio — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  return (
    <ToolShell path="/variable-data" h1="One design, every name on your list." name="Variable Data Studio" sub="Badges, certificates, tickets and cards from a spreadsheet"
      about={<ToolAbout intro="Paste your list, place the fields on the design, and download one print-ready PDF with every record — one per page or many per sheet with crop marks." faq={FAQ} related={[{ href: '/barcode-generator', label: 'Barcode Studio' }, { href: '/print-layout', label: 'Print Layout' }, { href: '/pdf-preflight', label: 'PDF Preflight Inspector' }]} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <VariableDataStudio />
    </ToolShell>
  );
}
