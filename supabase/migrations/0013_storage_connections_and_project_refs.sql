-- ---------------------------------------------------------------------
-- 0013_storage_connections_and_project_refs.sql  (storage spec §8, §47, §48)
--
-- Customer projects (.mtd files) live in the customer's own storage:
-- their computer, Google Drive, OneDrive or Dropbox. The platform keeps
-- ONLY lightweight references so the dashboard can list them:
--
--   storage_connections: which cloud drives a user has linked, and the
--     account e-mail/name shown to them. NEVER passwords, NEVER OAuth
--     tokens -- access tokens stay in the customer's browser tab only.
--
--   project_references: name, provider, the provider's file id, a small
--     preview, page size and last-modified time. NOT the project itself.
--     If this table were wiped, every .mtd file would still open.
--
-- Projects saved to "This computer" are not listed here at all (that list
-- lives only in the browser, see lib/mtd/recent.ts).
-- ---------------------------------------------------------------------

create table if not exists public.storage_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'onedrive', 'dropbox')),
  account_email text,
  account_name text,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
alter table public.storage_connections enable row level security;

create table if not exists public.project_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  storage_provider text not null check (storage_provider in ('google', 'onedrive', 'dropbox')),
  external_file_id text not null,
  storage_location_reference text,
  thumbnail text,
  document_width integer,
  document_height integer,
  last_known_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_provider, external_file_id)
);
create index if not exists project_references_user_idx on public.project_references (user_id, updated_at desc);
alter table public.project_references enable row level security;

-- Owner-only access (add-only form so it is safe to re-run).
do $do$ begin
  if not exists (select 1 from pg_policies where tablename = 'storage_connections' and policyname = 'Users manage their own storage connections') then
    create policy "Users manage their own storage connections" on public.storage_connections
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'project_references' and policyname = 'Users manage their own project references') then
    create policy "Users manage their own project references" on public.project_references
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $do$;
