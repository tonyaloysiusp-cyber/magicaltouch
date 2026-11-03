// What each template IS (flyer, poster, photo album, Instagram post…), kept
// apart from what it is ABOUT (birthday, business, Diwali…). Search uses
// both: "business flyer" = type flyer + topic business, so it finds flyers
// from every category (Business, Marketing, Events, Festivals…), and
// "photo album" finds only albums and photo books — not every collage.
//
// Shared by the gallery (client), the template pages and the hashtags.

export interface TypeSource {
  name: string;
  category: string;
  sub?: string | null; // sub-category name (e.g. "Flyer", "Instagram")
  width: number;
  height: number;
  tags?: string[] | null;
  occasion?: string | null;
  industry?: string | null;
  searchKeywords?: string | null;
}

export interface DesignType {
  id: string;
  label: string; // plural, for chips ("Flyers")
  one: string; // singular, for hashtags/titles ("flyer")
  words: string[]; // what people type (longest phrases matched first)
  related?: string[]; // shown after exact matches ("flyer" → posters)
  tags: string[]; // hashtags for designs of this type
}

export const DESIGN_TYPES: DesignType[] = [
  { id: 'social-post', label: 'Social media posts', one: 'social media post', words: ['social media post', 'social media', 'instagram post', 'insta post', 'facebook post', 'linkedin post', 'ig post', 'instagram', 'insta', 'post', 'posts', 'carousel'], related: ['story'], tags: ['socialmediapost', 'instagrampost', 'socialmediadesign', 'digitalmarketing'] },
  { id: 'story', label: 'Stories & reels', one: 'story', words: ['instagram story', 'insta story', 'whatsapp status', 'story', 'stories', 'reel', 'reels', 'status'], related: ['social-post'], tags: ['instagramstory', 'storytemplate', 'reelcover'] },
  { id: 'flyer', label: 'Flyers', one: 'flyer', words: ['flyer', 'flyers', 'flier', 'fliers', 'leaflet', 'leaflets', 'handout', 'handbill', 'pamphlet'], related: ['poster', 'ad'], tags: ['flyer', 'flyerdesign', 'printdesign', 'marketing'] },
  { id: 'poster', label: 'Posters', one: 'poster', words: ['poster', 'posters', 'placard'], related: ['flyer', 'ad'], tags: ['poster', 'posterdesign', 'printdesign'] },
  { id: 'invitation', label: 'Invitations', one: 'invitation', words: ['save the date', 'invitation', 'invitations', 'invite', 'invites', 'invitation card', 'e-invite', 'evite', 'rsvp'], related: ['greeting-card'], tags: ['invitation', 'invitationcard', 'einvite'] },
  { id: 'greeting-card', label: 'Cards & wishes', one: 'greeting card', words: ['greeting card', 'greeting cards', 'greeting', 'greetings', 'wishes', 'wish', 'card', 'cards', 'postcard'], related: ['invitation', 'social-post'], tags: ['greetingcard', 'wishes', 'cardmaker'] },
  { id: 'photo-album', label: 'Photo albums & books', one: 'photo album', words: ['photo album', 'photo albums', 'album', 'albums', 'photo book', 'photobook', 'photo books', 'memory book', 'yearbook', 'scrapbook'], related: ['photo-collage', 'magazine'], tags: ['photoalbum', 'photobook', 'albumdesign', 'memories'] },
  { id: 'photo-collage', label: 'Photo collages', one: 'photo collage', words: ['photo collage', 'collage', 'collages', 'photo grid', 'photo dump', 'mood board', 'moodboard'], related: ['photo-album', 'photo-frame'], tags: ['photocollage', 'collagemaker', 'photogrid'] },
  { id: 'photo-frame', label: 'Photo frames', one: 'photo frame', words: ['photo frame', 'photo frames', 'frame', 'frames', 'photo border'], related: ['photo-collage'], tags: ['photoframe', 'photoediting'] },
  { id: 'magazine', label: 'Magazines & booklets', one: 'magazine', words: ['magazine', 'magazines', 'zine', 'booklet', 'booklets', 'newsletter', 'lookbook', 'catalogue', 'catalog', 'ebook', 'e-book'], related: ['brochure', 'photo-album'], tags: ['magazine', 'magazinedesign', 'editorialdesign', 'booklet'] },
  { id: 'brochure', label: 'Brochures', one: 'brochure', words: ['brochure', 'brochures', 'tri-fold', 'trifold', 'bifold', 'bi-fold'], related: ['flyer', 'magazine'], tags: ['brochure', 'brochuredesign', 'printdesign'] },
  { id: 'ad', label: 'Ads & promotions', one: 'ad', words: ['advertisement', 'advert', 'ads', 'ad', 'promo', 'promotion', 'sale', 'offer', 'discount'], related: ['social-post', 'flyer', 'poster'], tags: ['advertising', 'promo', 'salepost', 'marketing'] },
  { id: 'banner', label: 'Banners & covers', one: 'banner', words: ['facebook cover', 'linkedin banner', 'youtube banner', 'twitter header', 'web banner', 'banner', 'banners', 'cover photo', 'cover', 'header', 'billboard', 'roll up', 'rollup'], related: ['poster', 'sign'], tags: ['banner', 'bannerdesign', 'coverphoto'] },
  { id: 'thumbnail', label: 'YouTube thumbnails', one: 'YouTube thumbnail', words: ['youtube thumbnail', 'thumbnail', 'thumbnails', 'youtube'], related: ['banner'], tags: ['youtubethumbnail', 'thumbnaildesign', 'youtube'] },
  { id: 'sign', label: 'Signs', one: 'sign', words: ['sign', 'signs', 'signage', 'board'], related: ['poster', 'banner'], tags: ['sign', 'signage', 'eventsign'] },
  { id: 'business-card', label: 'Business cards', one: 'business card', words: ['business card', 'business cards', 'visiting card', 'visiting cards', 'name card', 'id card'], related: ['letterhead'], tags: ['businesscard', 'visitingcard', 'branding'] },
  { id: 'letterhead', label: 'Letterheads & stationery', one: 'letterhead', words: ['letterhead', 'letterheads', 'stationery', 'envelope', 'compliment slip', 'letter'], related: ['business-card', 'invoice'], tags: ['letterhead', 'stationery', 'branding'] },
  { id: 'invoice', label: 'Invoices & documents', one: 'document', words: ['invoice', 'invoices', 'proposal', 'report', 'quotation', 'receipt'], related: ['letterhead'], tags: ['invoice', 'businessdocument'] },
  { id: 'resume', label: 'Resumes & CVs', one: 'resume', words: ['resume', 'resumes', 'cv', 'curriculum vitae', 'biodata'], tags: ['resume', 'cv', 'resumetemplate', 'jobsearch'] },
  { id: 'certificate', label: 'Certificates & awards', one: 'certificate', words: ['certificate', 'certificates', 'award', 'awards', 'diploma', 'achievement'], tags: ['certificate', 'certificatedesign', 'award'] },
  { id: 'menu', label: 'Menus', one: 'menu', words: ['menu', 'menus', 'menu card', 'price list'], related: ['flyer', 'social-post'], tags: ['menu', 'menudesign', 'restaurantmenu'] },
  { id: 'presentation', label: 'Presentations', one: 'presentation', words: ['presentation', 'presentations', 'slides', 'slide', 'pitch deck', 'deck', 'powerpoint', 'ppt'], tags: ['presentation', 'slides', 'pitchdeck'] },
  { id: 'logo', label: 'Logos', one: 'logo', words: ['logo', 'logos', 'brand mark'], tags: ['logo', 'logodesign', 'branding'] },
  { id: 'label', label: 'Labels, tags & stickers', one: 'label', words: ['label', 'labels', 'sticker', 'stickers', 'price tag', 'gift tag', 'tag', 'tags', 'badge', 'badges', 'bookmark'], tags: ['label', 'sticker', 'packaging'] },
  { id: 'ticket', label: 'Tickets & vouchers', one: 'ticket', words: ['ticket', 'tickets', 'voucher', 'vouchers', 'gift card', 'gift voucher', 'coupon', 'coupons'], tags: ['ticket', 'giftvoucher', 'coupon'] },
  { id: 'planner', label: 'Planners & schedules', one: 'planner', words: ['planner', 'planners', 'calendar', 'schedule', 'timetable', 'agenda', 'checklist', 'itinerary', 'program', 'programme', 'timeline', 'order of service'], tags: ['planner', 'calendar', 'schedule'] },
  { id: 'email', label: 'Email signatures & headers', one: 'email signature', words: ['email signature', 'email header', 'email', 'signature'], tags: ['emailsignature', 'emailmarketing'] },
  { id: 'mockup', label: 'Mockups', one: 'mockup', words: ['mockup', 'mockups', 'mock-up', 'mock up'], tags: ['mockup', 'productmockup'] },
];
export const TYPE_BY_ID = new Map(DESIGN_TYPES.map((t) => [t.id, t]));

const has = (re: RegExp, s: string) => re.test(s);

/** Every type a template counts as, best first. */
export function typesOf(t: TypeSource): string[] {
  const name = ` ${t.name.toLowerCase()} `;
  const sub = (t.sub || '').toLowerCase();
  const cat = (t.category || '').toLowerCase();
  const tags = (t.tags || []).map((x) => x.toLowerCase());
  const pages = pagesOf(t);
  const W = t.width, H = t.height, r = W / Math.max(1, H);
  const out: string[] = [];
  const add = (id: string) => { if (!out.includes(id)) out.push(id); };

  // 1. What the name says (most reliable).
  if (has(/\b(album|photo ?book|memory book|yearbook)\b/, name) || (cat === 'photo collage' && pages > 1)) add('photo-album');
  if (has(/\b(magazine|zine|booklet|newsletter|lookbook|catalogu?e|e-?book)\b/, name)) add('magazine');
  if (has(/\b(brochure|tri-?fold|bi-?fold)\b/, name)) add('brochure');
  if (has(/\bbusiness cards?\b|\bvisiting card|\bid card\b/, name) || sub === 'business card') add('business-card');
  if (has(/\b(letterhead|stationery|envelope|compliment slip)\b/, name) || sub === 'letterhead') add('letterhead');
  if (has(/\b(invoice|proposal|report|quotation|receipt)\b/, name)) add('invoice');
  if (has(/\b(resume|cv|curriculum)\b/, name) || cat === 'resume') add('resume');
  if (has(/\b(certificate|diploma|award|employee of the month|first place|winner)\b/, name) || cat === 'certificates') add('certificate');
  if (has(/\b(menu|price list)\b/, name) || cat === 'menus') add('menu');
  if (has(/\b(presentation|slides?|pitch deck|deck)\b/, name) || sub === 'presentation') add('presentation');
  if (has(/\bmock-?ups?\b/, name)) add('mockup');
  if (has(/\blogo\b/, name)) add('logo');
  if (has(/\b(label|sticker|price tag|gift tag|bookmark|name badge)s?\b/, name)) add('label');
  if (has(/\b(ticket|voucher|coupon|gift card)s?\b/, name)) add('ticket');
  if (has(/\b(planner|calendar|schedule|timetable|agenda|checklist|itinerary|programme|program|timeline|order of)\b/, name)) add('planner');
  if (has(/\bemail\b/, name)) add('email');
  if (has(/\b(thumbnail)\b/, name) || (sub === 'youtube' && Math.abs(r - 16 / 9) < 0.05)) add('thumbnail');
  if (has(/\b(banner|header|billboard|roll-?up)\b/, name) || sub === 'banner' || (has(/\bcover\b/, name) && r > 1.5)) add('banner');
  if (has(/\bsign(age)?\b/, name)) add('sign');
  if (has(/\b(collage|photo grid|photo dump|mosaic|mood ?board)\b/, name) || (cat === 'photo collage' && pages <= 1 && !has(/\bframe\b/, name))) add('photo-collage');
  if (has(/\b(story|stories|reel)\b/, name)) add('story');
  if (has(/\b(post|carousel|square)\b/, name) || sub === 'instagram' || sub === 'facebook') { if (!out.includes('story') && !out.includes('banner')) add('social-post'); }
  if (has(/\b(flyers?|fliers?|leaflet|handout)\b/, name) || sub === 'flyer') add('flyer');
  if (has(/\bposters?\b/, name) || sub === 'poster') add('poster');
  if (has(/\b(invitation|invite|save the date|rsvp)\b/, name) || sub === 'invitation' || sub === 'save the date') add('invitation');
  if (has(/\b(greeting|wishes|card|postcard|thank you|note)\b/, name) && !['business-card', 'invitation', 'ticket', 'social-post', 'story'].some((x) => out.includes(x))) add('greeting-card');
  // "Frame" is also a look in names ("Midnight Frame Diwali Post"): a photo frame only when nothing else fits, or in Photo Collage.
  if (has(/\bframes?\b/, name) && (cat === 'photo collage' || !out.length)) add('photo-frame');
  if (has(/\b(ad|ads|advert|advertisement|promo|sale|offer|discount|deals?)\b/, name) || sub === 'advertisement') add('ad');

  // 2. Nothing in the name: the size and category decide.
  if (!out.length || (out.length === 1 && out[0] === 'ad')) {
    const print = tags.includes('print') || W === 794 || W === 1123 || W === 1240 || W === 1050 || W === 1200 && H === 1800 || W === 480 || W === 559 || W === 1650;
    if (W === 1080 && H === 1920) add('story');
    else if (W === 1280 && H === 720) add('thumbnail');
    else if (Math.abs(r - 16 / 9) < 0.03) add(cat === 'business' ? 'presentation' : 'banner');
    else if (r > 2.4) add('banner');
    else if (!print && (r >= 0.78 && r <= 1.02)) add('social-post');
    else if (cat === 'love & family' || cat === 'birthday' || cat === 'wedding' || cat === 'events') {
      add(W <= 1050 && r < 0.8 && !/\b(night|summit|conference|tournament|gala|yoga|awards)\b/.test(name) ? 'invitation' : 'poster');
    } else if (cat === 'marketing' || cat === 'business') add(r < 0.85 ? 'flyer' : 'social-post');
    else add(r < 0.85 ? 'poster' : 'social-post');
  }
  // Square/portrait digital designs also work as social posts.
  if (!out.includes('social-post') && !out.includes('story') && (W === 1080 || W === 1200) && (H === 1080 || H === 1350 || H === 1200) && pages <= 1) out.push('social-post');
  return out;
}

/** Page count from tags ("12 pages", "12-pages") or the name ("… 12 Pages"). */
export function pagesOf(t: { tags?: string[] | null; name: string }): number {
  for (const x of t.tags || []) {
    const m = /^(\d+)[ -]pages$/.exec(x);
    if (m) return parseInt(m[1], 10);
  }
  const m = /\b(\d{1,3}) pages?\b/i.exec(t.name);
  return m ? parseInt(m[1], 10) : 1;
}

/** Has a drop-in photo frame (tag set by the database), or clearly needs photos. */
export function hasPhoto(t: TypeSource): boolean {
  if ((t.tags || []).includes('with-photo')) return true;
  return /\b(photo|collage|album|frame|polaroid|picture)s?\b/i.test(`${t.name} ${t.searchKeywords || ''}`);
}

// ------------------------------------------------------------------ topics
// Words for what a design is about. A topic word matches if any of these
// appear in the template's name, category, occasion, industry, tags or
// keywords (whole words, so "card" doesn't match "cardiff").
export const TOPIC_SYNONYMS: Record<string, string[]> = {
  business: ['business', 'company', 'corporate', 'startup', 'agency', 'office', 'brand', 'shop', 'store', 'services', 'consulting', 'marketing', 'real estate', 'hiring', 'launch', 'grand opening', 'b2b', 'professional', 'finance', 'law', 'clinic', 'salon', 'restaurant', 'cafe'],
  birthday: ['birthday', 'bday', 'b-day', 'turning', '1st', 'first birthday', 'sweet sixteen', 'party'],
  bday: ['birthday'],
  wedding: ['wedding', 'bride', 'bridal', 'groom', 'marriage', 'nikah', 'shaadi', 'engagement', 'reception', 'save the date'],
  marriage: ['wedding', 'marriage'],
  baby: ['baby', 'newborn', 'baby shower', 'gender reveal', 'christening', 'naming'],
  christmas: ['christmas', 'xmas', 'santa', 'festive season', 'holiday season'],
  xmas: ['christmas', 'xmas'],
  diwali: ['diwali', 'deepavali', 'deepawali', 'diya'],
  deepavali: ['diwali', 'deepavali'],
  eid: ['eid', 'eid mubarak', 'eid al-fitr', 'eid al-adha', 'bakrid'],
  ramadan: ['ramadan', 'ramzan', 'iftar', 'suhoor'],
  valentine: ['valentine', "valentine's", 'valentines', 'love'],
  valentines: ['valentine', 'valentines'],
  mother: ["mother's day", 'mothers day', 'mother', 'mum', 'mom', 'mama'],
  mothers: ["mother's day", 'mothers day', 'mother'],
  father: ["father's day", 'fathers day', 'father', 'dad', 'papa'],
  fathers: ["father's day", 'fathers day', 'father'],
  restaurant: ['restaurant', 'cafe', 'café', 'food', 'menu', 'dining', 'kitchen', 'bakery', 'pizza', 'burger', 'coffee'],
  food: ['food', 'restaurant', 'cafe', 'menu', 'recipe', 'bakery', 'kitchen'],
  real: ['real estate'],
  school: ['school', 'education', 'class', 'student', 'teacher', 'graduation', 'kids'],
  education: ['education', 'school', 'course', 'class', 'workshop', 'webinar', 'student', 'teacher', 'university', 'college'],
  sale: ['sale', 'offer', 'discount', 'deal', 'black friday', 'promo'],
  party: ['party', 'celebration', 'birthday', 'night'],
  newyear: ['new year'],
  church: ['church', 'sunday service', 'worship', 'easter', 'christian'],
  fitness: ['fitness', 'gym', 'workout', 'yoga', 'training'],
  beauty: ['beauty', 'salon', 'spa', 'makeup', 'skincare', 'hair', 'nails'],
  travel: ['travel', 'trip', 'holiday', 'vacation', 'tour', 'destination', 'honeymoon'],
  family: ['family', 'mother', 'father', 'kids', 'baby', 'anniversary', 'love'],
};

// Filler words people add that say nothing about the design.
const FILLER = new Set(['template', 'templates', 'design', 'designs', 'free', 'online', 'maker', 'make', 'create', 'creator', 'editable', 'for', 'a', 'an', 'the', 'and', 'with', 'of', 'my', 'to', 'in', 'on', 'best', 'new', 'idea', 'ideas', 'example', 'examples', 'sample', 'samples', 'download', 'printable', 'editor', 'edit', 'editing', 'happy']);

export interface ParsedQuery {
  types: string[]; // design types asked for
  topics: string[][]; // each inner list = alternatives; all groups must match
  photo: boolean; // "photo …" with no photo type → designs with photos
  raw: string;
}

/** "business flyer" → { types: [flyer], topics: [[business, company, …]] }. */
export function parseQuery(q: string): ParsedQuery {
  let text = ` ${q.toLowerCase().replace(/[#,]/g, ' ').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim()} `;
  const raw = text.trim();
  const types: string[] = [];
  // A hashtag like "birthdayflyer" or "weddingalbum": split it into words.
  if (!raw.includes(' ') && raw.length > 5) {
    const glued = DESIGN_TYPES.flatMap((t) => t.words).map((w) => w.replace(/\s/g, '')).sort((a, b) => b.length - a.length);
    const hit = glued.find((w) => raw.endsWith(w) && raw.length > w.length + 2);
    if (hit) text = ` ${raw.slice(0, raw.length - hit.length)} ${DESIGN_TYPES.flatMap((t) => t.words).find((w) => w.replace(/\s/g, '') === hit)} `;
  }
  // Longest phrases first, across every type.
  const phrases = DESIGN_TYPES.flatMap((t) => t.words.map((w) => ({ w, id: t.id }))).sort((a, b) => b.w.length - a.w.length);
  for (const { w, id } of phrases) {
    const re = new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`);
    if (re.test(text)) {
      if (!types.includes(id)) types.push(id);
      text = text.replace(re, ' ');
    }
  }
  // "photo" on its own (photo editing, birthday photo…) = designs with photos.
  let photo = false;
  if (/(^|\s)(photos?|pictures?|pics?|image|images)(?=\s|$)/.test(text)) {
    photo = true;
    text = text.replace(/(^|\s)(photos?|pictures?|pics?|image|images)(?=\s|$)/g, ' ');
  }
  // Multi-word topics ("real estate", "new year", "mother's day", "baby shower").
  const topics: string[][] = [];
  for (const ph of ["mother's day", 'mothers day', "father's day", 'fathers day', 'new year', 'real estate', 'baby shower', 'black friday', 'grand opening', 'gender reveal', 'lunar new year', 'raksha bandhan', 'ganesh chaturthi', 'independence day', 'national day', 'sweet sixteen', 'first birthday', 'eid mubarak', 'thank you', 'save the date', 'coming soon', 'we are hiring', 'open house', 'just listed']) {
    if (text.includes(` ${ph} `)) {
      topics.push([ph, ...(TOPIC_SYNONYMS[ph.replace(/'s? day/, '').replace(/\s/g, '')] || [])]);
      text = text.replace(` ${ph} `, ' ');
    }
  }
  text.split(' ').filter((w) => w && !FILLER.has(w)).forEach((w) => {
    const base = w.replace(/'s$/, '');
    const syn = TOPIC_SYNONYMS[base] || TOPIC_SYNONYMS[base.replace(/s$/, '')];
    topics.push([base, ...(syn || [])]);
  });
  return { types, topics, photo, raw };
}

/** Lower-cased text of what a template is about (not its long description). */
export function topicText(t: TypeSource): string {
  return ` ${[t.name, t.category, t.sub, t.occasion, t.industry, ...(t.tags || []).map((x) => x.replace(/^(style:|region-|occasion-)/, '').replace(/-/g, ' ')), (t.searchKeywords || '').replace(/,/g, ' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'& ]+/g, ' ')
    .replace(/\s+/g, ' ')} `;
}

/** Whole-word (or word-start for 4+ letters, so "birthday" ⊂ "birthdays") match. */
export function hasWord(text: string, w: string): boolean {
  if (text.includes(` ${w} `)) return true;
  if (w.length >= 4 && text.includes(` ${w}`)) return true;
  return false;
}

/** Hashtags for a template: its design types, topics and photo use. */
export function typeHashtags(t: TypeSource, types = typesOf(t)): string[] {
  const out: string[] = [];
  const add = (s?: string | null) => { const v = (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''); if (v.length >= 3 && v.length <= 32 && !out.includes(v)) out.push(v); };
  const topic = (t.occasion || '').trim() || topicWord(t);
  types.slice(0, 2).forEach((id) => {
    const ty = TYPE_BY_ID.get(id);
    if (!ty) return;
    if (topic) add(`${topic} ${ty.one}`);
    ty.tags.slice(0, 3).forEach(add);
  });
  if (hasPhoto(t)) {
    add('photo design');
    add('photo editing');
    if (topic) add(`${topic} photo`);
    if (topic) add(`${topic} photo editing`);
  }
  if (t.occasion) add(t.occasion);
  if (t.industry) add(t.industry);
  return out;
}

// The main subject word of a template (from category, else name).
const SUBJECTS = ['birthday', 'wedding', 'anniversary', 'baby shower', 'baby', 'graduation', 'christmas', 'diwali', 'eid', 'ramadan', 'new year', 'valentine', 'halloween', 'easter', 'pongal', 'onam', 'holi', 'business', 'restaurant', 'cafe', 'real estate', 'fitness', 'beauty', 'travel', 'school', 'church', 'party', 'sale', 'family', 'love', 'engagement', 'retirement', 'farewell'];
function topicWord(t: TypeSource): string {
  const n = ` ${t.name.toLowerCase()} `;
  const hit = SUBJECTS.find((s) => n.includes(` ${s}`));
  if (hit) return hit;
  const c = (t.category || '').toLowerCase();
  if (['birthday', 'wedding', 'business', 'menus'].includes(c)) return c === 'menus' ? 'restaurant' : c;
  return '';
}
