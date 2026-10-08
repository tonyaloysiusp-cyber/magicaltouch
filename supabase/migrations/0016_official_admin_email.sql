-- ---------------------------------------------------------------------
-- 0016_official_admin_email.sql
-- The company's official address (hellomagicaltouch.design@gmail.com)
-- is an administrator automatically, but only once that address has
-- been verified -- so nobody can claim admin by signing up with it
-- without access to the inbox. Runs as the table owner, so the
-- 0010 admin-flag protection (which only blocks end users) allows it.
-- ---------------------------------------------------------------------

create or replace function public.grant_official_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if lower(new.email) = 'hellomagicaltouch.design@gmail.com' and new.email_confirmed_at is not null then
    insert into public.profiles (id, is_admin) values (new.id, true)
    on conflict (id) do update set is_admin = true;
  end if;
  return new;
end;
$$;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'grant_official_admin_on_auth_users') then
    create trigger grant_official_admin_on_auth_users
      after insert or update of email_confirmed_at, email on auth.users
      for each row execute function public.grant_official_admin();
  end if;
end $do$;

-- A profile row created later by the app is forced to is_admin = false
-- by 0010; re-apply the grant right after such an insert.
create or replace function public.grant_official_admin_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (select 1 from auth.users u where u.id = new.id and lower(u.email) = 'hellomagicaltouch.design@gmail.com' and u.email_confirmed_at is not null) then
    update public.profiles set is_admin = true where id = new.id and is_admin = false;
  end if;
  return new;
end;
$$;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'grant_official_admin_on_profiles') then
    create trigger grant_official_admin_on_profiles
      after insert on public.profiles
      for each row execute function public.grant_official_admin_on_profile();
  end if;
end $do$;
