-- ---------------------------------------------------------------------
-- 0001_profiles_and_avatars.sql
-- Adds a profiles table (name, optional phone, avatar) alongside
-- Supabase's own auth.users, plus a storage bucket for avatar uploads.
-- This app has no migration runner wired up — apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  -- Optional contact info, not a login credential — this app's auth
  -- stays email+password only. Wiring phone into Supabase Auth itself
  -- would need a configured SMS provider (Twilio etc.), which isn't set
  -- up for this project.
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by their owner" on public.profiles;
create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by their owner" on public.profiles;
create policy "Profiles are insertable by their owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by their owner" on public.profiles;
create policy "Profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Public avatar storage: readable by anyone (so the URL can be used
-- directly as an <img src>), writable only by the owning user, under a
-- path prefixed with their own user id (avatars/<user_id>/<file>).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
