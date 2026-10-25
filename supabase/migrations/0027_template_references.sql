-- Design references for templates (admins only). Each template made from
-- the 500-template manifest records its own inspiration search link, the
-- brief it was designed from and the design decisions taken. Links are
-- search references unless an admin has checked a specific pin
-- (reference_verified stays false until a person verifies it).
create table if not exists public.template_references (
  template_id uuid primary key references public.templates (id) on delete cascade,
  manifest_id text not null unique check (manifest_id ~ '^[a-z]+-[0-9]{3}$'),
  collection text not null default 'collection-500',
  category text not null,
  subcategory text not null default '',
  design_brief text not null,
  inspiration_reference_url text not null check (inspiration_reference_url ~ '^https://[^\s]+$'),
  inspiration_pin_url text check (inspiration_pin_url is null or inspiration_pin_url ~ '^https://'),
  reference_type text not null default 'pinterest_search' check (reference_type in ('pinterest_search', 'pinterest_pin', 'other')),
  reference_verified boolean not null default false,
  design_notes jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.template_references enable row level security;
create policy "Admins read template references" on public.template_references for select using (public.is_admin());
create policy "Admins manage template references" on public.template_references for all using (public.is_admin()) with check (public.is_admin());
