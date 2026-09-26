-- ---------------------------------------------------------------------
-- 0006_template_designs.sql
-- The `templates` table (0003_templates_and_admin.sql) has never held
-- actual editable design content -- only a name/category/size/two hex
-- colors, rendered on /templates as a color-swatch card. Clicking "Use
-- Template" opens a blank document at the right size with nothing else
-- loaded (see docs/ENGINEERING_AUDIT.md §3). This adds the columns
-- needed for a real template: an editable Fabric scene, a real
-- thumbnail rendered from it, and a rights/originality status per the
-- "original template library" brief. Purely additive -- no existing
-- column, row, or reader of this table is affected until something
-- actually starts writing canvas_json.
--
-- This app has no migration runner wired up -- apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

alter table public.templates add column if not exists canvas_json jsonb;
alter table public.templates add column if not exists thumbnail text;
-- 'verified': originality/licensing has been checked (see
-- docs/ENGINEERING_AUDIT.md's originality-review process). Every
-- template this app generates itself defaults to 'verified' since its
-- shapes/colors/text placeholders are generated code, not sourced
-- content -- a future human- or vendor-sourced template would need to
-- go through review before being marked this way.
alter table public.templates add column if not exists rights_status text not null default 'verified';
