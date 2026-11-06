-- Applied 6 Nov 2026. Admin design studio → "My library": elements,
-- layouts and text styles an admin saves once and reuses in any design.
create table if not exists public.admin_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'element' check (kind in ('element','layout','text','photo')),
  objects jsonb not null,
  thumb text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admin_library enable row level security;
drop policy if exists "admin library" on public.admin_library;
create policy "admin library" on public.admin_library for all using (public.is_admin()) with check (public.is_admin());
create index if not exists admin_library_created on public.admin_library (created_at desc);
