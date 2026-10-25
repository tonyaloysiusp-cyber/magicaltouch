-- A course that learners have progress or certificates in cannot be
-- deleted (that would erase their records); hide it instead.
create or replace function public.course_delete_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.course_progress p where p.course_id = old.id) then
    raise exception 'Learners have progress in this course - hide it instead of deleting it';
  end if;
  return old;
end $$;
create trigger course_delete_guard before delete on public.courses for each row execute function public.course_delete_guard();
