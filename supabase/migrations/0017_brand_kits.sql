-- ---------------------------------------------------------------------
-- 0017_brand_kits.sql
-- One brand kit per user: colours, fonts, logo and business details the
-- editor can apply to any design. Private to its owner.
-- ---------------------------------------------------------------------

create table if not exists public.brand_kits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'My brand',
  colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '{}'::jsonb,
  logo_url text,
  info jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.brand_kits enable row level security;

do $do$ begin
  if not exists (select 1 from pg_policies where tablename = 'brand_kits' and policyname = 'brand_kits_owner_select') then
    create policy brand_kits_owner_select on public.brand_kits for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'brand_kits' and policyname = 'brand_kits_owner_insert') then
    create policy brand_kits_owner_insert on public.brand_kits for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'brand_kits' and policyname = 'brand_kits_owner_update') then
    create policy brand_kits_owner_update on public.brand_kits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $do$;
