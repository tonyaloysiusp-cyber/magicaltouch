import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PackagingEditor } from '@/components/packaging/editor/PackagingEditor';

const TITLE = 'Packaging Editor — Box Dielines From Your Product Size, Online';
const DESC = 'Enter your product size and board: the editor works out the inside size with a fitting gap, adds the board thickness at every fold and draws the dieline. Pick tuck end, seal end, tray, tray with lid, sleeve or FEFCO boxes, draw your own cut, crease, perforation and glue lines, design on layers and download a print PDF (outlined text, CutContour and Crease spot colours), a branded dieline template, DXF or the MTD project file.';
const URL = `${SITE_URL}/packaging-editor`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESC),
  alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME },
};

export default function PackagingEditorPage() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Packaging Editor — Magical Touch Design', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url: URL, description: DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Packaging Editor', item: URL }] },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="sr-only">Packaging Editor — box dielines from your product size</h1>
      <PackagingEditor />
    </>
  );
}
