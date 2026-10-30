// Auto ads & posts for a landing page — Admin → SEO → Overview → "Ads & posts".
// Builds ready-to-paste copy from the page itself: Google Ads responsive
// search ads (15 headlines ≤ 30 characters, 4 descriptions ≤ 90) and posts
// for Instagram, Facebook, LinkedIn, Pinterest, X and WhatsApp, each with
// its own tracked link so the Overview shows which channel brings visitors.

const SITE = 'https://www.magicaltouchdesign.com';

export interface AdPack {
  googleHeadlines: string[];
  googleDescriptions: string[];
  keywords: string[];
  posts: { channel: string; text: string; link: string }[];
}

const cap = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
const fits = (n: number) => (s: string) => s.length <= n;

export function utmLink(slug: string, source: string, medium: string, campaign: string) {
  const u = new URL(`${SITE}/${slug}`);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

export function buildAdPack(p: { slug: string; h1: string; thing: string; description: string; templates: number | null }): AdPack {
  const thing = p.thing.toLowerCase();
  const T = cap(thing);
  const n = p.templates && p.templates >= 10 ? (p.templates >= 60 ? '60+' : String(p.templates)) : '';
  const campaign = p.slug.slice(0, 40);

  const headlines = [
    p.h1.replace(/^free /i, 'Free '),
    `Free ${T} Templates`,
    `${T} — Free & Easy`,
    `Make a ${T} in Minutes`,
    n ? `${n} Free ${T} Designs` : `Pro ${T} Designs`,
    'No Watermark. Ever.',
    'Edit Online — Nothing to Install',
    'Print-Ready PDF With Bleed',
    'Download PDF, PNG or JPG',
    'Every Feature Is Free',
    'Arabic & English Fonts',
    'Works on Phone & Computer',
    'Designed by Pros, Edited by You',
    `Your ${T}, Ready Today`,
    'Magical Touch Design',
    `Free Online ${T} Maker`,
  ].map((h) => h.trim()).filter(fits(30)).filter((h, i, a) => a.indexOf(h) === i).slice(0, 15);

  const descriptions = [
    `Pick a ${thing} template, change the words and photos, and download in minutes. Free.`,
    'Every template, the full editor and all downloads are free — no watermark, no trial.',
    'Print-ready PDF with bleed and CMYK, or PNG and JPG for WhatsApp and Instagram.',
    `Professional ${thing} designs you can edit in your browser. Start free today.`,
    'Upload your logo and photos, change colours in one click, resize to any format.',
  ].filter(fits(90)).slice(0, 4);

  const kw = [thing, `free ${thing}`, `${thing} template`, `${thing} maker`, `${thing} design`, `${thing} online`, `${thing} maker free`, `editable ${thing}`];
  const keywords = kw.filter((k, i, a) => a.indexOf(k) === i);

  const tags = ['#graphicdesign', '#freetemplates', `#${thing.replace(/[^a-z0-9]/g, '')}`, '#designtools', '#smallbusiness', '#dubai', '#canvaalternative'].filter((t, i, a) => t.length > 2 && a.indexOf(t) === i);

  const L = (source: string, medium = 'social') => utmLink(p.slug, source, medium, campaign);
  const posts = [
    { channel: 'Instagram', link: L('instagram'), text: `Need a ${thing}? ✨\n\nPick a template, tap to change the words and photos, and download — free, no watermark.\n\n${n ? `${n} designs to choose from. ` : ''}Link in bio → ${p.h1}\n\n${tags.join(' ')}` },
    { channel: 'Facebook', link: L('facebook'), text: `Free ${thing} templates you can edit online 🎨\n\n✔ Change text, colours and photos in your browser\n✔ Print-ready PDF or PNG for WhatsApp\n✔ No watermark, no trial\n\nStart here: ${L('facebook')}` },
    { channel: 'LinkedIn', link: L('linkedin'), text: `Small teams shouldn’t need a designer for every ${thing}.\n\nWe built free, professional ${thing} templates that anyone can edit in a browser — your logo, your colours, print-ready PDF or social sizes in one click. No watermark, no paid tier.\n\nTry it: ${L('linkedin')}\n\n#design #marketing #smallbusiness` },
    { channel: 'Pinterest', link: L('pinterest'), text: `${p.h1} — free editable templates\n\n${p.description}\n\n${L('pinterest')}` },
    { channel: 'X / Threads', link: L('x'), text: `Free ${thing} templates — edit online, download PDF/PNG, no watermark. ${L('x')}` },
    { channel: 'WhatsApp', link: L('whatsapp'), text: `Hi! If you ever need a ${thing}, this is free and really easy — pick a design, change the words, download: ${L('whatsapp')}` },
  ];
  return { googleHeadlines: headlines, googleDescriptions: descriptions, keywords, posts };
}
