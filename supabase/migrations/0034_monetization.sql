-- Paid features, ready but switched OFF (Admin → Pricing & payments).
--
-- Two one-time purchases can be switched on later, independently:
--   editor     — one payment unlocks the editor for good
--   templates  — one payment unlocks every Premium template (templates.is_free = false)
-- Settings live in the public site setting `monetization` (JSON). While it is
-- missing or `enabled` is false, nothing anywhere is charged and nothing is
-- hidden: the site behaves exactly as it does today.
-- `purchases` records who bought what: added automatically by the payment
-- webhook (when set up) or by an admin ("Grant access").

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('editor', 'templates')),
  amount_cents integer,
  currency text,
  provider text not null default 'manual',
  provider_ref text unique,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (user_id);
alter table public.purchases enable row level security;
drop policy if exists "users read own purchases" on public.purchases;
create policy "users read own purchases" on public.purchases for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admins manage purchases" on public.purchases;
create policy "admins manage purchases" on public.purchases for all using (public.is_admin()) with check (public.is_admin());

-- Admin: give someone access by e-mail (e.g. paid by bank transfer).
create or replace function public.admin_grant_purchase(p_email text, p_product text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_product not in ('editor', 'templates') then raise exception 'Unknown product'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if uid is null then raise exception 'No account with that e-mail'; end if;
  insert into purchases (user_id, product, provider, note) values (uid, p_product, 'manual', p_note);
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_grant_purchase(text, text, text) from public;
grant execute on function public.admin_grant_purchase(text, text, text) to authenticated;

-- Admin: the purchase list with e-mails.
create or replace function public.admin_purchases()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((select json_agg(x order by x.created_at desc) from (
    select p.id, p.product, p.amount_cents, p.currency, p.provider, p.note, p.created_at, u.email
    from purchases p join auth.users u on u.id = p.user_id order by p.created_at desc limit 500) x), '[]'::json);
end $$;
revoke all on function public.admin_purchases() from public;
grant execute on function public.admin_purchases() to authenticated;
