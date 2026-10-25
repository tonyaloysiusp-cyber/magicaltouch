// Shared layout for /privacy and /terms: the site menu and footer around
// server-rendered text.

import Link from 'next/link';
import { SeoShell } from '@/components/seo/SeoShell';
import { PageHero } from '@/components/PageHero';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <SeoShell>
      <PageHero eyebrow="Magical Touch Design" title={title} accent={title.split(' ').slice(-1)[0]} subtitle={`Last updated ${updated}`} compact />
      <div className="mt-container py-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 items-start">
        <article className="max-w-3xl leading-relaxed text-[15px] text-mt-muted [&_h2]:mt-10 [&_h2]:first:mt-0 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-mt-ink [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1.5 [&_a]:text-mt-accent [&_a]:underline">
          {children}
        </article>
        <aside className="lg:sticky lg:top-8 rounded-3xl border border-mt-border bg-mt-surface p-6">
          <div className="h-1 w-16 rounded-full mt-spectrum mb-4" />
          <p className="text-[15px] font-semibold text-mt-ink">Questions?</p>
          <p className="mt-1.5 text-sm text-mt-muted leading-relaxed">We’re happy to help with anything about your account or your data.</p>
          <a href="mailto:hellomagicaltouch.design@gmail.com" className="mt-4 inline-flex h-10 items-center px-5 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold">
            Email us
          </a>
          <nav className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/privacy" className="text-mt-muted hover:text-mt-ink">Privacy Policy</Link>
            <Link href="/terms" className="text-mt-muted hover:text-mt-ink">Terms of Service</Link>
          </nav>
        </aside>
      </div>
    </SeoShell>
  );
}
