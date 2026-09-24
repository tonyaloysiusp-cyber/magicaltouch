-- ---------------------------------------------------------------------
-- 0003_templates_and_admin.sql
-- Moves the template gallery from a hardcoded array in the app's source
-- (lib/templatesData.ts) into a real table an admin can manage, plus an
-- admin flag on profiles to gate who's allowed to.
--
-- This app has no migration runner wired up — apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
--
-- To make a user an admin (there is deliberately no self-service way to
-- do this from the app itself):
--   update public.profiles set is_admin = true where id = '<their auth.users id>';
-- ---------------------------------------------------------------------

alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  width integer not null,
  height integer not null,
  color1 text not null default '#14121F',
  color2 text not null default '#FAF9F6',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;

-- The template gallery is public marketing/onboarding content — every
-- visitor (including signed-out ones on the homepage/template pages)
-- needs to be able to read it.
drop policy if exists "Templates are viewable by everyone" on public.templates;
create policy "Templates are viewable by everyone"
  on public.templates for select
  using (true);

drop policy if exists "Only admins can insert templates" on public.templates;
create policy "Only admins can insert templates"
  on public.templates for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Only admins can update templates" on public.templates;
create policy "Only admins can update templates"
  on public.templates for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Only admins can delete templates" on public.templates;
create policy "Only admins can delete templates"
  on public.templates for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Seeds the table with the same templates that used to live only in
-- lib/templatesData.ts, so switching the app over to reading from this
-- table doesn't blank the gallery out. Safe to run more than once
-- (matches on name+category so it won't duplicate rows).
insert into public.templates (name, category, width, height, color1, color2, sort_order)
select v.name, v.category, v.width, v.height, v.color1, v.color2, v.sort_order
from (values
  ('Studio Minimal', 'Business Card', 1050, 600, '#14121F', '#FAF9F6', 0),
  ('Bold Contact', 'Business Card', 1050, 600, '#6C4FD1', '#FF6F91', 1),
  ('Classic Letterpress', 'Business Card', 1050, 600, '#F5B942', '#14121F', 2),
  ('Clean Correspondence', 'Letterhead', 850, 1100, '#FAF9F6', '#6C4FD1', 3),
  ('Studio Header', 'Letterhead', 850, 1100, '#14121F', '#F5B942', 4),
  ('Night Market Flyer', 'Flyer', 1080, 1350, '#14121F', '#6C4FD1', 5),
  ('Bloom Festival', 'Flyer', 1080, 1350, '#FF6F91', '#F5B942', 6),
  ('Grand Opening', 'Flyer', 1080, 1350, '#6C4FD1', '#14121F', 7),
  ('Modern Resume', 'Resume', 850, 1100, '#14121F', '#FAF9F6', 8),
  ('Creative Portfolio', 'Resume', 850, 1100, '#6C4FD1', '#F5B942', 9),
  ('Paper & Ink Invite', 'Invitation', 1200, 1200, '#FF6F91', '#F5B942', 10),
  ('Golden Hour', 'Invitation', 1200, 1200, '#F5B942', '#FF6F91', 11),
  ('Quarterly Showcase', 'Poster', 1240, 1754, '#6C4FD1', '#FF6F91', 12)
) as v(name, category, width, height, color1, color2, sort_order)
where not exists (
  select 1 from public.templates t where t.name = v.name and t.category = v.category
);
