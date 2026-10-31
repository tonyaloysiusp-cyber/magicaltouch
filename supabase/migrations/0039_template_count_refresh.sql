-- Template counts update everywhere by themselves.
-- Whenever templates are added, published, unpublished or deleted — from
-- the Template Manager, the editor, a bulk import or SQL — the database asks
-- the site to refresh (POST /api/count-refresh with the private cron token).
-- At most once every 20 seconds, so a bulk import makes one call.
-- The display style lives in site setting `template_count_style`
-- (rounded50 | rounded100 | exact), set in Admin → Templates.

create or replace function public.templates_count_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare last timestamptz;
begin
  select updated_at into last from site_settings where key = 'template_count_refresh';
  if last is not null and last > now() - interval '20 seconds' then
    return null;
  end if;
  insert into site_settings (key, value, updated_at) values ('template_count_refresh', now()::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform net.http_post(
    url := 'https://www.magicaltouchdesign.com/api/count-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select token from app_private.cron_token limit 1)),
    body := '{}'::jsonb
  );
  return null;
exception when others then
  return null; -- never block saving a template because of a refresh
end $$;

create or replace trigger templates_count_changed
after insert or delete or update of status on public.templates
for each statement execute function public.templates_count_changed();
