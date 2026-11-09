// Template search, ranked like a shop search box: the words you type are
// matched against each template's title, category and sub-category,
// occasion, hashtags, search words and description — no filter needed.
//
//   * every word must match somewhere (falls back to "any word" when nothing does)
//   * a match in the title counts most, then category, occasion, hashtags, …
//   * plurals, common short forms (invite, bday, xmas, cv …), hashtags written
//     as one word (#birthdayinvitation) and small typos are understood
//
// Self-contained on purpose (no app imports) so it can be tested on its own.

export interface SearchSource {
  name: string;
  category?: string | null;
  sub?: string | null;
  occasion?: string | null;
  industry?: string | null;
  hashtags?: string[] | null;
  keywords?: string | null;
  tags?: string[] | null;
  description?: string | null;
  extra?: string[]; // e.g. design-type names ("flyer", "invitation")
}

export interface SearchDoc {
  name: Set<string>;
  nameText: string;
  cat: Set<string>;
  occ: Set<string>;
  tag: Set<string>;
  glued: Set<string>;
  kw: Set<string>;
  desc: Set<string>;
}

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'my', 'our', 'your', 'free', 'template', 'templates', 'design', 'designs',
  'online', 'maker', 'make', 'create', 'editable', 'idea', 'ideas', 'best', 'new', 'printable', 'download', 'custom', 'sample', 'example', 'format',
]);

// Short forms and other names → the word used in titles and categories.
const SYN: Record<string, string> = {
  invite: 'invitation', invites: 'invitation', invitations: 'invitation', evite: 'invitation', einvite: 'invitation', rsvp: 'invitation',
  bday: 'birthday', birth: 'birthday', xmas: 'christmas', deepavali: 'diwali', divali: 'diwali', ramzan: 'ramadan', ramdan: 'ramadan',
  cv: 'resume', biodata: 'resume', 'résumé': 'resume', leaflet: 'flyer', flier: 'flyer', pamphlet: 'flyer', placard: 'poster',
  ig: 'instagram', insta: 'instagram', fb: 'facebook', yt: 'youtube', thumb: 'thumbnail', biz: 'business', visiting: 'business',
  marriage: 'wedding', nikah: 'wedding', engagement: 'engagement', anniv: 'anniversary', grad: 'graduation', convocation: 'graduation',
  certificates: 'certificate', diploma: 'certificate', menus: 'menu', restaurant: 'restaurant', cafe: 'cafe', coffee: 'coffee',
  collage: 'collage', album: 'album', newyear: 'new year', valentines: 'valentine', mom: 'mother', mum: 'mother', dad: 'father',
  promo: 'promotion', offer: 'sale', discount: 'sale', deals: 'sale', deal: 'sale', advert: 'advertisement', ad: 'advertisement', ads: 'advertisement',
  ppt: 'presentation', slides: 'presentation', deck: 'presentation', letterhead: 'letterhead', invoice: 'invoice', bill: 'invoice', receipt: 'invoice',
  medicine: 'medical', medic: 'medical', doctor: 'medical', clinic: 'medical', hospital: 'medical', pharmacy: 'medical', health: 'medical',
  realestate: 'real estate', property: 'real estate', gym: 'fitness', workout: 'fitness', salon: 'beauty', spa: 'beauty',
};

export function norm(s: string): string {
  return ` ${(s || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export function stem(w: string): string {
  if (w.length <= 3 || /\d/.test(w)) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (/(ss|us|is)$/.test(w)) return w;
  if (/(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

const words = (s: string | null | undefined): string[] => norm(s || '').trim().split(' ').filter(Boolean);
const toSet = (...parts: (string | null | undefined)[]): Set<string> => {
  const out = new Set<string>();
  parts.forEach((p) => words(p).forEach((w) => { out.add(w); out.add(stem(SYN[w] && !SYN[w].includes(' ') ? SYN[w] : w)); }));
  return out;
};

export function buildDoc(t: SearchSource): SearchDoc {
  const tags = (t.tags || []).map((x) => x.replace(/^(style:|region-|occasion-|set-)/, '').replace(/[-_]/g, ' ')).filter((x) => !/^(wave|pro|pilot|v\d|batch)/.test(x));
  const hashtags = (t.hashtags || []).map((h) => h.replace(/^#/, ''));
  return {
    name: toSet(t.name),
    nameText: norm(t.name),
    cat: toSet(t.category, t.sub),
    occ: toSet(t.occasion),
    tag: toSet(...hashtags, ...tags, ...(t.extra || [])),
    glued: new Set(hashtags.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')).filter((h) => h.length >= 4)),
    kw: toSet(t.keywords, t.industry),
    desc: toSet(t.description),
  };
}

export interface ParsedSearch {
  raw: string;
  phrase: string; // normalised whole query
  glued: string; // query without spaces, for one-word hashtags
  terms: string[][]; // each term with its alternatives
}

/** Splits "birthdayinvitation" into known words using the vocabulary. */
function splitGlued(w: string, vocab: Set<string>): string[] | null {
  if (w.length < 7 || vocab.has(w)) return null;
  for (let i = w.length - 3; i >= 3; i--) {
    const a = w.slice(0, i), b = w.slice(i);
    if (vocab.has(a) && (vocab.has(b) || vocab.has(stem(b)))) return [a, b];
  }
  return null;
}

function edit1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; } // swapped letters
    else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

export function parseSearch(q: string, vocab?: Set<string>): ParsedSearch {
  const phrase = norm(q.replace(/#/g, ' '));
  let list = phrase.trim().split(' ').filter(Boolean);
  if (vocab) list = list.flatMap((w) => splitGlued(w, vocab) || [w]);
  const terms: string[][] = [];
  list.forEach((w) => {
    if (STOP.has(w) && list.length > 1) return;
    const alts = new Set<string>([w, stem(w)]);
    const syn = SYN[w] || SYN[stem(w)];
    if (syn) syn.split(' ').length === 1 ? (alts.add(syn), alts.add(stem(syn))) : syn.split(' ').forEach((x) => alts.add(x));
    // Small typo ("invitaion", "birtday"): borrow the closest known word.
    if (vocab && w.length >= 5 && ![...alts].some((a) => vocab.has(a))) {
      for (const v of vocab) if (v.length >= 5 && edit1(w, v)) { alts.add(v); break; }
    }
    terms.push([...alts]);
  });
  return { raw: q, phrase, glued: phrase.replace(/\s/g, ''), terms };
}

const hit = (set: Set<string>, alts: string[]): 0 | 1 | 2 => {
  for (const a of alts) if (set.has(a)) return 2;
  // Word start for 4+ letters while typing ("invit" → "invitation").
  for (const a of alts) if (a.length >= 4) for (const w of set) if (w.length > a.length && w.startsWith(a)) return 1;
  return 0;
};

/** Score a template for a query: 0 = not every word matched. */
export function scoreDoc(d: SearchDoc, p: ParsedSearch): number {
  if (!p.terms.length) return 0;
  let sc = 0;
  for (const alts of p.terms) {
    const n = hit(d.name, alts), c = hit(d.cat, alts), o = hit(d.occ, alts), t = hit(d.tag, alts), k = hit(d.kw, alts);
    const g = alts.some((a) => a.length >= 4 && [...d.glued].some((h) => h.includes(a))) ? 1 : 0;
    const e = n || c || o || t || k || g ? 0 : hit(d.desc, alts);
    const best = Math.max(n * 20, c * 15, o * 14, t * 11, k * 8, g * 9, e * 3);
    if (!best) return 0;
    sc += best + (n && c ? 6 : 0) + (n && t ? 4 : 0);
  }
  if (p.terms.length > 1 && d.nameText.includes(p.phrase)) sc += 60;
  if (p.glued.length >= 6 && d.glued.has(p.glued)) sc += 30;
  if (p.terms.length === 1 && d.nameText.startsWith(` ${p.terms[0][0]}`)) sc += 8;
  return sc;
}

/** How many words matched at all — for the "any word" fallback. */
export function looseScore(d: SearchDoc, p: ParsedSearch): number {
  let n = 0, sc = 0;
  for (const alts of p.terms) {
    const s = scoreDoc(d, { ...p, terms: [alts] });
    if (s) { n++; sc += s; }
  }
  return n ? n * 1000 + sc : 0;
}

export function vocabulary(docs: Iterable<SearchDoc>): Set<string> {
  const v = new Set<string>();
  for (const d of docs) [d.name, d.cat, d.occ, d.tag, d.kw].forEach((s) => s.forEach((w) => { if (w.length >= 3) v.add(w); }));
  return v;
}

/** "weddinginvitation" → "Wedding Invitation" for headings. */
export function hashtagTitle(tag: string): string {
  const KNOWN = ['instagram', 'invitation', 'birthday', 'wedding', 'business', 'card', 'cards', 'flyer', 'poster', 'post', 'story', 'menu', 'resume', 'certificate', 'collage', 'photo', 'greeting', 'happy', 'merry', 'christmas', 'diwali', 'eid', 'mubarak', 'new', 'year', 'sale', 'party', 'social', 'media', 'restaurant', 'food', 'template', 'status', 'whatsapp', 'thumbnail', 'youtube', 'linkedin', 'facebook', 'banner', 'event', 'wishes', 'day', 'mothers', 'fathers', 'valentines', 'baby', 'shower', 'save', 'the', 'date', 'real', 'estate', 'letterhead', 'invoice', 'album', 'memories', 'festival', 'ramadan', 'kareem', 'onam', 'holi', 'national', 'kids', 'family', 'love', 'anniversary', 'graduation', 'medical', 'clinic', 'fitness', 'beauty', 'salon', 'coffee', 'cafe', 'bakery', 'fashion', 'sports', 'school', 'education', 'music', 'travel', 'deepavali', 'easter', 'halloween', 'photography', 'women', 'destination', 'reception', 'announcement', 'corporate', 'company', 'planner', 'frame', 'grid', 'party', 'invite', 'greetings', 'christmas', 'kids', 'quote', 'quotes', 'motivation', 'offer', 'opening', 'grand', 'launch', 'product', 'wear', 'jewellery', 'jewelry', 'gold', 'flowers', 'floral'];
  let s = tag.toLowerCase(), out: string[] = [];
  while (s.length) {
    const k = KNOWN.filter((w) => s.startsWith(w)).sort((a, b) => b.length - a.length)[0];
    if (k) { out.push(k); s = s.slice(k.length); continue; }
    let i = 1;
    while (i < s.length && !KNOWN.some((w) => w.length >= 3 && s.startsWith(w, i))) i++;
    const chunk = s.slice(0, i); s = s.slice(i);
    if (chunk.length <= 2 && out.length) out[out.length - 1] += chunk; // photos, weddings
    else out.push(chunk);
  }
  return out.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/** Related searches from hashtags: "photo" → Family Photo Collage, Wedding Photo, … */
export function relatedSearches(q: string, tagCounts: [string, number][], max = 10): { label: string; q: string; count: number }[] {
  const ws = norm(q.replace(/#/g, ' ')).trim().split(' ').filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => stem(SYN[w] && !SYN[w].includes(' ') ? SYN[w] : w));
  if (!ws.length) return [];
  const glued = ws.join('');
  const out: { label: string; q: string; count: number }[] = [];
  const seen = new Set<string>();
  for (const [h, n] of tagCounts) {
    if (h === glued || !ws.every((w) => h.includes(w)) || h.length > 26) continue;
    const label = hashtagTitle(h);
    if (label.split(' ').some((p) => p.length > 14)) continue; // unsplittable
    const key = label.toLowerCase();
    if (seen.has(key) || stem(key.replace(/\s/g, '')) === glued) continue;
    seen.add(key);
    out.push({ label, q: label.toLowerCase(), count: n });
    if (out.length >= max) break;
  }
  return out;
}
