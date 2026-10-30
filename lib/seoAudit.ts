// SEO score for one landing page — used by Admin → SEO → Overview.
//
// Plain rules a person can act on, not a black box. Every issue says what is
// wrong and exactly how to fix it. A page is:
//   · working      — live, scores 80+, and real visitors arrive on it
//   · needs work   — live, but the score is low or nobody arrives yet
//   · not working  — switched off / draft, or shows no templates, or scores under 50

export type Level = 'bad' | 'warn';
export interface Issue { level: Level; text: string; fix: string }
export type PageStatus = 'working' | 'needs-work' | 'not-working';

export interface AuditInput {
  slug: string;
  title: string;
  description: string;
  h1: string;
  words: number;
  faqs: number;
  /** null for tool pages that show no template grid */
  templates: number | null;
  live: boolean;
  views30: number;
  /** visitors whose first page was this one, coming from a search engine */
  fromSearch30: number;
  related: number;
}

export interface AuditResult { score: number; status: PageStatus; issues: Issue[] }

export const TITLE_MIN = 30, TITLE_MAX = 60, DESC_MIN = 120, DESC_MAX = 160, WORDS_GOOD = 450, WORDS_MIN = 250;

export function auditLanding(p: AuditInput): AuditResult {
  const issues: Issue[] = [];
  let score = 100;
  const hit = (n: number, level: Level, text: string, fix: string) => { score -= n; issues.push({ level, text, fix }); };

  if (!p.live) hit(0, 'bad', 'Not live — the page is switched off or still a draft.', 'Publish it or switch it on in Landing pages. Off pages are left out of the sitemap, so Google never sees them.');

  const tl = p.title.length;
  if (!tl) hit(25, 'bad', 'No Google title.', 'Write a title of 30–60 characters that starts with the search phrase, e.g. “Free Flyer Maker — …”.');
  else if (tl > TITLE_MAX) hit(8, 'warn', `Google title is ${tl} characters — Google cuts it after about 60.`, 'Shorten it so the search phrase and the word “Free” are in the first 60 characters.');
  else if (tl < TITLE_MIN) hit(6, 'warn', `Google title is short (${tl} characters).`, 'Add what people get, e.g. “— Edit Online & Download PDF”.');

  const kw = p.h1.toLowerCase().replace(/^free\s+/, '').split(/\s+/).slice(0, 2).join(' ');
  if (tl && kw && !p.title.toLowerCase().includes(kw)) hit(6, 'warn', `The title doesn’t contain the page’s main phrase (“${kw}”).`, 'Put the exact phrase people search for at the start of the Google title.');

  const dl = p.description.length;
  if (!dl) hit(20, 'bad', 'No Google description.', 'Write 120–160 characters that say what people can make, that it’s free, and how they download it.');
  else if (dl > DESC_MAX) hit(4, 'warn', `Description is ${dl} characters — Google shows about 160.`, 'Trim it so the key promise fits in the first 160 characters.');
  else if (dl < DESC_MIN) hit(6, 'warn', `Description is short (${dl} characters).`, 'Add the benefit and the formats, e.g. “…download a print-ready PDF, PNG or JPG — no watermark.”');

  if (p.words < WORDS_MIN) hit(25, 'bad', `Thin page — about ${p.words} words.`, 'Pages under 250 words rarely rank. Add intro paragraphs, popular uses and 3–5 questions; built-in guides add tips, sizes and a checklist automatically.');
  else if (p.words < WORDS_GOOD) hit(10, 'warn', `About ${p.words} words — pages that rank usually have 450+ (plus the template grid).`, 'Add a paragraph on who it’s for, and 2–3 more questions and answers.');

  if (p.templates !== null) {
    if (p.templates === 0) hit(30, 'bad', 'Shows no templates — visitors land on an empty page.', 'Add “template words” that match real template names or keywords, or publish templates for this topic.');
    else if (p.templates < 8) hit(10, 'warn', `Only ${p.templates} matching templates.`, 'Add more template words (synonyms) or publish a few more templates on this topic.');
  }

  if (p.faqs < 3) hit(5, 'warn', `${p.faqs} question${p.faqs === 1 ? '' : 's'} — 3+ can show as a dropdown on Google.`, 'Add questions people really ask (“Is it free?”, “What size…?”, “Can I print it?”).');
  if (p.related < 2) hit(4, 'warn', 'Few links to related pages.', 'Link 3–4 related pages so Google finds and connects them.');

  if (p.live && p.views30 === 0) issues.push({ level: 'warn', text: 'No visitors in the last 30 days.', fix: 'Check it is on Google (tap “Google”), press “Send to search engines”, and share the link on social media and in the free listings.' });
  else if (p.live && p.fromSearch30 === 0 && p.views30 > 0) issues.push({ level: 'warn', text: 'Visitors arrive, but none from Google or Bing yet.', fix: 'It takes 2–8 weeks after Google first sees a page. Make sure Search Console is verified and the sitemap is submitted.' });

  score = Math.max(0, Math.min(100, Math.round(score)));
  const broken = !p.live || p.templates === 0 || score < 50;
  const status: PageStatus = broken ? 'not-working' : score >= 80 && p.views30 > 0 ? 'working' : 'needs-work';
  return { score, status, issues };
}

/** Did a visit come from a search engine? (referrer host, already www-less) */
export const isSearchReferrer = (host: string | null | undefined) => !!host && /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org|baidu\.com|search\.brave\.com)$/.test(host);
