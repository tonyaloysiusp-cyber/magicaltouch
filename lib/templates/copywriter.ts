// Template copy from the title: a clean, search-friendly title, a natural
// two-sentence description, hashtags and search keywords — worked out from
// what the template already says about itself (name, category, occasion and
// the first keywords). Pure and deterministic: the same template always gets
// the same copy, so the admin preview matches what is saved.

export interface CopyInput { id: string; name: string; category: string | null; occasion: string | null; search_keywords: string | null; hashtags: string[] | null; width: number; height: number }
export interface CopyOut { name: string; description: string; hashtags: string[]; search_keywords: string }

// Format words used in generated names, longest first.
const FORMATS = ['Instagram Portrait Post', 'Portrait Post', 'Square Post', 'Instagram Post', 'Facebook Post', 'LinkedIn Post', 'Facebook Cover', 'LinkedIn Banner', 'Twitter Header', 'X Header', 'YouTube Thumbnail', 'YouTube Banner', 'Pinterest Pin', 'WhatsApp Status', 'Story', 'Reel Cover', 'Business Card', 'Flyer', 'Poster', 'Brochure', 'Letterhead', 'Roll-up Banner', 'Banner', 'Menu', 'Presentation', 'Certificate', 'Invitation', 'Greeting Card', 'Email Signature', 'Web Banner', 'Leaderboard Ad', 'Billboard', 'Magazine Cover', 'Gift Voucher', 'Ticket', 'Invoice', 'Resume', 'ID Card', 'Postcard', 'Album', 'Collage', 'Photo Frame', 'Calendar', 'Planner', 'Logo'];

const SMALL = new Set(['a', 'an', 'and', 'or', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', '&']);
export function titleCase(s: string): string {
  return s.split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w) || !w) return w;
    if (/[A-Z].*[A-Z]/.test(w) || /\d/.test(w)) return w; // keep acronyms, sizes, 25%
    const lw = w.toLowerCase();
    if (i > 0 && SMALL.has(lw)) return lw;
    return lw[0].toUpperCase() + lw.slice(1);
  }).join('');
}

const tag = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '');
const GENERIC = new Set(['template', 'templates', 'professional', 'design', 'editable', 'free', 'post', 'real', 'estate', 'business', 'new', 'best', 'the', 'and']);

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = <T,>(arr: T[], seed: number, k = 0): T => arr[(seed >>> (k * 3)) % arr.length];

/** Splits a generated "Brand Headline Format · Layout" name. */
export function parseName(name: string): { brand: string | null; headline: string | null; format: string | null; layout: string | null } {
  const m = name.match(/^(.*?)\s+(?:·|—|-)\s+([^·—]+)$/);
  const main = (m ? m[1] : name).trim(), layout = m ? m[2].trim() : null;
  const f = FORMATS.find((x) => main.toLowerCase().endsWith(` ${x.toLowerCase()}`) || main.toLowerCase() === x.toLowerCase());
  if (!f) return { brand: null, headline: null, format: null, layout };
  const before = main.slice(0, main.length - f.length).trim();
  return { brand: null, headline: before || null, format: f, layout };
}

function sizeLine(w: number, h: number, category: string): string {
  const r = w / h;
  const shape = Math.abs(r - 1) < 0.04 ? 'Square' : r < 0.7 ? 'Tall' : r < 1 ? 'Portrait' : 'Landscape';
  if (/social|stories|youtube|banner/i.test(category)) return shape === 'Tall' ? `Tall ${w} × ${h} px, made for phones.` : `${shape} ${w} × ${h} px.`;
  return `${w} × ${h} px, print-ready with bleed when you download a PDF.`;
}

export function rewriteCopy(t: CopyInput): CopyOut {
  const seed = hash(t.id);
  const category = t.category || 'Design';
  const kws = (t.search_keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
  const isGenerated = (t.hashtags || []).includes('editabletemplate') || / · /.test(t.name);
  const p = parseName(t.name);
  const industry = isGenerated && kws[0] && !/template/i.test(kws[0]) ? kws[0] : null; // "real estate"
  const niche = isGenerated && kws[3] && !/template/i.test(kws[3]) ? kws[3] : null; // "luxury real estate"
  const occasion = t.occasion?.trim() || null;

  // Title
  let name = t.name.replace(/\s+/g, ' ').trim();
  let headline = '';
  if (isGenerated && p.format && p.headline) {
    // "Crestview Realty Modern villas, ready to move in" → drop the made-up brand
    // (first words in Title Case before a lower-case run), keep the headline.
    // The made-up brand comes first ("Crestview Realty"); the headline starts
    // at the capitalised word just before the first lower-case word.
    const words = p.headline.split(' ');
    const firstLower = words.findIndex((w, i) => i > 0 && /^[a-z]/.test(w));
    headline = firstLower > 0 ? words.slice(firstLower - 1).join(' ').replace(/[.,;:]+$/, '') : '';
    const ind = industry ? titleCase(industry) : '';
    name = headline
      ? `${titleCase(headline)} · ${ind ? `${ind} ` : ''}${p.format}${p.layout ? ` (${p.layout})` : ''}`
      : `${ind ? `${ind} ` : ''}${p.format}${p.layout ? ` · ${p.layout}` : ''}`;
  } else {
    name = name.replace(/\s*—\s*/g, ' · ');
    if (name === name.toLowerCase() || name === name.toUpperCase()) name = titleCase(name);
  }
  name = name.slice(0, 120);

  // Description
  const what = (p.format || category.replace(/s$/, '')).toLowerCase();
  const forWho = occasion ? `for ${occasion}` : industry ? `for ${niche || industry}` : '';
  const openers = [
    `${headline ? `“${titleCase(headline)}” — a` : 'A'} ready-made ${what} template ${forWho}`.trim(),
    `Make this ${what} ${forWho} your own`.trim(),
    `An editable ${what} ${forWho}${headline ? `, with the line “${titleCase(headline)}”` : ''}`.trim(),
  ];
  const middles = [
    'Change the words, colours, fonts and photos online, add your logo, then download as PNG, JPG or PDF.',
    'Swap in your own text, brand colours and pictures in the free editor and download in seconds.',
    'Edit every word, colour and image in your browser — no design skills needed — and download for free.',
  ];
  const description = `${pick(openers, seed)}. ${sizeLine(t.width, t.height, category)} ${pick(middles, seed, 1)}`.replace(/\s+/g, ' ').trim();

  // Hashtags: specific first, generic last; no single words cut out of phrases.
  const tags: string[] = [];
  const add = (s: string | null | undefined) => { if (!s) return; const x = tag(s); if (x.length >= 3 && x.length <= 30 && !GENERIC.has(x) && !tags.includes(x)) tags.push(x); };
  if (occasion) { add(occasion); add(`happy ${occasion}`); add(`${occasion} wishes`); }
  add(niche); add(industry);
  add(p.format || what);
  if (!p.format) add(category.replace(/s$/, '').replace(/ & .*/, ''));
  if (/social|stories/i.test(category)) { add('social media'); add('instagram'); }
  if (/flyer|poster|brochure|card|letterhead|menu|certificate|roll-up|magazine|ticket|invitation/i.test(category)) add('print ready');
  for (const h of t.hashtags || []) if (!['real', 'estate', 'professional', 'editabletemplate'].includes(h) && tags.length < 10) add(h);
  add('editable template');
  const hashtags = tags.slice(0, 12);

  // Search keywords: phrases people type.
  const kw: string[] = [];
  const addK = (s: string | null | undefined) => { const x = (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); if (x && !kw.includes(x)) kw.push(x); };
  if (occasion) { addK(`${occasion} ${what}`); addK(`${occasion} template`); }
  if (industry) { addK(`${industry} ${what}`); addK(`${industry} ${what} template`); }
  if (niche) addK(`${niche} ${what}`);
  addK(`${what} template`);
  if (headline) addK(headline);
  for (const k of kws) if (!/^professional template$/i.test(k)) addK(k);
  const search_keywords = kw.slice(0, 10).join(', ');

  return { name, description, hashtags, search_keywords };
}

/** True when the rewrite changes anything worth saving. */
export function copyChanged(t: CopyInput, o: CopyOut): boolean {
  return o.name !== t.name || o.search_keywords !== (t.search_keywords || '') || o.hashtags.join(',') !== (t.hashtags || []).join(',');
}
