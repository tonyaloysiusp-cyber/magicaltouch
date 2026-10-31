// Server side: the live number of published templates for page titles,
// descriptions and copy, written in the style chosen in Admin → Templates.
// Refreshed every 5 minutes, and at once whenever templates are added,
// published, unpublished or deleted (database trigger → /api/count-refresh,
// which clears the "template-count" cache tag).

import { countLabel, parseCountStyle, CountStyle } from '@/lib/templateCountLabel';

export const COUNT_TAG = 'template-count';

async function rest(path: string, extra: Record<string, string> = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...extra },
    next: { revalidate: 300, tags: [COUNT_TAG] },
  } as RequestInit);
}

export async function getTemplateCount(): Promise<number | null> {
  try {
    const res = await rest('templates?select=id&status=eq.published&limit=1', { Prefer: 'count=exact' });
    if (!res) return null;
    const total = Number((res.headers.get('content-range') || '').split('/')[1]);
    return res.ok && total > 0 ? total : null;
  } catch {
    return null;
  }
}

export async function getCountStyle(): Promise<CountStyle> {
  try {
    const res = await rest('site_settings?select=value&key=eq.template_count_style');
    const rows = res && res.ok ? ((await res.json()) as { value: string }[]) : [];
    return parseCountStyle(rows[0]?.value);
  } catch {
    return 'rounded50';
  }
}

/** "5,450+" (falls back to "1,000+" if the database can't be reached). */
export async function getTemplateCountLabel(): Promise<string> {
  const [n, style] = await Promise.all([getTemplateCount(), getCountStyle()]);
  return n ? countLabel(n, style) : '1,000+';
}

/** Puts the live count into copy written as "1,000+" / "Over 1,000". */
export function withCount(text: string, label: string): string {
  const plain = label.replace(/\+$/, '');
  return text.replace(/1,000\+/g, label).replace(/Over 1,000\b/g, `Over ${plain}`);
}
