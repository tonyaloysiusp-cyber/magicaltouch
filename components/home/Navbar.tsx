'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { AppTheme } from '@/hooks/useAppTheme';

const NAV_LINKS = [
  { label: 'Templates', href: '/templates' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

// A real day/night switch, not a decoration — toggling it flips the
// `dark` class the homepage root applies, which every section below
// reads via `dark:` Tailwind variants.
function ThemeSwitch({ theme, onToggle }: { theme: AppTheme; onToggle: () => void }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative inline-flex items-center w-14 h-8 rounded-full shrink-0 transition-colors duration-300 ${
        isDark ? 'bg-[#2A2740]' : 'bg-[#EAE6F5]'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ${
          isDark ? 'translate-x-6 bg-[#3A355A] text-[#C4DA3B]' : 'translate-x-0 bg-white text-[#F5B942]'
        }`}
      >
        {isDark ? <Moon size={13} /> : <Sun size={13} />}
      </span>
    </button>
  );
}

export function Navbar({ theme, onToggleTheme }: { theme: AppTheme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The homepage previously showed "Log In" / "Start Designing" even to
  // an already-logged-in visitor — there was no auth check backing the
  // nav UI at all (goToCreate below checks auth only at click time, not
  // for what the header displays). This keeps the header itself in sync,
  // including across a login/logout that happens without this component
  // remounting.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const goToCreate = async () => {
    setMenuOpen(false);
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-[#151320]/90 backdrop-blur-md border-b border-black/10 dark:border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <BrandLogo theme={theme} width={140} height={28} priority />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={goToCreate} className="text-sm text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white transition-colors">
            Create
          </button>
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="text-sm text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
          {loggedIn ? (
            <Link href="/dashboard" className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white px-3 py-2">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white px-3 py-2">
              Log In
            </Link>
          )}
          <button
            onClick={goToCreate}
            className="relative overflow-hidden text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(108,79,209,0.5)] hover:shadow-[0_10px_20px_-6px_rgba(108,79,209,0.6)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
          >
            Start Designing
          </button>
          {loggedIn && <ProfileMenu />}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
          <button className="p-2 -mr-2 text-[#17161B] dark:text-white" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#151320] px-6 py-4 flex flex-col gap-1">
          <button onClick={goToCreate} className="py-2.5 text-sm text-left text-[#17161B] dark:text-white">
            Create
          </button>
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="py-2.5 text-sm text-[#17161B] dark:text-white" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 mt-3">
            <Link
              href={loggedIn ? '/dashboard' : '/login'}
              className="text-center text-sm font-medium border border-black/15 dark:border-white/15 text-[#17161B] dark:text-white rounded-full py-2.5"
              onClick={() => setMenuOpen(false)}
            >
              {loggedIn ? 'Dashboard' : 'Log In'}
            </Link>
            <button onClick={goToCreate} className="text-center text-sm font-semibold text-white rounded-full py-2.5 bg-brand-gradient">
              Start Designing
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
