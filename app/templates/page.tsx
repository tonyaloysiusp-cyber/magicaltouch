'use client';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/home/Footer';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { X, Search, ArrowUpRight, BadgeCheck, Crown, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { STYLES, PALETTES, ASPECTS, stylesOf, styleLabel, palettesOf, mediumOf, shapeOf, aspectOf } from '@/lib/templates/taxonomy';
import { DESIGN_TYPES, TYPE_BY_ID, typesOf, pagesOf, hasPhoto, topicText, hasWord, parseQuery, ParsedQuery, typeHashtags } from '@/lib/designTypes';
import { renderTemplatePages, pageLabel, PageImage } from '@/lib/templates/renderPages';
import { resolveAuthedPath } from '@/lib/authNav';
import { MockDesignCard } from '@/components/MockDesignCard';
import { PrintSpecs } from '@/components/templates/PrintSpecs';
import { Template, TemplateCategory, CATEGORIES, TEMPLATES, fetchPublicTemplates, fetchCategories, fetchTemplateById } from '@/lib/templatesData';
import { supabase, getSessionUser } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';
import { loadSearchKeywords, reportSearch, SearchKeyword } from '@/lib/searchKeywords';

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
  kind: string | null; // design type id (flyer, poster, photo-album…)
  occ: string | null; // occasion id
  photo: boolean;
  cat: string; // 'All' or category id / name
  sub: string | null;
  styles: string[];
  palette: string | null;
  region: string | null;
  shape: Shape;
  aspect: string | null;
  medium: 'all' | 'print' | 'digital';
  pages: 'all' | 'single' | 'multi';
  featured: boolean;
  recent: boolean;
  sort: SortKey;
}
const NO_FILTERS: Filters = { q: '', kind: null, occ: null, photo: false, cat: 'All', sub: null, styles: [], palette: null, region: null, shape: 'all', aspect: null, medium: 'all', pages: 'all', featured: false, recent: false, sort: 'recommended' };

// Location mode: templates made for a part of the world (tag region-<id>).
const REGIONS: { id: string; label: string }[] = [
  { id: 'north-america', label: 'North America' }, { id: 'uk-europe', label: 'UK & Europe' }, { id: 'middle-east', label: 'Middle East' },
  { id: 'south-asia', label: 'India & South Asia' }, { id: 'east-asia', label: 'East & Southeast Asia' }, { id: 'africa', label: 'Africa' },
  { id: 'latin-america', label: 'Latin America' }, { id: 'oceania', label: 'Australia & NZ' },
];

// Occasions people look for; a template belongs to one when any of the words
// appears in its name, occasion, tags or keywords (whole words).
const OCCASIONS: { id: string; label: string; words: string[] }[] = [
  { id: 'birthday', label: 'Birthday', words: ['birthday', 'bday', 'sweet sixteen', 'turning'] },
  { id: 'wedding', label: 'Wedding', words: ['wedding', 'bridal', 'bride', 'save the date', 'engagement', 'nikah', 'reception'] },
  { id: 'christmas', label: 'Christmas', words: ['christmas', 'xmas', 'santa'] },
  { id: 'new-year', label: 'New Year', words: ['new year', 'nye'] },
  { id: 'diwali', label: 'Diwali', words: ['diwali', 'deepavali'] },
  { id: 'eid', label: 'Eid', words: ['eid', 'bakrid'] },
  { id: 'ramadan', label: 'Ramadan', words: ['ramadan', 'iftar', 'ramzan'] },
  { id: 'valentines', label: "Valentine's Day", words: ['valentine', "valentine's", 'valentines'] },
  { id: 'mothers-day', label: "Mother's Day", words: ["mother's day", 'mothers day', 'mother'] },
  { id: 'fathers-day', label: "Father's Day", words: ["father's day", 'fathers day', 'father'] },
  { id: 'baby', label: 'Baby & baby shower', words: ['baby', 'baby shower', 'newborn', 'gender reveal'] },
  { id: 'anniversary', label: 'Anniversary', words: ['anniversary'] },
  { id: 'graduation', label: 'Graduation', words: ['graduation', 'graduate', 'class of'] },
  { id: 'halloween', label: 'Halloween', words: ['halloween'] },
  { id: 'easter', label: 'Easter', words: ['easter'] },
  { id: 'thanksgiving', label: 'Thanksgiving', words: ['thanksgiving'] },
  { id: 'lunar-new-year', label: 'Lunar New Year', words: ['lunar new year', 'chinese new year'] },
  { id: 'holi', label: 'Holi', words: ['holi'] },
  { id: 'pongal', label: 'Pongal', words: ['pongal', 'sankranti'] },
  { id: 'onam', label: 'Onam', words: ['onam'] },
  { id: 'navratri', label: 'Navratri & Durga Puja', words: ['navratri', 'durga puja', 'dussehra', 'garba'] },
  { id: 'ganesh', label: 'Ganesh Chaturthi', words: ['ganesh', 'ganesha', 'ganpati'] },
  { id: 'raksha-bandhan', label: 'Raksha Bandhan', words: ['raksha bandhan', 'rakhi'] },
  { id: 'independence', label: 'Independence & National Day', words: ['independence day', 'national day', 'republic day'] },
  { id: 'black-friday', label: 'Black Friday & sales', words: ['black friday', 'white friday', 'cyber monday', 'sale'] },
  { id: 'back-to-school', label: 'Back to school', words: ['back to school', 'first day of school'] },
];
const PHOTO_TYPES = ['photo-album', 'photo-collage', 'photo-frame'];
const POPULAR = ['Business flyer', 'Wedding album', 'Birthday invitation', 'Instagram post', 'Restaurant menu', 'Diwali post', 'Resume', 'Certificate'];

interface Meta { styles: string[]; palettes: string[]; medium: string; pages: number; shape: string; aspect: string | null; types: string[]; topic: string; photo: boolean; occs: string[]; name: string; hay: string }

// Curated starting points: each one is just a combination of real filters.
const COLLECTIONS: { title: string; note: string; f: Partial<Filters> & { catName?: string } }[] = [
  { title: 'Black & gold luxury', note: 'Rich, dark and gilded', f: { palette: 'black-gold' } },
  { title: 'Soft pastel parties', note: 'Gentle colours for celebrations', f: { catName: 'Birthday', palette: 'pastel' } },
  { title: 'Photo wishes & collages', note: 'Drop your photos straight in', f: { photo: true, kind: 'social-post' } },
  { title: 'Wedding albums', note: '40 and 48 pages', f: { kind: 'photo-album', occ: 'wedding' } },
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
  if (p.get('kind') && TYPE_BY_ID.has(p.get('kind')!)) out.kind = p.get('kind');
  if (p.get('occasion')) out.occ = p.get('occasion');
  if (p.get('photo') === '1') out.photo = true;
  if (p.get('category')) out.catName = p.get('category')!;
  if (p.get('type')) out.subName = p.get('type')!;
  if (p.get('style')) out.styles = p.get('style')!.split(',').filter(Boolean);
  if (p.get('palette')) out.palette = p.get('palette');
  if (p.get('region')) out.region = p.get('region');
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
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [searchKeywords, setSearchKeywords] = useState<SearchKeyword[]>([]);
  useEffect(() => { loadSearchKeywords().then(setSearchKeywords); }, []);
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }));
  const [draft, setDraft] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [urlReady, setUrlReady] = useState(false);
  const router = useRouter();

  // Typing searches after a short pause (8,000+ templates).
  useEffect(() => {
    const id = window.setTimeout(() => setF((cur) => (cur.q === draft ? cur : { ...cur, q: draft })), 220);
    return () => window.clearTimeout(id);
  }, [draft]);
  const search = (q: string) => { setDraft(q); setF((cur) => ({ ...cur, q })); setSuggestOpen(false); };

  useEffect(() => {
    fetchPublicTemplates().then(setTemplates);
    const fromUrl = readFiltersFromUrl();
    const { catName, subName, ...rest } = fromUrl;
    setF((cur) => ({ ...cur, ...rest }));
    if (rest.q) setDraft(rest.q);
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
    if (f.kind) p.set('kind', f.kind);
    if (f.occ) p.set('occasion', f.occ);
    if (catName) p.set('category', catName);
    if (subName) p.set('type', subName);
    if (f.styles.length) p.set('style', f.styles.join(','));
    if (f.palette) p.set('palette', f.palette);
    if (f.region) p.set('region', f.region);
    if (f.shape !== 'all') p.set('shape', f.shape);
    if (f.aspect) p.set('ratio', f.aspect);
    if (f.medium !== 'all') p.set('use', f.medium);
    if (f.pages !== 'all') p.set('pages', f.pages);
    if (f.photo) p.set('photo', '1');
    if (f.featured) p.set('featured', '1');
    if (f.recent) p.set('recent', '1');
    if (f.sort !== 'recommended') p.set('sort', f.sort);
    const keep = new URLSearchParams(window.location.search).get('template');
    if (keep) p.set('template', keep);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [f, urlReady, categories]);

  // Close the preview / drawer with Escape.
  useEffect(() => {
    if (!previewing && !drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPreviewing(null); setDrawer(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewing, drawer]);

  useEffect(() => {
    getSessionUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const usingDbCategories = categories.length > 0 && templates.some((t) => !!t.categoryId);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const parentOf = useCallback((id: string | null | undefined) => (id ? catById.get(id)?.parentId ?? null : null), [catById]);
  const catNameToId = (n: string) => categories.find((c) => !c.parentId && c.name === n)?.id || n;

  // Everything about a template the filters look at, worked out once.
  const meta = useMemo(() => {
    const m = new Map<Template, Meta>();
    templates.forEach((t) => {
      const subCat = t.categoryId ? catById.get(t.categoryId) : undefined;
      const src = { name: t.name, category: t.category, sub: subCat?.parentId ? subCat.name : null, width: t.width, height: t.height, tags: t.tags, occasion: t.occasion, industry: t.industry, searchKeywords: t.searchKeywords };
      const types = typesOf(src);
      const topic = topicText(src);
      m.set(t, {
        styles: stylesOf(t),
        palettes: palettesOf(t),
        medium: mediumOf(t),
        pages: pagesOf(t),
        shape: shapeOf(t),
        aspect: aspectOf(t),
        types,
        topic,
        photo: hasPhoto(src),
        occs: OCCASIONS.filter((o) => o.words.some((w) => hasWord(topic, w))).map((o) => o.id),
        name: ` ${t.name.toLowerCase()} `,
        hay: `${topic} ${(t.description || '').toLowerCase()}`,
      });
    });
    return m;
  }, [templates, catById]);

  const newest = useMemo(() => templates.reduce((mx, t) => Math.max(mx, time(t)), 0), [templates]);
  const parsed = useMemo(() => parseQuery(f.q), [f.q]);

  type Key = 'cat' | 'sub' | 'kind' | 'occ' | 'styles' | 'palette' | 'region' | 'shape' | 'aspect' | 'medium' | 'pages' | 'photo' | 'featured' | 'recent' | 'q';
  // Every filter except the search words.
  const passes = useCallback(
    (t: Template, fl: Filters, skip?: Key) => {
      const x = meta.get(t);
      if (!x) return false;
      if (skip !== 'cat' && fl.cat !== 'All') {
        const ok = usingDbCategories ? t.categoryId === fl.cat || parentOf(t.categoryId) === fl.cat : t.category === fl.cat;
        if (!ok) return false;
      }
      if (skip !== 'sub' && fl.sub && t.categoryId !== fl.sub) return false;
      if (skip !== 'kind' && fl.kind && !x.types.includes(fl.kind)) return false;
      if (skip !== 'occ' && fl.occ && !x.occs.includes(fl.occ)) return false;
      if (skip !== 'styles' && fl.styles.length && !fl.styles.some((s) => x.styles.includes(s))) return false;
      if (skip !== 'palette' && fl.palette && !x.palettes.includes(fl.palette)) return false;
      if (skip !== 'region' && fl.region && !(t.tags || []).includes(`region-${fl.region}`)) return false;
      if (skip !== 'shape' && fl.shape !== 'all' && x.shape !== fl.shape) return false;
      if (skip !== 'aspect' && fl.aspect && x.aspect !== fl.aspect) return false;
      if (skip !== 'medium' && fl.medium !== 'all' && x.medium !== fl.medium) return false;
      if (skip !== 'pages' && fl.pages !== 'all' && (fl.pages === 'multi') !== x.pages > 1) return false;
      if (skip !== 'photo' && fl.photo && !x.photo) return false;
      if (skip !== 'featured' && fl.featured && !t.isFeatured) return false;
      if (skip !== 'recent' && fl.recent && newest - time(t) > RECENT_DAYS * 86400000) return false;
      return true;
    },
    [meta, usingDbCategories, parentOf, newest]
  );
  // The search: design type (exact or related) + every topic word + photo.
  const topicsOk = useCallback((x: Meta, pq: ParsedQuery) => pq.topics.every((alts) => alts.some((w) => hasWord(x.topic, w))), []);
  const photoOk = (x: Meta, pq: ParsedQuery) => !pq.photo || pq.types.some((id) => PHOTO_TYPES.includes(id)) || x.photo;
  const searchLevel = useCallback(
    (t: Template, pq: ParsedQuery): 0 | 1 | 2 => {
      // 2 = exact, 1 = related type, 0 = no match
      const x = meta.get(t)!;
      if (!topicsOk(x, pq) || !photoOk(x, pq)) return 0;
      if (!pq.types.length) return 2;
      if (pq.types.some((id) => x.types.includes(id))) return 2;
      const rel = pq.types.flatMap((id) => TYPE_BY_ID.get(id)?.related || []);
      return rel.some((id) => x.types.includes(id)) ? 1 : 0;
    },
    [meta, topicsOk]
  );
  const searching = !!f.q.trim();

  const results = useMemo(() => {
    const base = templates.filter((t) => passes(t, f));
    const sortList = (list: Template[]) => {
      if (f.sort === 'recent') return [...list].sort((a, b) => time(b) - time(a));
      if (f.sort === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
      return list;
    };
    if (!searching) return { exact: sortList(base), related: [] as Template[], loose: false };
    const exact: Template[] = [], related: Template[] = [];
    base.forEach((t) => { const l = searchLevel(t, parsed); if (l === 2) exact.push(t); else if (l === 1) related.push(t); });
    const rank = (list: Template[]) => {
      if (f.sort !== 'recommended') return sortList(list);
      const phrase = ` ${parsed.raw} `;
      const words = parsed.topics.map((g) => g[0]);
      const score = (t: Template) => {
        const x = meta.get(t)!;
        let sc = 0;
        if (x.name.includes(phrase)) sc += 120;
        if (parsed.types.length && parsed.types.includes(x.types[0])) sc += 50; // its main type
        words.forEach((w) => { if (hasWord(x.name, w)) sc += 30; });
        if (words.some((w) => (t.occasion || '').toLowerCase().includes(w))) sc += 20;
        if (t.isFeatured) sc += 5;
        return sc;
      };
      return list.map((t, i) => ({ t, i, sc: score(t) })).sort((a, b) => b.sc - a.sc || a.i - b.i).map((r) => r.t);
    };
    if (exact.length || related.length) return { exact: rank(exact), related: rank(related), loose: false };
    // Nothing matched exactly: fall back to a looser search (any word, anywhere).
    const words = f.q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const loose = base.filter((t) => { const x = meta.get(t)!; return words.some((w) => x.hay.includes(w)); });
    return { exact: rank(loose), related: [], loose: true };
  }, [templates, f, passes, searching, searchLevel, parsed, meta]);
  const filtered = useMemo(() => [...results.exact, ...results.related], [results]);

  // Facet counts (each ignores its own filter, like any good shop filter).
  const facet = useCallback(
    (skip: Key, keyOf: (t: Template, x: Meta) => string[]) => {
      const m = new Map<string, number>();
      templates.forEach((t) => {
        if (!passes(t, f, skip)) return;
        if (searching && searchLevel(t, parsed) !== 2) return;
        keyOf(t, meta.get(t)!).forEach((k) => m.set(k, (m.get(k) || 0) + 1));
      });
      return m;
    },
    [templates, f, passes, searching, searchLevel, parsed, meta]
  );
  const typeCounts = useMemo(() => facet('kind', (_, x) => x.types), [facet]);
  const occCounts = useMemo(() => facet('occ', (_, x) => x.occs), [facet]);
  const catCounts = useMemo(() => facet('cat', (t) => { const p = parentOf(t.categoryId); return [p || t.categoryId || t.category]; }), [facet, parentOf]);
  const subCounts = useMemo(() => facet('sub', (t) => (t.categoryId ? [t.categoryId] : [])), [facet]);
  const styleCounts = useMemo(() => facet('styles', (_, x) => x.styles), [facet]);
  const palCounts = useMemo(() => facet('palette', (_, x) => x.palettes), [facet]);
  const regionCounts = useMemo(() => facet('region', (t) => (t.tags || []).filter((g) => g.startsWith('region-')).map((g) => g.slice(7))), [facet]);
  const mediumCounts = useMemo(() => facet('medium', (_, x) => [x.medium]), [facet]);
  const pagesCounts = useMemo(() => facet('pages', (_, x) => [x.pages > 1 ? 'multi' : 'single']), [facet]);
  const photoCount = useMemo(() => facet('photo', (_, x) => (x.photo ? ['y'] : [])).get('y') || 0, [facet]);

  const catChips = useMemo(() => {
    if (!usingDbCategories) return CATEGORIES.map((c) => ({ id: c as string, label: c as string }));
    const rank = (name: string) => { const i = CATEGORY_ORDER.indexOf(name); return i === -1 ? 99 : i; };
    return categories.filter((c) => !c.parentId).sort((a, b) => rank(a.name) - rank(b.name)).map((c) => ({ id: c.id, label: c.name }));
  }, [categories, usingDbCategories]);
  const subChips = useMemo(() => (f.cat === 'All' ? [] : categories.filter((c) => c.parentId === f.cat).map((c) => ({ id: c.id, label: c.name }))), [categories, f.cat]);

  // Suggestions while typing: design types, occasions and popular searches.
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (q.length < 2) return [] as { label: string; q: string; hint: string }[];
    const out: { label: string; q: string; hint: string }[] = [];
    const pq = parseQuery(q);
    const rest = pq.topics.map((g) => g[0]).join(' ');
    DESIGN_TYPES.forEach((ty) => {
      if (ty.words.some((w) => w.startsWith(q) || q.split(' ').some((p) => p.length > 2 && w.startsWith(p)))) {
        const label = rest && !pq.types.length ? `${rest} ${ty.one}` : ty.label;
        out.push({ label: label[0].toUpperCase() + label.slice(1), q: rest && !pq.types.length ? `${rest} ${ty.one}` : ty.one, hint: `${typeCounts.get(ty.id) ?? ''}` });
      }
    });
    OCCASIONS.forEach((o) => { if (o.label.toLowerCase().includes(q) || o.words.some((w) => w.startsWith(q))) out.push({ label: o.label, q: o.label, hint: 'Occasion' }); });
    searchKeywords.forEach((k) => { if (k.k.toLowerCase().includes(q)) out.push({ label: k.k, q: k.k, hint: '' }); });
    const seen = new Set<string>();
    return out.filter((s) => (seen.has(s.label.toLowerCase()) ? false : (seen.add(s.label.toLowerCase()), true))).slice(0, 8);
  }, [draft, typeCounts, searchKeywords]);

  // Draw the grid in steps (60 at a time, more as you scroll) — putting all
  // 8,000+ cards on the page at once made it slow, especially on phones/iPad.
  const STEP = 60;
  const [shown, setShown] = useState(STEP);
  useEffect(() => { setShown(STEP); }, [filtered]);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = moreRef.current;
    if (!el || shown >= filtered.length) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown((n) => n + STEP); }, { rootMargin: '1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, filtered.length]);

  // What visitors search (and how many templates they found) for Admin → Keywords.
  useEffect(() => {
    if (!f.q.trim() || !templates.length) return;
    const t = window.setTimeout(() => reportSearch(f.q, results.exact.length), 1500);
    return () => window.clearTimeout(t);
  }, [f.q, results.exact.length, templates.length]);

  // Active filter chips (each one removable).
  const active: { label: string; clear: () => void }[] = [];
  if (f.q) active.push({ label: `“${f.q}”`, clear: () => search('') });
  if (f.kind) active.push({ label: TYPE_BY_ID.get(f.kind)?.label || f.kind, clear: () => set({ kind: null }) });
  if (f.occ) active.push({ label: OCCASIONS.find((o) => o.id === f.occ)?.label || f.occ, clear: () => set({ occ: null }) });
  if (f.cat !== 'All') active.push({ label: catChips.find((c) => c.id === f.cat)?.label || f.cat, clear: () => set({ cat: 'All', sub: null }) });
  if (f.sub) active.push({ label: categories.find((c) => c.id === f.sub)?.name || 'Type', clear: () => set({ sub: null }) });
  f.styles.forEach((s) => active.push({ label: styleLabel(s), clear: () => set({ styles: f.styles.filter((x) => x !== s) }) }));
  if (f.palette) active.push({ label: PALETTES.find((p) => p.id === f.palette)?.label || f.palette, clear: () => set({ palette: null }) });
  if (f.region) active.push({ label: REGIONS.find((r) => r.id === f.region)?.label || f.region, clear: () => set({ region: null }) });
  if (f.shape !== 'all') active.push({ label: f.shape[0].toUpperCase() + f.shape.slice(1), clear: () => set({ shape: 'all' }) });
  if (f.aspect) active.push({ label: ASPECTS.find((a) => a.id === f.aspect)?.label || f.aspect, clear: () => set({ aspect: null }) });
  if (f.medium !== 'all') active.push({ label: f.medium === 'print' ? 'For print' : 'For screens', clear: () => set({ medium: 'all' }) });
  if (f.pages !== 'all') active.push({ label: f.pages === 'multi' ? 'Multi-page' : 'Single page', clear: () => set({ pages: 'all' }) });
  if (f.photo) active.push({ label: 'With photos', clear: () => set({ photo: false }) });
  if (f.featured) active.push({ label: 'Featured', clear: () => set({ featured: false }) });
  if (f.recent) active.push({ label: 'Recently added', clear: () => set({ recent: false }) });
  const clearAll = () => { setDraft(''); setF({ ...NO_FILTERS, sort: f.sort }); };
  const filterCount = active.filter((a) => !a.label.startsWith('“')).length;

  const applyCollection = (c: (typeof COLLECTIONS)[number]) => {
    const { catName, ...rest } = c.f;
    setDraft(rest.q || '');
    setF({ ...NO_FILTERS, ...rest, cat: catName ? catNameToId(catName) : 'All' });
    document.getElementById('template-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const collections = useMemo(
    () =>
      COLLECTIONS.map((c) => {
        const { catName, ...rest } = c.f;
        const fl = { ...NO_FILTERS, ...rest, cat: catName ? catNameToId(catName) : 'All' };
        const items = templates.filter((t) => passes(t, fl));
        return { c, items };
      }).filter((x) => x.items.length >= 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates, passes, categories]
  );

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

  // Heading for the results ("Flyers", "Business flyers", "Results for …").
  const heading = (() => {
    if (searching) {
      const ty = parsed.types[0] ? TYPE_BY_ID.get(parsed.types[0]) : null;
      const topic = parsed.topics.map((g) => g[0]).join(' ');
      if (ty && !results.loose) return `${topic ? `${topic[0].toUpperCase()}${topic.slice(1)} ${ty.label.toLowerCase()}` : ty.label}`;
      return `Results for “${f.q.trim()}”`;
    }
    if (f.kind) return TYPE_BY_ID.get(f.kind)?.label || 'Templates';
    if (f.occ) return `${OCCASIONS.find((o) => o.id === f.occ)?.label} templates`;
    if (f.sub) return categories.find((c) => c.id === f.sub)?.name || 'Templates';
    if (f.cat !== 'All') return `${catChips.find((c) => c.id === f.cat)?.label || ''} templates`;
    return 'All templates';
  })();

  const sidebar = (
    <FilterPanel>
      <Section title="Design type" defaultOpen>
        <List
          items={DESIGN_TYPES.map((ty) => ({ id: ty.id, label: ty.label, n: typeCounts.get(ty.id) || 0 }))}
          selected={f.kind}
          onPick={(id) => set({ kind: f.kind === id ? null : id })}
          limit={10}
        />
      </Section>
      <Section title="Occasion" defaultOpen>
        <List
          items={OCCASIONS.map((o) => ({ id: o.id, label: o.label, n: occCounts.get(o.id) || 0 }))}
          selected={f.occ}
          onPick={(id) => set({ occ: f.occ === id ? null : id })}
          limit={8}
        />
      </Section>
      <Section title="Category" defaultOpen={f.cat !== 'All'}>
        <List
          items={catChips.map((c) => ({ id: c.id, label: c.label, n: catCounts.get(c.id) || 0 }))}
          selected={f.cat === 'All' ? null : f.cat}
          onPick={(id) => set({ cat: f.cat === id ? 'All' : id, sub: null })}
          limit={8}
        />
        {subChips.length > 1 && (
          <div className="mt-2 ml-3 pl-3 border-l border-mt-border">
            <List items={subChips.map((c) => ({ id: c.id, label: c.label, n: subCounts.get(c.id) || 0 }))} selected={f.sub} onPick={(id) => set({ sub: f.sub === id ? null : id })} limit={12} small />
          </div>
        )}
      </Section>
      <Section title="Style">
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((st) => {
            const on = f.styles.includes(st.id);
            const n = styleCounts.get(st.id) || 0;
            if (!on && !n) return null;
            return (
              <button key={st.id} onClick={() => set({ styles: on ? f.styles.filter((x) => x !== st.id) : [...f.styles, st.id] })} aria-pressed={on} className={`text-xs rounded-full px-2.5 py-1 border ${on ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
                {st.label}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Colour">
        <div className="grid grid-cols-2 gap-1.5">
          {PALETTES.map((pl) => {
            const on = f.palette === pl.id;
            const n = palCounts.get(pl.id) || 0;
            if (!n && !on) return null;
            return (
              <button key={pl.id} onClick={() => set({ palette: on ? null : pl.id })} aria-pressed={on} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border text-xs text-left ${on ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-muted hover:bg-mt-surface2'}`}>
                <span className="flex w-6 h-4 shrink-0 rounded overflow-hidden ring-1 ring-black/10">
                  <span className="flex-1" style={{ background: pl.swatch[0] }} />
                  <span className="flex-1" style={{ background: pl.swatch[1] }} />
                </span>
                <span className="truncate">{pl.label}</span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Format">
        <p className="text-[11px] text-mt-faint mb-1">Made for</p>
        <Seg value={f.medium} onChange={(v) => set({ medium: v as Filters['medium'] })} options={[['all', 'Any'], ['print', `Print ${mediumCounts.get('print') || 0}`], ['digital', `Screens ${mediumCounts.get('digital') || 0}`]]} />
        <p className="text-[11px] text-mt-faint mt-3 mb-1">Shape</p>
        <Seg value={f.shape} onChange={(v) => set({ shape: v as Shape })} options={[['all', 'Any'], ['portrait', 'Portrait'], ['square', 'Square'], ['landscape', 'Landscape']]} />
        <p className="text-[11px] text-mt-faint mt-3 mb-1">Pages</p>
        <Seg value={f.pages} onChange={(v) => set({ pages: v as Filters['pages'] })} options={[['all', 'Any'], ['single', `Single ${pagesCounts.get('single') || 0}`], ['multi', `Multi ${pagesCounts.get('multi') || 0}`]]} />
        <p className="text-[11px] text-mt-faint mt-3 mb-1">Aspect ratio</p>
        <select value={f.aspect || ''} onChange={(e) => set({ aspect: e.target.value || null })} className="w-full rounded-lg px-2.5 h-9 border border-mt-input-border bg-mt-surface text-mt-ink text-xs">
          <option value="">Any ratio</option>
          {ASPECTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Section>
      {REGIONS.some((r) => (regionCounts.get(r.id) || 0) > 0 || f.region === r.id) && (
        <Section title="Region">
          <List items={REGIONS.map((r) => ({ id: r.id, label: r.label, n: regionCounts.get(r.id) || 0 }))} selected={f.region} onPick={(id) => set({ region: f.region === id ? null : id })} limit={8} />
        </Section>
      )}
      <Section title="More" defaultOpen>
        <div className="space-y-2 text-[13px] text-mt-ink">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.photo} onChange={(e) => set({ photo: e.target.checked })} className="accent-[#3B82C4] w-4 h-4" /> With photos to replace <span className="ml-auto text-[11px] text-mt-faint">{photoCount}</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="accent-[#3B82C4] w-4 h-4" /> Featured picks</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.recent} onChange={(e) => set({ recent: e.target.checked })} className="accent-[#3B82C4] w-4 h-4" /> Added in the last {RECENT_DAYS} days</label>
        </div>
      </Section>
    </FilterPanel>
  );

  const card = (t: Template) => {
    const x = meta.get(t);
    const pages = x?.pages || 1;
    const ty = x?.types[0] ? TYPE_BY_ID.get(x.types[0]) : null;
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
            <span className="truncate">{ty ? ty.one[0].toUpperCase() + ty.one.slice(1) : t.category}</span>
            {x?.styles[0] && <span className="truncate text-mt-faint">{styleLabel(x.styles[0])}</span>}
          </div>
        </div>
      </div>
    );
  };

  const exactShown = Math.min(shown, results.exact.length);
  const relatedShown = Math.max(0, shown - results.exact.length);
  const relatedLabel = parsed.types.length ? (TYPE_BY_ID.get(parsed.types[0])?.related || []).map((id) => TYPE_BY_ID.get(id)?.label.toLowerCase()).filter(Boolean).join(', ') : '';

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-transparent text-mt-ink dark:text-mt-ink min-h-screen transition-colors duration-300`}
    >
      <SiteHeader theme={theme} onToggleTheme={toggleTheme} active="templates" />

      <PageHero
        align="center"
        eyebrow="Templates"
        title="Start somewhere brilliant."
        accent="brilliant"
        subtitle="Search by what you're making and what it's for — “business flyer”, “wedding album”, “Diwali post”."
      >
        <form className="max-w-2xl mx-auto relative" onSubmit={(e) => { e.preventDefault(); search(draft); }} role="search">
          <Search size={18} className="absolute left-4 top-[24px] -translate-y-1/2 text-mt-faint" />
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="Search 8,000+ templates — flyer, wedding album, Diwali post…"
            aria-label="Search templates"
            autoComplete="off"
            className="w-full h-12 pl-11 pr-24 rounded-2xl border border-mt-input-border bg-mt-surface text-[15px] shadow-[0_10px_30px_-18px_rgba(9,9,11,0.35)] placeholder:text-mt-faint focus:outline-none focus:border-[#3B82C4] focus:ring-4 focus:ring-[#8CCBFF]/30 transition-all"
          />
          {draft && <button type="button" onClick={() => search('')} aria-label="Clear search" className="absolute right-[76px] top-[24px] -translate-y-1/2 p-1 text-mt-faint hover:text-mt-ink"><X size={16} /></button>}
          <button type="submit" className="absolute right-1.5 top-[24px] -translate-y-1/2 h-9 px-4 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Search</button>
          {suggestOpen && suggestions.length > 0 && (
            <ul role="listbox" className="absolute z-30 left-0 right-0 mt-2 rounded-2xl border border-mt-border bg-mt-surface shadow-xl py-1.5 text-left overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => search(s.q)} className="w-full flex items-center gap-3 px-4 py-2 text-[14px] hover:bg-mt-surface2">
                    <Search size={14} className="text-mt-faint" /> <span className="flex-1 text-mt-ink">{s.label}</span> {s.hint && <span className="text-[11px] text-mt-faint">{s.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Popular searches">
          {(searchKeywords.some((k) => k.popular) ? searchKeywords.filter((k) => k.popular).map((k) => k.k) : POPULAR).slice(0, 8).map((k) => (
            <button key={k} type="button" onClick={() => search(k)} className="h-7 px-3 rounded-full border border-mt-border bg-mt-surface text-[12px] text-mt-muted hover:text-mt-ink">{k}</button>
          ))}
        </div>
      </PageHero>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-8 lg:grid lg:grid-cols-[250px_1fr] lg:gap-8">
        {/* Filters: a sidebar on big screens, a drawer on phones and iPad */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto mt-scroll pr-2 pb-10">
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Quick design types (phones/iPad) */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 mt-scroll" aria-label="Design type">
            {DESIGN_TYPES.filter((ty) => (typeCounts.get(ty.id) || 0) > 0 || f.kind === ty.id).slice(0, 14).map((ty) => (
              <button key={ty.id} onClick={() => set({ kind: f.kind === ty.id ? null : ty.id })} aria-pressed={f.kind === ty.id} className={`shrink-0 text-[13px] font-medium rounded-full px-3.5 py-1.5 border ${f.kind === ty.id ? 'bg-[#14121F] dark:bg-white text-white dark:text-[#14121F] border-transparent' : 'border-mt-border text-mt-ink'}`}>
                {ty.label}
              </button>
            ))}
          </div>

          {/* Results header */}
          <div className="mt-2 lg:mt-0 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl leading-tight">{heading}</h2>
              <p className="mt-1 text-[13px] text-mt-muted" aria-live="polite">
                {results.exact.length.toLocaleString()} {results.exact.length === 1 ? 'template' : 'templates'}
                {results.related.length > 0 && ` · ${results.related.length.toLocaleString()} related`}
                {results.loose && ' · no exact match, showing close results'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDrawer(true)} className={`lg:hidden inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 border text-[13px] font-medium ${filterCount ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-ink'}`}>
                <SlidersHorizontal size={14} /> Filters{filterCount ? ` · ${filterCount}` : ''}
              </button>
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Sort" className="h-9 rounded-full px-3 border border-mt-border bg-mt-surface text-mt-ink text-[13px] focus:outline-none">
                {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {active.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Active filters">
              {active.map((a) => (
                <button key={a.label} onClick={a.clear} className="inline-flex items-center gap-1 rounded-full bg-mt-surface2 border border-mt-border pl-3 pr-2 py-1 text-mt-ink hover:border-mt-accent/40" aria-label={`Remove filter ${a.label}`}>
                  {a.label} <X size={12} />
                </button>
              ))}
              <button onClick={clearAll} className="ml-1 font-semibold text-[#3B82C4] hover:underline px-2 py-1">Clear all</button>
            </div>
          )}

          {active.length === 0 && collections.length > 0 && (
            <section aria-label="Collections" className="pt-6">
              <h3 className="text-sm font-semibold text-mt-muted mb-3">Collections</h3>
              <div className="flex gap-3 overflow-x-auto pb-3 mt-scroll snap-x">
                {collections.map(({ c, items }) => (
                  <button key={c.title} onClick={() => applyCollection(c)} className="snap-start shrink-0 w-[230px] text-left rounded-2xl border border-mt-border bg-mt-surface overflow-hidden mt-card-hover">
                    <div className="grid grid-cols-3 gap-0.5 h-[100px] bg-mt-surface2">
                      {items.slice(0, 3).map((t) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={t.id || t.name} src={t.thumbnail || ''} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ))}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-mt-ink">{c.title}</p>
                      <p className="text-xs text-mt-muted">{c.note}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section id="template-grid" className="pt-6 pb-10 scroll-mt-20">
            <div className="columns-2 md:columns-3 xl:columns-4 min-[1700px]:columns-5 gap-4 [&>*]:mb-4">
              {results.exact.slice(0, exactShown).map(card)}
            </div>
            {results.related.length > 0 && relatedShown > 0 && (
              <>
                <div className="mt-6 mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-mt-border" />
                  <p className="text-[13px] font-semibold text-mt-muted">Related{relatedLabel ? `: ${relatedLabel}` : ''}</p>
                  <span className="h-px flex-1 bg-mt-border" />
                </div>
                <div className="columns-2 md:columns-3 xl:columns-4 min-[1700px]:columns-5 gap-4 [&>*]:mb-4">
                  {results.related.slice(0, relatedShown).map(card)}
                </div>
              </>
            )}
            {shown < filtered.length && (
              <div ref={moreRef} className="py-8 flex justify-center">
                <button onClick={() => setShown((n) => n + STEP * 2)} className="h-10 px-5 rounded-full border border-mt-border text-sm font-semibold text-mt-ink hover:bg-mt-surface2">Show more templates</button>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="text-lg font-[family-name:var(--font-display)]">No templates match these filters.</p>
                <p className="mt-2 text-sm text-mt-muted">Remove a filter or try a different search.</p>
                {active.length > 0 && <button onClick={clearAll} className="mt-4 text-sm font-semibold text-[#3B82C4] hover:underline">Clear all filters</button>}
              </div>
            )}
          </section>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button className="absolute inset-0 bg-black/45" aria-label="Close filters" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[88%] max-w-[360px] bg-mt-surface shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-mt-border">
              <p className="font-semibold">Filters</p>
              <button onClick={() => setDrawer(false)} aria-label="Close" className="p-1.5"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">{sidebar}</div>
            <div className="p-3 border-t border-mt-border flex gap-2">
              <button onClick={clearAll} className="h-11 px-4 rounded-full border border-mt-border text-sm font-semibold">Clear</button>
              <button onClick={() => setDrawer(false)} className="flex-1 h-11 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold">Show {results.exact.length.toLocaleString()} templates</button>
            </div>
          </div>
        </div>
      )}

      {previewing && <TemplatePreview t={previewing} types={meta.get(previewing)?.types || []} onClose={() => setPreviewing(null)} onUse={() => useTemplate(previewing)} onTag={(tag) => { search(tag); setPreviewing(null); }} onStyle={(st) => { set({ styles: [st] }); setPreviewing(null); }} />}

      <Footer theme={theme} />
    </main>
    </div>
  );
}

// ------------------------------------------------------------ filter parts
function FilterPanel({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-mt-border">{children}</div>;
}
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-3">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between text-[13px] font-semibold text-mt-ink py-1">
        {title} <ChevronDown size={15} className={`text-mt-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
function List({ items, selected, onPick, limit, small }: { items: { id: string; label: string; n: number }[]; selected: string | null; onPick: (id: string) => void; limit: number; small?: boolean }) {
  const [all, setAll] = useState(false);
  const usable = items.filter((i) => i.n > 0 || i.id === selected).sort((a, b) => (a.id === selected ? -1 : b.id === selected ? 1 : 0));
  const list = all ? usable : usable.slice(0, limit);
  if (!usable.length) return <p className="text-[12px] text-mt-faint">None for this search</p>;
  return (
    <div>
      <ul className="space-y-0.5">
        {list.map((i) => {
          const on = i.id === selected;
          return (
            <li key={i.id}>
              <button onClick={() => onPick(i.id)} aria-pressed={on} className={`w-full flex items-center gap-2 rounded-lg px-2 ${small ? 'py-1 text-[12px]' : 'py-1.5 text-[13px]'} text-left ${on ? 'bg-[#8CCBFF]/20 text-mt-ink font-semibold' : 'text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink'}`}>
                <span className={`w-3.5 h-3.5 shrink-0 rounded-full border ${on ? 'border-[#3B82C4] bg-[#3B82C4] shadow-[inset_0_0_0_2px_white]' : 'border-mt-border'}`} />
                <span className="flex-1 truncate">{i.label}</span>
                <span className="text-[11px] text-mt-faint tabular-nums">{i.n.toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {usable.length > limit && (
        <button onClick={() => setAll((v) => !v)} className="mt-1 px-2 text-[12px] font-semibold text-[#3B82C4] hover:underline">{all ? 'Show less' : `Show all ${usable.length}`}</button>
      )}
    </div>
  );
}
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([id, l]) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={value === id} className={`rounded-full px-2.5 py-1 border text-[12px] ${value === id ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function TemplatePreview({ t, types, onClose, onUse, onTag, onStyle }: { t: Template; types: string[]; onClose: () => void; onUse: () => void; onTag: (tag: string) => void; onStyle: (s: string) => void }) {
  // Fast: the ready-made medium-size picture (~900 px) shows at once. Only
  // multi-page designs draw their pages, small (520 px) and only when asked.
  const [pages, setPages] = useState<PageImage[] | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [idx, setIdx] = useState(0);
  const [design, setDesign] = useState<any>(t.canvasJson ?? null);
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const expected = pagesOf(t);
  useEffect(() => {
    closeRef.current?.focus();
    setPages(null);
    setIdx(0);
    setLoaded(false);
    setLoadingPages(false);
    setDesign(t.canvasJson ?? null);
  }, [t]);
  const showPages = async () => {
    if (loadingPages || pages) return;
    setLoadingPages(true);
    const full = t.canvasJson ? t : t.id ? await fetchTemplateById(t.id) : null;
    if (!full?.canvasJson) { setPages([]); setLoadingPages(false); return; }
    setDesign(full.canvasJson);
    const imgs = await renderTemplatePages(full.canvasJson, 520, { quality: 0.72 }).catch(() => []);
    setPages(imgs);
    setLoadingPages(false);
  };
  const fallback = t.preview || t.thumbnail;
  const show = pages && pages.length ? pages[Math.min(idx, pages.length - 1)].url : fallback;
  const many = !!pages && pages.length > 1;
  const st = stylesOf(t);
  const tags = [...new Set([...typeHashtags({ name: t.name, category: t.category, width: t.width, height: t.height, tags: t.tags, occasion: t.occasion, industry: t.industry, searchKeywords: t.searchKeywords }, types)])].slice(0, 12);
  const typeLabel = types[0] ? TYPE_BY_ID.get(types[0])?.one : null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.name} className="bg-mt-surface rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto grid md:grid-cols-[1.5fr_1fr]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-mt-accentsoft dark:bg-mt-bg flex flex-col p-4 sm:p-6 min-h-[280px]">
          <div className="relative flex-1 flex items-center justify-center">
            {show ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={show} alt={many ? `${t.name} — ${pageLabel(pages!, idx)}` : t.name} onLoad={() => setLoaded(true)} decoding="async" className={`max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-lg transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
            ) : (
              <div className="w-full h-72"><MockDesignCard colors={t.colors} label={t.category} /></div>
            )}
            {!loaded && show && <Loader2 size={22} className="absolute animate-spin text-mt-faint" />}
            {expected > 1 && !many && (
              <button onClick={showPages} disabled={loadingPages} className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[12px] font-semibold bg-mt-surface/95 shadow rounded-full px-3.5 py-1.5 text-mt-ink">
                {loadingPages ? <><Loader2 size={12} className="animate-spin" /> Loading {expected} pages…</> : <>See all {expected} pages</>}
              </button>
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
            <dt className="text-mt-muted">Type</dt>
            <dd className="capitalize">{typeLabel || t.category}</dd>
            <dt className="text-mt-muted">Category</dt>
            <dd>{t.category}</dd>
            <dt className="text-mt-muted">Size</dt>
            <dd>{t.width} × {t.height} {t.unit || 'px'}</dd>
            <dt className="text-mt-muted">Pages</dt>
            <dd>{pages && pages.length ? pages.length : expected}{expected === 2 ? ' (front & back)' : ''}</dd>
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
              {tags.map((tag) => (
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
