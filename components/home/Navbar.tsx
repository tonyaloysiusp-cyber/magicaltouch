'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';

const NAV_LINKS = [
  { label: 'Templates', href: '/templates' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar() {
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
        scrolled ? 'bg-[#F7F5F0]/90 backdrop-blur-md border-b border-black/10' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <Image src="/logo.png" alt="Magical Touch" width={140} height={28} priority />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={goToCreate} className="text-sm text-[#4A4750] hover:text-[#17161B] transition-colors">
            Create
          </button>
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="text-sm text-[#4A4750] hover:text-[#17161B] transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {loggedIn ? (
            <Link href="/dashboard" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
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

        <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-black/10 bg-[#F7F5F0] px-6 py-4 flex flex-col gap-1">
          <button onClick={goToCreate} className="py-2.5 text-sm text-left">
            Create
          </button>
          {NAV_LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 mt-3">
            <Link
              href={loggedIn ? '/dashboard' : '/login'}
              className="text-center text-sm font-medium border border-black/15 rounded-full py-2.5"
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
