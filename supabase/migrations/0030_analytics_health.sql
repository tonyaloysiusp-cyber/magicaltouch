-- Richer visitor analytics (country, city, browser, OS, campaign, new vs
-- returning, page load time) and a small error log for the admin health page.
alter table public.site_visitors_daily add column if not exists country text, add column if not exists city text, add column if not exists browser text, add column if not exists os text, add column if not exists utm text, add column if not exists is_returning boolean not null default false;
alter table public.site_views_daily add column if not exists load_ms_sum bigint not null default 0, add column if not exists load_n integer not null default 0;
create table if not exists public.site_errors_daily (
  day date not null default current_date,
  path text not null,
  message text not null,
  count integer not null default 0,
  last_at timestamptz not null default now(),
  primary key (day, path, message)
);
alter table public.site_errors_daily enable row level security;
create policy "admins read errors" on public.site_errors_daily for select using (public.is_admin());

create or replace function public.track_visit2(p_path text, p_visitor text, p_referrer text default null, p_device text default null, p_country text default null, p_city text default null, p_browser text default null, p_os text default null, p_utm text default null, p_load_ms integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare ret boolean;
begin
  if p_visitor is null or length(p_visitor) < 8 or length(p_visitor) > 64 then return; end if;
  p_path := left(coalesce(nullif(split_part(p_path, '?', 1), ''), '/'), 200);
  if p_load_ms is not null and (p_load_ms < 0 or p_load_ms > 120000) then p_load_ms := null; end if;
  insert into site_views_daily(day, path, views, load_ms_sum, load_n) values (current_date, p_path, 1, coalesce(p_load_ms, 0), case when p_load_ms is null then 0 else 1 end)
    on conflict (day, path) do update set views = site_views_daily.views + 1,
      load_ms_sum = site_views_daily.load_ms_sum + coalesce(p_load_ms, 0),
      load_n = site_views_daily.load_n + case when p_load_ms is null then 0 else 1 end;
  ret := exists (select 1 from site_visitors_daily v where v.visitor = p_visitor and v.day < current_date);
  insert into site_visitors_daily(day, visitor, user_id, views, first_path, referrer, device, country, city, browser, os, utm, is_returning)
    values (current_date, p_visitor, auth.uid(), 1, p_path, left(p_referrer, 200), left(p_device, 20), left(p_country, 3), left(p_city, 60), left(p_browser, 20), left(p_os, 20), left(p_utm, 80), ret)
    on conflict (day, visitor) do update set views = site_visitors_daily.views + 1,
      user_id = coalesce(site_visitors_daily.user_id, excluded.user_id),
      country = coalesce(site_visitors_daily.country, excluded.country),
      city = coalesce(site_visitors_daily.city, excluded.city);
end $$;
revoke all on function public.track_visit2(text, text, text, text, text, text, text, text, text, integer) from public;
grant execute on function public.track_visit2(text, text, text, text, text, text, text, text, text, integer) to anon, authenticated;

create or replace function public.track_error(p_path text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_message is null or length(trim(p_message)) = 0 then return; end if;
  insert into site_errors_daily(day, path, message, count) values (current_date, left(coalesce(split_part(p_path, '?', 1), '/'), 200), left(p_message, 300), 1)
    on conflict (day, path, message) do update set count = site_errors_daily.count + 1, last_at = now();
end $$;
revoke all on function public.track_error(text, text) from public;
grant execute on function public.track_error(text, text) to anon, authenticated;

-- Admins can see and remove old uploaded pictures (Health → Storage).
create policy "Admins read all design assets" on storage.objects for select using (bucket_id = 'design-assets' and public.is_admin());
create policy "Admins remove design assets" on storage.objects for delete using (bucket_id = 'design-assets' and public.is_admin());

-- Everything the admin Overview shows, in one call.
create or replace function public.admin_site_stats(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; since date := current_date - (p_days - 1); prev date := current_date - (2 * p_days - 1);
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_new', (select count(*) from auth.users where created_at::date >= since),
    'users_new_prev', (select count(*) from auth.users where created_at::date >= prev and created_at::date < since),
    'users_active', (select count(*) from auth.users where last_sign_in_at::date >= since),
    'today_views', (select coalesce(sum(views),0) from site_views_daily where day = current_date),
    'today_visitors', (select count(*) from site_visitors_daily where day = current_date),
    'today_signed_in', (select count(distinct user_id) from site_visitors_daily where day = current_date and user_id is not null),
    'views', (select coalesce(sum(views),0) from site_views_daily where day >= since),
    'views_prev', (select coalesce(sum(views),0) from site_views_daily where day >= prev and day < since),
    'visitors', (select count(distinct visitor) from site_visitors_daily where day >= since),
    'visitors_prev', (select count(distinct visitor) from site_visitors_daily where day >= prev and day < since),
    'returning', (select count(distinct visitor) from site_visitors_daily where day >= since and is_returning),
    'bounce', (select coalesce(round(100.0 * count(*) filter (where views = 1) / nullif(count(*), 0)), 0) from site_visitors_daily where day >= since),
    'pages_per_visit', (select coalesce(round(avg(views)::numeric, 1), 0) from site_visitors_daily where day >= since),
    'avg_load_ms', (select coalesce(round(sum(load_ms_sum)::numeric / nullif(sum(load_n), 0)), 0) from site_views_daily where day >= since),
    'designs_new', (select count(*) from designs where created_at::date >= since),
    'daily', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
        select g::date as day,
          (select coalesce(sum(views),0) from site_views_daily v where v.day = g::date) as views,
          (select count(*) from site_visitors_daily v where v.day = g::date) as visitors,
          (select count(*) from auth.users u where u.created_at::date = g::date) as signups
        from generate_series(since, current_date, interval '1 day') g) d),
    'top_pages', (select coalesce(jsonb_agg(t), '[]') from (select path, sum(views) views, round(sum(load_ms_sum)::numeric / nullif(sum(load_n), 0)) load_ms from site_views_daily where day >= since group by path order by 2 desc limit 20) t),
    'slow_pages', (select coalesce(jsonb_agg(t), '[]') from (select path, round(sum(load_ms_sum)::numeric / nullif(sum(load_n), 0)) load_ms, sum(load_n) samples from site_views_daily where day >= since group by path having sum(load_n) >= 3 order by 2 desc limit 8) t),
    'entry_pages', (select coalesce(jsonb_agg(t), '[]') from (select first_path path, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc limit 10) t),
    'referrers', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(nullif(referrer,''),'Direct') referrer, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc limit 12) t),
    'campaigns', (select coalesce(jsonb_agg(t), '[]') from (select utm, count(*) visitors from site_visitors_daily where day >= since and utm is not null group by 1 order by 2 desc limit 10) t),
    'countries', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(country,'??') country, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc limit 15) t),
    'cities', (select coalesce(jsonb_agg(t), '[]') from (select city, country, count(*) visitors from site_visitors_daily where day >= since and city is not null group by 1, 2 order by 3 desc limit 10) t),
    'devices', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(device,'unknown') device, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc) t),
    'browsers', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(browser,'Other') browser, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc limit 8) t),
    'systems', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(os,'Other') os, count(*) visitors from site_visitors_daily where day >= since group by 1 order by 2 desc limit 8) t),
    'recent_signups', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(p.name, split_part(u.email, '@', 1)) name, u.created_at, u.last_sign_in_at from auth.users u left join profiles p on p.id = u.id order by u.created_at desc limit 8) t),
    'errors', (select coalesce(jsonb_agg(t), '[]') from (select path, message, sum(count) count, max(last_at) last_at from site_errors_daily where day >= since group by 1, 2 order by 3 desc limit 10) t)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_site_stats(integer) from public;
grant execute on function public.admin_site_stats(integer) to authenticated;

-- Health check numbers for Admin → Health.
create or replace function public.admin_health()
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'db_size_mb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'tables', (select coalesce(jsonb_agg(t), '[]') from (select relname name, round(pg_total_relation_size(c.oid) / 1048576.0, 2) mb, c.reltuples::bigint rows from pg_class c where c.relkind = 'r' and c.relnamespace = 'public'::regnamespace order by pg_total_relation_size(c.oid) desc limit 10) t),
    'buckets', (select coalesce(jsonb_agg(t), '[]') from (select bucket_id, count(*) files, round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) mb from storage.objects group by 1 order by 3 desc) t),
    'big_files', (select coalesce(jsonb_agg(t), '[]') from (select bucket_id, name, round((metadata->>'size')::bigint / 1048576.0, 1) mb, created_at from storage.objects where bucket_id = 'design-assets' and (metadata->>'size')::bigint > 1048576 order by (metadata->>'size')::bigint desc limit 30) t),
    'published_no_content', (select coalesce(jsonb_agg(t), '[]') from (select id, name from templates where status = 'published' and canvas_json is null limit 50) t),
    'published_no_thumb', (select coalesce(jsonb_agg(t), '[]') from (select id, name from templates where status = 'published' and coalesce(thumbnail, '') = '' limit 50) t),
    'heavy_templates', (select coalesce(jsonb_agg(t), '[]') from (select id, name, status, round(pg_column_size(canvas_json) / 1048576.0, 2) mb, width, height from templates where pg_column_size(canvas_json) > 900000 order by pg_column_size(canvas_json) desc limit 20) t),
    'versions_total', (select count(*) from template_versions),
    'versions_extra', (select coalesce(sum(greatest(n - 5, 0)), 0) from (select count(*) n from template_versions group by template_id) x),
    'errors_today', (select coalesce(sum(count), 0) from site_errors_daily where day = current_date),
    'errors_week', (select coalesce(sum(count), 0) from site_errors_daily where day > current_date - 7)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_health() from public;
grant execute on function public.admin_health() to authenticated;

-- What visitors search for in the template gallery (Admin → SEO → Keywords).
create table if not exists public.site_searches_daily (
  day date not null default current_date,
  q text not null,
  results integer not null default 0,
  count integer not null default 0,
  primary key (day, q)
);
alter table public.site_searches_daily enable row level security;
create policy "admins read searches" on public.site_searches_daily for select using (public.is_admin());
create or replace function public.track_search(p_q text, p_results integer)
returns void language plpgsql security definer set search_path = public as $$
declare q text := lower(regexp_replace(btrim(coalesce(p_q, '')), '\s+', ' ', 'g'));
begin
  if length(q) < 2 or length(q) > 60 then return; end if;
  insert into site_searches_daily(day, q, results, count) values (current_date, q, greatest(0, coalesce(p_results, 0)), 1)
    on conflict (day, q) do update set count = site_searches_daily.count + 1, results = excluded.results;
end $$;
revoke all on function public.track_search(text, integer) from public;
grant execute on function public.track_search(text, integer) to anon, authenticated;
create or replace function public.admin_searches(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return (select coalesce(jsonb_agg(t), '[]') from (select q, sum(count) searches, min(results) results from site_searches_daily where day > current_date - p_days group by q order by 2 desc limit 60) t);
end $$;
revoke all on function public.admin_searches(integer) from public;
grant execute on function public.admin_searches(integer) to authenticated;
