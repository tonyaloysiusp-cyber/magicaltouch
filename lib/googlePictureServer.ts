import { parseGooglePicture, GooglePicture } from './googlePicture';

/** Server side: the admin-chosen Google picture (cached 10 minutes). */
export async function getGooglePicture(): Promise<GooglePicture | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/site_settings?select=value&key=eq.google_picture`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600 } } as RequestInit);
    if (!r.ok) return null;
    const rows = (await r.json()) as { value: string }[];
    const p = parseGooglePicture(rows?.[0]?.value);
    return p.url ? p : null;
  } catch {
    return null;
  }
}
