# Template library audit — 11 Nov 2026

Read-only audit of the live database (Supabase `templates`), done before any new cleanup.

| Measure | Count |
|---|---:|
| Total template records | 22,413 |
| Published (in the gallery) | 18,583 |
| Drafts | 317 |
| Hidden / unpublished (kept, restorable) | 3,513 |
| — hidden as near-duplicates (`hidden-duplicate-2026-11`) | 1,730 |
| — hidden as clip-art quality (`hidden-quality-2026-11`) | 1,300 |
| — retired old birthday set (`hidden-birthday-replaced-2026-11`) | 253 |
| Published without a preview image | 0 |
| Published without a design (canvas) | 0 |
| Published with a short (< 60 chars) description | 0 |
| Published without hashtags | 0 |
| Published with ≤ 3 objects (near-empty) | 0 |
| Main categories in use | 13 |
| Free / Pro | 18,583 / 0 |
| Saved user designs (`designs` table) | 2 — independent copies; unpublishing a template never changes them |

## Duplicates
- Same name and same size among published templates: **14 groups (30 templates)** after renaming the Creative Universe set (each now carries its layout, e.g. “· Editorial”). They are listed under *Duplicate candidates* in Admin → Template Quality & Review — not changed automatically.

## Live count check
The gallery list (`/api/public-templates`) returned 18,583 rows = published records; the page titles show the rounded live count (“18,550+”).

## Review system (built, no mass changes made)
Admin → Content → **Template Quality & Review** (`/admin/review`):
- large previews, suggested quality score (automatic hint), collection, category, size, colours, Free/Pro, status, dates;
- filters: status, decision, collection, category, not reviewed, duplicate candidates, missing preview, Free/Pro; search; sorting; pagination (48 per page, loaded from the database);
- actions: Keep, Improve, Replace, Archive, Review later, Restore — single or bulk, with a confirmation screen for bulk and archive;
- Archive hides from the gallery, keeps the record, and redirects the old URL to the category page; Restore reverses both;
- every change is written to `site_settings.template_review_log` (who/when/what/previous state) for rollback.

## Rollback
- A decision: set the tags back (Restore removes review tags and `archived`).
- Earlier cleanups: backups in `site_settings` keys `quality_cleanup_2026_11` and `birthday_retired_2026_11` (id + slug lists).
