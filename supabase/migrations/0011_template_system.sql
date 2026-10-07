-- ---------------------------------------------------------------------
-- 0011_template_system.sql
-- Turns templates into managed platform content (storage spec §9-§28):
--   * hierarchical categories the admin can extend without code changes
--   * tags, description, slug, print metadata, featured/free flags
--   * publishing states: draft -> review -> published / unpublished /
--     archived. Customers can only ever read PUBLISHED rows; drafts and
--     admin data are invisible to them at the database level (RLS), not
--     just hidden in the UI.
--   * immutable version snapshots (template_versions) so a template
--     update never changes customer projects already made from it
--   * a public "template-media" bucket for thumbnails/previews, writable
--     only by admins
--
-- Purely additive and idempotent. Existing template rows are marked
-- 'published' so nothing disappears from the live gallery.
-- Apply by hand in the Supabase SQL editor (no migration runner).
-- ---------------------------------------------------------------------

-- Admin check used by every policy below. SECURITY DEFINER so it can
-- read profiles regardless of the caller's own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Categories ----------
create table if not exists public.template_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.template_categories(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.template_categories enable row level security;
drop policy if exists "Template categories are viewable by everyone" on public.template_categories;
create policy "Template categories are viewable by everyone"
  on public.template_categories for select using (true);
drop policy if exists "Only admins manage template categories" on public.template_categories;
create policy "Only admins manage template categories"
  on public.template_categories for all using (public.is_admin()) with check (public.is_admin());

-- Seed the starting tree (spec §11) plus the categories the site already uses.
insert into public.template_categories (name, slug, parent_id, sort_order)
select v.name, v.slug, null, v.ord from (values
  ('Business', 'business', 1), ('Social Media', 'social-media', 2), ('Wedding', 'wedding', 3),
  ('Events', 'events', 4), ('Marketing', 'marketing', 5), ('Print', 'print', 6),
  ('Resume', 'resume', 7), ('Certificates', 'certificates', 8), ('Menus', 'menus', 9), ('Cards', 'cards', 10)
) as v(name, slug, ord)
on conflict (slug) do nothing;

insert into public.template_categories (name, slug, parent_id, sort_order)
select v.name, v.slug, p.id, v.ord
from (values
  ('Business Card', 'business-card', 'business', 1), ('Letterhead', 'letterhead', 'business', 2),
  ('Flyer', 'flyer', 'business', 3), ('Brochure', 'brochure', 'business', 4),
  ('Instagram', 'instagram', 'social-media', 1), ('Facebook', 'facebook', 'social-media', 2), ('YouTube', 'youtube', 'social-media', 3),
  ('Invitation', 'invitation', 'wedding', 1), ('Reception', 'reception', 'wedding', 2), ('Save the Date', 'save-the-date', 'wedding', 3),
  ('Birthday', 'birthday', 'events', 1), ('Conference', 'conference', 'events', 2), ('Party', 'party', 'events', 3),
  ('Poster', 'poster', 'marketing', 1), ('Banner', 'banner', 'marketing', 2), ('Advertisement', 'advertisement', 'marketing', 3),
  ('A4', 'a4', 'print', 1), ('A3', 'a3', 'print', 2), ('A2', 'a2', 'print', 3), ('A1', 'a1', 'print', 4)
) as v(name, slug, parent_slug, ord)
join public.template_categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;

-- ---------- Templates: new metadata ----------
alter table public.templates add column if not exists slug text;
alter table public.templates add column if not exists description text;
alter table public.templates add column if not exists category_id uuid references public.template_categories(id) on delete set null;
alter table public.templates add column if not exists tags text[] not null default '{}';
-- First run only: existing rows become 'published' (they're already
-- live); every template created afterwards starts as a 'draft'.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'templates' and column_name = 'status'
  ) then
    alter table public.templates add column status text not null default 'published';
    alter table public.templates alter column status set default 'draft';
    alter table public.templates add column if not exists published_at timestamptz;
    update public.templates set published_at = now();
  end if;
end $$;
alter table public.templates add column if not exists is_featured boolean not null default false;
alter table public.templates add column if not exists is_free boolean not null default true;
alter table public.templates add column if not exists unit text not null default 'px';
alter table public.templates add column if not exists dpi integer not null default 72;
alter table public.templates add column if not exists color_mode text not null default 'rgb';
alter table public.templates add column if not exists preview text;
alter table public.templates add column if not exists current_version text not null default '1.0';
alter table public.templates add column if not exists published_at timestamptz;
alter table public.templates add column if not exists occasion text;
alter table public.templates add column if not exists industry text;
alter table public.templates add column if not exists language text;
alter table public.templates add column if not exists search_keywords text;
alter table public.templates add column if not exists orientation text
  generated always as (case when width > height then 'landscape' when width < height then 'portrait' else 'square' end) stored;

alter table public.templates drop constraint if exists templates_status_check;
alter table public.templates add constraint templates_status_check
  check (status in ('draft', 'review', 'published', 'unpublished', 'archived'));

create unique index if not exists templates_slug_idx on public.templates (slug) where slug is not null;
create index if not exists templates_status_idx on public.templates (status);
create index if not exists templates_category_id_idx on public.templates (category_id);
create index if not exists templates_tags_idx on public.templates using gin (tags);

-- Link existing rows to the matching category by name.
update public.templates t set category_id = c.id
from public.template_categories c
where t.category_id is null and lower(c.name) = lower(t.category);

-- ---------- Template access rules ----------
drop policy if exists "Templates are viewable by everyone" on public.templates;
drop policy if exists "Published templates are viewable by everyone" on public.templates;
create policy "Published templates are viewable by everyone"
  on public.templates for select using (status = 'published' or public.is_admin());

drop policy if exists "Only admins can insert templates" on public.templates;
create policy "Only admins can insert templates"
  on public.templates for insert with check (public.is_admin());
drop policy if exists "Only admins can update templates" on public.templates;
create policy "Only admins can update templates"
  on public.templates for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Only admins can delete templates" on public.templates;
create policy "Only admins can delete templates"
  on public.templates for delete using (public.is_admin());

-- ---------- Immutable version snapshots ----------
create table if not exists public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  version text not null,
  canvas_json jsonb,
  thumbnail text,
  preview text,
  width integer not null,
  height integer not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);
alter table public.template_versions enable row level security;
drop policy if exists "Only admins can read template versions" on public.template_versions;
create policy "Only admins can read template versions"
  on public.template_versions for select using (public.is_admin());
drop policy if exists "Only admins can create template versions" on public.template_versions;
create policy "Only admins can create template versions"
  on public.template_versions for insert with check (public.is_admin());
drop policy if exists "Only admins can delete template versions" on public.template_versions;
create policy "Only admins can delete template versions"
  on public.template_versions for delete using (public.is_admin());
-- No update policy on purpose: a version, once saved, never changes.

-- ---------- Thumbnail / preview storage ----------
insert into storage.buckets (id, name, public)
values ('template-media', 'template-media', true)
on conflict (id) do nothing;

drop policy if exists "Template media is publicly readable" on storage.objects;
create policy "Template media is publicly readable"
  on storage.objects for select using (bucket_id = 'template-media');
drop policy if exists "Only admins upload template media" on storage.objects;
create policy "Only admins upload template media"
  on storage.objects for insert with check (bucket_id = 'template-media' and public.is_admin());
drop policy if exists "Only admins update template media" on storage.objects;
create policy "Only admins update template media"
  on storage.objects for update using (bucket_id = 'template-media' and public.is_admin());
drop policy if exists "Only admins delete template media" on storage.objects;
create policy "Only admins delete template media"
  on storage.objects for delete using (bucket_id = 'template-media' and public.is_admin());
