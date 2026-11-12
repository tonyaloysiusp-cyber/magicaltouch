// The template categories (design types) in the order people look for them.
// Admin → Template Manager organises templates into these; occasions such as
// Birthday, Wedding or Festivals are sub-categories inside each one, and the
// public search matches titles, descriptions, hashtags and occasions across all.
export const CATEGORY_ORDER = [
  'Social Media Posts', 'Stories & Reels', 'Flyers', 'Posters', 'Invitations', 'Greeting Cards', 'Business Cards',
  'Presentations', 'YouTube Thumbnails', 'Banners & Covers', 'Roll-ups, Signs & Flags', 'Menus', 'Certificates',
  'Resumes & CVs', 'Letterheads & Stationery', 'Brochures', 'Magazines & Booklets', 'Photo Collages & Frames', 'Photo Albums',
  'Tickets & Vouchers', 'ID Cards, Badges & Tags', 'Invoices & Documents', 'Planners & Calendars', 'Digital Signage & Screens',
  'Email Signatures', 'Logos', 'Mockups',
];
export const rankCategory = (name: string) => { const i = CATEGORY_ORDER.indexOf(name); return i === -1 ? 99 : i; };
