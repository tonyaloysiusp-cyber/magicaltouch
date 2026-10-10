'use client';

// Frame for every admin page: the site header, a hero in the brand style,
// and a side menu (a scrolling row on phones) linking all admin tools.

import Link from 'next/link';
import { ReactNode } from 'react';
import { LayoutDashboard, Inbox, Server, CalendarHeart, PenLine, Mail, LayoutTemplate, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';

export type AdminSection = 'overview' | 'messages' | 'services' | 'occasions' | 'wording' | 'email' | 'templates' | 'brand';

const NAV: { id: AdminSection; label: string; href: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: <LayoutDashboard size={17} /> },
  { id: 'messages', label: 'Messages', href: '/admin?tab=messages', icon: <Inbox size={17} /> },
  { id: 'occasions', label: 'Festivals & occasions', href: '/admin?tab=occasions', icon: <CalendarHeart size={17} /> },
  { id: 'services', label: 'Hosting & renewals', href: '/admin?tab=services', icon: <Server size={17} /> },
  { id: 'templates', label: 'Templates', href: '/admin/templates', icon: <LayoutTemplate size={17} /> },
  { id: 'brand', label: 'Brand workspace', href: '/admin/brand', icon: <Sparkles size={17} /> },
  { id: 'email', label: 'Email Center', href: '/admin/email', icon: <Mail size={17} /> },
  { id: 'wording', label: 'Email wording', href: '/admin?tab=wording', icon: <PenLine size={17} /> },
];

export function AdminShell({
  active,
  title,
  accent,
  subtitle,
  actions,
  badges = {},
  onNavigate,
  children,
}: {
  active: AdminSection;
  title: string;
  accent?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  badges?: Partial<Record<AdminSection, number>>;
  // In-page tabs (on /admin) switch without a page load.
  onNavigate?: (id: AdminSection) => boolean;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useAppTheme();
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} />
        <PageHero eyebrow="Admin" title={title} accent={accent} subtitle={subtitle} actions={actions} compact />
        <div className="mt-container py-6 sm:py-8 grid lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)] gap-6 2xl:gap-10 items-start">
          <nav aria-label="Admin" className="lg:sticky lg:top-24 -mx-4 px-4 sm:mx-0 sm:px-0 flex lg:flex-col gap-1.5 overflow-x-auto mt-scroll pb-1 lg:pb-0">
            {NAV.map((n) => {
              const on = n.id === active;
              const count = badges[n.id];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={(e) => {
                    if (onNavigate && onNavigate(n.id)) e.preventDefault();
                  }}
                  aria-current={on ? 'page' : undefined}
                  className={`shrink-0 flex items-center gap-3 h-11 px-3.5 rounded-xl text-[14px] font-medium transition-colors ${
                    on ? 'bg-mt-primary text-mt-onprimary shadow-[0_10px_24px_-14px_rgba(9,9,11,0.6)]' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
                  }`}
                >
                  <span className={on ? '' : 'text-mt-faint'}>{n.icon}</span>
                  <span className="whitespace-nowrap flex-1">{n.label}</span>
                  {!!count && (
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold inline-flex items-center justify-center ${on ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'}`}>{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AdminCard({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-[15px] font-semibold text-mt-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
