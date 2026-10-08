// Shared layout for /privacy and /terms (server components, no JS needed).

import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-mt-bg text-mt-ink">
      <header className="border-b border-black/5 bg-mt-surface/80">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Magical Touch Design home">
            <BrandLogo theme="light" width={150} height={30} />
          </Link>
          <nav className="flex gap-5 text-sm text-mt-muted">
            <Link href="/privacy" className="hover:text-mt-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-mt-ink">Terms</Link>
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12 leading-relaxed text-[15px] text-[#2b2540] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#14121F] [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1.5 [&_a]:text-[#6C4FD1] [&_a]:underline">
        <h1 className="text-4xl font-semibold tracking-tight text-mt-ink">{title}</h1>
        <p className="mt-2 mb-10 text-sm text-mt-muted">Last updated {updated}</p>
        {children}
      </article>
      <footer className="border-t border-black/5 py-8 text-center text-xs text-mt-muted">
        Magical Touch Design · <a href="mailto:hellomagicaltouch.design@gmail.com" className="underline">hellomagicaltouch.design@gmail.com</a>
      </footer>
    </main>
  );
}
