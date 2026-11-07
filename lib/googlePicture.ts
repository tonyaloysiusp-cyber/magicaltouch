// The picture Google shows next to our search result (and on shared links).
// Chosen in Admin → SEO & Google → Google picture; stored in site_settings
// under "google_picture". Change it weekly or monthly — Google picks up the
// new one the next time it visits the home page.

export interface GooglePicture {
  url: string;
  alt: string;
  updated_at: string;
  history: { url: string; alt: string; from: string; to: string }[];
}

export const EMPTY_PICTURE: GooglePicture = { url: '', alt: '', updated_at: '', history: [] };

export function parseGooglePicture(v: unknown): GooglePicture {
  try {
    const o = typeof v === 'string' ? JSON.parse(v) : v;
    if (!o || typeof o !== 'object') return EMPTY_PICTURE;
    const x = o as Partial<GooglePicture>;
    return {
      url: typeof x.url === 'string' && /^(https:\/\/|\/)\S+$/.test(x.url) ? x.url : '',
      alt: typeof x.alt === 'string' ? x.alt.slice(0, 140) : '',
      updated_at: typeof x.updated_at === 'string' ? x.updated_at : '',
      history: Array.isArray(x.history) ? x.history.slice(0, 24) : [],
    };
  } catch {
    return EMPTY_PICTURE;
  }
}
