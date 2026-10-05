-- ---------------------------------------------------------------------
-- 0010_protect_admin_flag.sql
-- Security fix: 0001 lets users update their own profiles row, and 0003
-- added is_admin to that same row -- so any signed-in user could set
-- is_admin = true on themselves and then create/edit/delete templates.
-- This trigger blocks signed-in users (and anonymous requests) from
-- setting or changing is_admin. Admins are granted only from the
-- Supabase dashboard / SQL editor, which run as a privileged role.
--
-- Apply by hand in the Supabase SQL editor, like every other migration.
-- ---------------------------------------------------------------------

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin can only be changed by an administrator';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_flag();
