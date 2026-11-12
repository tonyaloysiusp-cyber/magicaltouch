import Link from 'next/link';
import { SeoShell } from '@/components/seo/SeoShell';

// Shown for any address that does not exist: the site menu, a search box and
// a few useful places, so a visitor is never stuck on a dead end.
export default function NotFound() {
  const links = [
    { href: '/templates', label: 'All templates' },
    { href: '/templates/category/social-media-posts', label: 'Social media posts' },
    { href: '/templates/category/invitations', label: 'Invitations' },
    { href: '/templates/category/flyers', label: 'Flyers' },
    { href: '/templates/category/business-cards', label: 'Business cards' },
    { href: '/free-design-tools', label: 'Free design tools' },
  ];
  return (
    <SeoShell>
      <div className="mt-container py-16 sm:py-24 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-mt-muted">404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">This page could not be found</h1>
        <p className="mt-3 text-mt-muted">The link may be old or mistyped. Search the templates or pick a place to start.</p>
        <form action="/templates" method="get" role="search" className="mt-8 mx-auto max-w-xl flex gap-2">
          <input name="q" type="search" placeholder="Search templates — wedding invitation, Diwali post…" aria-label="Search templates"
            className="flex-1 h-12 rounded-full border border-mt-border bg-mt-surface px-5 text-[15px] outline-none focus:border-mt-accent" />
          <button type="submit" className="h-12 px-6 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold">Search</button>
        </form>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="px-4 py-2 rounded-full border border-mt-border text-sm text-mt-muted hover:text-mt-ink">{l.label}</Link>
          ))}
        </div>
        <Link href="/" className="mt-10 inline-block text-sm font-medium text-mt-accent hover:underline">← Back to the home page</Link>
      </div>
    </SeoShell>
  );
}
