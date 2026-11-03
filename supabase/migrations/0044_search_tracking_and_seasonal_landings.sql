-- Applied 3 Nov 2026.
-- 1) Search tracking never saved anything: "q" was both a variable and a
--    column ("column reference q is ambiguous"), so Admin → Keywords had no
--    searches. Renamed the variable.
CREATE OR REPLACE FUNCTION public.track_search(p_q text, p_results integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_q text := lower(regexp_replace(btrim(coalesce(p_q, '')), '\s+', ' ', 'g'));
begin
  if length(v_q) < 2 or length(v_q) > 60 then return; end if;
  insert into site_searches_daily as s (day, q, results, count) values (current_date, v_q, greatest(0, coalesce(p_results, 0)), 1)
    on conflict (day, q) do update set count = s.count + 1, results = excluded.results;
end $function$;

-- 2) Landing pages: festival seasons (lib/landingSeasons.ts) and a month
--    without visitors before a page is removed.
CREATE OR REPLACE FUNCTION public.landing_data(p_token text DEFAULT NULL::text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  return json_build_object(
    'status', coalesce((select json_agg(s) from landing_status s), '[]'::json),
    'settings', coalesce((select value from site_settings where key = 'landing_lifecycle'), '{"on":true,"days":30}'),
    'google_since', (select case when value <> '' then updated_at::date end from site_settings where key = 'google_verification'),
    'occasions', coalesce((select json_agg(json_build_object('name', name, 'date', occasion_date)) from occasions where active and occasion_date between current_date - 30 and current_date + 400), '[]'::json),
    'season_off', coalesce((select value from site_settings where key = 'landing_season_off'), ''),
    'ideas', coalesce((select value from site_settings where key = 'landing_ideas'), '{}')
  );
end $function$;

CREATE OR REPLACE FUNCTION public.landing_season(p_token text, p_off text[], p_on text[])
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  hidden text[];
  season text[];
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  select coalesce(string_to_array(nullif(value, ''), ','), '{}') into hidden from site_settings where key = 'hidden_landings';
  select coalesce(string_to_array(nullif(value, ''), ','), '{}') into season from site_settings where key = 'landing_season_off';
  hidden := coalesce(hidden, '{}'); season := coalesce(season, '{}');
  p_off := array(select x from unnest(coalesce(p_off, '{}')) x where x ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and not x = any(hidden));
  hidden := hidden || p_off;
  season := array(select distinct x from unnest(season || p_off) x);
  p_on := array(select x from unnest(coalesce(p_on, '{}')) x where x = any(season));
  hidden := array(select x from unnest(hidden) x where not x = any(p_on));
  season := array(select x from unnest(season) x where not x = any(p_on));
  insert into site_settings (key, value, updated_at) values ('hidden_landings', array_to_string(hidden, ','), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into site_settings (key, value, updated_at) values ('landing_season_off', array_to_string(season, ','), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  return json_build_object('off', coalesce(array_length(p_off, 1), 0), 'on', coalesce(array_length(p_on, 1), 0));
end $function$;
grant execute on function public.landing_season(text, text[], text[]) to anon, authenticated;

alter table public.landing_status drop constraint if exists landing_status_status_check;
alter table public.landing_status add constraint landing_status_status_check check (status = any (array['working','warming','not-working','removed','off-season']));

update site_settings set value = '{"on":true,"days":30}', updated_at = now() where key = 'landing_lifecycle';
