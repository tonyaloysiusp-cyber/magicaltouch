-- Landing page lifecycle (Admin → SEO → Page health).
--
-- Every live landing page is checked daily and given a status:
--   working      visitors or search-engine visitors arrive, page loads, templates show
--   warming      live for less than the monitoring window (default 14 days),
--                or waiting for Google Search Console to be verified
--   not-working  broken (no templates / page error) or no visitors after the window
--   removed      switched off by the checker (or an admin); kept here with a
--                copy of the page so it can be brought back in one click
-- "Removed" pages are switched off, never deleted: built-in pages go into
-- hidden_landings, pages made in Admin are unpublished (back to draft), so
-- every removal can be undone in one click.

create table if not exists public.landing_status (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'builtin' check (kind in ('builtin', 'custom')),
  first_seen date not null default current_date,
  status text not null default 'warming' check (status in ('working', 'warming', 'not-working', 'removed')),
  reason text,
  views30 integer not null default 0,
  search30 integer not null default 0,
  templates integer,
  http integer,
  checked_at timestamptz,
  removed_at timestamptz,
  snapshot jsonb
);
alter table public.landing_status enable row level security;
drop policy if exists "admins manage landing status" on public.landing_status;
create policy "admins manage landing status" on public.landing_status for all using (public.is_admin()) with check (public.is_admin());

-- Everything the checker needs, for an admin or the daily job (cron token).
create or replace function public.landing_data(p_token text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  return json_build_object(
    'status', coalesce((select json_agg(s) from landing_status s), '[]'::json),
    'settings', coalesce((select value from site_settings where key = 'landing_lifecycle'), '{"on":true,"days":14}'),
    'google_since', (select case when value <> '' then updated_at::date end from site_settings where key = 'google_verification')
  );
end $$;
revoke all on function public.landing_data(text) from public;
grant execute on function public.landing_data(text) to anon, authenticated;

-- Save the day's statuses and remove pages that aren't working.
-- p_rows:    [{slug, kind, status, reason, views30, search30, templates, http}]
-- p_remove:  [{slug, kind, reason}]
create or replace function public.landing_apply(p_token text, p_rows jsonb, p_remove jsonb, p_summary text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  hidden text;
  removed int := 0;
  snap jsonb;
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
    select to_jsonb(p) into snap from seo_pages p where p.slug = r->>'slug';
    -- unpublish the Admin version (custom page, or an edit of a built-in one)
    update seo_pages set status = 'draft', updated_at = now() where slug = r->>'slug';
    if r->>'kind' <> 'custom' then
      select coalesce(value, '') into hidden from site_settings where key = 'hidden_landings';
      if position(',' || (r->>'slug') || ',' in ',' || coalesce(hidden, '') || ',') = 0 then
        insert into site_settings (key, value, updated_at) values ('hidden_landings', trim(both ',' from coalesce(hidden, '') || ',' || (r->>'slug')), now())
        on conflict (key) do update set value = excluded.value, updated_at = now();
      end if;
    end if;
    insert into landing_status (slug, kind, status, reason, removed_at, snapshot, checked_at)
    values (r->>'slug', coalesce(r->>'kind', 'builtin'), 'removed', r->>'reason', now(), snap, now())
    on conflict (slug) do update set status = 'removed', reason = excluded.reason, removed_at = now(), snapshot = coalesce(excluded.snapshot, landing_status.snapshot), checked_at = now();
    removed := removed + 1;
  end loop;
  insert into site_settings (key, value, updated_at)
  values ('landing_lifecycle_log', json_build_object('at', now(), 'removed', removed, 'checked', jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'summary', p_summary)::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  if removed > 0 and p_summary is not null then
    insert into admin_messages (kind, title, body, link, priority, dedupe_key)
    values ('system', 'Landing pages: ' || removed || ' removed (not working)', p_summary, '/admin/seo?tab=health', 'normal', 'landing-cleanup-' || current_date)
    on conflict (dedupe_key) do update set body = excluded.body, title = excluded.title;
  end if;
  return json_build_object('removed', removed);
end $$;
revoke all on function public.landing_apply(text, jsonb, jsonb, text) from public;
grant execute on function public.landing_apply(text, jsonb, jsonb, text) to anon, authenticated;

-- Admin: bring a removed page back (and restart its monitoring).
create or replace function public.landing_restore(p_slug text)
returns json language plpgsql security definer set search_path = public as $$
declare s landing_status; hidden text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into s from landing_status where slug = p_slug;
  if not found then raise exception 'Unknown page'; end if;
  -- republish the Admin version if it was published before removal
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

-- Daily check, 08:35 Dubai time.
do $do$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'mt-daily-landing-check';
  perform cron.schedule('mt-daily-landing-check', '35 4 * * *', $job$
    select net.http_post(
      url := 'https://www.magicaltouchdesign.com/api/cron/landing-check',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select token from app_private.cron_token limit 1)),
      body := '{}'::jsonb
    );
  $job$);
end
$do$;
