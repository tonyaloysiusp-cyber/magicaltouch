-- ---------------------------------------------------------------------
-- 0008_designs_rls.sql
-- Security audit finding (automated test→find→fix sweep): `public.designs`
-- is the app's core table, referenced by design_versions/assets since
-- migration 0002, but no migration in this repo ever creates it or
-- enables Row Level Security on it -- it predates this migrations
-- folder and was evidently set up by hand directly in the Supabase
-- project. That means its real RLS state can't be verified from the
-- repo alone.
--
-- This matters because the app's own queries assume RLS is the ONLY
-- authorization boundary here: app/dashboard/page.tsx's list query
-- (`.from('designs').select(...).order('updated_at', ...)`) and its
-- update/delete calls (`.eq('id', id)`) never filter by user_id at the
-- application level -- exactly the "Supabase RLS enforces ownership"
-- pattern every OTHER table in this schema (design_versions, assets,
-- profiles) already uses. If `designs` itself is missing or has
-- incorrect RLS, any logged-in user could list, read, rename, or delete
-- every other user's designs through a direct API call, regardless of
-- what the dashboard UI shows them.
--
-- This migration is purely additive and fully idempotent (enabling RLS
-- that's already enabled, or re-creating a policy that already exists
-- with this exact definition, is a no-op) -- safe to apply whether or
-- not `designs` already has correct RLS today.
--
-- This app has no migration runner wired up -- apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

alter table public.designs enable row level security;

drop policy if exists "Designs are viewable by their owner" on public.designs;
create policy "Designs are viewable by their owner"
  on public.designs for select
  using (auth.uid() = user_id);

drop policy if exists "Designs are insertable by their owner" on public.designs;
create policy "Designs are insertable by their owner"
  on public.designs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Designs are updatable by their owner" on public.designs;
create policy "Designs are updatable by their owner"
  on public.designs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Designs are deletable by their owner" on public.designs;
create policy "Designs are deletable by their owner"
  on public.designs for delete
  using (auth.uid() = user_id);
