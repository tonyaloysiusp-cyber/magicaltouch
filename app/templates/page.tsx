'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { Menu, X, Search, ArrowUpRight, Instagram, Twitter, Facebook, Youtube, BadgeCheck, Crown, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { STYLES, PALETTES, ASPECTS, stylesOf, styleLabel, palettesOf, mediumOf, pageCountOf, shapeOf, aspectOf, visibleTags } from '@/lib/templates/taxonomy';
import { renderTemplatePages, pageLabel, PageImage } from '@/lib/templates/renderPages';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { PrintSpecs } from '@/components/templates/PrintSpecs';
import { Template, TemplateCategory, CATEGORIES, TEMPLATES, fetchPublicTemplates, fetchCategories, fetchTemplateById } from '@/lib/templatesData';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { PageHero } from '@/components/PageHero';
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
const CATEGORY_ORDER = ['Festivals', 'Birthday', 'Love & Family', 'Events', 'Wedding', 'Business', 'Social Media', 'Marketing', 'Menus', 'Certificates', 'Resume', 'Cards'];

type SortKey = 'recommended' | 'recent' | 'az';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'recent', label: 'Recently added' },
  { id: 'az', label: 'Alphabetical' },
];

const time = (t: Template) => (t.publishedAt ? new Date(t.publishedAt).getTime() : 0);
const RECENT_DAYS = 30;

type Shape = 'all' | 'portrait' | 'landscape' | 'square';
interface Filters {
  q: string;
  cat: string; // 'All' or category id / name
  sub: string | null;
  styles: string[];
  palette: string | null;
  shape: Shape;
  aspect: string | null;
  medium: 'all' | 'print' | 'digital';
  pages: 'all' | 'single' | 'multi';
  featured: boolean;
  recent: boolean;
  sort: SortKey;
}
const NO_FILTERS: Filters = { q: '', cat: 'All', sub: null, styles: [], palette: null, shape: 'all', aspect: null, medium: 'all', pages: 'all', featured: false, recent: false, sort: 'recommended' };

// Curated starting points: each one is just a combination of real filters.
const COLLECTIONS: { title: string; note: string; f: Partial<Filters> & { catName?: string } }[] = [
  { title: 'Black & gold luxury', note: 'Rich, dark and gilded', f: { palette: 'black-gold' } },
  { title: 'Soft pastel parties', note: 'Gentle colours for celebrations', f: { catName: 'Birthday', palette: 'pastel' } },
  { title: 'Photo wishes & collages', note: 'Drop your photos straight in', f: { q: 'photo' } },
  { title: 'Business essentials', note: 'Cards, letterheads and stationery', f: { catName: 'Business', medium: 'print' } },
  { title: 'Editorial & magazines', note: 'Multi-page layouts', f: { pages: 'multi' } },
  { title: 'Elegant weddings', note: 'Invitations and keepsakes', f: { catName: 'Wedding', styles: ['elegant'] } },
  { title: 'Bold & colourful', note: 'Loud, bright, scroll-stopping', f: { styles: ['colorful'] } },
  { title: 'Festive season', note: 'Diwali, Christmas and more', f: { catName: 'Festivals' } },
];

function readFiltersFromUrl(): Partial<Filters> & { catName?: string; subName?: string } {
  const p = new URLSearchParams(window.location.search);
  const out: Partial<Filters> & { catName?: string; subName?: string } = {};
  if (p.get('q')) out.q = p.get('q')!;
  if (p.get('category')) out.catName = p.get('category')!;
  if (p.get('type')) out.subName = p.get('type')!;
  if (p.get('style')) out.styles = p.get('style')!.split(',').filter(Boolean);
  if (p.get('palette')) out.palette = p.get('palette');
  const sh = p.get('shape');
  if (sh === 'portrait' || sh === 'landscape' || sh === 'square') out.shape = sh;
  if (p.get('ratio')) out.aspect = p.get('ratio');
  const use = p.get('use');
  if (use === 'print' || use === 'digital') out.medium = use;
  const pg = p.get('pages');
  if (pg === 'single' || pg === 'multi') out.pages = pg;
  if (p.get('featured') === '1') out.featured = true;
  if (p.get('recent') === '1') out.recent = true;
  const so = p.get('sort');
  if (so === 'recent' || so === 'az') out.sort = so;
  return out;
}

export default function TemplatesPage() {
  const { theme, toggleTheme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [urlReady, setUrlReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPublicTemplates().then(setTemplates);
    const fromUrl = readFiltersFromUrl();
    const { catName, subName, ...rest } = fromUrl;
    setF((cur) => ({ ...cur, ...rest }));
    fetchCategories().then((cats) => {
      setCategories(cats);
      const byName = (n?: string) => (n ? cats.find((c) => c.name.toLowerCase() === n.toLowerCase() || c.slug === n.toLowerCase()) : undefined);
      const c = byName(catName), sc = byName(subName);
      if (c || sc) setF((cur) => ({ ...cur, cat: (sc?.parentId || c?.id) ?? cur.cat, sub: sc ? sc.id : null }));
      setUrlReady(true);
    });
    // Deep link from the admin "Preview" button: /templates?template=<id>.
    const id = new URLSearchParams(window.location.search).get('template');
    if (id) fetchTemplateById(id).then((t) => t && setPreviewing(t));
  }, []);

  // Keep the address bar in step with the filters, so a view can be shared.
  useEffect(() => {
    if (!urlReady) return;
    const p = new URLSearchParams();
    const catName = categories.find((c) => c.id === f.cat)?.name;
    const subName = categories.find((c) => c.id === f.sub)?.name;
    if (f.q) p.set('q', f.q);
    if (catName) p.set('category', catName);
    if (subName) p.set('type', subName);
    if (f.styles.length) p.set('style', f.styles.join(','));
    if (f.palette) p.set('palette', f.palette);
    if (f.shape !== 'all') p.set('shape', f.shape);
    if (f.aspect) p.set('ratio', f.aspect);
    if (f.medium !== 'all') p.set('use', f.medium);
    if (f.pages !== 'all') p.set('pages', f.pages);
    if (f.featured) p.set('featured', '1');
    if (f.recent) p.set('recent', '1');
    if (f.sort !== 'recommended') p.set('sort', f.sort);
    const keep = new URLSearchParams(window.location.search).get('template');
    if (keep) p.set('template', keep);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [f, urlReady, categories]);

  // Close the preview with Escape.
  useEffect(() => {
    if (!previewing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreviewing(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewing]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const usingDbCategories = categories.length > 0 && templates.some((t) => !!t.categoryId);
  const parentOf = useCallback((id: string | null | undefined) => categories.find((c) => c.id === id)?.parentId ?? null, [categories]);
  const catNameToId = (n: string) => categories.find((c) => !c.parentId && c.name === n)?.id || n;

  // Everything about a template the filters look at, worked out once.
  const meta = useMemo(() => {
    const m = new Map<Template, { styles: string[]; palettes: string[]; medium: string; pages: number; shape: string; aspect: string | null; hay: string }>();
    templates.forEach((t) =>
      m.set(t, {
        styles: stylesOf(t),
        palettes: palettesOf(t),
        medium: mediumOf(t),
        pages: pageCountOf(t),
        shape: shapeOf(t),
        aspect: aspectOf(t),
        hay: [t.name, t.category, t.description, t.searchKeywords, t.occasion, t.industry, ...(t.tags || []).map((x) => x.replace('style:', ''))].filter(Boolean).join(' ').toLowerCase(),
      })
    );
    return m;
  }, [templates]);

  const newest = useMemo(() => templates.reduce((mx, t) => Math.max(mx, time(t)), 0), [templates]);

  type Key = 'cat' | 'sub' | 'styles' | 'palette' | 'shape' | 'aspect' | 'medium' | 'pages' | 'featured' | 'recent' | 'q';
  const matches = useCallback(
    (t: Template, fl: Filters, skip?: Key) => {
      const x = meta.get(t)!;
      if (!x) return false;
      if (skip !== 'cat' && fl.cat !== 'All') {
        const ok = usingDbCategories ? t.categoryId === fl.cat || parentOf(t.categoryId) === fl.cat : t.category === fl.cat;
        if (!ok) return false;
      }
      if (skip !== 'sub' && fl.sub && t.categoryId !== fl.sub) return false;
      if (skip !== 'styles' && fl.styles.length && !fl.styles.some((s) => x.styles.includes(s))) return false;
      if (skip !== 'palette' && fl.palette && !x.palettes.includes(fl.palette)) return false;
      if (skip !== 'shape' && fl.shape !== 'all' && x.shape !== fl.shape) return false;
      if (skip !== 'aspect' && fl.aspect && x.aspect !== fl.aspect) return false;
      if (skip !== 'medium' && fl.medium !== 'all' && x.medium !== fl.medium) return false;
      if (skip !== 'pages' && fl.pages !== 'all' && (fl.pages === 'multi') !== x.pages > 1) return false;
      if (skip !== 'featured' && fl.featured && !t.isFeatured) return false;
      if (skip !== 'recent' && fl.recent && newest - time(t) > RECENT_DAYS * 86400000) return false;
      if (skip !== 'q') {
        const q = fl.q.trim().toLowerCase();
        if (q && !q.split(/\s+/).every((w) => x.hay.includes(w))) return false;
      }
      return true;
    },
    [meta, usingDbCategories, parentOf, newest]
  );
  const countWith = (patch: Partial<Filters>) => templates.filter((t) => matches(t, { ...f, ...patch })).length;

  // Purpose: top-level categories that actually have templates.
  const chips = useMemo(() => {
    if (!usingDbCategories) return CATEGORIES.map((c) => ({ id: c, label: c }));
    const used = new Set<string>();
    templates.forEach((t) => t.categoryId && used.add(parentOf(t.categoryId) || t.categoryId));
    const rank = (name: string) => { const i = CATEGORY_ORDER.indexOf(name); return i === -1 ? 99 : i; };
    return categories.filter((c) => !c.parentId && used.has(c.id)).sort((a, b) => rank(a.name) - rank(b.name)).map((c) => ({ id: c.id, label: c.name }));
  }, [categories, templates, usingDbCategories, parentOf]);
  const subChips = useMemo(() => {
    if (!usingDbCategories || f.cat === 'All') return [];
    const used = new Set(templates.filter((t) => parentOf(t.categoryId) === f.cat).map((t) => t.categoryId));
    return categories.filter((c) => c.parentId === f.cat && used.has(c.id)).map((c) => ({ id: c.id, label: c.name }));
  }, [categories, templates, f.cat, usingDbCategories, parentOf]);

  const filtered = useMemo(() => {
    const list = templates.filter((t) => matches(t, f));
    if (f.sort === 'recent') return [...list].sort((a, b) => time(b) - time(a));
    if (f.sort === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list; // curated order: featured first, then the editors' order
  }, [templates, f, matches]);

  // Active filter chips (each one removable).
  const active: { label: string; clear: () => void }[] = [];
  if (f.q) active.push({ label: `“${f.q}”`, clear: () => set({ q: '' }) });
  if (f.cat !== 'All') active.push({ label: chips.find((c) => c.id === f.cat)?.label || f.cat, clear: () => set({ cat: 'All', sub: null }) });
  if (f.sub) active.push({ label: categories.find((c) => c.id === f.sub)?.name || 'Type', clear: () => set({ sub: null }) });
  f.styles.forEach((s) => active.push({ label: styleLabel(s), clear: () => set({ styles: f.styles.filter((x) => x !== s) }) }));
  if (f.palette) active.push({ label: PALETTES.find((p) => p.id === f.palette)?.label || f.palette, clear: () => set({ palette: null }) });
  if (f.shape !== 'all') active.push({ label: f.shape[0].toUpperCase() + f.shape.slice(1), clear: () => set({ shape: 'all' }) });
  if (f.aspect) active.push({ label: ASPECTS.find((a) => a.id === f.aspect)?.label || f.aspect, clear: () => set({ aspect: null }) });
  if (f.medium !== 'all') active.push({ label: f.medium === 'print' ? 'For print' : 'For screens', clear: () => set({ medium: 'all' }) });
  if (f.pages !== 'all') active.push({ label: f.pages === 'multi' ? 'Multi-page' : 'Single page', clear: () => set({ pages: 'all' }) });
  if (f.featured) active.push({ label: 'Featured', clear: () => set({ featured: false }) });
  if (f.recent) active.push({ label: 'Recently added', clear: () => set({ recent: false }) });
  const clearAll = () => setF({ ...NO_FILTERS, sort: f.sort });
  const extraCount = [f.palette, f.shape !== 'all', f.aspect, f.medium !== 'all', f.pages !== 'all', f.featured, f.recent].filter(Boolean).length;

  const applyCollection = (c: (typeof COLLECTIONS)[number]) => {
    const { catName, ...rest } = c.f;
    setF({ ...NO_FILTERS, ...rest, cat: catName ? catNameToId(catName) : 'All' });
    document.getElementById('template-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const collections = useMemo(
    () =>
      COLLECTIONS.map((c) => {
        const { catName, ...rest } = c.f;
        const fl = { ...NO_FILTERS, ...rest, cat: catName ? catNameToId(catName) : 'All' };
        const items = templates.filter((t) => matches(t, fl));
        return { c, items };
      }).filter((x) => x.items.length >= 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates, matches, categories]
  );

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
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-transparent text-mt-ink dark:text-mt-ink min-h-screen transition-colors duration-300`}
    >
      <header className="sticky top-0 z-50 bg-mt-bg/90 dark:bg-mt-bg/90 backdrop-blur border-b border-black/5 dark:border-white/10">
        <nav className="mt-container h-16 flex items-center justify-between">
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
                    ? 'text-mt-ink dark:text-white font-semibold'
                    : 'text-mt-muted dark:text-mt-muted hover:text-mt-ink dark:hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            {!loggedIn && (
              <Link href="/login" className="text-sm font-medium text-mt-muted dark:text-mt-muted hover:text-mt-ink dark:hover:text-white px-3 py-2">
                Log In
              </Link>
            )}
            <button
              onClick={goToWorkspace}
              className="relative overflow-hidden text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(9,9,11,0.16)] hover:shadow-[0_10px_20px_-6px_rgba(9,9,11,0.16)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-mt-surface/25 before:rounded-t-full"
            >
              Start Designing
            </button>
            {loggedIn && <ProfileMenu />}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            <button
              className="p-2 -mr-2 text-mt-ink dark:text-white"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-black/5 dark:border-white/10 bg-mt-surface2 dark:bg-mt-bg px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="py-2.5 text-sm text-mt-muted dark:text-mt-muted" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <Link
                href={loggedIn ? '/dashboard' : '/login'}
                className="text-center text-sm font-medium border border-black/10 dark:border-white/15 text-mt-ink dark:text-white rounded-full py-2.5"
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

      <PageHero
        align="center"
        eyebrow="Templates"
        title="Start somewhere brilliant."
        accent="brilliant"
        subtitle="Choose a starting point. Add your style. Make it yours."
      >
        <div className="max-w-xl mx-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mt-faint" />
          <input
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search templates — “resume”, “birthday”, “menu”…"
            aria-label="Search templates"
            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-mt-input-border bg-mt-surface text-[15px] shadow-[0_10px_30px_-18px_rgba(9,9,11,0.35)] placeholder:text-mt-faint focus:outline-none focus:border-[#3B82C4] focus:ring-4 focus:ring-[#8CCBFF]/30 transition-all"
          />
        </div>
      </PageHero>
      <div className="h-8" />

      <div className="mt-container">
        {/* Purpose */}
        <div role="group" aria-label="What are you making?" className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
          {[{ id: 'All', label: 'All' }, ...chips].map(({ id: c, label }) => (
            <button
              key={c}
              onClick={() => set({ cat: c, sub: null })}
              aria-pressed={f.cat === c}
              className={`shrink-0 text-sm font-medium rounded-full px-4 py-2 border transition-colors ${
                f.cat === c
                  ? 'bg-[#14121F] dark:bg-white text-white dark:text-[#14121F] border-[#14121F] dark:border-white'
                  : 'text-mt-ink dark:text-mt-muted border-black/10 dark:border-white/15 hover:border-mt-accent/40 hover:text-mt-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {subChips.length > 1 && (
          <div role="group" aria-label="Type" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
            {subChips.map((c) => (
              <button
                key={c.id}
                onClick={() => set({ sub: f.sub === c.id ? null : c.id })}
                aria-pressed={f.sub === c.id}
                className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${f.sub === c.id ? 'mt-active-blue text-mt-ink' : 'border-black/10 dark:border-white/15 text-mt-muted hover:text-mt-ink'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Style */}
        <div className="mt-5">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-faint mb-2">Browse by style</p>
          <div role="group" aria-label="Visual style" className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
            {STYLES.map((st) => {
              const on = f.styles.includes(st.id);
              const n = on ? null : countWith({ styles: [st.id] });
              if (!on && !n) return null;
              return (
                <button
                  key={st.id}
                  onClick={() => set({ styles: on ? f.styles.filter((x) => x !== st.id) : [...f.styles, st.id] })}
                  aria-pressed={on}
                  className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${on ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-black/10 dark:border-white/15 text-mt-ink hover:border-mt-accent/40'}`}
                >
                  {st.label}
                  {n !== null && <span className="ml-1 text-mt-faint">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & sort */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="more-filters"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 border font-medium transition-colors ${filtersOpen || extraCount ? 'mt-active-blue text-mt-ink' : 'border-black/10 dark:border-white/15 text-mt-ink'}`}
          >
            <SlidersHorizontal size={14} /> Filters{extraCount ? ` · ${extraCount}` : ''}
          </button>
          <label className="inline-flex items-center gap-1.5 text-mt-muted">
            <span>Sort</span>
            <select
              value={f.sort}
              onChange={(e) => set({ sort: e.target.value as SortKey })}
              className="rounded-full px-3 py-2 border border-black/10 dark:border-white/15 bg-mt-surface text-mt-ink text-xs focus:outline-none focus:border-mt-accent/50"
            >
              {SORTS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {filtersOpen && (
          <div id="more-filters" className="mt-4 mx-auto max-w-4xl rounded-2xl border border-mt-border bg-mt-surface p-4 sm:p-5 grid gap-5 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint mb-2">Colour palette</legend>
              <div className="flex flex-wrap gap-2">
                {PALETTES.map((pl) => {
                  const on = f.palette === pl.id;
                  const n = countWith({ palette: pl.id });
                  if (!n && !on) return null;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => set({ palette: on ? null : pl.id })}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border text-xs transition-colors ${on ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-ink hover:bg-mt-surface2'}`}
                    >
                      <span className="flex w-7 h-5 rounded-full overflow-hidden ring-1 ring-black/10">
                        <span className="flex-1" style={{ background: pl.swatch[0] }} />
                        <span className="flex-1" style={{ background: pl.swatch[1] }} />
                      </span>
                      {pl.label} <span className="text-mt-faint">{n}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint mb-2">Shape</legend>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'portrait', 'landscape', 'square'] as const).map((o) => (
                  <button key={o} onClick={() => set({ shape: o })} aria-pressed={f.shape === o} className={`rounded-full px-3 py-1.5 border text-xs ${f.shape === o ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted'}`}>
                    {o === 'all' ? 'Any' : o[0].toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint mb-2">Aspect ratio</legend>
              <select value={f.aspect || ''} onChange={(e) => set({ aspect: e.target.value || null })} className="w-full rounded-lg px-3 h-9 border border-mt-input-border bg-mt-surface text-mt-ink text-xs">
                <option value="">Any ratio</option>
                {ASPECTS.map((a) => {
                  const n = countWith({ aspect: a.id });
                  return n ? <option key={a.id} value={a.id}>{a.label} ({n})</option> : null;
                })}
              </select>
            </fieldset>
            <fieldset>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint mb-2">Made for</legend>
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'Anything'], ['print', 'Print'], ['digital', 'Screens & social']] as const).map(([id, l]) => (
                  <button key={id} onClick={() => set({ medium: id })} aria-pressed={f.medium === id} className={`rounded-full px-3 py-1.5 border text-xs ${f.medium === id ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted'}`}>
                    {l}{id !== 'all' && <span className="ml-1 text-mt-faint">{countWith({ medium: id })}</span>}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint mb-2">Pages</legend>
              <div className="flex flex-wrap gap-1.5">
                {([['all', 'Any'], ['single', 'Single page'], ['multi', 'Multi-page']] as const).map(([id, l]) => (
                  <button key={id} onClick={() => set({ pages: id })} aria-pressed={f.pages === id} className={`rounded-full px-3 py-1.5 border text-xs ${f.pages === id ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted'}`}>
                    {l}{id !== 'all' && <span className="ml-1 text-mt-faint">{countWith({ pages: id })}</span>}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mt-ink">
              <legend className="sr-only">More</legend>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="accent-[#3B82C4] w-4 h-4" /> Featured picks
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.recent} onChange={(e) => set({ recent: e.target.checked })} className="accent-[#3B82C4] w-4 h-4" /> Added in the last {RECENT_DAYS} days
              </label>
            </fieldset>
          </div>
        )}

        {active.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs" aria-label="Active filters">
            {active.map((a) => (
              <button key={a.label} onClick={a.clear} className="inline-flex items-center gap-1 rounded-full bg-mt-surface2 border border-mt-border pl-3 pr-2 py-1 text-mt-ink hover:border-mt-accent/40" aria-label={`Remove filter ${a.label}`}>
                {a.label} <X size={12} />
              </button>
            ))}
            <button onClick={clearAll} className="ml-1 font-semibold text-[#3B82C4] hover:underline px-2 py-1">Clear all</button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-mt-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'template' : 'templates'}
        </p>
      </div>

      {active.length === 0 && collections.length > 0 && (
        <section aria-label="Collections" className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl mb-4">Collections</h2>
          <div className="flex gap-4 overflow-x-auto pb-3 mt-scroll snap-x">
            {collections.map(({ c, items }) => (
              <button key={c.title} onClick={() => applyCollection(c)} className="snap-start shrink-0 w-[260px] text-left rounded-2xl border border-mt-border bg-mt-surface overflow-hidden mt-card-hover">
                <div className="grid grid-cols-3 gap-0.5 h-[120px] bg-mt-surface2">
                  {items.slice(0, 3).map((t) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={t.id || t.name} src={t.thumbnail || ''} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ))}
                </div>
                <div className="px-3.5 py-3">
                  <p className="text-sm font-semibold text-mt-ink">{c.title}</p>
                  <p className="text-xs text-mt-muted">{c.note} · {items.length} templates</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="template-grid" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 scroll-mt-20">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 min-[1800px]:columns-6 gap-4 2xl:gap-5 [&>*]:mb-4">
          {filtered.map((t) => {
            const x = meta.get(t);
            const pages = x?.pages || 1;
            return (
              <div key={t.id || t.name} className="group break-inside-avoid rounded-xl overflow-hidden border border-black/5 dark:border-white/10 bg-mt-surface shadow-sm mt-card-hover">
                <div className="relative overflow-hidden bg-mt-accentsoft dark:bg-mt-bg" style={{ aspectRatio: tileRatio(t) }}>
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
                    {t.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt={t.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <MockDesignCard colors={t.colors} label={t.category} />
                    )}
                  </div>
                  {pages > 1 && <span className="absolute top-2 right-2 z-10 text-[10px] font-semibold uppercase tracking-wide text-white bg-[#14121F]/75 px-2 py-1 rounded-full">{pages} pages</span>}
                  {t.isFree === false && (
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-mt-ink bg-[#F3A6B8] px-2 py-1 rounded-full shadow">
                      <Crown size={11} /> Premium
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewing(t)}
                    aria-label={`Preview ${t.name}`}
                    className="absolute inset-0 bg-[#14121F]/0 group-hover:bg-[#14121F]/40 focus-visible:bg-[#14121F]/40 transition-colors duration-300 flex items-center justify-center focus-visible:outline-none"
                  >
                    <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-sm font-semibold text-mt-ink bg-mt-surface px-4 py-2 rounded-full">
                      Preview <ArrowUpRight size={14} />
                    </span>
                  </button>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold leading-snug truncate" title={t.name}>{t.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-mt-muted">
                    <span className="truncate rounded-full bg-mt-accentsoft text-mt-accent px-2 py-0.5">{t.category}</span>
                    {x?.styles[0] && <span className="truncate">{styleLabel(x.styles[0])}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg font-[family-name:var(--font-display)]">No templates match these filters.</p>
            <p className="mt-2 text-sm text-mt-muted">Remove a filter or try a different search.</p>
            {active.length > 0 && <button onClick={clearAll} className="mt-4 text-sm font-semibold text-[#3B82C4] hover:underline">Clear all filters</button>}
          </div>
        )}
      </section>

      {previewing && <TemplatePreview t={previewing} onClose={() => setPreviewing(null)} onUse={() => useTemplate(previewing)} onTag={(tag) => { set({ q: tag }); setPreviewing(null); }} onStyle={(st) => { set({ styles: [st] }); setPreviewing(null); }} />}

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="mt-container py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo theme={theme} width={120} height={24} />
            <span className="text-xs text-mt-muted dark:text-mt-muted">© {new Date().getFullYear()} Magical Touch</span>
          </div>
          <div className="flex gap-3 text-mt-muted dark:text-mt-muted">
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

function TemplatePreview({ t, onClose, onUse, onTag, onStyle }: { t: Template; onClose: () => void; onUse: () => void; onTag: (tag: string) => void; onStyle: (s: string) => void }) {
  const [pages, setPages] = useState<PageImage[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [design, setDesign] = useState<any>(t.canvasJson ?? null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const expected = pageCountOf(t);
  useEffect(() => {
    closeRef.current?.focus();
    let alive = true;
    setPages(null);
    setIdx(0);
    (async () => {
      const full = t.canvasJson ? t : t.id ? await fetchTemplateById(t.id) : null;
      if (!full?.canvasJson) return alive && setPages([]);
      if (alive) setDesign(full.canvasJson);
      const imgs = await renderTemplatePages(full.canvasJson).catch(() => []);
      if (alive) setPages(imgs);
    })();
    return () => {
      alive = false;
    };
  }, [t]);
  const fallback = t.preview || t.thumbnail;
  const show = pages && pages.length ? pages[Math.min(idx, pages.length - 1)].url : fallback;
  const many = !!pages && pages.length > 1;
  const st = stylesOf(t);
  const tags = visibleTags(t);
  return (
    <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.name} className="bg-mt-surface rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto grid md:grid-cols-[1.5fr_1fr]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-mt-accentsoft dark:bg-mt-bg flex flex-col p-4 sm:p-6 min-h-[280px]">
          <div className="relative flex-1 flex items-center justify-center">
            {show ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={show} alt={many ? `${t.name} — ${pageLabel(pages!, idx)}` : t.name} className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-lg" />
            ) : (
              <div className="w-full h-72"><MockDesignCard colors={t.colors} label={t.category} /></div>
            )}
            {pages === null && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[11px] bg-mt-surface/90 rounded-full px-3 py-1 text-mt-muted">
                <Loader2 size={12} className="animate-spin" /> Loading {expected > 1 ? `all ${expected} pages` : 'full preview'}…
              </span>
            )}
            {many && (
              <>
                <button onClick={() => setIdx((i) => (i - 1 + pages!.length) % pages!.length)} aria-label="Previous page" className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-mt-surface shadow inline-flex items-center justify-center"><ChevronLeft size={18} /></button>
                <button onClick={() => setIdx((i) => (i + 1) % pages!.length)} aria-label="Next page" className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-mt-surface shadow inline-flex items-center justify-center"><ChevronRight size={18} /></button>
              </>
            )}
          </div>
          {many && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 mt-scroll" role="tablist" aria-label="Pages">
              {pages!.map((p, i) => (
                <button key={i} role="tab" aria-selected={i === idx} onClick={() => setIdx(i)} className={`shrink-0 flex flex-col items-center gap-1 rounded-lg p-1 ${i === idx ? 'ring-2 ring-[#3B82C4]' : 'ring-1 ring-black/10 dark:ring-white/10'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-16 w-auto rounded" />
                  <span className="text-[10px] text-mt-muted max-w-[90px] truncate">{pageLabel(pages!, i)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col">
          <button ref={closeRef} onClick={onClose} className="self-end p-1 -mt-2 -mr-2 text-mt-muted rounded focus-visible:ring-2 focus-visible:ring-[#8CCBFF]" aria-label="Close preview">
            <X size={20} />
          </button>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-mt-accent">
            <BadgeCheck size={14} /> Provided by Magical Touch Design
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight">{t.name}</h2>
          {t.description && <p className="mt-3 text-sm text-mt-muted leading-relaxed">{t.description}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-mt-muted">Category</dt>
            <dd>{t.category}</dd>
            <dt className="text-mt-muted">Size</dt>
            <dd>{t.width} × {t.height} {t.unit || 'px'}</dd>
            <dt className="text-mt-muted">Pages</dt>
            <dd>{pages && pages.length ? pages.length : expected}{pages && pages.length === 2 && /^(page|artboard)/i.test(pages[0].name) ? ' (front & back)' : ''}</dd>
            <dt className="text-mt-muted">Made for</dt>
            <dd>{mediumOf(t) === 'print' ? 'Print' : 'Screens & social'}</dd>
          </dl>
          <PrintSpecs width={t.width} height={t.height} print={mediumOf(t) === 'print'} canvasJson={design} colors={t.colors} />
          {st.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {st.map((s) => (
                <button key={s} onClick={() => onStyle(s)} className="text-xs rounded-full px-2.5 py-1 border border-mt-border text-mt-ink hover:border-mt-accent/40">{styleLabel(s)}</button>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 10).map((tag) => (
                <button key={tag} onClick={() => onTag(tag)} className="text-xs rounded-full px-2.5 py-1 bg-black/5 dark:bg-white/10 text-mt-muted">#{tag}</button>
              ))}
            </div>
          )}
          <div className="mt-auto pt-6">
            <button onClick={onUse} className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-brand-gradient px-5 py-3 rounded-full">
              Use this template <ArrowUpRight size={15} />
            </button>
            <p className="mt-3 text-xs text-center text-mt-muted">You get your own copy to edit, with every page. The original never changes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
