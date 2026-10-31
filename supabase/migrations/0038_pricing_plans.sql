-- Pricing (still OFF — nothing is charged until switched on in Admin →
-- Pricing & payments). Worldwide plans:
--   single    one template, bought once (purchases.template_id)
--   pack5     5 template credits — unlock any 5 Premium templates
--   pack10    10 template credits
--   monthly   everything (all templates + editor) while active (expires_at)
--   yearly    everything for a year (expires_at)
--   editor    the editor, bought once (kept from 0034)
-- 'templates' (all Premium templates, one-time) stays allowed for old rows.

alter table public.purchases drop constraint if exists purchases_product_check;
alter table public.purchases add constraint purchases_product_check check (product in ('editor', 'templates', 'single', 'pack5', 'pack10', 'monthly', 'yearly'));
alter table public.purchases add column if not exists template_id uuid references public.templates(id) on delete set null;
alter table public.purchases add column if not exists expires_at timestamptz;
alter table public.purchases add column if not exists subscription_ref text;
create index if not exists purchases_sub_idx on public.purchases (subscription_ref);

-- Templates unlocked with a pack credit.
create table if not exists public.template_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);
alter table public.template_unlocks enable row level security;
create policy "users read own unlocks" on public.template_unlocks for select using (auth.uid() = user_id or public.is_admin());

-- What the signed-in person can use.
create or replace function public.my_access()
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); credits int;
begin
  if uid is null then return json_build_object('signed_in', false); end if;
  select coalesce(sum(case product when 'pack5' then 5 when 'pack10' then 10 else 0 end), 0) into credits from purchases where user_id = uid;
  credits := credits - (select count(*) from template_unlocks where user_id = uid);
  return json_build_object(
    'signed_in', true,
    'plan_until', (select max(expires_at) from purchases where user_id = uid and product in ('monthly', 'yearly')),
    'editor', exists (select 1 from purchases where user_id = uid and product = 'editor'),
    'all_templates', exists (select 1 from purchases where user_id = uid and product = 'templates'),
    'credits', greatest(credits, 0),
    'templates', coalesce((select json_agg(distinct t) from (
      select template_id t from purchases where user_id = uid and product = 'single' and template_id is not null
      union select template_id from template_unlocks where user_id = uid) x), '[]'::json)
  );
end $$;
revoke all on function public.my_access() from public;
grant execute on function public.my_access() to authenticated;

-- Use one pack credit on a template.
create or replace function public.unlock_template(p_template uuid)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); credits int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from template_unlocks where user_id = uid and template_id = p_template) then return json_build_object('ok', true); end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select coalesce(sum(case product when 'pack5' then 5 when 'pack10' then 10 else 0 end), 0) into credits from purchases where user_id = uid;
  credits := credits - (select count(*) from template_unlocks where user_id = uid);
  if credits <= 0 then raise exception 'No template credits left'; end if;
  insert into template_unlocks (user_id, template_id) values (uid, p_template);
  return json_build_object('ok', true, 'credits', credits - 1);
end $$;
revoke all on function public.unlock_template(uuid) from public;
grant execute on function public.unlock_template(uuid) to authenticated;

-- Admin: give access by e-mail (bank transfer, UPI, gift…).
create or replace function public.admin_grant_purchase(p_email text, p_product text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_product not in ('editor', 'templates', 'pack5', 'pack10', 'monthly', 'yearly') then raise exception 'Unknown product'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if uid is null then raise exception 'No account with that e-mail'; end if;
  insert into purchases (user_id, product, provider, note, expires_at)
  values (uid, p_product, 'manual', p_note,
    case p_product when 'monthly' then now() + interval '1 month' when 'yearly' then now() + interval '1 year' end);
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_grant_purchase(text, text, text) from public;
grant execute on function public.admin_grant_purchase(text, text, text) to authenticated;

create or replace function public.admin_purchases()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((select json_agg(x order by x.created_at desc) from (
    select p.id, p.product, p.amount_cents, p.currency, p.provider, p.note, p.created_at, p.expires_at, u.email, t.name as template
    from purchases p join auth.users u on u.id = p.user_id left join templates t on t.id = p.template_id
    order by p.created_at desc limit 500) x), '[]'::json);
end $$;
revoke all on function public.admin_purchases() from public;
grant execute on function public.admin_purchases() to authenticated;
