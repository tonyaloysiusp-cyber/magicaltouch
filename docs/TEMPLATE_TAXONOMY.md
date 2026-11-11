# Template taxonomy

24 main categories, each with sub-categories. Stored today as `templates.category` + `category_id` (sub-category in `template_categories`). Styles, compositions and occasions are tags until migration 0049+ adds columns.

| # | Category | Sub-categories |
|---|---|---|
| 1 | Business & Corporate | Company profiles, corporate flyers, annual reports, proposals, presentations, business cards, letterheads, brochures, certificates, invoices |
| 2 | Marketing & Advertising | Sale posters, product launches, print ads, promo flyers, coupons, digital ads, email headers, roll-up banners |
| 3 | Social Media | Instagram posts, stories, carousels, Facebook promotions, LinkedIn graphics, YouTube thumbnails, Pinterest pins, TikTok covers, social ads, content series |
| 4 | Branding & Identity | Brand boards, style guides, stationery sets, social kits, mood boards |
| 5 | Logo Design | Wordmarks, monograms, emblems, badges, icon marks |
| 6 | Wedding | Invitations, save the dates, RSVP, programmes, menus, signage, thank-you cards, announcements |
| 7 | Birthday & Celebrations | Invitations, wishes, milestone birthdays, kids parties, photo collages, banners |
| 8 | Festivals & Culture | Diwali, Eid, Ramadan, Christmas, New Year, Lunar New Year, Holi, Onam, national days, Hanukkah |
| 9 | Food & Restaurant | Menus, café posters, delivery promos, table cards, recipe cards, food social posts |
| 10 | Beauty & Fashion | Salon price lists, fashion lookbooks, product campaigns, appointment cards |
| 11 | Healthcare | Clinic flyers, health awareness posters, appointment cards, pharmacy promos |
| 12 | Education | Course flyers, certificates, timetables, school newsletters, worksheets |
| 13 | Real Estate | Just listed, open house, property brochures, agent cards, sold posts |
| 14 | Construction | Company profiles, project boards, safety signage, quotes |
| 15 | Travel & Tourism | Tour flyers, itineraries, hotel promos, travel posts |
| 16 | Events & Entertainment | Conference kits, stage backdrops, name badges, tickets, gala invitations |
| 17 | Photography | Portfolio pages, price lists, photo collages, albums |
| 18 | Editorial & Publishing | Magazine covers, multi-page magazines, newsletters, book covers |
| 19 | Stationery & Print | Notepads, envelopes, compliments slips, stickers, folders |
| 20 | Packaging & Labels | Product labels, jar labels, box wraps, hang tags |
| 21 | Presentation & Pitch Decks | Pitch decks, reports, portfolios, training decks |
| 22 | Digital & Web | Web banners, app screens, email graphics, blog headers |
| 23 | Illustration & Art | Character, editorial, flat, geometric, isometric, botanical, line art, abstract, vector scenes |
| 24 | Patterns & Textures | Seamless geometric, organic, floral, abstract, retro, luxury, textile, Islamic geometric, minimal, borders, surface textures |

## Cross-cutting facets
- **Style:** Minimal (Swiss, editorial, architectural, Scandinavian, Japanese-inspired, modern grid) · Luxury (quiet luxury, black & gold, champagne, high-fashion editorial, premium cosmetics, luxury typography) · Retro (70s, 80s neon, 90s graphic, vintage newspaper, retro futurism, analog film) · Contemporary (modern editorial, brutalist, neo-brutalist, experimental type, geometric modernism, abstract) · Artistic (collage, cut-paper, hand-drawn, botanical, digital painting, pop art, geometric illustration) · Additional (futuristic, cyberpunk, Y2K, Memphis, organic, industrial, Bauhaus-inspired, maximalist, playful, cinematic, typography-led). Multiple styles per template.
- **Composition:** centred, split, grid, full-bleed photo, arch frame, editorial columns, collage, typographic, framed border, diagonal.
- **Colour:** color1/color2 (+ palette), mood (warm, cool, pastel, earthy, neon, luxury, neutral) computed by `lib/colour.ts`.
- **Format:** print (with bleed) vs digital; orientation; size presets.
- **Occasion / industry / region:** existing `occasion`, `industry` columns and `region-*` tags.

## Library targets (planning, not inventory)
Phase 1: 100 excellent templates → Phase 2: 500 reviewed → Phase 3: 2,000 → Phase 4: 5,000 then 10,000+. Live published count is shown from the database, never hard-coded.
