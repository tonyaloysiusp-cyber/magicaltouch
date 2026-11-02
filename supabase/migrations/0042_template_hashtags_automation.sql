-- Hashtags per template (Admin → Templates → Google & hashtags). Empty =
-- the site makes them automatically from the name, category and occasion.
alter table public.templates add column if not exists hashtags text[] not null default '{}';

-- What runs on its own, for Admin → SEO → Dashboard.
create or replace function public.admin_automation_status()
returns json language plpgsql stable security definer set search_path = public, cron as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return (select coalesce(json_agg(x order by x.name), '[]'::json) from (
    select j.jobname as name, j.schedule, j.active,
      (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid) as last_run,
      (select d.status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) as last_status
    from cron.job j) x);
end $$;
revoke all on function public.admin_automation_status() from public, anon;
grant execute on function public.admin_automation_status() to authenticated;

-- Fill search keywords where a published template has none, from its
-- category, occasion and industry. Never overwrites keywords you wrote.
create or replace function public.template_seo_autofill()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() and current_user not in ('postgres', 'supabase_admin') then raise exception 'admins only'; end if;
  update public.templates t set search_keywords = array_to_string(array(select distinct k from unnest(array[
      lower(t.category) || ' template', 'free ' || lower(t.category) || ' template',
      nullif(lower(coalesce(t.occasion, '')), '') , nullif(lower(coalesce(t.occasion, '')) || ' design', ' design'),
      nullif(lower(coalesce(t.industry, '')), ''), lower(t.category) || ' design online']) k where k is not null and k <> ''), ', ')
  where t.status = 'published' and coalesce(t.search_keywords, '') = '';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.template_seo_autofill() from public, anon;
grant execute on function public.template_seo_autofill() to authenticated;

select public.template_seo_autofill();
