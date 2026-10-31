-- Admin → Templates → File sizes: the heaviest templates (their saved design
-- size), so big ones can be shrunk with one click.
create or replace function public.admin_template_sizes(p_min_kb integer default 150)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return coalesce((select json_agg(x order by x.kb desc) from (
    select id, name, status, thumbnail, length(canvas_json::text) / 1024 as kb,
      (length(canvas_json::text) - length(replace(canvas_json::text, 'data:image/', ''))) / 11 as pictures
    from templates where length(canvas_json::text) >= p_min_kb * 1024
    order by length(canvas_json::text) desc limit 300) x), '[]'::json);
end $$;
revoke all on function public.admin_template_sizes(integer) from public;
grant execute on function public.admin_template_sizes(integer) to authenticated;
