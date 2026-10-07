-- ---------------------------------------------------------------------
-- 0014_marketing_email_center_account_deletion.sql
--
-- Email spec §27-§35, §40-§46 and storage spec §38.
--
-- Marketing consent lives on the profile and is OFF by default -- creating
-- an account never subscribes anyone. Transactional mail (verification,
-- password, security, welcome) is separate and unaffected.
--
-- Unsubscribing works without logging in: each profile has a random,
-- unguessable unsubscribe_token, and public.unsubscribe_marketing(token)
-- is the only thing that can use it.
--
-- Campaigns, offers and the email log are admin-only. Recipient e-mail
-- addresses live in auth.users, which the browser can't read; admins get
-- them only through admin_campaign_recipients(), which checks is_admin()
-- and returns subscribed users only.
--
-- public.delete_my_account() lets a signed-in user delete their own
-- account; every table referencing auth.users cascades. Files on the
-- customer's computer or in their own cloud drive are never touched.
-- ---------------------------------------------------------------------

-- ---------- Consent on the profile ----------
alter table public.profiles add column if not exists marketing_status text not null default 'none';
alter table public.profiles add column if not exists marketing_consent_at timestamptz;
alter table public.profiles add column if not exists unsubscribed_at timestamptz;
alter table public.profiles add column if not exists unsubscribe_reason text;
alter table public.profiles add column if not exists unsubscribe_campaign_id uuid;
alter table public.profiles add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_unsubscribe_token_idx on public.profiles (unsubscribe_token);
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_marketing_status_check') then
    alter table public.profiles add constraint profiles_marketing_status_check
      check (marketing_status in ('none', 'subscribed', 'unsubscribed', 'bounced', 'suppressed'));
  end if;
end $do$;

-- ---------- Campaigns ----------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text not null default 'announcement'
    check (campaign_type in ('offer', 'promotion', 'announcement', 'newsletter', 'new_template', 'special')),
  subject text not null default '',
  preheader text,
  content text not null default '',
  image_url text,
  cta_label text,
  cta_url text,
  audience text not null default 'all_subscribers' check (audience in ('all_subscribers', 'verified_subscribers')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  offer_id uuid,
  template_id uuid,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.email_campaigns enable row level security;

-- ---------- Offers ----------
create table if not exists public.email_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount text,
  start_date date,
  end_date date,
  target_audience text not null default 'all_subscribers',
  landing_page text,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_offers enable row level security;

-- ---------- Email log (also the duplicate guard for campaigns) ----------
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  email text not null,
  email_type text not null,
  subject text,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  failure_reason text
);
create unique index if not exists email_log_campaign_user_idx on public.email_log (campaign_id, user_id) where campaign_id is not null;
create index if not exists email_log_created_idx on public.email_log (created_at desc);
alter table public.email_log enable row level security;

do $do$ begin
  if not exists (select 1 from pg_policies where tablename = 'email_campaigns' and policyname = 'Admins manage campaigns') then
    create policy "Admins manage campaigns" on public.email_campaigns for all using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'email_offers' and policyname = 'Admins manage offers') then
    create policy "Admins manage offers" on public.email_offers for all using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'email_log' and policyname = 'Admins read and write the email log') then
    create policy "Admins read and write the email log" on public.email_log for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $do$;

-- ---------- Functions ----------

-- Unsubscribe from a link in an e-mail (no login).
create or replace function public.unsubscribe_marketing(p_token uuid, p_reason text default null, p_campaign uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  update public.profiles
     set marketing_status = 'unsubscribed',
         unsubscribed_at = now(),
         unsubscribe_reason = left(coalesce(p_reason, unsubscribe_reason), 500),
         unsubscribe_campaign_id = coalesce(p_campaign, unsubscribe_campaign_id)
   where unsubscribe_token = p_token
  returning id into found_id;
  return found_id is not null;
end;
$$;

-- Subscribed users with their e-mail address, for admins only.
create or replace function public.admin_campaign_recipients(p_verified_only boolean default false)
returns table (user_id uuid, email text, name text, unsubscribe_token uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can list campaign recipients';
  end if;
  return query
    select p.id, u.email::text, p.name, p.unsubscribe_token
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.marketing_status = 'subscribed'
       and u.email is not null
       and (not p_verified_only or u.email_confirmed_at is not null);
end;
$$;

-- Email Center dashboard numbers and subscriber list, admins only.
create or replace function public.admin_email_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view email statistics';
  end if;
  return json_build_object(
    'total_users', (select count(*) from auth.users),
    'verified_users', (select count(*) from auth.users where email_confirmed_at is not null),
    'subscribers', (select count(*) from public.profiles where marketing_status = 'subscribed'),
    'unsubscribed', (select count(*) from public.profiles where marketing_status = 'unsubscribed'),
    'welcome_emails', (select count(*) from public.profiles where welcome_email_sent_at is not null),
    'emails_sent', (select count(*) from public.email_log where status in ('SENT', 'DELIVERED')),
    'emails_failed', (select count(*) from public.email_log where status in ('FAILED', 'BOUNCED')),
    'sent_last_24h', (select count(*) from public.email_log where status in ('SENT', 'DELIVERED') and sent_at > now() - interval '24 hours'),
    'campaigns', (select count(*) from public.email_campaigns),
    'scheduled_campaigns', (select count(*) from public.email_campaigns where status = 'scheduled')
  );
end;
$$;

create or replace function public.admin_list_users(p_search text default null)
returns table (user_id uuid, email text, name text, email_verified boolean, created_at timestamptz,
               last_sign_in_at timestamptz, marketing_status text, is_admin boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can list users';
  end if;
  return query
    select u.id, u.email::text, p.name, u.email_confirmed_at is not null, u.created_at, u.last_sign_in_at,
           coalesce(p.marketing_status, 'none'), coalesce(p.is_admin, false)
      from auth.users u
      left join public.profiles p on p.id = u.id
     where p_search is null or p_search = ''
        or u.email ilike '%' || p_search || '%'
        or p.name ilike '%' || p_search || '%'
     order by u.created_at desc
     limit 500;
end;
$$;

-- A signed-in user deletes their own account (everything cascades).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.admin_campaign_recipients(boolean) from public, anon;
revoke execute on function public.admin_email_stats() from public, anon;
revoke execute on function public.admin_list_users(text) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.admin_campaign_recipients(boolean) to authenticated;
grant execute on function public.admin_email_stats() to authenticated;
grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.unsubscribe_marketing(uuid, text, uuid) to anon, authenticated;
