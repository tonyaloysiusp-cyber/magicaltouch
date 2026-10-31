-- Broken landing pages are DELETED, not switched off (owner's decision).
--
-- "Broken" = the page gives an error, or shows no templates. For those:
--   · pages made in Admin: the seo_pages row is deleted for good
--   · built-in pages (defined in code): any Admin edit is deleted and the
--     page is taken off the site (hidden_landings → 404, out of the sitemap)
--   · status 'deleted', no copy kept
-- Pages that only lack visitors after the watch period are still switched
-- off (status 'removed') and can be restored.

alter table public.landing_status drop constraint if exists landing_status_status_check;
alter table public.landing_status add constraint landing_status_status_check
  check (status in ('working', 'warming', 'not-working', 'removed', 'deleted'));

-- p_remove: [{slug, kind, reason, delete?: true}]
create or replace function public.landing_apply(p_token text, p_rows jsonb, p_remove jsonb, p_summary text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  hidden text;
  removed int := 0;
  deleted int := 0;
  snap jsonb;
  del boolean;
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into landing_status (slug, kind, status, reason, views30, search30, templates, http, checked_at)
    values (r->>'slug', coalesce(r->>'kind', 'builtin'), r->>'status', r->>'reason', coalesce((r->>'views30')::int, 0), coalesce((r->>'search30')::int, 0), (r->>'templates')::int, (r->>'http')::int, now())
    on conflict (slug) do update set kind = excluded.kind, status = excluded.status, reason = excluded.reason, views30 = excluded.views30, search30 = excluded.search30,
      templates = excluded.templates, http = excluded.http, checked_at = now(), removed_at = null;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(p_remove, '[]'::jsonb)) loop
    continue when (r->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
    del := coalesce((r->>'delete')::boolean, false);
    if del then
      delete from seo_pages where slug = r->>'slug';
      snap := null;
    else
      select to_jsonb(p) into snap from seo_pages p where p.slug = r->>'slug';
      update seo_pages set status = 'draft', updated_at = now() where slug = r->>'slug';
    end if;
    if r->>'kind' <> 'custom' then
      select coalesce(value, '') into hidden from site_settings where key = 'hidden_landings';
      if position(',' || (r->>'slug') || ',' in ',' || coalesce(hidden, '') || ',') = 0 then
        insert into site_settings (key, value, updated_at) values ('hidden_landings', trim(both ',' from coalesce(hidden, '') || ',' || (r->>'slug')), now())
        on conflict (key) do update set value = excluded.value, updated_at = now();
      end if;
    end if;
    insert into landing_status (slug, kind, status, reason, removed_at, snapshot, checked_at)
    values (r->>'slug', coalesce(r->>'kind', 'builtin'), case when del then 'deleted' else 'removed' end, r->>'reason', now(), snap, now())
    on conflict (slug) do update set status = excluded.status, reason = excluded.reason, removed_at = now(),
      snapshot = case when del then null else coalesce(excluded.snapshot, landing_status.snapshot) end, checked_at = now();
    if del then deleted := deleted + 1; else removed := removed + 1; end if;
  end loop;
  insert into site_settings (key, value, updated_at)
  values ('landing_lifecycle_log', json_build_object('at', now(), 'removed', removed + deleted, 'deleted', deleted, 'checked', jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'summary', p_summary)::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  if removed + deleted > 0 and p_summary is not null then
    insert into admin_messages (kind, title, body, link, priority, dedupe_key)
    values ('system', 'Landing pages: ' || deleted || ' deleted, ' || removed || ' switched off', p_summary, '/admin/seo?tab=health', 'normal', 'landing-cleanup-' || current_date)
    on conflict (dedupe_key) do update set body = excluded.body, title = excluded.title;
  end if;
  return json_build_object('removed', removed + deleted, 'deleted', deleted);
end $$;
revoke all on function public.landing_apply(text, jsonb, jsonb, text) from public;
grant execute on function public.landing_apply(text, jsonb, jsonb, text) to anon, authenticated;

-- Restore: switched-off pages come back; deleted Admin pages are gone for good.
-- A deleted built-in page can come back (its content lives in the code).
create or replace function public.landing_restore(p_slug text)
returns json language plpgsql security definer set search_path = public as $$
declare s landing_status; hidden text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into s from landing_status where slug = p_slug;
  if not found then raise exception 'Unknown page'; end if;
  if s.status = 'deleted' and s.kind = 'custom' then raise exception 'This page was deleted for good — create it again in Landing pages'; end if;
  if s.snapshot is not null and s.snapshot->>'status' = 'published' then
    update seo_pages set status = 'published', updated_at = now() where slug = p_slug;
  end if;
  select coalesce(value, '') into hidden from site_settings where key = 'hidden_landings';
  update site_settings set value = array_to_string(array_remove(string_to_array(hidden, ','), p_slug), ','), updated_at = now() where key = 'hidden_landings';
  update landing_status set status = 'warming', reason = 'Restored — monitoring again', removed_at = null, first_seen = current_date where slug = p_slug;
  return json_build_object('restored', p_slug);
end $$;
revoke all on function public.landing_restore(text) from public;
grant execute on function public.landing_restore(text) to authenticated;

-- The page already taken off for showing no templates: delete it for good.
delete from public.seo_pages where slug = 'free-graphic-design-templates';
update public.landing_status set status = 'deleted', snapshot = null, removed_at = now()
  where slug = 'free-graphic-design-templates';
