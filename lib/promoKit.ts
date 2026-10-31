// Ready-made promotion posters and videos for the site itself (public/promo),
// with a caption for each channel. Shown in Admin → SEO → Social.

const SITE = 'https://www.magicaltouchdesign.com';
const link = (source: string) => `${SITE}/?utm_source=${source}&utm_medium=social&utm_campaign=launch-kit`;

export interface PromoAsset { file: string; kind: 'image' | 'video'; title: string; size: string; channels: string[]; caption: string }

export const PROMO_KIT: PromoAsset[] = [
  { file: '/promo/promo-reel-9x16.mp4', kind: 'video', title: 'Launch reel', size: '1080 × 1920 · 15 s', channels: ['Instagram Reels', 'TikTok', 'YouTube Shorts', 'Facebook Reels', 'WhatsApp status'],
    caption: `Design anything — free, forever ✨\n\n1,800+ templates, an AI Template Studio that turns any design you like into an editable one, Photo Studio and print-ready PDF. No watermark, no trial.\n\nLink in bio 👉 magicaltouchdesign.com\n\n#graphicdesign #freetemplates #canvaalternative #smallbusiness #india #designtools` },
  { file: '/promo/promo-square-1x1.mp4', kind: 'video', title: 'Square video', size: '1080 × 1080 · 15 s', channels: ['LinkedIn', 'Facebook', 'Instagram feed', 'X'],
    caption: `We built a design platform where every feature is free.\n\n✔ 1,800+ professional templates\n✔ AI Template Studio — paste any design, edit it in a minute (works with free Claude, ChatGPT and Gemini)\n✔ Photo Studio with background removal\n✔ Print-ready CMYK PDF\n✔ No watermark, no paid tier\n\nTry it: ${link('linkedin')}\n\n#design #marketing #smallbusiness #startup` },
  { file: '/promo/promo-instagram-post.jpg', kind: 'image', title: 'Instagram post', size: '1080 × 1350', channels: ['Instagram', 'Facebook'],
    caption: `Design anything. Free. Forever. 🎨\n\nWedding invites, birthday posts, flyers, certificates, menus — 1,800+ templates you edit in your browser.\n\nLink in bio.\n#freetemplates #graphicdesign #instagramtemplates` },
  { file: '/promo/promo-instagram-story.jpg', kind: 'image', title: 'Story', size: '1080 × 1920', channels: ['Instagram story', 'WhatsApp status', 'Facebook story'],
    caption: 'Add a link sticker → magicaltouchdesign.com' },
  { file: '/promo/promo-ai-studio.jpg', kind: 'image', title: 'AI Studio announcement', size: '1080 × 1350', channels: ['Instagram', 'LinkedIn', 'Facebook'],
    caption: `NEW: AI Template Studio 🤖✨\n\nSee a design you love? Paste a screenshot — free AI (Claude, ChatGPT, Gemini…) rebuilds it as a fully editable template in about a minute. Change every word, colour and photo.\n\nFree on magicaltouchdesign.com\n#ai #design #productivity` },
  { file: '/promo/promo-linkedin.jpg', kind: 'image', title: 'LinkedIn / link image', size: '1200 × 627', channels: ['LinkedIn', 'Facebook link', 'X', 'Product Hunt'],
    caption: `Small teams shouldn’t need a design budget. Magical Touch Design is free: 1,800+ templates, AI Template Studio, Photo Studio and print-ready CMYK PDF — no watermark.\n\n${link('linkedin')}` },
  { file: '/promo/promo-square.jpg', kind: 'image', title: 'Square post', size: '1080 × 1080', channels: ['Facebook', 'Instagram', 'WhatsApp groups'],
    caption: `Every design tool. Every feature free. No watermark.\n${link('facebook')}` },
  { file: '/promo/promo-pinterest.jpg', kind: 'image', title: 'Pinterest pin', size: '1000 × 1500', channels: ['Pinterest'],
    caption: '1,800+ free design templates — invitations, flyers, social posts, certificates and menus. Edit online, download PDF or PNG, no watermark.' },
];
