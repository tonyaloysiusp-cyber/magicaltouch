# Creative Universe — competitor research

_Last updated: 11 Nov 2026. These sites are research references only. Nothing was copied: no templates, artwork, names, descriptions, thumbnails or code._

## What each platform does well

| Platform | Strengths | Pain points users report | Gap we can take |
|---|---|---|---|
| Canva | Huge library, instant search, one-click resize, brand kit | Templates look alike (“Canva look”); heavy pages; Pro paywall on many elements | Original art directions, print-production rigour, free vector tools |
| VistaCreate | Simple editor, animated templates, format-first browsing | Thin category depth, generic stock-photo layouts | Industry collections with real copy, print specs |
| Envato Elements | Professional designers, file-type filters (AI, PSD, INDD, Word), application filters | Must download files and edit in desktop apps; subscription for everything | Professional quality *and* browser editing, no download step |
| Dribbble / Behance | Taste-making, editorial presentation, strong art direction | Inspiration only — nothing is editable | Editorial-style gallery with “edit this design” on every piece |
| Vecteezy | Vector assets, licence clarity per item | Asset-level, not layout-level; attribution requirements | Original vector motifs and a Pattern Studio built in |
| PosterMyWall | Filters for type, style, motion, colour and orientation; size presets; print ordering | Dated visual style; cluttered cards | Style + colour + composition discovery with a calm, premium UI |
| StockLayouts | Organised by product and by industry; multi-format files; print-trade credibility | Old-fashioned site; files only | Same print discipline (bleed, trim, safe area, CMYK PDF) in the browser |
| Magnific | Premium creative AI and upscaling, cinematic visual identity | Expensive credits; not a layout tool | Distinctive visual identity on our own pages |

## Patterns worth learning (principles, not designs)
- **Two ways in:** by *what you make* (product/format) and by *who you are* (industry). StockLayouts and Envato both do this.
- **Style and colour as first-class filters** (PosterMyWall): style, colour, orientation, motion.
- **File/application compatibility filters** (Envato): our equivalent is print vs digital, bleed, CMYK PDF, MP4.
- **Editorial presentation** (Behance/Dribbble): mixed proportions, generous whitespace, curated collections with a story.
- **Preview before editing** (PosterMyWall): a detail view with size, format and palette before opening the editor.

## What Magical Touch does differently
1. Original creative directions in consistent brand sets (letterhead + card + flyer + social from one system).
2. Real print production: 3 mm bleed, trim, safe area, crop marks, CMYK PDF.
3. Built-in **Pattern Studio** (live) and **Colour Explorer** (live) — not just preset backgrounds.
4. Colour-based discovery across the whole library (`/api/colour-search`, CIE Lab distance).
5. Free, no watermark, edits in the browser, saves to the user's own device or drive.

## Build order
| Priority | Feature | Cost | Uses existing architecture? |
|---|---|---|---|
| 1 | Quality clean-up of the library | Low | Yes (status + tags + redirects) |
| 2 | Pattern Studio | Medium | Yes (SVG engine + editor handoff) |
| 3 | Colour Explorer + colour search | Low | Yes (color1/color2 columns) |
| 4 | Style/composition taxonomy + filters | Medium | Needs migration 0049+ columns |
| 5 | New original collections (birthday first) | High (design time) | Yes (Python kits) |
| 6 | Server-side paginated gallery search | Medium | Replace 5 MB list endpoint |
| 7 | Vector engine (direct selection, Bézier handles, pathfinder) | High | Partly (fabric paths, polygon-clipping already installed) |
| 8 | Palette recolouring of templates with contrast guard | Medium | Yes (`lib/colour.ts` contrast helpers) |

Sources used for research: Envato author hub (filters), PosterMyWall blog (finding templates), StockLayouts site (product/industry/format organisation), Google Search Central image SEO guide.
