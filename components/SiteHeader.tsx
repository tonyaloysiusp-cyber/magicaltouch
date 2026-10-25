'use client';

// The ONE top menu for the whole site (every page except the editor and
// Photo Studio, which have their own tool bars). Same tabs, same order and
// same behaviour everywhere; on phones and tablets the tabs move into a
// menu so nothing is ever cut off.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Plus, X } from 'lucide-react';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { ProfileMenu } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { supabase } from '@/lib/supabase';
import { resolveAuthedPath } from '@/lib/authNav';
import type { AppTheme } from '@/hooks/useAppTheme';

export type SiteTab = 'create' | 'templates' | 'photo' | 'tutorials' | 'tools' | 'about' | 'dashboard' | 'profile' | 'home' | 'contact';

const TABS: { id: SiteTab; label: string; href: string; xl?: boolean }[] = [
  { id: 'templates', label: 'Templates', href: '/templates' },
  { id: 'photo', label: 'Photo Studio', href: '/photo-studio' },
  { id: 'tutorials', label: 'Tutorials', href: '/tutorials' },
  { id: 'tools', label: 'Free tools', href: '/free-design-tools', xl: true },
  { id: 'about', label: 'About', href: '/about' },
];

export function SiteHeader({
  theme,
  onToggleTheme,
  active,
  transparentTop = false,
  onCreate,
}: {
  theme: AppTheme;
  onToggleTheme: () => void;
  active?: SiteTab;
  /** Home page: no background until the page scrolls. */
  transparentTop?: boolean;
  /** Return false to stop "Create" (e.g. the dashboard's design limit). */
  onCreate?: () => boolean | void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(!transparentTop);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!transparentTop) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentTop]);

  // Close the menu on Escape and keep the page from scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const create = async () => {
    setOpen(false);
    if (onCreate && onCreate() === false) return;
    router.push(await resolveAuthedPath('/create'));
  };

  const tabClass = (on: boolean) =>
    `relative text-sm font-medium px-3 py-2 rounded-full transition-colors ${on ? 'text-mt-ink bg-mt-surface2' : 'text-mt-muted hover:text-mt-ink'}`;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? 'bg-mt-bg/90 backdrop-blur-md border-b border-mt-border' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav aria-label="Main" className="mt-container h-16 flex items-center justify-between gap-3">
        <Link href="/" title="Magical Touch Design — home" className="flex items-center shrink-0">
          <BrandLogo theme={theme} width={140} height={28} priority />
        </Link>

        <div className="hidden lg:flex items-center gap-0.5">
          <button onClick={create} className={tabClass(active === 'create')}>Create</button>
          {TABS.map((t) => (
            <Link key={t.id} href={t.href} aria-current={active === t.id ? 'page' : undefined} className={`${t.xl ? 'hidden xl:inline-flex' : ''} ${tabClass(active === t.id)}`}>
              {t.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
          <div className="hidden lg:flex items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined} className={tabClass(active === 'dashboard')}>Dashboard</Link>
            ) : loggedIn === false ? (
              <Link href="/login" className={tabClass(false)}>Log in</Link>
            ) : null}
          </div>
          <button
            onClick={create}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-full bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(9,9,11,0.16)] hover:-translate-y-0.5 transition-transform"
          >
            <Plus size={15} aria-hidden /> {loggedIn ? 'New design' : 'Start designing'}
          </button>
          {loggedIn && <ProfileMenu />}
          <button
            className="lg:hidden h-10 w-10 -mr-1 inline-flex items-center justify-center rounded-full text-mt-ink hover:bg-mt-surface2"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="site-menu" className="lg:hidden border-t border-mt-border bg-mt-bg h-[calc(100dvh-4rem)] overflow-y-auto">
          <div className="mt-container py-4 flex flex-col">
            <button onClick={create} className="py-3 text-left text-[17px] font-medium text-mt-ink border-b border-mt-border">Create a design</button>
            {TABS.map((t) => (
              <Link key={t.id} href={t.href} onClick={() => setOpen(false)} aria-current={active === t.id ? 'page' : undefined} className={`py-3 text-[17px] font-medium border-b border-mt-border ${active === t.id ? 'text-mt-ink' : 'text-mt-muted'}`}>
                {t.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} className="py-3 text-[17px] font-medium text-mt-muted border-b border-mt-border">Contact</Link>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={loggedIn ? '/dashboard' : '/login'} onClick={() => setOpen(false)} className="h-12 inline-flex items-center justify-center rounded-full border border-mt-border text-[15px] font-semibold text-mt-ink">
                {loggedIn ? 'Dashboard' : 'Log in'}
              </Link>
              <button onClick={create} className="h-12 inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient text-white text-[15px] font-semibold">
                <Plus size={16} aria-hidden /> {loggedIn ? 'New design' : 'Start designing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
