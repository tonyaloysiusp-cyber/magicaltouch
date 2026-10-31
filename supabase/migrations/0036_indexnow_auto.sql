-- Weekly automatic "Send to search engines" (IndexNow) from the daily page
-- check. The cron route records when it last sent with this function, so the
-- SEO setup step "Pages sent to search engines" stays green by itself.
create or replace function public.cron_mark_indexnow(p_token text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or (p_token is not null and exists (select 1 from app_private.cron_token where token = p_token))) then
    raise exception 'Not allowed';
  end if;
  insert into site_settings (key, value, updated_at) values ('indexnow_last', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return json_build_object('ok', true);
end $$;
revoke all on function public.cron_mark_indexnow(text) from public;
grant execute on function public.cron_mark_indexnow(text) to anon, authenticated;
