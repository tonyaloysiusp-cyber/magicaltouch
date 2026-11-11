// Search-engine helpers: the canonical site address, server-side template
// look-ups for template pages and the sitemap, and small text helpers.
// Uses the public (anon) key, so only published templates are visible.

export const SITE_URL = 'https://www.magicaltouchdesign.com';
export const SITE_NAME = 'Magical Touch Design';
export const SITE_DESCRIPTION =
  'Free online design workspace with 1,000+ professional templates — social media posts, flyers, posters, menus, invitations, certificates and more. Edit every word, colour and photo in your browser and download print-ready PDF, PNG or JPG.';

export interface SeoTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  width: number;
  height: number;
  preview: string | null;
  thumbnail: string | null;
  tags: string[] | null;
  search_keywords: string | null;
  color1: string | null;
  updated_at: string | null;
  published_at: string | null;
  is_free?: boolean | null;
  occasion?: string | null;
  industry?: string | null;
  hashtags?: string[] | null;
  description?: string | null;
}

const COLS = 'id,name,slug,category,width,height,preview,thumbnail,tags,search_keywords,color1,updated_at,published_at,is_free,occasion,industry,hashtags,description';

async function rest<T>(query: string, revalidate = 3600): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate },
    } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const PUBLISHED = 'status=eq.published&slug=not.is.null';

export async function getTemplateBySlug(slug: string): Promise<SeoTemplate | null> {
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows?.[0] || null;
}

export async function getRelatedTemplates(t: SeoTemplate, limit = 8): Promise<SeoTemplate[]> {
  const rows = await rest<SeoTemplate[]>(
    `templates?select=${COLS}&${PUBLISHED}&category=eq.${encodeURIComponent(t.category)}&id=neq.${t.id}&order=sort_order.asc&limit=${limit}`
  );
  return rows || [];
}

export async function getTemplatesInCategory(category: string, limit = 400): Promise<SeoTemplate[]> {
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&category=eq.${encodeURIComponent(category)}&order=sort_order.asc&limit=${limit}`);
  return rows || [];
}

/** Every published template (paged, PostgREST returns at most 1000 rows per call). */
// Kept in memory for 10 minutes per server instance as well as in the data
// cache: the full list is ~5 MB over 9 requests, and logs showed it being
// fetched thousands of times a day (it fed every category page).
let allMemo: { at: number; p: Promise<SeoTemplate[]> } | null = null;
export function getAllPublishedTemplates(): Promise<SeoTemplate[]> {
  if (allMemo && Date.now() - allMemo.at < 600_000) return allMemo.p;
  const p = fetchAllPublished().then((rows) => {
    if (!rows.length) allMemo = null; // don't keep a failed fetch
    return rows;
  });
  allMemo = { at: Date.now(), p };
  return p;
}
async function fetchAllPublished(): Promise<SeoTemplate[]> {
  const out: SeoTemplate[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&order=sort_order.asc,id.asc&offset=${from}&limit=1000`);
    if (!rows || !rows.length) break;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Published templates whose name or keywords contain any of the terms. */
// A term with "+" needs every part ("wedding+album": wedding AND album, each
// in the name, keywords, category or occasion) — so a page for "business
// flyer" shows business flyers, not every flyer and every business design.
export async function searchTemplates(terms: string[], limit = 40): Promise<SeoTemplate[]> {
  const clean = (t: string) => t.replace(/[^\p{L}\p{N} ]/gu, '').trim();
  const ors = terms
    .flatMap((t) => {
      if (t.includes('+')) {
        const parts = t.split('+').map(clean).filter(Boolean);
        if (!parts.length) return [];
        return [`and(${parts.map((w) => `or(name.ilike.*${w}*,search_keywords.ilike.*${w}*,category.ilike.*${w}*,occasion.ilike.*${w}*)`).join(',')})`];
      }
      const w = clean(t);
      return w ? [`name.ilike.*${w}*`, `search_keywords.ilike.*${w}*`] : [];
    })
    .join(',');
  if (!ors) return [];
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&or=(${encodeURIComponent(ors)})&order=is_featured.desc,sort_order.asc&limit=${limit}`);
  return rows || [];
}

// Category ↔ URL segment ("Social Media" ↔ "social-media").
export const categorySlug = (c: string) => c.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  // Only the category column (~150 KB) instead of the full list.
  const m = new Map<string, number>();
  for (let from = 0; from < 20000; from += 1000) {
    const rows = await rest<{ category: string }[]>(`templates?select=category&${PUBLISHED}&order=id.asc&offset=${from}&limit=1000`);
    if (!rows || !rows.length) break;
    rows.forEach((r) => m.set(r.category, (m.get(r.category) || 0) + 1));
    if (rows.length < 1000) break;
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, slug: categorySlug(name), count }));
}

// Print sizes are stored at 96 px per inch.
export function sizeLabel(w: number, h: number) {
  const mm = (px: number) => Math.round((px / 96) * 25.4);
  const named: Record<string, string> = { '210x297': 'A4', '297x210': 'A4 landscape', '148x210': 'A5', '297x420': 'A3', '420x297': 'A3 landscape', '216x279': 'US Letter', '99x210': 'DL' };
  const key = `${mm(w)}x${mm(h)}`;
  if (named[key]) return `${named[key]} (${mm(w)} × ${mm(h)} mm)`;
  if ((w === 1080 && h === 1350) || (w === 1080 && h === 1080) || (w === 1080 && h === 1920) || (w === 1200 && h === 630) || (w === 1280 && h === 720) || (w === 1584 && h === 396))
    return `${w} × ${h} px`;
  return w > 700 && h > 700 ? `${w} × ${h} px` : `${mm(w)} × ${mm(h)} mm`;
}

export function formatLabel(w: number, h: number) {
  if (w === 1080 && h === 1350) return 'Instagram post (4:5)';
  if (w === 1080 && h === 1080) return 'Square post';
  if (w === 1080 && h === 1920) return 'Instagram / WhatsApp story';
  if (w === 1200 && h === 630) return 'Facebook post';
  if (w === 1280 && h === 720) return 'YouTube thumbnail';
  if (w === 1584 && h === 396) return 'LinkedIn banner';
  const l = sizeLabel(w, h);
  return /^A\d|Letter|DL/.test(l) ? `${l.split(' (')[0]} print` : 'Print or digital';
}

const KINDS: [RegExp, string][] = [
  [/invitation|invite|save the date|rsvp/i, 'Invitation'], [/business card/i, 'Business card'], [/flyer/i, 'Flyer'], [/poster/i, 'Poster'], [/menu/i, 'Menu'],
  [/resume|\bcv\b/i, 'Resume'], [/certificate/i, 'Certificate'], [/letterhead/i, 'Letterhead'], [/invoice/i, 'Invoice'], [/brochure/i, 'Brochure'],
  [/magazine/i, 'Magazine'], [/collage/i, 'Photo collage'], [/album/i, 'Photo album'], [/thumbnail/i, 'YouTube thumbnail'], [/banner|backdrop/i, 'Banner'],
  [/presentation|slides/i, 'Presentation'], [/story/i, 'Story'], [/\bcard\b/i, 'Card'], [/wishes|greeting/i, 'Greeting'], [/announcement|reveal/i, 'Announcement'], [/\bpost\b/i, 'Social media post'],
];

/** One line under the title: what it is · occasion · size. */
export function templateSubtitle(t: Pick<SeoTemplate, 'name' | 'category' | 'width' | 'height' | 'occasion' | 'industry'>) {
  const kind = KINDS.find(([rx]) => rx.test(t.name))?.[1] || t.category;
  const size = formatLabel(t.width, t.height) === 'Print or digital' ? sizeLabel(t.width, t.height) : formatLabel(t.width, t.height);
  const parts = [size.toLowerCase().includes(kind.toLowerCase()) ? '' : kind, t.occasion || t.industry || '', size];
  return [...new Set(parts.filter(Boolean))].join(' · ');
}

export function templateDescription(t: SeoTemplate) {
  if (t.description && t.description.length >= 60) return t.description.slice(0, 320);
  const kw = (t.search_keywords || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4).join(', ');
  return `Free ${t.name} template — ${formatLabel(t.width, t.height)}, ${sizeLabel(t.width, t.height)}. Edit the text, colours and photos online and download as PDF, PNG or JPG.${kw ? ` Great for ${kw}.` : ''}`.slice(0, 300);
}

/** A public site setting (e.g. the Google verification code). */
export async function getSiteSetting(key: string): Promise<string | null> {
  const rows = await rest<{ value: string }[]>(`site_settings?select=value&key=eq.${encodeURIComponent(key)}&limit=1`, 600);
  return rows?.[0]?.value?.trim() || null;
}

export interface SeoPageRow { slug: string; title: string; h1: string; description: string; intro: string; thing: string; terms: string[]; faqs: [string, string][]; updated_at: string }

/** Landing pages created in Admin → SEO & promotion. */
export async function getPublishedSeoPages(): Promise<SeoPageRow[]> {
  return (await rest<SeoPageRow[]>(`seo_pages?select=slug,title,h1,description,intro,thing,terms,faqs,updated_at&status=eq.published&limit=1000`, 600)) || [];
}
export async function getSeoPage(slug: string): Promise<SeoPageRow | null> {
  const rows = await rest<SeoPageRow[]>(`seo_pages?select=slug,title,h1,description,intro,thing,terms,faqs,updated_at&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`, 600);
  return rows?.[0] || null;
}

/** Landing addresses that open the template gallery with a filter instead of
 *  their own page (Admin → SEO → Landing pages → "Link to gallery"), e.g.
 *  /free-brochure-templates → /templates?kind=brochure. Faster: no page to build. */
export function parseRedirects(v: string | null | undefined): Map<string, string> {
  try {
    const o = JSON.parse(v || '{}');
    return new Map(Object.entries(o).filter(([k, u]) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(k) && typeof u === 'string' && /^\/templates(\/|\?|$)/.test(u)) as [string, string][]);
  } catch {
    return new Map();
  }
}
export async function getLandingRedirects(): Promise<Map<string, string>> {
  return parseRedirects(await getSiteSetting('landing_redirects'));
}

/** Built-in landing pages switched off in Admin → SEO (Landing pages). */
export async function getHiddenLandings(): Promise<Set<string>> {
  const v = await getSiteSetting('hidden_landings');
  return new Set((v || '').split(',').map((x) => x.trim()).filter(Boolean));
}

// ---------------------------------------------------------------- hashtags & sub-categories

/** Templates carrying a hashtag (most featured first). */
export async function getTemplatesByHashtag(tag: string, limit = 240): Promise<SeoTemplate[]> {
  const t = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!t) return [];
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&hashtags=cs.%7B${t}%7D&order=is_featured.desc,sort_order.asc&limit=${limit}`);
  return rows || [];
}

/** Hashtags that appear most often alongside the given templates. */
export function relatedHashtags(rows: SeoTemplate[], exclude: string[] = [], max = 24): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  rows.forEach((r) => (r.hashtags || []).forEach((h) => { if (!exclude.includes(h)) m.set(h, (m.get(h) || 0) + 1); }));
  return [...m.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, max).map(([tag, count]) => ({ tag, count }));
}

/** Every hashtag with its template count (for the sitemap and hashtag index). */
export async function getHashtagCounts(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (let from = 0; from < 20000; from += 1000) {
    const rows = await rest<{ hashtags: string[] | null }[]>(`templates?select=hashtags&${PUBLISHED}&order=id.asc&offset=${from}&limit=1000`);
    if (!rows || !rows.length) break;
    rows.forEach((r) => (r.hashtags || []).forEach((h) => m.set(h, (m.get(h) || 0) + 1)));
    if (rows.length < 1000) break;
  }
  return m;
}

export interface SubCategory { id: string; name: string; slug: string; parent: string; parentSlug: string; count: number }

/** Sub-categories ("Wedding → Invitation") with how many templates each has. */
export async function getSubcategories(): Promise<SubCategory[]> {
  const cats = await rest<{ id: string; name: string; parent_id: string | null }[]>(`template_categories?select=id,name,parent_id`);
  if (!cats) return [];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (let from = 0; from < 20000; from += 1000) {
    const rows = await rest<{ category_id: string | null }[]>(`templates?select=category_id&${PUBLISHED}&order=id.asc&offset=${from}&limit=1000`);
    if (!rows || !rows.length) break;
    rows.forEach((r) => r.category_id && counts.set(r.category_id, (counts.get(r.category_id) || 0) + 1));
    if (rows.length < 1000) break;
  }
  return cats
    .filter((c) => c.parent_id && byId.get(c.parent_id) && (counts.get(c.id) || 0) > 0)
    .map((c) => {
      const p = byId.get(c.parent_id!)!;
      return { id: c.id, name: c.name, slug: categorySlug(c.name), parent: p.name, parentSlug: categorySlug(p.name), count: counts.get(c.id) || 0 };
    })
    .sort((a, b) => b.count - a.count);
}

export async function getTemplatesInSubcategory(id: string, limit = 400): Promise<SeoTemplate[]> {
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&category_id=eq.${id}&order=is_featured.desc,sort_order.asc&limit=${limit}`);
  return rows || [];
}

export { hashtagTitle } from '@/lib/templateSearch';

/** Retired duplicate templates → the slug of the variant that was kept
 *  (site setting `template_redirects`, a JSON object). */
export async function getTemplateRedirect(slug: string): Promise<string | null> {
  const raw = await getSiteSetting('template_redirects');
  if (!raw) return null;
  try { const m = JSON.parse(raw) as Record<string, string>; return typeof m[slug] === 'string' ? m[slug] : null; } catch { return null; }
}

// ---------- Site-wide SEO standard (see docs/TEMPLATE_SEO_STRATEGY.md) ----------
// Titles: 60 characters or fewer when shown in Google, brand at the end.
// Descriptions: 70–155 characters, ending on a whole sentence or word.
export const TITLE_MAX = 60;
export const DESC_MAX = 155;

export function fitTitle(base: string): { absolute: string } {
  const b = base.replace(/\s+/g, ' ').replace(/\s*\|\s*Magical Touch Design\s*$/i, '').trim();
  const options = [`${b} | Magical Touch Design`, `${b} | Magical Touch`];
  for (const o of options) if (o.length <= TITLE_MAX) return { absolute: o };
  // Too long: keep the part before an em dash, then the brand if it fits.
  const head = b.split(/\s+[—–|]\s+/)[0];
  if (head !== b) return fitTitle(head);
  if (b.length <= TITLE_MAX) return { absolute: b };
  const cut = b.slice(0, TITLE_MAX + 1).replace(/\s+\S*$/, '');
  return { absolute: cut.replace(/[\s,;:—–-]+$/, '') };
}

export function fitDescription(text: string, max = DESC_MAX): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max + 1);
  const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (end >= 70) return slice.slice(0, end + 1);
  return slice.replace(/\s+\S*$/, '').replace(/[\s,;:—–-]+$/, '') + '…';
}
