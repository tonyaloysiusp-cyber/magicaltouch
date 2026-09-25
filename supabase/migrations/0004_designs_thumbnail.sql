-- ---------------------------------------------------------------------
-- 0004_designs_thumbnail.sql
-- The dashboard's Recent Files / All Designs grid has shown real design
-- previews since an earlier round (app/editor/page.tsx's save flow
-- already generates one from the first artboard and writes it to
-- designs.thumbnail) — but that column was never added to the `designs`
-- table by a migration, only to design_versions (0002). Every save has
-- been silently hitting that code path's own missing-column fallback
-- ever since, which is why every card on the dashboard falls back to
-- showing its plain width × height instead of a picture of the design.
--
-- This app has no migration runner wired up — apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- Existing designs won't backfill a thumbnail retroactively; the next
-- time each one is opened and saved, it gets one.
-- ---------------------------------------------------------------------

alter table public.designs add column if not exists thumbnail text;
