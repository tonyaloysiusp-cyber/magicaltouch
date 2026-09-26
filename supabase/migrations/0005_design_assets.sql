-- ---------------------------------------------------------------------
-- 0005_design_assets.sql
-- First slice of the storage architecture audit's core fix (see
-- docs/ENGINEERING_AUDIT.md §1): today every uploaded image is embedded
-- as a base64 data URL directly inside designs.canvas_json /
-- design_versions.canvas_json, multiplied up to 50x by version history.
-- This migration adds the missing pieces -- a private object-storage
-- bucket for real design assets, and a metadata table keyed by content
-- hash so the same uploaded pixels are never stored twice -- without
-- touching any existing table, column, or row. Purely additive.
--
-- This app has no migration runner wired up -- apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  mime_type text not null,
  width integer,
  height integer,
  file_size integer not null,
  -- SHA-256 of the raw file bytes, hex-encoded. Scoped to (user_id, hash)
  -- rather than globally unique -- deduplicating within one user's own
  -- uploads is safe and simple; deduplicating identical content ACROSS
  -- users needs its own privacy review (see docs/ENGINEERING_AUDIT.md)
  -- and isn't attempted here.
  hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists assets_user_id_hash_idx
  on public.assets (user_id, hash);

alter table public.assets enable row level security;

drop policy if exists "Assets are viewable by their owner" on public.assets;
create policy "Assets are viewable by their owner"
  on public.assets for select
  using (auth.uid() = user_id);

drop policy if exists "Assets are insertable by their owner" on public.assets;
create policy "Assets are insertable by their owner"
  on public.assets for insert
  with check (auth.uid() = user_id);

drop policy if exists "Assets are deletable by their owner" on public.assets;
create policy "Assets are deletable by their owner"
  on public.assets for delete
  using (auth.uid() = user_id);

-- Private bucket (unlike the public `avatars` one) -- a user's uploaded
-- design photos are not meant to be readable by anyone holding a guessable
-- URL. Access happens exclusively through signed URLs the owner generates
-- for their own objects, which the select policy below allows.
insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', false)
on conflict (id) do nothing;

drop policy if exists "Design assets are readable by their owner" on storage.objects;
create policy "Design assets are readable by their owner"
  on storage.objects for select
  using (bucket_id = 'design-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own design assets" on storage.objects;
create policy "Users can upload their own design assets"
  on storage.objects for insert
  with check (bucket_id = 'design-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own design assets" on storage.objects;
create policy "Users can update their own design assets"
  on storage.objects for update
  using (bucket_id = 'design-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own design assets" on storage.objects;
create policy "Users can delete their own design assets"
  on storage.objects for delete
  using (bucket_id = 'design-assets' and (storage.foldername(name))[1] = auth.uid()::text);
