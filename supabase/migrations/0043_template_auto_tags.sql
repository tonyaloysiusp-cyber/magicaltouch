-- Facts the gallery search needs, kept on each template automatically:
--   'with-photo'  the design has a drop-in photo frame (search "photo",
--                 "photo editing", "birthday photo"…)
--   'N pages'     page count for multi-page designs (albums, magazines,
--                 brochures), so the gallery shows "40 pages" and the
--                 "photo album" search can tell an album from a collage.
-- Worked out from canvas_json whenever it is inserted or changed.

create or replace function public.template_auto_tags(p_tags text[], p_canvas jsonb)
returns text[] language plpgsql immutable as $$
declare
  t text := coalesce(p_canvas::text, '');
  n int;
  out text[];
begin
  out := array(select x from unnest(coalesce(p_tags, '{}')) x where x <> 'with-photo' and x !~ '^\d+ pages$');
  if t ~ '"__frame"' then out := out || 'with-photo'; end if;
  select count(*) into n from jsonb_array_elements(coalesce(p_canvas -> 'objects', '[]'::jsonb)) o where (o ->> '__isArtboard') = 'true';
  if n > 1 then out := out || (n || ' pages'); end if;
  return out;
end $$;

create or replace function public.templates_auto_tags_trg()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.canvas_json is distinct from old.canvas_json then
    new.tags := public.template_auto_tags(new.tags, new.canvas_json);
  end if;
  return new;
end $$;

drop trigger if exists templates_auto_tags on public.templates;
create trigger templates_auto_tags before insert or update of canvas_json on public.templates
  for each row execute function public.templates_auto_tags_trg();

update public.templates set tags = public.template_auto_tags(tags, canvas_json)
where tags is distinct from public.template_auto_tags(tags, canvas_json);
