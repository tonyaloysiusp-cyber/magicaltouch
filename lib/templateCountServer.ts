// Server side: the live number of published templates, rounded down to the
// nearest 50 ("1,850+"), for page titles, descriptions and copy. Checked at
// most once an hour, so adding templates updates the site by itself.

import { roundedCountLabel } from '@/lib/templateCountLabel';

export async function getTemplateCount(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/templates?select=id&status=eq.published&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
      next: { revalidate: 3600 },
    } as RequestInit);
    const total = Number((res.headers.get('content-range') || '').split('/')[1]);
    return res.ok && total > 0 ? total : null;
  } catch {
    return null;
  }
}

/** "1,850+" (falls back to "1,000+" if the database can't be reached). */
export async function getTemplateCountLabel(): Promise<string> {
  const n = await getTemplateCount();
  return n ? roundedCountLabel(n) : '1,000+';
}

/** Puts the live count into copy written as "1,000+" / "Over 1,000". */
export function withCount(text: string, label: string): string {
  return text.replace(/1,000\+/g, label).replace(/Over 1,000\b/g, `Over ${label.replace(/\+$/, '')}`);
}
