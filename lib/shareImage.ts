// The site's share image (what Google, WhatsApp, Facebook and LinkedIn show
// for magicaltouchdesign.com), drawn live at /api/og from these settings.
// Edited in Admin → SEO → Social → "Share image". `{count}` becomes the live
// template count ("5,450+"), so the picture never goes out of date.

export interface ShareImage {
  kicker: string;
  headline: string;
  highlight: string;
  sub: string;
  website: string;
  bg: string;
  accent: string;
  templates: string[]; // template slugs shown on the right (up to 4)
}

export const SHARE_DEFAULT: ShareImage = {
  kicker: 'Magical Touch Design',
  headline: 'Design anything.',
  highlight: 'Make it magical.',
  sub: '{count} free templates — posters, flyers, invitations, posts, menus & more. No watermark.',
  website: 'magicaltouchdesign.com',
  bg: '#FFF7F2',
  accent: '#7C3AED',
  templates: [],
};

export function parseShareImage(v: unknown): ShareImage {
  try {
    const o: any = typeof v === 'string' ? JSON.parse(v) : v;
    if (!o || typeof o !== 'object') return SHARE_DEFAULT;
    const str = (x: any, d: string, max = 140) => (typeof x === 'string' && x.trim() ? x.slice(0, max) : d);
    const col = (x: any, d: string) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : d);
    return {
      kicker: str(o.kicker, SHARE_DEFAULT.kicker, 60), headline: str(o.headline, SHARE_DEFAULT.headline, 60), highlight: str(o.highlight, SHARE_DEFAULT.highlight, 60),
      sub: str(o.sub, SHARE_DEFAULT.sub, 160), website: str(o.website, SHARE_DEFAULT.website, 60), bg: col(o.bg, SHARE_DEFAULT.bg), accent: col(o.accent, SHARE_DEFAULT.accent),
      templates: Array.isArray(o.templates) ? o.templates.filter((s: any) => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)).slice(0, 4) : [],
    };
  } catch {
    return SHARE_DEFAULT;
  }
}
