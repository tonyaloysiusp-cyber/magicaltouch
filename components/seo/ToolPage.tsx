// Shared layout for the standalone tool pages: the tool opens straight away
// in the branded app frame (ToolShell); how-to steps, FAQ and related tools
// sit below it — plus SoftwareApplication, HowTo, FAQPage and BreadcrumbList
// structured data.

import type { ReactNode } from 'react';
import { ToolShell, ToolAbout } from '@/components/tools/ToolShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

export interface ToolPageProps {
  path: string; name: string; eyebrow: string; h1: string; intro: string; description: string;
  steps: [string, string][]; faq: [string, string][]; related: { href: string; label: string }[];
  extra?: ReactNode; children: ReactNode; image?: string;
}

export const RELATED_TOOLS: { href: string; label: string }[] = [
  { href: '/create', label: 'Design editor' },
  { href: '/photo-studio', label: 'Photo editor' },
  { href: '/trace', label: 'Image to vector (Image Trace)' },
  { href: '/patterns', label: 'Pattern maker, rangoli & mandala' },
  { href: '/textile-studio', label: 'Textile Design Studio: jerseys, T-shirts, kurta & embroidery' },
  { href: '/print-size-calculator', label: 'Print size & binding calculator' },
  { href: '/print-layout', label: 'Print layout & imposition' },
  { href: '/remove-background', label: 'Background remover' },
  { href: '/passport-photo-maker', label: 'Passport size photo maker' },
  { href: '/colours', label: 'Colour palettes & gradients' },
  { href: '/templates', label: 'Free templates' },
];

export function ToolPage(p: ToolPageProps) {
  const url = `${SITE_URL}${p.path}`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${p.name} — ${SITE_NAME}`, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', browserRequirements: 'Requires JavaScript and a modern browser', isAccessibleForFree: true, url, description: p.description, ...(p.image ? { image: `${SITE_URL}${p.image}`, screenshot: `${SITE_URL}${p.image}` } : {}), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL } },
    { '@context': 'https://schema.org', '@type': 'HowTo', name: p.h1, step: p.steps.map(([name, text], i) => ({ '@type': 'HowToStep', position: i + 1, name, text })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` }, { '@type': 'ListItem', position: 3, name: p.name, item: url }] },
  ];
  return (
    <ToolShell path={p.path} h1={p.h1} name={p.name} sub={p.eyebrow}
      about={<ToolAbout intro={p.intro} steps={p.steps} faq={p.faq} related={p.related.filter((r) => r.href !== p.path)} extra={p.extra} />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {p.children}
    </ToolShell>
  );
}
