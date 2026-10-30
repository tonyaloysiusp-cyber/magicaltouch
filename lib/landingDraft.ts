// Turns a search phrase ("church flyer template") into a ready-to-edit
// landing page draft: address, Google title (≤ 60), description (≤ 160),
// intro, template words and questions. No AI service needed — it's built
// from the phrase and our own facts, so it never invents claims. Admins
// review and publish it in SEO → Landing pages.

const STOP = new Set(['free', 'online', 'the', 'and', 'for', 'a', 'an', 'of', 'to', 'in', 'with', 'my', 'how', 'make', 'create', 'design', 'designs', 'maker', 'makers', 'generator', 'template', 'templates', 'ideas', 'idea', 'best', 'easy', 'app', 'editable', 'printable', 'download', 'sample', 'samples', 'example', 'examples', 'pdf', 'png', 'word', 'canva']);

/** The words that describe the thing itself: "free church flyer maker" → ["church", "flyer"]. */
export function coreWords(phrase: string): string[] {
  return phrase.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}

const cap = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(And|For|Of|To|In|With|A|An|The)\b/g, (m) => m.toLowerCase());
const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const fit = (s: string, n: number) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/(\s+(&|and|or|with|for|to|—))+$/i, '').replace(/[—,:;&\s-]+$/, ''));

export interface LandingDraft { slug: string; title: string; h1: string; description: string; intro: string; thing: string; terms: string; faqs: string }

export function draftLanding(phrase: string, templateCount = 0): LandingDraft {
  const words = coreWords(phrase);
  const thing = words.join(' ') || phrase.toLowerCase();
  const isTemplates = /template|ideas|design/.test(phrase.toLowerCase()) && !/maker|generator/.test(phrase.toLowerCase());
  const h1 = isTemplates ? `Free ${thing} templates` : `Free ${thing} maker`;
  const T = cap(thing);
  // Longest suffix that still fits Google's ~60 characters.
  const base = isTemplates ? `Free ${T} Templates` : `Free ${T} Maker`;
  const title = fit([`${base} — Edit Online & Download`, `${base} — Edit Online`, `${base} Online`, base].find((t) => t.length <= 60) || base, 60);
  const n = templateCount >= 10 ? `${templateCount >= 60 ? '60+' : templateCount} ` : '';
  const description = fit(`Make a ${thing} online for free. Pick one of our ${n}${thing} templates, change the words, colours and photos, and download a print-ready PDF, PNG or JPG — no watermark.`, 160);
  const intro = [
    `Looking for a ${thing} that looks professionally designed? Start from one of our ${n}free ${thing} templates. Each one is laid out by a designer, so the spacing, fonts and colours already work together — you only change what matters to you.`,
    `Everything happens in your browser on a computer, tablet or phone. Click any text to edit it, upload your own photos and logo, and try different colours in one click. Nothing to install and no design experience needed.`,
    `When it’s ready, download a print-ready PDF with bleed for a print shop, or a PNG / JPG to share on WhatsApp, Instagram, Facebook and LinkedIn. Every template and every download is free, with no watermark.`,
  ].join('\n\n');
  const faqs = [
    [`Is the ${thing} ${isTemplates ? 'template' : 'maker'} really free?`, 'Yes. Every template, the editor and all download formats are free, with no watermark. A free account lets you save your designs and come back later.'],
    [`Can I print my ${thing}?`, 'Yes. Download “PDF (print)” — it includes 3 mm bleed and crop marks and can be exported in CMYK, which is what print shops ask for.'],
    [`Can I add my own photos and logo?`, 'Yes. Upload them from your computer or phone and drop them into any photo frame, or place them anywhere on the design.'],
    [`Can I change the size?`, 'Yes. Use Resize to switch between A4, A5, US Letter, Instagram post, story and custom sizes in one click.'],
  ].map(([q, a]) => `${q} | ${a}`).join('\n');
  return { slug: slugify(isTemplates ? `${thing} templates` : `free ${thing} maker`), title, h1, description, intro, thing, terms: words.length > 1 ? [words.join(' '), words[words.length - 1]].join(', ') : words.join(', '), faqs };
}
