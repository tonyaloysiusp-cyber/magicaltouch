-- Visitor counts. Small on purpose: one row per day+page and one per day+visitor
-- (an anonymous random id kept in the browser).
create table if not exists public.site_views_daily (
  day date not null default current_date,
  path text not null,
  views integer not null default 0,
  primary key (day, path)
);
create table if not exists public.site_visitors_daily (
  day date not null default current_date,
  visitor text not null,
  user_id uuid,
  views integer not null default 0,
  first_path text,
  referrer text,
  device text,
  primary key (day, visitor)
);
alter table public.site_views_daily enable row level security;
alter table public.site_visitors_daily enable row level security;
drop policy if exists "admins read views" on public.site_views_daily;
drop policy if exists "admins read visitors" on public.site_visitors_daily;
create policy "admins read views" on public.site_views_daily for select using (public.is_admin());
create policy "admins read visitors" on public.site_visitors_daily for select using (public.is_admin());

create or replace function public.track_visit(p_path text, p_visitor text, p_referrer text default null, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or length(p_visitor) < 8 or length(p_visitor) > 64 then return; end if;
  p_path := left(coalesce(nullif(split_part(p_path, '?', 1), ''), '/'), 200);
  insert into site_views_daily(day, path, views) values (current_date, p_path, 1)
    on conflict (day, path) do update set views = site_views_daily.views + 1;
  insert into site_visitors_daily(day, visitor, user_id, views, first_path, referrer, device)
    values (current_date, p_visitor, auth.uid(), 1, p_path, left(p_referrer, 200), left(p_device, 20))
    on conflict (day, visitor) do update set views = site_visitors_daily.views + 1,
      user_id = coalesce(site_visitors_daily.user_id, excluded.user_id);
end $$;
revoke all on function public.track_visit(text, text, text, text) from public;
grant execute on function public.track_visit(text, text, text, text) to anon, authenticated;

create or replace function public.admin_site_stats(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_new', (select count(*) from auth.users where created_at > now() - make_interval(days => p_days)),
    'users_active', (select count(*) from auth.users where last_sign_in_at > now() - make_interval(days => p_days)),
    'today_views', (select coalesce(sum(views),0) from site_views_daily where day = current_date),
    'today_visitors', (select count(*) from site_visitors_daily where day = current_date),
    'today_signed_in', (select count(distinct user_id) from site_visitors_daily where day = current_date and user_id is not null),
    'views', (select coalesce(sum(views),0) from site_views_daily where day > current_date - p_days),
    'visitors', (select count(distinct visitor) from site_visitors_daily where day > current_date - p_days),
    'daily', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
        select g::date as day,
          (select coalesce(sum(views),0) from site_views_daily v where v.day = g::date) as views,
          (select count(*) from site_visitors_daily v where v.day = g::date) as visitors,
          (select count(*) from auth.users u where u.created_at::date = g::date) as signups
        from generate_series(current_date - (p_days - 1), current_date, interval '1 day') g) d),
    'top_pages', (select coalesce(jsonb_agg(t), '[]') from (select path, sum(views) views from site_views_daily where day > current_date - p_days group by path order by 2 desc limit 15) t),
    'referrers', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(nullif(referrer,''),'Direct') referrer, count(*) visitors from site_visitors_daily where day > current_date - p_days group by 1 order by 2 desc limit 10) t),
    'devices', (select coalesce(jsonb_agg(t), '[]') from (select coalesce(device,'unknown') device, count(*) visitors from site_visitors_daily where day > current_date - p_days group by 1 order by 2 desc) t)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_site_stats(integer) from public;
grant execute on function public.admin_site_stats(integer) to authenticated;

-- Tutorials: lessons are completed in order. A lesson can only be marked
-- complete when every visible lesson before it is complete.
create or replace function public.course_order_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare missing text;
begin
  if public.is_admin() then return new; end if;
  select l.title into missing
  from public.course_lessons l
  where l.course_id = new.course_id and l.visible and not (l.id = any (new.completed_lessons))
    and exists (
      select 1 from public.course_lessons d
      where d.course_id = new.course_id and d.visible and d.id = any (new.completed_lessons)
        and (d.sort, d.title) > (l.sort, l.title)
    )
  order by l.sort, l.title limit 1;
  if missing is not null and (tg_op = 'INSERT' or exists (select unnest(new.completed_lessons) except select unnest(old.completed_lessons))) then
    raise exception 'Finish “%” first — lessons unlock one after another', missing;
  end if;
  return new;
end $$;
drop trigger if exists course_order_guard on public.course_progress;
create trigger course_order_guard before insert or update on public.course_progress
  for each row execute function public.course_order_guard();
