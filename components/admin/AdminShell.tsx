'use client';

// Frame for every admin page: the site header, a slim page header and a
// grouped side menu (Dashboard · Content · Growth · Business · Operations)
// with a "Jump to" search (press / to focus). On phones the menu becomes a
// "Go to" picker so it never pushes the page sideways.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutDashboard, Inbox, Server, CalendarHeart, PenLine, Mail, LayoutTemplate, Sparkles, Award, GraduationCap, Megaphone, Info, HeartPulse, BadgeDollarSign, Hash, Image as ImageIcon, Share2, Search, ExternalLink, FileText, PartyPopper } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useAppTheme } from '@/hooks/useAppTheme';

export type AdminSection = 'overview' | 'messages' | 'services' | 'occasions' | 'wording' | 'email' | 'templates' | 'brand' | 'certificates' | 'courses' | 'about' | 'seo' | 'health' | 'pricing' | 'google' | 'posts' | 'social' | 'picture' | 'documents' | 'wishes';

interface NavItem { id: AdminSection; label: string; href: string; icon: ReactNode; hint: string }
export const ADMIN_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'Dashboard', items: [
    { id: 'overview', label: 'Overview', href: '/admin', icon: <LayoutDashboard size={16} />, hint: 'Today at a glance' },
    { id: 'messages', label: 'Inbox', href: '/admin?tab=messages', icon: <Inbox size={16} />, hint: 'Customer messages, reminders' },
    { id: 'health', label: 'Site health', href: '/admin/health', icon: <HeartPulse size={16} />, hint: 'Errors, storage, speed' },
  ] },
  { title: 'Content', items: [
    { id: 'templates', label: 'Templates', href: '/admin/templates', icon: <LayoutTemplate size={16} />, hint: 'Add, edit, publish' },
    { id: 'google', label: 'Google & hashtags', href: '/admin/templates?tab=google', icon: <Hash size={16} />, hint: 'Search words and hashtags per template' },
    { id: 'brand', label: 'Brand workspace', href: '/admin/brand', icon: <Sparkles size={16} />, hint: 'Logo, colours, brand designs' },
    { id: 'about', label: 'About page', href: '/admin/about', icon: <Info size={16} />, hint: 'Founder and story' },
  ] },
  { title: 'Growth', items: [
    { id: 'seo', label: 'SEO & Google', href: '/admin/seo', icon: <Megaphone size={16} />, hint: 'Landing pages, Google, keywords' },
    { id: 'picture', label: 'Google picture', href: '/admin/seo?tab=picture', icon: <ImageIcon size={16} />, hint: 'The picture next to our Google result' },
    { id: 'wishes', label: 'Festival wishes', href: '/admin/festival-wishes', icon: <PartyPopper size={16} />, hint: 'Greeting + celebration on festival days' },
    { id: 'posts', label: 'Google posts', href: '/admin/seo?tab=posts', icon: <ImageIcon size={16} />, hint: 'Posters and videos on Google' },
    { id: 'social', label: 'Social media', href: '/admin/seo?tab=social', icon: <Share2 size={16} />, hint: 'Profiles, post planner, promo kit' },
    { id: 'email', label: 'Email Center', href: '/admin/email', icon: <Mail size={16} />, hint: 'Campaigns and subscribers' },
    { id: 'wording', label: 'Email wording', href: '/admin?tab=wording', icon: <PenLine size={16} />, hint: 'Welcome and system emails' },
  ] },
  { title: 'Business', items: [
    { id: 'pricing', label: 'Pricing & payments', href: '/admin/pricing', icon: <BadgeDollarSign size={16} />, hint: 'Plans, packs, purchases' },
    { id: 'certificates', label: 'Verified certificates', href: '/admin/certificates', icon: <Award size={16} />, hint: 'Issue and check' },
    { id: 'courses', label: 'Courses', href: '/admin/courses', icon: <GraduationCap size={16} />, hint: 'Lessons and learners' },
  ] },
  { title: 'Operations', items: [
    { id: 'occasions', label: 'Festivals & occasions', href: '/admin?tab=occasions', icon: <CalendarHeart size={16} />, hint: 'Calendar and reminders' },
    { id: 'services', label: 'Hosting & renewals', href: '/admin?tab=services', icon: <Server size={16} />, hint: 'Domain, hosting, bills' },
    { id: 'documents', label: 'Business documents', href: '/admin/documents', icon: <FileText size={16} />, hint: 'Registration, tax, trademark, official sites' },
  ] },
];
const ALL = ADMIN_GROUPS.flatMap((g) => g.items);
const SPECTRUM = 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)';

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
  const router = useRouter();
  const [q, setQ] = useState('');
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? ALL.filter((n) => `${n.label} ${n.hint}`.toLowerCase().includes(t)) : null;
  }, [q]);
  const go = (n: NavItem) => {
    if (onNavigate && onNavigate(n.id)) return;
    router.push(n.href);
  };
  const activeItem = ALL.find((n) => n.id === active);

  const item = (n: NavItem) => {
    const on = n.id === active;
    const count = badges[n.id];
    return (
      <Link
        key={n.id}
        href={n.href}
        title={n.hint}
        onClick={(e) => { if (onNavigate && onNavigate(n.id)) e.preventDefault(); setQ(''); }}
        aria-current={on ? 'page' : undefined}
        className={`relative flex items-center gap-2.5 h-9 pl-3 pr-2.5 rounded-lg text-[13.5px] transition-colors ${on ? 'bg-mt-ink text-mt-bg font-semibold' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'}`}
      >
        <span className={on ? '' : 'text-mt-faint'}>{n.icon}</span>
        <span className="truncate flex-1">{n.label}</span>
        {!!count && <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold inline-flex items-center justify-center ${on ? 'bg-white/20' : 'bg-rose-600 text-white'}`}>{count}</span>}
      </Link>
    );
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} />
        <div className="h-[3px]" style={{ background: SPECTRUM }} aria-hidden />
        <div className="mt-container py-5 sm:py-7 grid lg:grid-cols-[236px_minmax(0,1fr)] gap-6 xl:gap-9 items-start">
          {/* Side menu (desktop) */}
          <aside aria-label="Admin" className="hidden lg:flex flex-col gap-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto mt-scroll pr-1">
            <div className="rounded-2xl border border-mt-border bg-mt-surface p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-faint px-1">Admin panel</p>
              <label className="mt-2 relative block">
                <Search size={14} className="absolute left-2.5 top-2.5 text-mt-faint" />
                <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && hits?.[0]) { go(hits[0]); setQ(''); } if (e.key === 'Escape') setQ(''); }}
                  placeholder="Jump to…  ( / )" className="w-full h-9 rounded-lg border border-mt-input-border bg-mt-bg pl-8 pr-2 text-[13px] text-mt-ink placeholder:text-mt-faint focus:outline-none focus:border-[#3B82C4]" />
              </label>
            </div>
            <nav className="flex flex-col gap-4">
              {hits ? (
                <div className="flex flex-col gap-0.5">{hits.length ? hits.map(item) : <p className="px-3 text-[13px] text-mt-faint">Nothing found</p>}</div>
              ) : ADMIN_GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-faint">{g.title}</p>
                  <div className="flex flex-col gap-0.5">{g.items.map(item)}</div>
                </div>
              ))}
            </nav>
            <Link href="/" className="mx-3 mb-2 inline-flex items-center gap-1.5 text-[12px] text-mt-faint hover:text-mt-ink"><ExternalLink size={12} /> View the website</Link>
          </aside>

          <div className="min-w-0">
            {/* Go to (phones and tablets) */}
            <label className="lg:hidden block mb-4">
              <span className="sr-only">Go to</span>
              <select value={active} onChange={(e) => { const n = ALL.find((x) => x.id === e.target.value); if (n) go(n); }}
                className="w-full h-11 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-[14px] font-medium text-mt-ink">
                {ADMIN_GROUPS.map((g) => (
                  <optgroup key={g.title} label={g.title}>
                    {g.items.map((n) => <option key={n.id} value={n.id}>{n.label}{badges[n.id] ? ` (${badges[n.id]})` : ''}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            {/* Page header */}
            <header className="flex flex-wrap items-end gap-4 pb-5 mb-6 border-b border-mt-border">
              <div className="flex-1 min-w-[220px]">
                <p className="text-[12px] text-mt-faint">Admin{activeItem && activeItem.label !== title ? ` · ${activeItem.label}` : ''}</p>
                <h1 className="mt-1 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight">
                  {(() => {
                    const i = accent ? title.indexOf(accent) : -1;
                    if (i < 0) return title;
                    return <>{title.slice(0, i)}<span className="mt-spectrum-text">{accent}</span>{title.slice(i + accent!.length)}</>;
                  })()}
                </h1>
                {subtitle && <div className="mt-1.5 text-[14px] text-mt-muted max-w-3xl">{subtitle}</div>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </header>
            {children}
          </div>
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
