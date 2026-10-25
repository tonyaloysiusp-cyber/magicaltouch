-- Tutorials with levels (progress, submissions, certificates after admin
-- approval), admin-managed SEO landing pages, and a promotion tracker.

-- ---------------------------------------------------------------- tutorials
create table if not exists public.tutorial_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('beginner', 'intermediate', 'pro')),
  completed_tasks text[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'approved', 'rejected')),
  learner_name text,
  work_name text,
  work_preview text,          -- small JPEG data URL of the submitted design
  review_note text,
  certificate_code text,
  certificate_path text,      -- storage path in the "certificates" bucket
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level)
);

alter table public.tutorial_progress enable row level security;

create policy "Learners read their own progress" on public.tutorial_progress
  for select using (auth.uid() = user_id or public.is_admin());

-- Learners can track tasks and submit, but never approve themselves or
-- attach a certificate.
create policy "Learners start their own progress" on public.tutorial_progress
  for insert with check (auth.uid() = user_id and status in ('in_progress', 'submitted') and certificate_code is null and certificate_path is null);

create policy "Learners update their own progress" on public.tutorial_progress
  for update using (auth.uid() = user_id and status <> 'approved')
  with check (auth.uid() = user_id and status in ('in_progress', 'submitted') and certificate_code is null and certificate_path is null);

create policy "Admins manage tutorial progress" on public.tutorial_progress
  for all using (public.is_admin()) with check (public.is_admin());

-- Private bucket for issued certificate PDFs: <user_id>/<code>.pdf
insert into storage.buckets (id, name, public) values ('certificates', 'certificates', false)
on conflict (id) do nothing;

create policy "Admins write certificate files" on storage.objects
  for insert with check (bucket_id = 'certificates' and public.is_admin());
create policy "Admins update certificate files" on storage.objects
  for update using (bucket_id = 'certificates' and public.is_admin());
create policy "Owners and admins read certificate files" on storage.objects
  for select using (bucket_id = 'certificates' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- ---------------------------------------------------------------- SEO pages
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  h1 text not null,
  description text not null,
  intro text not null default '',
  thing text not null default 'design',
  terms text[] not null default '{}',
  faqs jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.seo_pages enable row level security;
create policy "Published SEO pages are public" on public.seo_pages for select using (status = 'published' or public.is_admin());
create policy "Admins manage SEO pages" on public.seo_pages for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- promotion
create table if not exists public.promo_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('channel', 'campaign', 'keyword')),
  name text not null,
  url text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  notes text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.promo_items enable row level security;
create policy "Admins manage promotion" on public.promo_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- site settings (applied as 0021)
-- Public, non-secret settings such as the Google Search Console verification code.
create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "Site settings are public" on public.site_settings for select using (true);
create policy "Admins manage site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
