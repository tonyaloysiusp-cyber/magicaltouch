// The official Magical Touch posts (public/posts, made by scripts/make_posts.mjs).
// One square design each — fits Google Business, Instagram, Facebook, LinkedIn and X.
export type BrandPost = { id: string; title: string; caption: string };

const TAGS = '#magicaltouchdesign #freedesign #graphicdesign #freetemplates #printdesign';

export const BRAND_POSTS: BrandPost[] = [
  { id: 'free-for-everyone', title: 'Design anything. Free for everyone.', caption: 'Design anything — free for everyone. Templates, a design editor, Photo Studio, packaging and textile tools, with print-ready export. No login, no watermark.' },
  { id: 'no-login', title: 'No login. No fee. Just create.', caption: 'No login. No fee. Just create. Open magicaltouchdesign.com and start designing — your files stay on your own device.' },
  { id: 'photo-studio', title: 'Retouch faces. Free Photo Studio.', caption: 'Retouch portraits free: lip shades, brighter eyes, face shape and skin — all on your device in the free Photo Studio.' },
  { id: 'templates', title: 'Free templates for every occasion.', caption: 'Free templates for every occasion — posters, menus, invitations, social posts and more. Change every word and photo, then download free.' },
  { id: 'languages', title: 'Your design, any language.', caption: 'Your design in any language: type in 17+ scripts and translate into 37 languages, with fonts made for each script.' },
  { id: 'packaging', title: 'Real box dielines. Ready to print.', caption: 'Real box dielines at your exact size and board — design on the flat blank, then download the print PDF, DXF and spec sheet. Free.' },
  { id: 'print-ready', title: 'Print-ready files. Free export.', caption: 'Print-ready files with 3 mm bleed, crop marks and CMYK — business cards, flyers and more. Free export, no watermark.' },
];

export const postCaption = (p: BrandPost, url = 'https://magicaltouchdesign.com') => `${p.caption}\n\n${url}\n\n${TAGS}`;
