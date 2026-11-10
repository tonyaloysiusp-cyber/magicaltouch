// Landing page ideas for Admin → SEO → Landing pages: pages worth adding,
// each with ready text, so the admin only taps Approve. Three sources:
//   festival  a festival in the next 75 days with no page yet (seasonal —
//             it switches itself off after the festival, on again next year)
//   searches  what visitors searched on the site (30 days), with templates
//   coverage  design type × topic combinations with many templates
//             ("Business flyer templates", "Wedding album templates")
// Pages approved here are judged like any page: no visitors after a month
// → deleted automatically (festival pages are switched off, not deleted).

import { DESIGN_TYPES, TYPE_BY_ID, parseQuery, typesOf, topicText, hasWord, hasPhoto, TypeSource } from '@/lib/designTypes';
import { festivalDates } from '@/lib/landingSeasons';

export interface Idea {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  thing: string;
  terms: string[];
  faqs: [string, string][];
  source: 'festival' | 'searches' | 'coverage';
  why: string;
  templates: number;
  score: number;
  festivalDate?: string;
  link: string; // the gallery with this filter, used instead of a page
}

const slugify = (s: string) => s.replace(/https?:\/\/\S+|www\.\S+/gi, ' ').toLowerCase().replace(/&/g, 'and').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const cap = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/'S\b/g, "'s");
const FILL = new Set(['free', 'template', 'templates', 'maker', 'online', 'design', 'designs', 'editable', 'make', 'create', 'for', 'the', 'a', 'and', 'of']);
/** "Free Wedding Album Templates" and "wedding-album-templates" → "album wedding". */
export const pageKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !FILL.has(w)).map((w) => w.replace(/s$/, '')).sort().join(' ');

export interface Pre { types: string[]; topic: string; photo: boolean }
/** Worked out once per template (type, topic words, photo). */
export const prepare = (list: TypeSource[]): Pre[] => list.map((t) => ({ types: typesOf(t), topic: topicText(t), photo: hasPhoto(t) }));

/** Counts templates the gallery would show for a search. */
export function countFor(q: string, list: Pre[]): number {
  const pq = parseQuery(q);
  let n = 0;
  for (const x of list) {
    if (pq.types.length && !pq.types.some((id) => x.types.includes(id))) continue;
    if (pq.photo && !x.photo) continue;
    if (!pq.topics.every((alts) => alts.some((w) => hasWord(x.topic, w)))) continue;
    n++;
  }
  return n;
}

/** The template gallery filtered to a search ("business flyer" →
 *  /templates?kind=flyer&q=business) — used instead of a separate page. */
export function galleryLink(q: string): string {
  const pq = parseQuery(q.replace(/\+/g, ' '));
  const p = new URLSearchParams();
  if (pq.types[0]) p.set('kind', pq.types[0]);
  const topic = pq.topics.map((g) => g[0]).join(' ');
  if (topic) p.set('q', topic);
  if (pq.photo && !pq.types.length) p.set('photo', '1');
  const qs = p.toString();
  return qs ? `/templates?${qs}` : '/templates';
}

/** Ready-to-publish text for a page about `topic` + `thing` ("wedding" + "photo album"). */
export function draft(topic: string, thingOne: string, count: number, extra?: { festivalDate?: string }): Omit<Idea, 'source' | 'why' | 'templates' | 'score' | 'link'> {
  const t = topic.trim();
  const phrase = `${t ? `${t} ` : ''}${thingOne}`.trim();
  const Phrase = cap(phrase);
  const plural = /s$/.test(thingOne) ? Phrase : `${Phrase}${/y$/.test(Phrase) ? '' : 's'}`.replace(/ys$/, 'ies');
  const slug = slugify(`${phrase} templates`);
  const n = count >= 20 ? `${Math.floor(count / 10) * 10}+` : `${count}`;
  const when = extra?.festivalDate ? ` ${t} is on ${new Date(`${extra.festivalDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — get yours ready early.` : '';
  const title = `Free ${Phrase} Templates — Edit Online`.slice(0, 60);
  const description = `${n} free ${phrase} templates. Change the words, colours and photos online, then download a print-ready PDF or a picture to share. No watermark.`.slice(0, 160);
  const intro = [
    `Find the right ${phrase} in minutes. Every design here is free and fully editable: swap the text, colours, fonts and photos in your browser — no software to install.${when}`,
    `When you're done, download a print-ready PDF for printing or a high-quality PNG/JPG for WhatsApp, Instagram and email. Save your design to your account and come back to change it any time.`,
  ].join('\n\n');
  const ty = TYPE_BY_ID.get(DESIGN_TYPES.find((d) => d.one === thingOne)?.id || '');
  const print = ty && ['flyer', 'poster', 'invitation', 'greeting-card', 'photo-album', 'magazine', 'brochure', 'business-card', 'letterhead', 'certificate', 'menu', 'resume'].includes(ty.id);
  const faqs: [string, string][] = [
    [`Are these ${phrase} templates free?`, `Yes. Every ${phrase} template is free to edit and download, with no watermark.`],
    [`Can I add my own photos and text?`, `Yes. Click any text to type your own words, and tap a photo to replace it with yours.`],
    print
      ? [`Can I print my ${thingOne}?`, `Yes. Download a print-ready PDF (with bleed for professional printers) or print it at home.`]
      : [`What size is a ${thingOne}?`, `Each template is already the right size for where it's used. You can also resize it in the editor.`],
  ];
  // Words that must ALL appear ("wedding+album"): topic words + the type's core word.
  const SOFT = new Set([...FILL, 'day', 'photo', 'media', 'social', 'greeting', 'youtube', 'eve']);
  const words = (x: string) => x.toLowerCase().replace(/['’]s\b/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !SOFT.has(w));
  const terms = [[...words(t), ...words(thingOne === 'design' ? '' : thingOne)].join('+')].filter(Boolean);
  return { slug, h1: `${plural} — free & editable`, title, description, intro, thing: thingOne, terms, faqs, festivalDate: extra?.festivalDate };
}

// Topics checked for "coverage" ideas (with the type they are usually for).
const TOPICS = ['birthday', 'wedding', 'business', 'restaurant', 'real estate', 'fitness', 'beauty', 'salon', 'school', 'church', 'baby shower', 'graduation', 'anniversary', 'travel', 'party', 'sale', 'christmas', 'diwali', 'eid', 'ramadan', 'new year', 'valentine', "mother's day", 'halloween', 'family', 'kids', 'cafe', 'hiring', 'event', 'conference'];
const COVER_TYPES = ['flyer', 'poster', 'invitation', 'social-post', 'story', 'greeting-card', 'photo-album', 'menu', 'certificate', 'brochure', 'banner', 'magazine', 'photo-collage'];

export function buildIdeas(opts: {
  templates: TypeSource[];
  existing: { slug: string; h1: string }[];
  dismissed: Set<string>;
  searches: { q: string; count: number; results: number }[];
  occasions: { name: string; date: string }[];
  today?: Date;
}): Idea[] {
  const today = opts.today || new Date();
  const pre = prepare(opts.templates);
  const have = new Set(opts.existing.flatMap((p) => [pageKey(p.slug), pageKey(p.h1)]));
  const taken = (slug: string, h1: string) => have.has(pageKey(slug)) || have.has(pageKey(h1)) || opts.dismissed.has(slug);
  const out: Idea[] = [];
  const add = (i: Idea) => { if (!taken(i.slug, i.h1) && !out.some((o) => o.slug === i.slug || pageKey(o.slug) === pageKey(i.slug))) out.push(i); };

  // 1. Festivals coming up (75 days) without a page.
  const soon = opts.occasions.filter((o) => { const d = (new Date(`${o.date}T00:00:00Z`).getTime() - today.getTime()) / 86400000; return d >= 0 && d <= 75; });
  for (const o of soon) {
    const name = o.name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\/.*$/, '').trim();
    const pagesForIt = opts.existing.filter((p) => festivalDates(p.slug, p.h1, [o]).length > 0);
    if (pagesForIt.length) continue;
    const count = countFor(name, pre);
    if (count < 8) continue;
    const d = draft(name, 'design', count, { festivalDate: o.date });
    const days = Math.round((new Date(`${o.date}T00:00:00Z`).getTime() - today.getTime()) / 86400000);
    add({ ...d, link: galleryLink(name), slug: slugify(`${name} templates`), h1: `${cap(name)} templates — free & editable`, title: `Free ${cap(name)} Templates — Posts, Cards & Posters`.slice(0, 60), terms: d.terms, source: 'festival', why: `${cap(name)} is in ${days} days · ${count} templates · seasonal: switches off a week after`, templates: count, score: 1000 - days + count });
  }

  // 2. What visitors searched (30 days).
  for (const s of opts.searches) {
    if (/https?:|www\.|\.com\b|\//i.test(s.q)) continue; // a pasted link, not a topic
    if (s.count < 2) continue;
    const pq = parseQuery(s.q);
    const ty = pq.types[0] ? TYPE_BY_ID.get(pq.types[0]) : null;
    const topic = pq.topics.map((g) => g[0]).join(' ');
    if (!ty && !topic) continue;
    const count = countFor(s.q, pre);
    if (count < 6) continue;
    const d = draft(topic, ty ? ty.one : 'design', count);
    add({ ...d, link: galleryLink(s.q), source: 'searches', why: `Searched ${s.count} times on the site this month · ${count} templates`, templates: count, score: 500 + s.count * 20 + count });
  }

  // 3. Popular combinations with plenty of templates.
  for (const tid of COVER_TYPES) {
    const ty = TYPE_BY_ID.get(tid)!;
    for (const topic of TOPICS) {
      const count = countFor(`${topic} ${ty.one}`, pre);
      if (count < 20) continue;
      const d = draft(topic, ty.one, count);
      add({ ...d, link: galleryLink(`${topic} ${ty.one}`), source: 'coverage', why: `${count} matching templates · a common Google search`, templates: count, score: count });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
