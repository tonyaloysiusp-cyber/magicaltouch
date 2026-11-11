# SEO standard

Follows Google Search Central guidance (titles, snippets, image SEO, sitemaps, structured data).

## Rules (enforced in code)
- `fitTitle(base)` in `lib/seo.ts`: final title ≤ 60 characters, brand last (“ | Magical Touch Design”, shortened to “ | Magical Touch” or dropped if needed). Used on every public page.
- `fitDescription(text)`: 70–155 characters, ends on a sentence or whole word.
- One `<h1>` per page; breadcrumbs (visible + `BreadcrumbList`) on deep pages.
- Canonical URL on every indexable page.
- Open Graph image on every page (template preview, or `/api/og`).
- Structured data: `WebPage`, `ItemList` (catalogues), `Course` (tutorials), `SoftwareApplication` + `FAQPage` (tools), `BreadcrumbList`.
- Sitemap: all indexable pages; template entries include `<image:image>` with the preview (image sitemap).
- Hidden/retired templates 301 to the kept template or to their category page — never a soft 404.
- Common guessed URLs (`/features`, `/pricing`, `/tools`, `/pattern-studio`) redirect.

## Audit tool
`smoke-mcp` branch, `tools/seo.mjs`: samples the sitemap and key pages, reports titles > 65, descriptions out of range, missing canonical/OG/H1, duplicate titles/descriptions, invalid JSON-LD, images without alt, non-200 status.

Baseline (11 Nov 2026, before the fix): 105/124 titles over 65 characters, 20 descriptions over 165, 16 under 70, 4 pages without an H1 in HTML, 3 without canonical, 3 guessed URLs 404, sitemap without image tags.

## Content rules
- Template titles describe purpose and style (e.g. “Atlas & Co. Architects Letterhead”), never “Flyer 01”.
- Descriptions explain use, audience, style, composition, editable parts, format.
- Hashtags: relevant only, no repetition.
- Landing pages only where there is a genuinely distinct set of templates (thin pages are hidden).
