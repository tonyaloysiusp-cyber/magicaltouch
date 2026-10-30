// Social media integration: the site's own profiles (saved once in Admin →
// SEO → Social, shown in the footer and given to Google as "sameAs" so the
// brand panel links them) and one-tap share links for any page.
// Stored as the public site setting `social_links` (JSON: { id: url }).

export interface Network { id: string; name: string; placeholder: string; color: string }

export const NETWORKS: Network[] = [
  { id: 'instagram', name: 'Instagram', placeholder: 'https://www.instagram.com/yourname', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', placeholder: 'https://www.facebook.com/yourpage', color: '#1877F2' },
  { id: 'linkedin', name: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/yourcompany', color: '#0A66C2' },
  { id: 'youtube', name: 'YouTube', placeholder: 'https://www.youtube.com/@yourchannel', color: '#FF0000' },
  { id: 'pinterest', name: 'Pinterest', placeholder: 'https://www.pinterest.com/yourname', color: '#E60023' },
  { id: 'tiktok', name: 'TikTok', placeholder: 'https://www.tiktok.com/@yourname', color: '#111111' },
  { id: 'x', name: 'X', placeholder: 'https://x.com/yourname', color: '#111111' },
  { id: 'threads', name: 'Threads', placeholder: 'https://www.threads.net/@yourname', color: '#111111' },
  { id: 'whatsapp', name: 'WhatsApp channel', placeholder: 'https://whatsapp.com/channel/…', color: '#25D366' },
  { id: 'behance', name: 'Behance', placeholder: 'https://www.behance.net/yourname', color: '#1769FF' },
];

export type SocialLinks = Record<string, string>;

export function parseSocial(v: string | null | undefined): SocialLinks {
  try {
    const o = JSON.parse(v || '{}');
    const out: SocialLinks = {};
    NETWORKS.forEach((n) => { if (typeof o?.[n.id] === 'string' && /^https:\/\/[^\s]+$/.test(o[n.id])) out[n.id] = o[n.id]; });
    return out;
  } catch { return {}; }
}

/** Share a page on each network (opens the network's own share box). */
export function shareLinks(url: string, text: string, image?: string) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  return [
    { id: 'whatsapp', name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { id: 'facebook', name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'linkedin', name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'x', name: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { id: 'threads', name: 'Threads', href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}` },
    { id: 'pinterest', name: 'Pinterest', href: `https://www.pinterest.com/pin/create/button/?url=${u}&description=${t}${image ? `&media=${encodeURIComponent(image)}` : ''}` },
    { id: 'reddit', name: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'telegram', name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'email', name: 'Email', href: `mailto:?subject=${t}&body=${encodeURIComponent(`${text}\n\n${url}`)}` },
  ];
}
