'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { Menu, X, Search, ArrowUpRight, Sun, Moon, Instagram, Twitter, Facebook, Youtube } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Category, Template, CATEGORIES, TEMPLATES, fetchTemplates } from '@/lib/templatesData';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

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
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
];

// A varied tile height per template, keyed off its own aspect ratio, so
// the gallery reads as a curated visual wall rather than a uniform grid
// of identical boxes — the same masonry approach the homepage's own
// design showcase uses.
function tileHeight(t: Template): string {
  const ratio = t.height / t.width;
  if (ratio >= 1.5) return 'h-96';
  if (ratio >= 1.05) return 'h-80';
  if (ratio >= 0.85) return 'h-64';
  return 'h-52';
}

export default function TemplatesPage() {
  const { theme, toggleTheme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, templates]);

  const goToWorkspace = async () => {
    setMenuOpen(false);
    router.push(await resolveAuthedPath('/dashboard'));
  };

  const useTemplate = async (t: Template) => {
    // A real id means this row has actual editable canvas_json the
    // editor can load (see lib/templatesData.ts) -- the static fallback
    // array and any pre-migration row have no id, so they fall back to
    // today's blank-canvas-at-the-right-size behavior.
    const editorPath = t.id
      ? `/editor?w=${t.width}&h=${t.height}&templateId=${t.id}`
      : `/editor?w=${t.width}&h=${t.height}`;
    router.push(await resolveAuthedPath(editorPath));
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#FAF9F6] dark:bg-[#111015] text-[#14121F] dark:text-[#F3F1F7] min-h-screen transition-colors duration-300`}
    >
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 dark:bg-[#151320]/90 backdrop-blur border-b border-black/5 dark:border-white/10">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <BrandLogo theme={theme} width={140} height={28} priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`text-sm transition-colors ${
                  l.label === 'Templates'
                    ? 'text-[#14121F] dark:text-white font-semibold'
                    : 'text-[#4B4560] dark:text-[#B7B2C6] hover:text-[#14121F] dark:hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-full border border-black/10 dark:border-white/15 text-[#4B4560] dark:text-[#B7B2C6] hover:border-black/25 dark:hover:border-white/30 transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {!loggedIn && (
              <Link href="/login" className="text-sm font-medium text-[#4B4560] dark:text-[#B7B2C6] hover:text-[#14121F] dark:hover:text-white px-3 py-2">
                Log In
              </Link>
            )}
            <button
              onClick={goToWorkspace}
              className="relative overflow-hidden text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(108,79,209,0.5)] hover:shadow-[0_10px_20px_-6px_rgba(108,79,209,0.6)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
            >
              Start Designing
            </button>
            {loggedIn && <ProfileMenu />}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 text-[#4B4560] dark:text-[#B7B2C6]"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="p-2 -mr-2 text-[#14121F] dark:text-white"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-black/5 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#151320] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="py-2.5 text-sm text-[#4B4560] dark:text-[#B7B2C6]" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <Link
                href={loggedIn ? '/dashboard' : '/login'}
                className="text-center text-sm font-medium border border-black/10 dark:border-white/15 text-[#14121F] dark:text-white rounded-full py-2.5"
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

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase">Templates</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl sm:text-6xl leading-[1.05] tracking-tight">
          Start somewhere brilliant.
        </h1>
        <p className="mt-5 text-lg text-[#4B4560] dark:text-[#B7B2C6] max-w-lg mx-auto leading-relaxed">
          Choose a starting point. Add your style. Make it yours.
        </p>

        <div className="mt-8 max-w-md mx-auto relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B4560]/60 dark:text-[#B7B2C6]/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-11 pr-4 py-3 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-[#1B1926] text-sm placeholder:text-[#4B4560]/60 dark:placeholder:text-[#B7B2C6]/60 focus:outline-none focus:border-[#6C4FD1]/50 focus:ring-2 focus:ring-[#6C4FD1]/15 transition-all"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 text-sm font-medium rounded-full px-4 py-2 border transition-colors ${
                activeCategory === c
                  ? 'bg-[#14121F] dark:bg-white text-white dark:text-[#14121F] border-[#14121F] dark:border-white'
                  : 'text-[#14121F] dark:text-[#B7B2C6] border-black/10 dark:border-white/15 hover:border-[#6C4FD1]/40 hover:text-[#6C4FD1]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
          {filtered.map((t) => (
            <div key={t.name} className="group break-inside-avoid rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white dark:bg-[#1B1926] shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className={`relative overflow-hidden ${tileHeight(t)}`}>
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  {t.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <MockDesignCard colors={t.colors} label={t.category} />
                  )}
                </div>
                <div className="absolute inset-0 bg-[#14121F]/0 group-hover:bg-[#14121F]/40 transition-colors duration-300 flex items-center justify-center">
                  <button
                    onClick={() => useTemplate(t)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-sm font-semibold text-[#14121F] bg-white px-4 py-2 rounded-full"
                  >
                    Use Template <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-[#4B4560] dark:text-[#B7B2C6] mt-0.5">{t.category}</p>
                </div>
                <span className="text-[11px] text-[#4B4560] dark:text-[#B7B2C6] shrink-0">
                  {t.width}×{t.height}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg font-[family-name:var(--font-display)]">No templates match yet.</p>
            <p className="mt-2 text-sm text-[#4B4560] dark:text-[#B7B2C6]">Try a different search or category.</p>
          </div>
        )}
      </section>

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo theme={theme} width={120} height={24} />
            <span className="text-xs text-[#4B4560] dark:text-[#B7B2C6]">© {new Date().getFullYear()} Magical Touch</span>
          </div>
          <div className="flex gap-3 text-[#4B4560] dark:text-[#B7B2C6]">
            <Instagram size={16} />
            <Twitter size={16} />
            <Facebook size={16} />
            <Youtube size={16} />
          </div>
        </div>
      </footer>
    </main>
    </div>
  );
}
