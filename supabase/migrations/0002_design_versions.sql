-- ---------------------------------------------------------------------
-- 0002_design_versions.sql
-- Version History (platform spec §56/98/99 — "Never lose a design",
-- crash recovery, a real recoverable history rather than only the
-- single latest `designs` row). Every successful save (manual or
-- autosave) writes a snapshot here; the editor's Version History panel
-- lists them and can restore any one back into the live document.
--
-- This app has no migration runner wired up — apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_json jsonb not null,
  width integer not null,
  height integer not null,
  thumbnail text,
  created_at timestamptz not null default now()
);

create index if not exists design_versions_design_id_created_at_idx
  on public.design_versions (design_id, created_at desc);

alter table public.design_versions enable row level security;

drop policy if exists "Design versions are viewable by their owner" on public.design_versions;
create policy "Design versions are viewable by their owner"
  on public.design_versions for select
  using (auth.uid() = user_id);

drop policy if exists "Design versions are insertable by their owner" on public.design_versions;
create policy "Design versions are insertable by their owner"
  on public.design_versions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Design versions are deletable by their owner" on public.design_versions;
create policy "Design versions are deletable by their owner"
  on public.design_versions for delete
  using (auth.uid() = user_id);

-- Keeps storage bounded: after each insert, drop anything past the 50
-- most recent versions for that design rather than growing forever.
create or replace function public.trim_design_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.design_versions
  where design_id = new.design_id
    and id not in (
      select id from public.design_versions
      where design_id = new.design_id
      order by created_at desc
      limit 50
    );
  return new;
end;
$$;

drop trigger if exists trim_design_versions_trigger on public.design_versions;
create trigger trim_design_versions_trigger
  after insert on public.design_versions
  for each row execute function public.trim_design_versions();
