-- Applied 6 Nov 2026. "Run the site from Claude": a Claude connector
-- (MCP server at /api/mcp) calls ONE database function, mcp_call, with a
-- private key. Keys are made in Admin → Hosting & renewals → Claude
-- connector; only their SHA-256 hash is stored, the key is shown once.
-- Every tool is limited to safe admin jobs: read stats, renewals,
-- messages, searches, festivals; publish / unpublish / retag templates;
-- update a renewal. Nothing here can delete users, designs or templates.

create schema if not exists app_private;
create table if not exists app_private.mcp_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
revoke all on app_private.mcp_keys from anon, authenticated;

-- Admin: make a new key (returned once) / list / revoke.
create or replace function public.mcp_new_key(p_label text default 'Claude')
returns text language plpgsql security definer set search_path to 'public' as $$
declare k text;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  k := 'mt_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into app_private.mcp_keys (key_hash, label, created_by) values (encode(sha256(convert_to(k, 'UTF8')), 'hex'), left(coalesce(p_label, 'Claude'), 60), auth.uid());
  return k;
end $$;

create or replace function public.mcp_keys_list()
returns json language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  return coalesce((select json_agg(json_build_object('id', id, 'label', label, 'created_at', created_at, 'last_used_at', last_used_at) order by created_at desc) from app_private.mcp_keys), '[]'::json);
end $$;

create or replace function public.mcp_key_revoke(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  delete from app_private.mcp_keys where id = p_id;
end $$;

-- The connector's single entry point.
create or replace function public.mcp_call(p_key text, p_tool text, p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  kid uuid;
  a jsonb := coalesce(p_args, '{}'::jsonb);
  lim int := least(greatest(coalesce((a->>'limit')::int, 20), 1), 100);
  r jsonb;
  n int;
begin
  select id into kid from app_private.mcp_keys where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
  if kid is null then raise exception 'Invalid connector key'; end if;
  update app_private.mcp_keys set last_used_at = now() where id = kid;

  if p_tool = 'site_overview' then
    return jsonb_build_object(
      'users', (select count(*) from auth.users),
      'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'designs', (select count(*) from public.designs),
      'designs_7d', (select count(*) from public.designs where created_at > now() - interval '7 days'),
      'templates_published', (select count(*) from public.templates where status = 'published'),
      'templates_draft', (select count(*) from public.templates where status in ('draft', 'review')),
      'unread_messages', (select count(*) from public.admin_messages where read_at is null and not archived),
      'renewals_next_30_days', (select count(*) from public.admin_services where status = 'active' and renews_on <= current_date + 30),
      'searches_7d', (select coalesce(sum(count), 0) from public.site_searches_daily where day > current_date - 7));

  elsif p_tool = 'list_services' then
    return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'kind', kind, 'provider', provider, 'plan', plan, 'cost', cost, 'currency', currency,
      'billing', billing_cycle, 'renews_on', renews_on, 'auto_renew', auto_renew, 'status', status, 'link', account_url, 'notes', notes, 'details', details) order by sort nulls last, renews_on nulls last)
      from public.admin_services), '[]'::jsonb);

  elsif p_tool = 'update_service' then
    update public.admin_services set
      renews_on = coalesce((a->>'renews_on')::date, renews_on),
      cost = coalesce((a->>'cost')::numeric, cost),
      currency = coalesce(nullif(a->>'currency', ''), currency),
      plan = coalesce(nullif(a->>'plan', ''), plan),
      status = coalesce(nullif(a->>'status', ''), status),
      auto_renew = coalesce((a->>'auto_renew')::boolean, auto_renew),
      notes = coalesce(nullif(a->>'notes', ''), notes),
      updated_at = now()
    where id = (a->>'id')::uuid;
    get diagnostics n = row_count;
    return jsonb_build_object('updated', n);

  elsif p_tool = 'list_messages' then
    return coalesce((select jsonb_agg(x) from (select id, kind, title, body, link, priority, due_on, read_at is not null as read, created_at
      from public.admin_messages where not archived and (coalesce((a->>'unread_only')::boolean, true) = false or read_at is null)
      order by created_at desc limit lim) x), '[]'::jsonb);

  elsif p_tool = 'mark_message_read' then
    update public.admin_messages set read_at = now() where id = (a->>'id')::uuid and read_at is null;
    get diagnostics n = row_count;
    return jsonb_build_object('updated', n);

  elsif p_tool = 'search_templates' then
    return coalesce((select jsonb_agg(x) from (select id, name, slug, category, status, width, height, tags, is_featured, updated_at
      from public.templates
      where (coalesce(a->>'query', '') = '' or name ilike '%' || (a->>'query') || '%' or coalesce(search_keywords, '') ilike '%' || (a->>'query') || '%' or (a->>'query') = any(tags))
        and (coalesce(a->>'status', '') = '' or status = a->>'status')
      order by updated_at desc limit lim) x), '[]'::jsonb);

  elsif p_tool = 'set_template_status' then
    if coalesce(a->>'status', '') not in ('published', 'draft') then raise exception 'status must be published or draft'; end if;
    update public.templates set status = a->>'status', updated_at = now(),
      published_at = case when a->>'status' = 'published' then coalesce(published_at, now()) else published_at end
    where id = (a->>'id')::uuid and (a->>'status' = 'draft' or (canvas_json is not null and thumbnail is not null));
    get diagnostics n = row_count;
    return jsonb_build_object('updated', n);

  elsif p_tool = 'update_template_info' then
    update public.templates set
      name = coalesce(nullif(a->>'name', ''), name),
      description = coalesce(nullif(a->>'description', ''), description),
      search_keywords = coalesce(nullif(a->>'keywords', ''), search_keywords),
      tags = coalesce((select array_agg(lower(trim(t))) from jsonb_array_elements_text(a->'tags') t), tags),
      is_featured = coalesce((a->>'featured')::boolean, is_featured),
      occasion = coalesce(nullif(a->>'occasion', ''), occasion),
      updated_at = now()
    where id = (a->>'id')::uuid;
    get diagnostics n = row_count;
    return jsonb_build_object('updated', n);

  elsif p_tool = 'top_searches' then
    return coalesce((select jsonb_agg(x) from (select q, sum(count) as searches, max(results) as results
      from public.site_searches_daily where day > current_date - least(coalesce((a->>'days')::int, 30), 365)
      group by q order by 2 desc limit lim) x), '[]'::jsonb);

  elsif p_tool = 'upcoming_festivals' then
    return coalesce((select jsonb_agg(x) from (select id, name, occasion_date, region, template_category, active
      from public.occasions where occasion_date >= current_date and occasion_date <= current_date + least(coalesce((a->>'days')::int, 90), 400)
      order by occasion_date limit lim) x), '[]'::jsonb);

  elsif p_tool = 'landing_pages' then
    return coalesce((select jsonb_agg(x) from (select slug, status, reason, views30, search30, templates, checked_at
      from public.landing_status where deleted_at is null order by views30 desc nulls last limit lim) x), '[]'::jsonb);

  else
    raise exception 'Unknown tool %', p_tool;
  end if;
end $$;

revoke all on function public.mcp_call(text, text, jsonb) from public;
grant execute on function public.mcp_call(text, text, jsonb) to anon, authenticated;
grant execute on function public.mcp_new_key(text), public.mcp_keys_list(), public.mcp_key_revoke(uuid) to authenticated;
