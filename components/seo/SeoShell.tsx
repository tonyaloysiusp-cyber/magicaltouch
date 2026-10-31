'use client';

// Header, theme and footer around the server-rendered template and
// category pages (the content itself is plain HTML that search engines read).

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, Wand2 } from 'lucide-react';
import { usePremiumGate } from '@/components/monetization/Paywall';
import { AppHeader } from '@/components/AppHeader';
import type { SiteTab } from '@/components/SiteHeader';
import { Footer } from '@/components/home/Footer';
import { useAppTheme } from '@/hooks/useAppTheme';
import { resolveAuthedPath } from '@/lib/authNav';

export function SeoShell({ children, active }: { children: ReactNode; active?: SiteTab }) {
  const { theme, toggleTheme } = useAppTheme();
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} active={active} />
        {children}
        <Footer theme={theme} />
      </main>
    </div>
  );
}

export function UseTemplateButton({ id, width, height, label = 'Use this template — free', premium = false }: { id: string; width: number; height: number; label?: string; premium?: boolean }) {
  const router = useRouter();
  const gate = usePremiumGate();
  const path = `/editor?w=${width}&h=${height}&templateId=${id}`;
  const locked = gate.locked(premium ? false : true);
  return (
    <>
      <button
        type="button"
        onClick={async () => { if (gate.guard(premium ? false : true)) router.push(await resolveAuthedPath(path)); }}
        className="h-12 px-6 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center gap-2 hover:opacity-90"
      >
        {locked ? <Crown size={18} /> : <Wand2 size={18} />} {locked ? 'Premium template — unlock' : label}
      </button>
      {gate.dialog}
    </>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-mt-muted">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5">›</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-mt-ink underline-offset-2 hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="text-mt-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
