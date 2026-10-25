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
}

const COLS = 'id,name,slug,category,width,height,preview,thumbnail,tags,search_keywords,color1,updated_at,published_at';

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
export async function getAllPublishedTemplates(): Promise<SeoTemplate[]> {
  const out: SeoTemplate[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&order=sort_order.asc&offset=${from}&limit=1000`);
    if (!rows || !rows.length) break;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Published templates whose name or keywords contain any of the terms. */
export async function searchTemplates(terms: string[], limit = 40): Promise<SeoTemplate[]> {
  const ors = terms
    .map((t) => t.replace(/[^\p{L}\p{N} ]/gu, '').trim())
    .filter(Boolean)
    .flatMap((t) => [`name.ilike.*${t}*`, `search_keywords.ilike.*${t}*`])
    .join(',');
  if (!ors) return [];
  const rows = await rest<SeoTemplate[]>(`templates?select=${COLS}&${PUBLISHED}&or=(${encodeURIComponent(ors)})&order=is_featured.desc,sort_order.asc&limit=${limit}`);
  return rows || [];
}

// Category ↔ URL segment ("Social Media" ↔ "social-media").
export const categorySlug = (c: string) => c.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  const rows = await getAllPublishedTemplates();
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.category, (m.get(r.category) || 0) + 1));
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

export function templateDescription(t: SeoTemplate) {
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
