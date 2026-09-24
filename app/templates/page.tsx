'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { Menu, X, Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Category, Template, CATEGORIES, TEMPLATES, fetchTemplates } from '@/lib/templatesData';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Templates', href: '/templates' },
  { label: 'Pricing', href: '/#pricing' },
];

export default function TemplatesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [loggedIn, setLoggedIn] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const router = useRouter();

  // TEMPLATES (the static fallback) renders immediately so the page never
  // shows an empty gallery while this loads; fetchTemplates() itself falls
  // back to the same list if the table isn't reachable, so this can only
  // ever replace it with equal-or-better real data, never blank it out.
  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  // Same gap as the homepage Navbar: this header showed "Log In" even
  // when the visitor was already signed in, since nothing checked auth
  // for the nav UI itself (only the "Start Designing" click handler did).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const filtered = useMemo(
    () => (activeCategory === 'All' ? templates : templates.filter((t) => t.category === activeCategory)),
    [activeCategory, templates]
  );

  const goToWorkspace = async () => {
    setMenuOpen(false);
    router.push(await resolveAuthedPath('/dashboard'));
  };

  const useTemplate = async (t: Template) => {
    const editorPath = `/editor?w=${t.width}&h=${t.height}&templateId=${encodeURIComponent(t.name)}`;
    router.push(await resolveAuthedPath(editorPath));
  };

  return (
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#FAF9F6] text-[#14121F] min-h-screen`}
    >
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur border-b border-black/5">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Magical Touch" width={140} height={28} priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`text-sm transition-colors ${
                  l.label === 'Templates' ? 'text-[#14121F] font-semibold' : 'text-[#4B4560] hover:text-[#14121F]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!loggedIn && (
              <Link href="/login" className="text-sm font-medium text-[#4B4560] hover:text-[#14121F] px-3 py-2">
                Log In
              </Link>
            )}
            <button
              onClick={goToWorkspace}
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-brand-gradient shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Start Designing
            </button>
            {loggedIn && <ProfileMenu />}
          </div>

          <button
            className="md:hidden p-2 -mr-2 text-[#14121F]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-black/5 bg-[#FAF9F6] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="py-2.5 text-sm text-[#4B4560]" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <Link
                href={loggedIn ? '/dashboard' : '/login'}
                className="text-center text-sm font-medium border border-black/10 rounded-full py-2.5"
                onClick={() => setMenuOpen(false)}
              >
                {loggedIn ? 'Dashboard' : 'Log In'}
              </Link>
              <button onClick={goToWorkspace} className="text-center text-sm font-semibold text-white rounded-full py-2.5 bg-brand-gradient">
                Start Designing
              </button>
            </div>
          </div>
        )}
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Template Library</h1>
        <p className="mt-4 text-[#4B4560] max-w-lg mx-auto leading-relaxed">
          Choose a starting point, customize it and make it yours. Every template opens the
          editor at the correct size and orientation for its format.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 text-sm font-medium rounded-full px-4 py-2 border transition-colors ${
                activeCategory === c
                  ? 'bg-[#14121F] text-white border-[#14121F]'
                  : 'text-[#14121F] border-black/10 hover:border-[#6C4FD1]/40 hover:text-[#6C4FD1]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => {
            const isTall = t.height >= t.width;
            return (
              <div key={t.name} className="group rounded-2xl overflow-hidden border border-black/5 bg-white">
                <div className={`relative overflow-hidden ${isTall ? 'h-64' : 'h-48'}`}>
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                    <MockDesignCard colors={t.colors} label={t.category} />
                  </div>
                  <div className="absolute inset-0 bg-[#14121F]/0 group-hover:bg-[#14121F]/35 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => useTemplate(t)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold text-white bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/30 hover:bg-white/25"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[#4B4560] mt-0.5">{t.category}</p>
                  </div>
                  <span className="text-[11px] text-[#4B4560] shrink-0">
                    {t.width}×{t.height}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-[#4B4560] py-16">No templates in this category yet.</p>
        )}
      </section>

      <footer className="border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Magical Touch" width={120} height={24} />
            <span className="text-xs text-[#4B4560]">© 2026 Magical Touch</span>
          </div>
          <div className="flex gap-3 text-[#4B4560]">
            <Instagram size={16} />
            <Twitter size={16} />
            <Facebook size={16} />
            <Youtube size={16} />
          </div>
        </div>
      </footer>
    </main>
  );
}
