-- SEO performance & autopilot (Admin → SEO → Performance).
--
-- seo_perf_data: everything needed to see which pages work — views now and
--   the 30 days before, entries and entries from search engines per page,
--   what visitors searched, tracked keywords, upcoming occasions, the
--   landing pages and the autopilot setting. Admins, or the weekly job with
--   the private cron token.
-- seo_apply: the only writes the autopilot makes — publish a new landing
--   page (never overwrites one), switch a page off (reversible), log the run
--   and post a summary to the admin inbox (it goes out in the daily email).
-- Weekly job: Mondays 08:20 Dubai time; the site only acts when an admin
--   has switched the autopilot on (site setting seo_autopilot = 'on').

create or replace function public.seo_perf_data(p_token text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  d30 date := current_date - 29;
  d60 date := current_date - 59;
  se text := '(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org|baidu\.com|search\.brave\.com)$';
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  return json_build_object(
    'views', coalesce((select json_agg(v) from (
        select path, sum(views) filter (where day >= d30) as v30, sum(views) filter (where day < d30) as vprev
        from site_views_daily where day >= d60 group by path) v), '[]'::json),
    'entries', coalesce((select json_agg(e) from (
        select first_path as path, count(*) as n, count(*) filter (where referrer ~ se) as search
        from site_visitors_daily where day >= d30 and first_path is not null group by first_path) e), '[]'::json),
    'searches', coalesce((select json_agg(s) from (
        select q, sum(count) as n, max(results) as results from site_searches_daily where day >= d30 group by q order by 2 desc limit 200) s), '[]'::json),
    'keywords', coalesce((select json_agg(name) from promo_items where kind = 'keyword'), '[]'::json),
    'occasions', coalesce((select json_agg(o) from (
        select name, occasion_date from occasions where active and occasion_date between current_date and current_date + 75 order by occasion_date) o), '[]'::json),
    'pages', coalesce((select json_agg(p) from (select slug, title, h1, description, intro, thing, terms, faqs, status, created_at from seo_pages) p), '[]'::json),
    'hidden', coalesce((select value from site_settings where key = 'hidden_landings'), ''),
    'autopilot', coalesce((select value from site_settings where key = 'seo_autopilot'), 'off'),
    'last_run', (select value from site_settings where key = 'seo_autopilot_log')
  );
end $$;
revoke all on function public.seo_perf_data(text) from public;
grant execute on function public.seo_perf_data(text) to anon, authenticated;

create or replace function public.seo_apply(p_token text, p_actions jsonb, p_summary text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  a jsonb;
  pg jsonb;
  hidden text;
  published int := 0;
  hid int := 0;
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  for a in select * from jsonb_array_elements(coalesce(p_actions, '[]'::jsonb)) loop
    if a->>'type' = 'publish' then
      pg := a->'page';
      insert into seo_pages (slug, title, h1, description, intro, thing, terms, faqs, status)
      values (pg->>'slug', left(pg->>'title', 120), left(pg->>'h1', 120), left(pg->>'description', 300), coalesce(pg->>'intro', ''), coalesce(pg->>'thing', 'design'),
              coalesce((select array_agg(x) from jsonb_array_elements_text(pg->'terms') x), '{}'), coalesce(pg->'faqs', '[]'::jsonb), 'published')
      on conflict (slug) do nothing;
      if found then published := published + 1; end if;
    elsif a->>'type' = 'hide' and (a->>'slug') ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      select coalesce(value, '') into hidden from site_settings where key = 'hidden_landings';
      if position(',' || (a->>'slug') || ',' in ',' || coalesce(hidden, '') || ',') = 0 then
        insert into site_settings (key, value, updated_at) values ('hidden_landings', trim(both ',' from coalesce(hidden, '') || ',' || (a->>'slug')), now())
        on conflict (key) do update set value = excluded.value, updated_at = now();
        hid := hid + 1;
      end if;
    end if;
  end loop;
  insert into site_settings (key, value, updated_at)
  values ('seo_autopilot_log', json_build_object('at', now(), 'published', published, 'hidden', hid, 'summary', p_summary)::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  if p_summary is not null and (published > 0 or hid > 0 or p_token is not null) then
    insert into admin_messages (kind, title, body, link, priority, dedupe_key)
    values ('system', 'SEO autopilot: ' || published || ' new page(s), ' || hid || ' switched off', p_summary, '/admin/seo?tab=performance', 'normal', 'seo-autopilot-' || current_date)
    on conflict (dedupe_key) do update set body = excluded.body, title = excluded.title;
  end if;
  return json_build_object('published', published, 'hidden', hid);
end $$;
revoke all on function public.seo_apply(text, jsonb, text) from public;
grant execute on function public.seo_apply(text, jsonb, text) to anon, authenticated;

-- Weekly run, Mondays 04:20 UTC (08:20 Dubai).
do $do$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'mt-weekly-seo-autopilot';
  perform cron.schedule('mt-weekly-seo-autopilot', '20 4 * * 1', $job$
    select net.http_post(
      url := 'https://www.magicaltouchdesign.com/api/cron/seo-autopilot',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select token from app_private.cron_token limit 1)),
      body := '{}'::jsonb
    );
  $job$);
end
$do$;
