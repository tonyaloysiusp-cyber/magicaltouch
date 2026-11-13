// Shared layout for the standalone tool pages: one strong landing page per
// tool (no thin sub-pages) with the tool itself above the fold, how-to
// steps, FAQ and related tools — plus SoftwareApplication, HowTo, FAQPage
// and BreadcrumbList structured data.

import { BackChip } from '@/components/tools/BackChip';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

export interface ToolPageProps {
  path: string; name: string; eyebrow: string; h1: string; intro: string; description: string;
  steps: [string, string][]; faq: [string, string][]; related: { href: string; label: string }[];
  extra?: ReactNode; children: ReactNode; image?: string;
}

export const RELATED_TOOLS: { href: string; label: string }[] = [
  { href: '/custom-jersey-designer', label: 'Custom jersey designer' },
  { href: '/polo-shirt-designer', label: 'Polo T-shirt designer' },
  { href: '/custom-t-shirt-designer', label: 'Custom T-shirt designer' },
  { href: '/wall-designer', label: 'Wall poster & wallpaper designer' },
  { href: '/trace', label: 'Image to vector (Image Trace)' },
  { href: '/patterns', label: 'Seamless pattern maker' },
  { href: '/colours', label: 'Colour palette generator' },
  { href: '/remove-background', label: 'Background remover' },
  { href: '/passport-photo-maker', label: 'Passport size photo maker' },
  { href: '/rangoli-mandala-maker', label: 'Rangoli & mandala maker' },
  { href: '/gradient-background-generator', label: 'Gradient background generator' },
  { href: '/print-size-calculator', label: 'Print size & bleed calculator' },
  { href: '/photo-studio', label: 'Photo editor' },
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
    <SeoShell active="tools">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><Crumbs items={[{ href: '/', label: 'Home' }, { href: '/tools', label: 'Tools' }, { label: p.name }]} /><BackChip /></div>
        <header className="mt-4 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">{p.eyebrow}</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">{p.h1}</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">{p.intro}</p>
        </header>
        <div className="mt-8">{p.children}</div>

        <section className="mt-16" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.steps.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-mt-border bg-mt-surface p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-[14px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {p.extra}

        <section className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" aria-labelledby="faq">
          <div>
            <h2 id="faq" className="text-2xl font-semibold">Questions</h2>
            <dl className="mt-4 divide-y divide-mt-border">
              {p.faq.map(([q, a]) => (<div key={q} className="py-4"><dt className="font-semibold">{q}</dt><dd className="mt-1 text-[15px] text-mt-muted leading-relaxed">{a}</dd></div>))}
            </dl>
          </div>
          <nav aria-label="More free tools" className="rounded-3xl border border-mt-border bg-mt-surface p-6 self-start">
            <h2 className="text-lg font-semibold">More free tools</h2>
            <ul className="mt-3 space-y-2 text-[15px]">
              {p.related.filter((r) => r.href !== p.path).map((r) => <li key={r.href}><Link href={r.href} className="text-mt-muted hover:text-mt-ink">{r.label} →</Link></li>)}
            </ul>
          </nav>
        </section>
      </div>
    </SeoShell>
  );
}
