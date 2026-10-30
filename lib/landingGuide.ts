// Long-form guide content for landing pages.
//
// Thin pages (a heading, two short paragraphs and a grid) rarely rank. Each
// landing page now carries a real guide for the thing it makes: design tips,
// the sizes people actually need, what to write, and a checklist before
// printing or posting. The text is specific to the kind of design, so pages
// don't repeat each other word for word.
//
// Pure data + helpers, safe on the server and in the admin (for the SEO score).

import type { Landing } from '@/lib/landings';

export interface GuideKind {
  id: string;
  /** what to write on it */
  write: string[];
  /** design tips: [short title, explanation] */
  tips: [string, string][];
  /** common sizes: [name, size, where it's used] */
  sizes: [string, string, string][];
  /** before you print / post */
  checklist: string[];
}

const PRINT_CHECK = [
  'Read every word aloud once — names, dates, phone numbers and prices are where typos hide.',
  'Keep text at least 3 mm inside the edge so nothing is cut off when it is trimmed.',
  'Download “PDF (print)” with bleed and crop marks for a print shop, or PNG for screens.',
  'Check photos look sharp at 100% zoom; blurry images look worse on paper.',
];
const SOCIAL_CHECK = [
  'Look at it at phone size — if you can’t read the headline at a glance, make it bigger.',
  'Keep important text away from the very top and bottom of stories, where app buttons sit.',
  'Download PNG for crisp text, JPG for photo-heavy posts.',
  'Write the caption and add the link before you post, so the design and caption work together.',
];

const K = (g: GuideKind) => g;

export const GUIDES: GuideKind[] = [
  K({
    id: 'flyer',
    write: ['A headline that says the offer or event in under eight words', 'The date, time and place — or the opening hours', 'One clear next step: call, scan, visit or book', 'Your logo and contact details at the bottom'],
    tips: [
      ['One message, not five', 'People decide in about three seconds whether a flyer is for them. Lead with the single most important thing — the discount, the event, the opening — and let everything else support it.'],
      ['Big, then medium, then small', 'Use three text sizes at most: a large headline, a medium sub-line and small details. When everything is the same size, nothing stands out.'],
      ['Leave breathing room', 'Empty space is not wasted space. Margins and gaps between blocks make a flyer look professional and easier to read from a distance.'],
      ['Add a QR code', 'A QR code that opens your menu, map or booking page turns a piece of paper into a visit. Keep it at least 2 cm wide so phones can scan it.'],
      ['Match the photo to the audience', 'A real photo of your shop, food or team usually works better than a generic stock image, because people recognise you when they arrive.'],
    ],
    sizes: [['A5', '148 × 210 mm', 'Hand-outs, counters, door drops'], ['A4', '210 × 297 mm', 'Notice boards and windows'], ['US Letter', '8.5 × 11 in', 'North America'], ['Instagram post', '1080 × 1350 px', 'Sharing the flyer online']],
    checklist: PRINT_CHECK,
  }),
  K({
    id: 'poster',
    write: ['A short, bold title readable from five metres away', 'Date, time and venue in one line', 'Ticket price or “free entry”', 'Website, QR code or booking number'],
    tips: [
      ['Design for distance', 'A poster is read from across a room or street. Test it by zooming out until it is the size of a stamp on your screen — if the title is still readable, it works.'],
      ['Use one strong image', 'One large photo or illustration beats a collage. It gives the eye a single place to land before it moves to the words.'],
      ['High contrast wins', 'Dark text on a light background, or light text on a dark one. Avoid putting text straight onto busy parts of a photo; add a soft shape behind it instead.'],
      ['Limit your fonts', 'Two fonts are plenty — one with character for the title and one simple font for details.'],
      ['Print at 300 DPI', 'Our print templates are built at full resolution, so A3 and A4 posters stay sharp. Choose PDF (print) when you download.'],
    ],
    sizes: [['A3', '297 × 420 mm', 'Shop windows and events'], ['A4', '210 × 297 mm', 'Notice boards, offices'], ['A2', '420 × 594 mm', 'Large wall posters'], ['Story', '1080 × 1920 px', 'Instagram and WhatsApp status']],
    checklist: PRINT_CHECK,
  }),
  K({
    id: 'invitation',
    write: ['Who is hosting and what the occasion is', 'The date, start time and full address', 'Dress code or theme, if there is one', 'How to RSVP and by when'],
    tips: [
      ['Set the mood first', 'Colours and fonts tell guests what kind of event it is before they read a word — soft pastels for a baby shower, gold and serif type for a formal dinner, bright colours for a kids’ party.'],
      ['Make the date impossible to miss', 'The date and time are what guests look for again later. Give them their own line, slightly larger than the details around them.'],
      ['Write the address in full', 'Include the building name, area and city. For WhatsApp invites, add a map link or a QR code to a location pin.'],
      ['Keep the RSVP simple', 'One phone number or one link. Asking people to reply “by 10 March” gets more answers than an open request.'],
      ['Send it digitally and print a few', 'Download a PNG to share on WhatsApp and Instagram, and a PDF to print cards for older relatives and VIP guests.'],
    ],
    sizes: [['5 × 7 in', '127 × 178 mm', 'Classic printed invitation'], ['A5', '148 × 210 mm', 'Printed cards'], ['Story', '1080 × 1920 px', 'WhatsApp and Instagram'], ['Square', '1080 × 1080 px', 'Group chats and posts']],
    checklist: ['Check the spelling of every name — twice.', 'Confirm the day of the week matches the date.', ...PRINT_CHECK.slice(2)],
  }),
  K({
    id: 'wedding',
    write: ['The couple’s names, and the hosts’ names if traditional', 'Ceremony and reception times and venues', 'Dress code', 'RSVP details and wedding website or QR code'],
    tips: [
      ['Follow your wedding colours', 'Use the same two or three colours as your flowers and décor, so the invitation feels like the first part of the day.'],
      ['Pair a script with a clean font', 'Script fonts look beautiful for names, but are hard to read in long lines. Use them only for the names and a simple serif or sans for details.'],
      ['Make a full set', 'Save-the-date, invitation, RSVP card, menu and thank-you cards look best when they share the same design. Duplicate your invitation and change the words.'],
      ['Bilingual is easy', 'Add an Arabic, Hindi or other language version on a second page — the editor supports right-to-left text and dozens of language fonts.'],
      ['Order a proof first', 'Print one copy at home or at the print shop before ordering hundreds, and check colours on real paper.'],
    ],
    sizes: [['5 × 7 in', '127 × 178 mm', 'Standard invitation'], ['A5', '148 × 210 mm', 'Printed invitation'], ['Square', '1080 × 1080 px', 'Digital invitations'], ['Story', '1080 × 1920 px', 'WhatsApp status']],
    checklist: ['Check names, dates and venue spellings with both families.', 'Print one proof copy before the full order.', ...PRINT_CHECK.slice(2)],
  }),
  K({
    id: 'birthday',
    write: ['Whose birthday it is and the age, if it’s a milestone', 'Date, time and place', 'Theme or dress code', 'RSVP name and number'],
    tips: [
      ['Pick a theme and commit', 'Superheroes, princesses, football, neon, garden party — a clear theme makes the invitation fun and helps guests plan costumes and gifts.'],
      ['Big age number', 'For kids and milestone birthdays, the age is the hero. Make the number large and colourful.'],
      ['Add a photo', 'A photo of the birthday person makes the invitation personal and makes guests smile. Drop it into any photo frame on the template.'],
      ['Mention the end time', 'Parents of young guests appreciate knowing when to pick up. Write “3–6 pm” rather than just “3 pm”.'],
      ['Reuse it as a thank-you', 'After the party, duplicate the design, swap in a party photo and send it as a thank-you message.'],
    ],
    sizes: [['5 × 7 in', '127 × 178 mm', 'Printed cards'], ['A6', '105 × 148 mm', 'Small party cards'], ['Story', '1080 × 1920 px', 'WhatsApp and Instagram'], ['Square', '1080 × 1080 px', 'Group chats']],
    checklist: ['Check the date, start and end time.', 'Add the full address or a map link.', ...SOCIAL_CHECK.slice(2)],
  }),
  K({
    id: 'resume',
    write: ['Your name, job title and contact details at the top', 'A 2–3 line summary of what you do best', 'Experience with achievements, newest first', 'Skills, education, languages and certificates'],
    tips: [
      ['Lead with results', 'Instead of listing duties, write what changed because of you: “cut delivery time by 20%” beats “responsible for logistics”.'],
      ['One page if you can', 'Recruiters scan a CV in seconds. Keep it to one page for under ten years’ experience and two pages at most otherwise.'],
      ['Readable for robots too', 'Many companies use software to read CVs. Use clear headings like “Experience” and “Education”, and download a PDF so the text stays selectable.'],
      ['Photo depends on the country', 'Photos are common in the UAE, Gulf, Europe and Asia, but usually left off in the US, UK and Canada. Our templates work either way.'],
      ['Tailor it every time', 'Duplicate your CV for each application and move the most relevant experience and skills to the top.'],
    ],
    sizes: [['A4', '210 × 297 mm', 'UAE, UK, Europe, Asia'], ['US Letter', '8.5 × 11 in', 'USA and Canada'], ['PDF', 'Selectable text', 'Email and job portals'], ['LinkedIn banner', '1584 × 396 px', 'Matching profile header']],
    checklist: ['Check your phone number and email work.', 'Spell-check company names and job titles.', 'Download as PDF and open it once to check it looks right.', 'Name the file “FirstName-LastName-CV.pdf”.'],
  }),
  K({
    id: 'business-card',
    write: ['Your name and job title', 'Phone, email and website', 'Company name and logo', 'Optional: a QR code to your profile, menu or WhatsApp'],
    tips: [
      ['Less is more', 'A business card has room for about 30 words. Pick the contact details people really use and leave the rest off.'],
      ['Use both sides', 'Put your logo or a bold colour on the front and your details on the back. It looks premium and leaves room to breathe.'],
      ['Mind the safe area', 'Keep text at least 3–4 mm from the edge. Print shops trim cards in stacks, so anything too close to the edge may be cut.'],
      ['Add a QR code', 'A QR code to your WhatsApp, LinkedIn or portfolio saves people typing. Generate it in the editor in one click.'],
      ['Print in CMYK', 'Download “PDF (print)” in CMYK with bleed — it’s what print shops ask for, and colours come out closer to what you see.'],
    ],
    sizes: [['Standard (UAE / EU)', '85 × 55 mm', 'Most of the world'], ['US', '3.5 × 2 in', 'USA and Canada'], ['Square', '65 × 65 mm', 'Creative businesses'], ['Digital card', '1080 × 1080 px', 'WhatsApp and email']],
    checklist: ['Call the phone number and email the address on the card once.', ...PRINT_CHECK.slice(1)],
  }),
  K({
    id: 'menu',
    write: ['Dish names in the language your guests read', 'Short, tasty descriptions', 'Prices — with or without currency symbols', 'Allergens, vegetarian and spicy markers'],
    tips: [
      ['Group dishes clearly', 'Starters, mains, desserts and drinks with clear headings let guests find what they want quickly and order faster.'],
      ['Drop the currency symbol', 'Writing “45” instead of “AED 45.00” is a common menu trick: it looks cleaner and keeps attention on the food.'],
      ['Highlight what you want to sell', 'Put your signature or most profitable dishes in a box or with a small photo — guests notice the top-right of a page first.'],
      ['Readable in dim light', 'Restaurants are often darker than your screen. Use at least 10 pt text and strong contrast.'],
      ['Make a QR version', 'Download a PNG or PDF for your website and print a table card with a QR code that opens it.'],
    ],
    sizes: [['A4', '210 × 297 mm', 'Full menus'], ['A5', '148 × 210 mm', 'Café and table menus'], ['DL', '99 × 210 mm', 'Drinks and dessert menus'], ['Story', '1080 × 1920 px', 'Daily specials online']],
    checklist: ['Check every price against your till system.', 'Mark allergens and spicy dishes.', ...PRINT_CHECK.slice(2)],
  }),
  K({
    id: 'certificate',
    write: ['The certificate title, e.g. “Certificate of Achievement”', 'The recipient’s full name', 'What it is for and the date', 'Signature lines with names and titles'],
    tips: [
      ['Make the name the hero', 'The recipient’s name should be the largest text after the title. A classic serif or elegant script works well.'],
      ['Add a seal or logo', 'A badge, seal or your organisation’s logo makes a certificate feel official.'],
      ['Leave room to sign', 'Even if you sign digitally, leave clear signature lines with printed names under them.'],
      ['Make many at once', 'Have a list of names? Duplicate the page for each person, or use our course certificates with verification codes for training.'],
      ['Landscape is standard', 'Most certificates are A4 or US Letter landscape so they fit standard frames.'],
    ],
    sizes: [['A4 landscape', '297 × 210 mm', 'Most countries'], ['US Letter landscape', '11 × 8.5 in', 'USA and Canada'], ['A5', '210 × 148 mm', 'Small awards'], ['Square post', '1080 × 1080 px', 'Sharing on LinkedIn']],
    checklist: ['Check the spelling of every recipient’s name.', 'Check the date and the organisation name.', ...PRINT_CHECK.slice(2)],
  }),
  K({
    id: 'social',
    write: ['A hook in the first line of the design', 'One idea per post — or one per slide in a carousel', 'Your handle or logo, small', 'A call to action in the caption: save, share, comment or visit'],
    tips: [
      ['Stop the scroll', 'You have about a second. Bold colour, a face, or a surprising headline makes people pause.'],
      ['Design for the 4:5 crop', 'Instagram shows 4:5 portrait posts largest in the feed. Use 1080 × 1350 px for more screen space than a square.'],
      ['Keep a consistent look', 'Use the same two fonts and colour palette every time so followers recognise your posts. Save them in a brand kit.'],
      ['Turn one post into a set', 'Resize a post into a story and a LinkedIn image in one click, so one idea works on every channel.'],
      ['Carousels get saved', 'Tips, steps and before/after carousels are saved and shared more than single images — and saves help reach.'],
    ],
    sizes: [['Instagram portrait', '1080 × 1350 px', 'Feed posts'], ['Square', '1080 × 1080 px', 'Instagram, Facebook'], ['Story / Reel cover', '1080 × 1920 px', 'Stories, WhatsApp status'], ['LinkedIn / Facebook', '1200 × 627 px', 'Link posts']],
    checklist: SOCIAL_CHECK,
  }),
  K({
    id: 'card',
    write: ['A short greeting on the front', 'A personal message inside or on the back', 'Your name — or your company name and logo', 'Optional: a photo'],
    tips: [
      ['Personal beats perfect', 'A family photo or a handwritten-style message makes a card memorable. Upload your own photo into any frame.'],
      ['Choose the right tone', 'Warm and playful for friends, calm and elegant for clients. The same occasion can need two different cards.'],
      ['Send digital, print a few', 'Download a PNG to send on WhatsApp in seconds, and print the PDF on thick card for people you’ll see in person.'],
      ['Make it a series', 'Companies can keep one design and change only the occasion — Eid, Diwali, Christmas, New Year — so greetings always look on-brand.'],
      ['Folded cards', 'For a folded card, design the front and the inside as two pages and print double-sided.'],
    ],
    sizes: [['5 × 7 in', '127 × 178 mm', 'Folded greeting cards'], ['A6', '105 × 148 mm', 'Postcards'], ['Square', '1080 × 1080 px', 'WhatsApp and Instagram'], ['Story', '1080 × 1920 px', 'Status updates']],
    checklist: ['Check names and spelling in the greeting.', ...SOCIAL_CHECK.slice(2)],
  }),
  K({
    id: 'brochure',
    write: ['Who you are and what you offer, in one line', 'Services or products with short benefits', 'Proof: clients, numbers, testimonials, photos', 'Contact details and a clear next step'],
    tips: [
      ['Plan the folds', 'In a tri-fold, the front panel sells, the inside three panels explain, and the back panel holds contact details. Plan each panel’s job before writing.'],
      ['Benefits over features', 'Write what customers get, not just what you do: “move in faster” rather than “project management services”.'],
      ['Use real photos', 'Photos of your team, work and premises build trust far better than stock images.'],
      ['Keep paragraphs short', 'Three to four lines per block, with clear headings, so readers can skim.'],
      ['Make a PDF version', 'Download a PDF to email and to put on your website — many clients will read it on screen.'],
    ],
    sizes: [['A4 tri-fold', '297 × 210 mm', 'Folds to DL'], ['A4 bi-fold', '297 × 210 mm', 'Folds to A5'], ['Company profile', 'A4 pages', 'Multi-page PDF'], ['Presentation', '1920 × 1080 px', 'Screen decks']],
    checklist: PRINT_CHECK,
  }),
  K({
    id: 'letterhead',
    write: ['Company name and logo at the top', 'Address, phone, email and website', 'Trade licence or registration number if required', 'Space for the letter itself'],
    tips: [
      ['Keep it quiet', 'A letterhead frames your letter — it shouldn’t compete with it. A slim header and footer is enough.'],
      ['Match your business card', 'Use the same logo, colours and fonts as your cards and email signature for a consistent brand.'],
      ['Leave writing space', 'Keep at least two-thirds of the page clear for the letter.'],
      ['Make a Word-friendly version', 'Download a high-quality PNG of the header and footer to place in your word processor.'],
      ['Print a test page', 'Print one copy and write a sample letter to check margins before ordering stationery.'],
    ],
    sizes: [['A4', '210 × 297 mm', 'UAE, UK, Europe, Asia'], ['US Letter', '8.5 × 11 in', 'USA and Canada'], ['DL envelope', '110 × 220 mm', 'Matching envelopes'], ['Compliment slip', '210 × 99 mm', 'Short notes']],
    checklist: PRINT_CHECK,
  }),
  K({
    id: 'hiring',
    write: ['“We’re hiring” and the job title, big', 'Location and job type (full-time, part-time, remote)', '3–4 key requirements or perks', 'How to apply: email, link or QR code'],
    tips: [
      ['Job title first', 'Candidates scan for the role. Make the job title the largest text after “We’re hiring”.'],
      ['Sell the job', 'Mention one or two perks — salary range, visa, training, flexible hours. They make a big difference to how many people apply.'],
      ['Easy to apply', 'A QR code or short link to the application form gets far more applicants than “send your CV”.'],
      ['Several roles?', 'Use a carousel: one slide per role, with the same design, so you can post them all at once.'],
      ['Post where your candidates are', 'LinkedIn for office roles, Instagram and WhatsApp groups for retail and hospitality, printed posters for local shops.'],
    ],
    sizes: [['Square', '1080 × 1080 px', 'LinkedIn and Instagram'], ['Portrait', '1080 × 1350 px', 'Instagram feed'], ['Story', '1080 × 1920 px', 'Stories and status'], ['A4', '210 × 297 mm', 'Printed notice']],
    checklist: SOCIAL_CHECK,
  }),
  K({
    id: 'real-estate',
    write: ['Property type and area, e.g. “2-bed apartment, Dubai Marina”', 'Price or “Price on request”', 'Key features: size, beds, baths, views, parking', 'Agent name, phone, licence / permit number and QR code'],
    tips: [
      ['Best photo first', 'One great exterior or view photo sells the click. Put smaller interior photos below it.'],
      ['Numbers people compare', 'Bedrooms, bathrooms and size in sq ft or m² should be easy to spot — use icons for quick scanning.'],
      ['Follow local rules', 'In Dubai and other markets, listings need the agent and permit numbers. Leave space for them on every design.'],
      ['Make a set', 'Use the same design for the flyer, Instagram post, story and open-house poster for one property.'],
      ['Link to the full listing', 'A QR code to the full listing or virtual tour turns printed flyers into enquiries.'],
    ],
    sizes: [['A4', '210 × 297 mm', 'Printed flyers'], ['Portrait', '1080 × 1350 px', 'Instagram listings'], ['Story', '1080 × 1920 px', 'Open-house stories'], ['Facebook', '1200 × 630 px', 'Facebook and portals']],
    checklist: ['Check price, size and permit number against the listing.', ...PRINT_CHECK.slice(2)],
  }),
  K({
    id: 'thumbnail',
    write: ['3–5 big words that make people curious', 'A face showing emotion, if you have one', 'One strong visual of the topic', 'Your channel’s consistent colours'],
    tips: [
      ['Readable at tiny size', 'Thumbnails are often seen smaller than a stamp. Use very few words, very large.'],
      ['Faces and emotion', 'Thumbnails with a clear face and expression usually get more clicks.'],
      ['High contrast', 'Bright subject, simple background, and an outline or shadow behind text.'],
      ['Don’t repeat the title', 'The thumbnail and title should work together — add something the title doesn’t say.'],
      ['Keep a series look', 'Use the same layout and colours for a series so viewers recognise your videos.'],
    ],
    sizes: [['YouTube thumbnail', '1280 × 720 px', '16:9, under 2 MB'], ['Shorts cover', '1080 × 1920 px', 'Vertical videos'], ['Channel banner', '2560 × 1440 px', 'Channel art'], ['Square', '1080 × 1080 px', 'Sharing on social']],
    checklist: ['Check it at small size on a phone.', 'Download PNG or JPG under 2 MB.', 'Avoid the bottom-right corner where the video length shows.'],
  }),
  K({
    id: 'festival',
    write: ['The greeting or festival name, large', 'Your name, family name or company logo', 'For businesses: the offer or opening hours during the holiday', 'Optional: a short wish or blessing'],
    tips: [
      ['Start early', 'Festive posts that go out a few days before the occasion get more reach than posts on the day itself, when everyone posts at once.'],
      ['Use traditional colours with care', 'Each festival has colours people recognise. Use them as accents and keep text readable on top.'],
      ['Make it yours', 'Add your logo, family name or a photo so your greeting stands out in a crowded feed or chat.'],
      ['One design, every format', 'Resize the same greeting for a post, a story, a WhatsApp status and a printed card in one click.'],
      ['Plan sale messages', 'For shops, prepare a teaser, a launch post and a “last day” reminder with the same design.'],
    ],
    sizes: [['Square', '1080 × 1080 px', 'Instagram, Facebook, WhatsApp'], ['Story', '1080 × 1920 px', 'Stories and status'], ['Portrait', '1080 × 1350 px', 'Instagram feed'], ['A5 card', '148 × 210 mm', 'Printed greetings']],
    checklist: ['Check the festival date and spelling of greetings.', ...SOCIAL_CHECK.slice(0, 1), ...SOCIAL_CHECK.slice(2)],
  }),
  K({
    id: 'generic',
    write: ['A clear headline', 'The key details people need', 'One call to action', 'Your logo and contact details'],
    tips: [
      ['Start from a template', 'A professional layout already has the spacing, hierarchy and font pairing worked out — you just change the words and photos.'],
      ['Two fonts, three colours', 'One font for headings, one for text, and a small colour palette keeps any design clean.'],
      ['Align everything', 'Line up text and images on the same edges. Alignment is the quickest way to make a design look professional.'],
      ['Use your brand kit', 'Save your logo, colours and fonts once and apply them to any template in one click.'],
      ['Export for where it goes', 'PDF with bleed for printing, PNG for sharp text on screens, JPG for photos.'],
    ],
    sizes: [['A4', '210 × 297 mm', 'Print'], ['Instagram portrait', '1080 × 1350 px', 'Social'], ['Story', '1080 × 1920 px', 'Stories and status'], ['Presentation', '1920 × 1080 px', 'Screens']],
    checklist: PRINT_CHECK,
  }),
];

const RULES: [RegExp, string][] = [
  [/wedding|nikah|save-the-date|engagement/, 'wedding'],
  [/birthday/, 'birthday'],
  [/invitation|invite|baby-shower/, 'invitation'],
  [/resume|cv/, 'resume'],
  [/business-card/, 'business-card'],
  [/menu/, 'menu'],
  [/certificate/, 'certificate'],
  [/real-estate/, 'real-estate'],
  [/hiring/, 'hiring'],
  [/letterhead/, 'letterhead'],
  [/brochure|brand-guidelines/, 'brochure'],
  [/youtube|thumbnail/, 'thumbnail'],
  [/greeting-card|thank-you|anniversary|card-maker/, 'card'],
  [/instagram|linkedin|story|quote|social/, 'social'],
  [/flyer|salon|gym/, 'flyer'],
  [/poster|banner|sale/, 'poster'],
];

/** Which guide fits a landing page. Tool pages (QR, resizer…) get none. */
export function guideFor(l: Pick<Landing, 'slug' | 'seasonal' | 'ctaHref'>): GuideKind | null {
  if (l.ctaHref) return null;
  if (l.seasonal) return GUIDES.find((g) => g.id === 'festival')!;
  const hit = RULES.find(([re]) => re.test(l.slug));
  return GUIDES.find((g) => g.id === (hit ? hit[1] : 'generic'))!;
}

/** Visible words the guide adds to a page (for the SEO score). */
export function guideWords(g: GuideKind | null): number {
  if (!g) return 0;
  const text = [...g.write, ...g.tips.flat(), ...g.sizes.flat(), ...g.checklist].join(' ');
  return text.split(/\s+/).filter(Boolean).length + 30; // + headings
}

/** Visible words on a landing page from its own copy. */
export function landingWords(l: Pick<Landing, 'h1' | 'intro' | 'uses' | 'faqs'> & { features?: [string, string][] }): number {
  const text = [l.h1, ...l.intro, ...l.uses, ...l.faqs.flat(), ...(l.features || []).flat()].join(' ');
  return text.split(/\s+/).filter(Boolean).length + 60; // + fixed "how to" steps
}
