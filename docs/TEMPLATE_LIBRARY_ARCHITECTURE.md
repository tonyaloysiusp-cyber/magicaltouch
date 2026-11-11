# Template library architecture

## Today (audited 11 Nov 2026)
- **Stack:** Next.js 14 on Cloudflare Workers (OpenNext), Supabase Postgres 17 (free plan), fabric.js 5.1 editor.
- **Storage:** template documents in `templates.canvas_json` (jsonb); thumbnails/previews as static files in `public/templates/collection` (JPG/WebP); photos in `public/templates/photos` with `credits.json` licence records (CC0 / Pixabay licence).
- **Statuses:** `draft`, `published`, `unpublished`. Hidden sets are tagged (`hidden-duplicate-2026-11`, `hidden-quality-2026-11`) and their slugs redirect via `site_settings.template_redirects`.
- **Import pipeline:** Python kits in `scripts/templates_kit` write `data/collections/*.json`; `supabase/seed/import-*.sql` loads them (via `net.http_get` from GitHub raw).
- **User designs:** stored separately (`designs`, local `.mtd.html` files); unpublishing a template never touches them.

## Quality clean-up (11 Nov 2026)
- 1,730 near-duplicates hidden (earlier) and **1,457 clip-art templates hidden** (emoji-style 3D icons, sparse layouts). Backup list: `site_settings.quality_cleanup_2026_11`. Redirects go to the template's category page. Reversible: set `status='published'` and remove the tag.
- Published library after clean-up: 5,534.

## Target data model (migration 0049 + next)
Columns added by `0049_template_quality.sql` (needs the db-migrate workflow secret): `quality_score`, `quality_breakdown`, `review_status` (draft → in_production → needs_review → approved → published → archived), `review_notes`, `reviewed_at`.
Next migration adds: `styles text[]`, `composition text`, `palette text[]`, `typography text`, `format text` (print/digital), `bleed_mm numeric`, `difficulty text`, `layer_count int`, `short_description text`, `alt_text text`, `licence jsonb`, with GIN indexes on arrays.

## Performance plan
1. Replace the 5 MB `/api/public-templates` list with a paginated, database-filtered search endpoint (Postgres full-text + GIN on hashtags/styles).
2. Generate 320 px WebP thumbnails for gallery cards (current 520 px JPGs ≈ 60–100 KB).
3. Keep thumbnails as static assets (free, CDN-cached); watch the 20,000-file static asset limit (19,4xx today).
