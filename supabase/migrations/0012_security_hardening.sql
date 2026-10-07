-- ---------------------------------------------------------------------
-- 0012_security_hardening.sql
-- Fixes from the Supabase security advisor after applying 0001-0011:
--  * protect_profile_admin_flag gets a fixed search_path
--  * trim_design_versions is a trigger-only function; nobody should be
--    able to call it directly through the API
-- public.is_admin() stays callable on purpose: RLS policies call it as
-- the requesting user, and it only reveals the caller's own admin flag.
-- ---------------------------------------------------------------------
alter function public.protect_profile_admin_flag() set search_path = public;
revoke execute on function public.trim_design_versions() from public, anon, authenticated;
