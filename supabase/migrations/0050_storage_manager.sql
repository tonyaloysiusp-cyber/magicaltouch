-- Admin → Storage: where the free plan's space goes, and safe clean-ups.
-- Nothing here touches people's own designs, profiles, purchases, unlocks or
-- certificates. Templates that someone bought or unlocked are always kept.

-- Template pictures named by any template (thumbnail, preview or inside the
-- design), as storage object names in the template-media bucket.
create or replace function public._template_media_in_use()
returns table (bucket text, name text) language sql stable security definer set search_path = public as $$
  select distinct m[1], m[2]
  from templates t,
       lateral regexp_matches(
         coalesce(t.thumbnail, '') || ' ' || coalesce(t.preview, '') || ' ' || coalesce(t.canvas_json::text, ''),
         '/(template-media|template-thumbs)/([^"''?\s)]+)', 'g') m
$$;
revoke all on function public._template_media_in_use() from public, anon, authenticated;

create or replace function public.admin_storage_report()
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  create temp table if not exists _used (bucket text, name text, primary key (bucket, name)) on commit drop;
  truncate _used;
  insert into _used select bucket, name from public._template_media_in_use() on conflict do nothing;
  select jsonb_build_object(
    'db_size_mb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'tables', (select coalesce(jsonb_agg(t), '[]') from (
      select relname name, round(pg_total_relation_size(c.oid) / 1048576.0, 2) mb, greatest(c.reltuples, 0)::bigint rows
      from pg_class c where c.relkind = 'r' and c.relnamespace = 'public'::regnamespace
      order by pg_total_relation_size(c.oid) desc limit 15) t),
    'buckets', (select coalesce(jsonb_agg(t), '[]') from (
      select bucket_id, count(*) files, round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) mb
      from storage.objects group by 1 order by 3 desc) t),
    'templates', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from templates group by 1) t),
    'templates_protected', (select count(distinct id) from templates t where exists (select 1 from purchases p where p.template_id = t.id) or exists (select 1 from template_unlocks u where u.template_id = t.id)),
    'versions_total', (select count(*) from template_versions),
    'versions_extra', (select coalesce(sum(greatest(n - 3, 0)), 0) from (select count(*) n from template_versions group by template_id) x),
    'versions_mb', round(pg_total_relation_size('public.template_versions') / 1048576.0, 1),
    'orphan_files', (select count(*) from storage.objects o where o.bucket_id in ('template-media', 'template-thumbs') and not exists (select 1 from _used u where u.bucket = o.bucket_id and u.name = o.name)),
    'orphan_mb', (select round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) from storage.objects o where o.bucket_id in ('template-media', 'template-thumbs') and not exists (select 1 from _used u where u.bucket = o.bucket_id and u.name = o.name)),
    'logs_old', (select (select count(*) from site_views_daily where day < current_date - 90)
                      + (select count(*) from site_searches_daily where day < current_date - 90)
                      + (select count(*) from site_errors_daily where day < current_date - 90)),
    'backup_rows', 0
  ) into r;
  if to_regclass('public.template_copy_backup') is not null then
    execute 'select jsonb_set($1, ''{backup_rows}'', to_jsonb((select count(*) from public.template_copy_backup)))' into r using r;
  end if;
  return r;
end $$;
revoke all on function public.admin_storage_report() from public;
grant execute on function public.admin_storage_report() to authenticated;

-- Names of unused template pictures, a page at a time. The admin page then
-- removes them through the Storage API (admins may delete in template-media).
create or replace function public.admin_storage_orphans(p_limit integer default 500)
returns table (bucket text, name text, mb numeric) language plpgsql security definer set search_path = public, storage as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    with used as (select * from public._template_media_in_use())
    select o.bucket_id::text, o.name, round(coalesce((o.metadata->>'size')::bigint, 0) / 1048576.0, 2)
    from storage.objects o
    where o.bucket_id in ('template-media', 'template-thumbs')
      and not exists (select 1 from used u where u.bucket = o.bucket_id and u.name = o.name)
    order by o.created_at
    limit least(greatest(p_limit, 1), 1000);
end $$;
revoke all on function public.admin_storage_orphans(integer) from public;
grant execute on function public.admin_storage_orphans(integer) to authenticated;

-- Database clean-ups. p_dry = true only counts.
--   versions  keep the newest 3 saved versions of each template
--   logs      daily visit / search / error counts older than 90 days
--   archived  templates marked archived or unpublished (never bought/unlocked)
--   backup    the one-off template_copy_backup table rows
create or replace function public.admin_storage_clean(p_kind text, p_dry boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n bigint := 0;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_kind = 'versions' then
    if p_dry then
      select coalesce(sum(greatest(c - 3, 0)), 0) into n from (select count(*) c from template_versions group by template_id) x;
    else
      delete from template_versions v using (
        select id from (select id, row_number() over (partition by template_id order by created_at desc) rn from template_versions) z where rn > 3
      ) d where v.id = d.id;
      get diagnostics n = row_count;
    end if;
  elsif p_kind = 'logs' then
    if p_dry then
      select (select count(*) from site_views_daily where day < current_date - 90)
           + (select count(*) from site_searches_daily where day < current_date - 90)
           + (select count(*) from site_errors_daily where day < current_date - 90) into n;
    else
      delete from site_views_daily where day < current_date - 90; get diagnostics n = row_count;
      declare k bigint; begin
        delete from site_searches_daily where day < current_date - 90; get diagnostics k = row_count; n := n + k;
        delete from site_errors_daily where day < current_date - 90; get diagnostics k = row_count; n := n + k;
      end;
    end if;
  elsif p_kind = 'archived' then
    if p_dry then
      select count(*) into n from templates t where t.status in ('archived', 'unpublished')
        and not exists (select 1 from purchases p where p.template_id = t.id)
        and not exists (select 1 from template_unlocks u where u.template_id = t.id);
    else
      delete from templates t where t.status in ('archived', 'unpublished')
        and not exists (select 1 from purchases p where p.template_id = t.id)
        and not exists (select 1 from template_unlocks u where u.template_id = t.id);
      get diagnostics n = row_count;
    end if;
  elsif p_kind = 'backup' then
    if to_regclass('public.template_copy_backup') is null then n := 0;
    elsif p_dry then execute 'select count(*) from public.template_copy_backup' into n;
    else execute 'delete from public.template_copy_backup'; get diagnostics n = row_count; end if;
  else
    raise exception 'unknown clean-up %', p_kind;
  end if;
  return jsonb_build_object('kind', p_kind, 'dry', p_dry, 'rows', n);
end $$;
revoke all on function public.admin_storage_clean(text, boolean) from public;
grant execute on function public.admin_storage_clean(text, boolean) to authenticated;
