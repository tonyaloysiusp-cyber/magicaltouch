import Link from 'next/link';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, SeoTemplate, relatedHashtags } from '@/lib/seo';

// Shared layout for category and sub-category landing pages: heading,
// intro, sub-category links, the templates, popular hashtags and FAQs.

/** "Wedding" + "Invitation" → "Wedding Invitation"; "Business" + "Flyer" → "Flyer". */
export function subFull(parent: { name: string; slug: string }, name: string) {
  return ['social-media', 'marketing', 'business', 'events', 'print'].includes(parent.slug) || name.toLowerCase().includes(parent.name.toLowerCase()) ? name : `${parent.name} ${name}`;
}

const INTRO: Record<string, string> = {
  festivals: 'Diwali, Eid, Christmas, Onam, New Year and every festival in between — greeting posts, stories and cards you can personalise with your name, logo and photos.',
  'social-media': 'Scroll-stopping Instagram posts, stories, Facebook posts, LinkedIn banners and YouTube thumbnails, sized correctly for every platform.',
  marketing: 'Posters, flyers, sale offers, magazine covers and adverts that make your business look professional — print-ready or ready to post.',
  business: 'Business cards, letterheads, invoices, flyers, brochures and presentations with a consistent, professional look for your brand.',
  birthday: 'Birthday invitations, wishes, party posters and photo collages for kids, milestone birthdays and surprise parties.',
  'photo-collage': 'Photo collages and albums with ready-made frames — drop in your photos and add a title for family, travel and celebration memories.',
  wedding: 'Wedding invitations, save the dates, RSVP cards, menus and welcome signs in elegant, matching styles.',
  events: 'Event posters, party invitations, conference branding, stage backdrops and tickets for events of every size.',
  cards: 'Greeting cards for every occasion — thank you cards, wishes, congratulations and festive cards to print or share.',
  'love-and-family': 'Anniversary wishes, love notes, family posters and baby announcements for the people who matter most.',
  certificates: 'Certificates of achievement, appreciation, completion and participation — print-ready with your logo and signatures.',
  resume: 'Clean, modern resumes and CVs that recruiters can read in seconds — edit online and download as PDF.',
  menus: 'Restaurant, café and bar menus, price lists and food promotions that are easy to update and print.',
};

export function CategoryLanding(props: {
  name: string;
  parent?: { name: string; slug: string };
  slug: string;
  count: number;
  rows: SeoTemplate[];
  links: { href: string; label: string; count: number; active?: boolean }[];
  subLinks?: { href: string; label: string; count: number }[];
}) {
  const { name, parent, count, rows, links, subLinks } = props;
  const full = parent ? subFull(parent, name) : name;
  const low = full.toLowerCase();
  const path = parent ? `/templates/category/${parent.slug}/${props.slug}` : `/templates/category/${props.slug}`;
  const url = `${SITE_URL}${path}`;
  const intro = INTRO[parent ? parent.slug : props.slug];
  const tags = relatedHashtags(rows, ['magicaltouchdesign', 'magicaltouch', 'freetemplates'], 30);
  const faqs: [string, string][] = [
    [`Are the ${low} templates free?`, `Yes — all ${count} ${low} templates are free to customise and download. A free account lets you save your designs and come back to them.`],
    [`How do I edit a ${low} template?`, `Open any template, click the text to type your own, replace the photos with yours and change colours or fonts. No design skills or software needed.`],
    [`Can I print my design?`, `Yes. Download a print-ready PDF for printing at home or at a print shop, or a PNG / JPG to share online.`],
  ];
  const crumbs = [{ href: '/', label: 'Home' }, { href: '/templates', label: 'Templates' }, ...(parent ? [{ href: `/templates/category/${parent.slug}`, label: parent.name }] : []), { label: name }];
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Free ${full} templates`, url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      mainEntity: { '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 50).map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/templates/${t.slug}`, name: t.name })) },
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: c.href ? `${SITE_URL}${c.href === '/' ? '' : c.href}` : url })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return (
    <SeoShell active="templates">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={crumbs} />
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Free {full} templates</h1>
        <p className="mt-3 max-w-2xl text-mt-muted">
          {count} editable {low} designs. {intro || 'Pick one, change the words, colours and photos online, and download it ready to print or share.'}
        </p>
        {subLinks && subLinks.length > 0 && (
          <nav aria-label={`${name} types`} className="mt-5 flex flex-wrap gap-2">
            {subLinks.map((s) => (
              <Link key={s.href} href={s.href} className="px-3.5 py-1.5 rounded-full bg-mt-surface2 text-[13px] font-medium hover:bg-mt-border">{s.label} <span className="opacity-60">({s.count})</span></Link>
            ))}
          </nav>
        )}
        <nav aria-label="Categories" className="mt-5 flex flex-wrap gap-2">
          {links.map((c) => (
            <Link key={c.href} href={c.href} className={`px-3.5 py-1.5 rounded-full border text-[13px] ${c.active ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
              {c.label} <span className="opacity-60">({c.count})</span>
            </Link>
          ))}
        </nav>
        <h2 className="mt-8 text-xl font-semibold">{full} templates</h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/templates/${r.slug}`} className="block group">
                <div className="aspect-[4/5] rounded-2xl border border-mt-border bg-mt-surface2 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail || r.preview || ''} alt={`${r.name} – ${low} template`} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform" />
                </div>
                <p className="mt-2 text-[13px] font-medium line-clamp-2">{r.name}</p>
              </Link>
            </li>
          ))}
        </ul>
        {tags.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Popular {low} hashtags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.tag} href={`/templates/tag/${t.tag}`} className="px-3 py-1.5 rounded-full border border-mt-border text-[13px] text-mt-muted hover:text-mt-ink">#{t.tag}</Link>
              ))}
            </div>
          </section>
        )}
        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map(([q, a]) => (
              <div key={q}><dt className="font-medium">{q}</dt><dd className="mt-1 text-mt-muted">{a}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </SeoShell>
  );
}
