-- A certificate's own finished design (signature, extra logos, small text
-- changes) saved from the editor. Empty = drawn from its master template.
-- Admin-only like the rest of the table (policy "admin certificates").
alter table public.certificate_issues add column if not exists canvas_json jsonb;
