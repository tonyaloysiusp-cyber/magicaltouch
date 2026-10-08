'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { Menu, X, Search, ArrowUpRight, Sun, Moon, Instagram, Twitter, Facebook, Youtube, BadgeCheck, Crown } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Template, TemplateCategory, CATEGORIES, TEMPLATES, fetchPublicTemplates, fetchCategories, fetchTemplateById } from '@/lib/templatesData';
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

// Each tile keeps its template's real proportions (clamped for very
// tall or wide sizes), so the gallery reads as a masonry wall and no
// preview is ever cropped.
function tileRatio(t: Template): string {
  const r = Math.min(2.1, Math.max(0.42, t.height / Math.max(t.width, 1)));
  return `${1} / ${r}`;
}

// High-demand categories first; anything else follows in its own order.
const CATEGORY_ORDER = ['Birthday', 'Events', 'Wedding', 'Business', 'Social Media', 'Marketing', 'Menus', 'Certificates', 'Resume', 'Cards'];

type SortKey = 'popular' | 'newest' | 'trending';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
];

const time = (t: Template) => (t.publishedAt ? new Date(t.publishedAt).getTime() : 0);

export default function TemplatesPage() {
  const { theme, toggleTheme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  // A category id from the database, or a plain name for the built-in
  // fallback list when the database isn't reachable.
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [orientation, setOrientation] = useState<'all' | 'portrait' | 'landscape' | 'square'>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('popular');
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const router = useRouter();

  // TEMPLATES (the static fallback) renders immediately so the page never
  // shows an empty gallery while this loads. fetchPublicTemplates() only
  // ever returns templates with real, usable design content -- never the
  // legacy 0003 seed's color-swatch-only rows, which "Use Template" can't
  // actually do anything with (see lib/templatesData.ts).
  useEffect(() => {
    fetchPublicTemplates().then(setTemplates);
    fetchCategories().then(setCategories);
    // Deep link from the admin "Preview" button: /templates?template=<id>.
    // RLS lets admins preview drafts; customers only ever get published.
    const id = new URLSearchParams(window.location.search).get('template');
    if (id) fetchTemplateById(id).then((t) => t && setPreviewing({ ...t, canvasJson: undefined }));
  }, []);

  // Close the preview with Escape.
  useEffect(() => {
    if (!previewing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreviewing(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewing]);

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

  const usingDbCategories = categories.length > 0 && templates.some((t) => !!t.categoryId);
  const parentOf = (id: string | null | undefined) => categories.find((c) => c.id === id)?.parentId ?? null;

  // Category chips: top-level categories that actually have templates.
  const chips = useMemo(() => {
    if (!usingDbCategories) return CATEGORIES.map((c) => ({ id: c, label: c }));
    const used = new Set<string>();
    templates.forEach((t) => {
      if (!t.categoryId) return;
      used.add(parentOf(t.categoryId) || t.categoryId);
    });
    const rank = (name: string) => { const i = CATEGORY_ORDER.indexOf(name); return i === -1 ? 99 : i; };
    return categories
      .filter((c) => !c.parentId && used.has(c.id))
      .sort((a, b) => rank(a.name) - rank(b.name))
      .map((c) => ({ id: c.id, label: c.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, templates, usingDbCategories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = templates.filter((t) => {
      const matchesCategory =
        activeCategory === 'All' ||
        (usingDbCategories ? t.categoryId === activeCategory || parentOf(t.categoryId) === activeCategory : t.category === activeCategory);
      const haystack = [t.name, t.category, t.description, t.searchKeywords, t.occasion, t.industry, ...(t.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !q || q.split(/\s+/).every((word) => haystack.includes(word));
      const shape = t.orientation || (t.width > t.height ? 'landscape' : t.width < t.height ? 'portrait' : 'square');
      const matchesOrientation = orientation === 'all' || shape === orientation;
      const matchesFree = !freeOnly || t.isFree !== false;
      return matchesCategory && matchesQuery && matchesOrientation && matchesFree;
    });
    // Popular keeps the curated order (featured first, then sort order).
    if (sort === 'newest') return [...list].sort((a, b) => time(b) - time(a));
    if (sort === 'trending') {
      // Featured picks published recently rise to the top.
      const now = Date.now();
      const score = (t: Template) => (t.isFeatured ? 2 : 0) + Math.max(0, 1 - (now - time(t)) / (60 * 86400000));
      return [...list].sort((a, b) => score(b) - score(a));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, query, templates, orientation, freeOnly, sort, usingDbCategories, categories]);

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
          {[{ id: 'All', label: 'All' }, ...chips].map(({ id: c, label }) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 text-sm font-medium rounded-full px-4 py-2 border transition-colors ${
                activeCategory === c
                  ? 'bg-[#14121F] dark:bg-white text-white dark:text-[#14121F] border-[#14121F] dark:border-white'
                  : 'text-[#14121F] dark:text-[#B7B2C6] border-black/10 dark:border-white/15 hover:border-[#6C4FD1]/40 hover:text-[#6C4FD1]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          {(['all', 'portrait', 'landscape', 'square'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`rounded-full px-3 py-1.5 border transition-colors ${
                orientation === o
                  ? 'border-[#6C4FD1] text-[#6C4FD1] dark:text-[#B9A6F2] bg-[#6C4FD1]/5'
                  : 'border-black/10 dark:border-white/15 text-[#4B4560] dark:text-[#B7B2C6]'
              }`}
            >
              {o === 'all' ? 'Any shape' : o[0].toUpperCase() + o.slice(1)}
            </button>
          ))}
          <label className="ml-1 inline-flex items-center gap-1.5 text-[#4B4560] dark:text-[#B7B2C6] cursor-pointer">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="accent-[#6C4FD1]" />
            Free only
          </label>
          <label className="ml-1 inline-flex items-center gap-1.5 text-[#4B4560] dark:text-[#B7B2C6]">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full px-3 py-1.5 border border-black/10 dark:border-white/15 bg-white dark:bg-[#1B1926] text-[#14121F] dark:text-[#F3F1F7] text-xs focus:outline-none focus:border-[#6C4FD1]/50"
            >
              {SORTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-center text-xs text-[#4B4560] dark:text-[#B7B2C6]">
          {filtered.length} {filtered.length === 1 ? 'template' : 'templates'}
        </p>
      </div>

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 [&>*]:mb-4">
          {filtered.map((t) => (
            <div key={t.id || t.name} className="group break-inside-avoid rounded-xl overflow-hidden border border-black/5 dark:border-white/10 bg-white dark:bg-[#1B1926] shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="relative overflow-hidden bg-[#F1EEF8] dark:bg-[#14121F]" style={{ aspectRatio: tileRatio(t) }}>
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
                  {t.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumbnail} alt={t.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <MockDesignCard colors={t.colors} label={t.category} />
                  )}
                </div>
                {t.isFree === false ? (
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#14121F] bg-[#F5B942] px-2 py-1 rounded-full shadow">
                    <Crown size={11} /> Premium
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold uppercase tracking-wide text-white bg-[#14121F]/75 px-2 py-1 rounded-full">
                    Free
                  </span>
                )}
                <button
                  onClick={() => setPreviewing(t)}
                  aria-label={`Preview ${t.name}`}
                  className="absolute inset-0 bg-[#14121F]/0 group-hover:bg-[#14121F]/40 transition-colors duration-300 flex items-center justify-center"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-sm font-semibold text-[#14121F] bg-white px-4 py-2 rounded-full">
                    Preview <ArrowUpRight size={14} />
                  </span>
                </button>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-semibold leading-snug truncate" title={t.name}>{t.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[#4B4560] dark:text-[#B7B2C6]">
                  <span className="truncate rounded-full bg-[#6C4FD1]/10 text-[#6C4FD1] dark:text-[#B9A6F2] px-2 py-0.5">{t.category}</span>
                  <span className="shrink-0">{t.width}×{t.height}</span>
                </div>
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

      {previewing && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewing(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewing.name}
            className="bg-white dark:bg-[#1B1926] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto grid md:grid-cols-[1.4fr_1fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#F1EEF8] dark:bg-[#14121F] flex items-center justify-center p-6 min-h-[260px]">
              {previewing.preview || previewing.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewing.preview || previewing.thumbnail!} alt={previewing.name} className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg" />
              ) : (
                <div className="w-full h-72">
                  <MockDesignCard colors={previewing.colors} label={previewing.category} />
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col">
              <button onClick={() => setPreviewing(null)} className="self-end p-1 -mt-2 -mr-2 text-[#4B4560] dark:text-[#B7B2C6]" aria-label="Close">
                <X size={20} />
              </button>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6C4FD1] dark:text-[#B9A6F2]">
                <BadgeCheck size={14} /> Provided by Magical Touch Design
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight">{previewing.name}</h2>
              {previewing.description && <p className="mt-3 text-sm text-[#4B4560] dark:text-[#B7B2C6] leading-relaxed">{previewing.description}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-[#4B4560] dark:text-[#B7B2C6]">Category</dt>
                <dd>{previewing.category}</dd>
                <dt className="text-[#4B4560] dark:text-[#B7B2C6]">Size</dt>
                <dd>
                  {previewing.width} × {previewing.height} {previewing.unit || 'px'}
                </dd>
                {previewing.isFree !== undefined && (
                  <>
                    <dt className="text-[#4B4560] dark:text-[#B7B2C6]">Price</dt>
                    <dd>{previewing.isFree ? 'Free' : 'Premium'}</dd>
                  </>
                )}
              </dl>
              {!!previewing.tags?.length && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {previewing.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setQuery(tag);
                        setPreviewing(null);
                      }}
                      className="text-xs rounded-full px-2.5 py-1 bg-black/5 dark:bg-white/10 text-[#4B4560] dark:text-[#B7B2C6]"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-6">
                <button
                  onClick={() => useTemplate(previewing)}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-brand-gradient px-5 py-3 rounded-full"
                >
                  Use This Template <ArrowUpRight size={15} />
                </button>
                <p className="mt-3 text-xs text-center text-[#4B4560] dark:text-[#B7B2C6]">
                  You get your own copy to edit. The original template never changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
