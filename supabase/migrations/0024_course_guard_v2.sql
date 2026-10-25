-- Tighter certificate request rules: name validation matches the site form,
-- and a pending request cannot be edited while it waits for review.
create or replace function public.course_progress_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  required uuid[];
  c record;
begin
  select * into c from public.courses where id = new.course_id;
  if c.id is null then raise exception 'Unknown course'; end if;

  if not admin then
    if new.user_id <> auth.uid() then raise exception 'Not your progress'; end if;
    -- Learners can never touch review or certificate fields.
    if tg_op = 'INSERT' then
      new.certificate_code := null; new.certificate_path := null; new.reviewed_at := null; new.reviewed_by := null; new.released_at := null; new.review_note := null;
      if new.status not in ('in_progress', 'pending') then new.status := 'in_progress'; end if;
    else
      if old.status = 'approved' then raise exception 'This certificate is already approved'; end if;
      new.certificate_code := old.certificate_code; new.certificate_path := old.certificate_path;
      new.reviewed_at := old.reviewed_at; new.reviewed_by := old.reviewed_by; new.released_at := old.released_at;
      if new.status not in ('in_progress', 'pending') then raise exception 'Only an administrator can approve or reject'; end if;
      if new.status = 'in_progress' and old.status = 'rejected' then new.review_note := old.review_note; end if;
      if new.status = old.status then new.review_note := old.review_note; end if;
    end if;
    -- Keep only real lessons of this course.
    new.completed_lessons := coalesce(array(select distinct l.id from public.course_lessons l where l.course_id = new.course_id and l.id = any (new.completed_lessons)), '{}');
    -- While a request is waiting for review, the record it is judged on is frozen.
    if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'pending' then
      new.completed_lessons := old.completed_lessons; new.learner_name := old.learner_name;
    end if;

    if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
      select coalesce(array_agg(l.id), '{}') into required from public.course_lessons l where l.course_id = new.course_id and l.visible;
      if not (required <@ new.completed_lessons) then raise exception 'Finish every lesson before requesting a certificate'; end if;
      new.learner_name := regexp_replace(btrim(coalesce(new.learner_name, '')), '\s+', ' ', 'g');
      if length(new.learner_name) < 3 then raise exception 'Enter your full name as it should appear on the certificate'; end if;
      if length(new.learner_name) > 80 then raise exception 'That name is too long for a certificate (80 characters at most)'; end if;
      if new.learner_name !~ '[[:alpha:]]' or new.learner_name ~ '[0-9@#$%^*_=+<>{}|\\/~`\[\]]' then raise exception 'Use letters only in the name - no numbers or symbols'; end if;
      if c.prerequisite_slug is not null and not exists (
        select 1 from public.course_progress p join public.courses pc on pc.id = p.course_id
        where p.user_id = new.user_id and pc.slug = c.prerequisite_slug and p.status = 'approved'
      ) then raise exception 'Complete the previous level first'; end if;
      new.requested_at := now();
      new.review_note := null;
      insert into public.admin_messages (kind, title, body, link, priority, dedupe_key, meta)
      values ('system', 'Certificate request: ' || c.title, coalesce(new.learner_name, 'A learner') || ' finished “' || c.title || '” and asked for a certificate.', '/admin/courses', 'normal', 'cert-req-' || new.user_id || '-' || new.course_id || '-' || extract(epoch from now())::bigint, jsonb_build_object('course', c.slug))
      on conflict do nothing;
    end if;
  else
    -- Admin decisions must follow the workflow.
    if tg_op = 'UPDATE' then
      if old.status = 'approved' and old.released_at is not null and new.status <> 'approved' then raise exception 'This certificate is already released - revoke it in Verified certificates instead'; end if;
      if new.status = 'approved' and old.status <> 'approved' and old.status <> 'pending' then raise exception 'Only pending requests can be approved'; end if;
      if new.status = 'rejected' and old.status <> 'rejected' and length(btrim(coalesce(new.review_note, ''))) = 0 then raise exception 'Give a reason when rejecting'; end if;
      if new.released_at is not null and old.released_at is null and (new.status <> 'approved' or new.certificate_code is null) then raise exception 'Approve and issue the certificate before releasing it'; end if;
      if old.certificate_code is not null and new.certificate_code is distinct from old.certificate_code then raise exception 'A certificate was already issued for this course'; end if;
      if new.status in ('approved', 'rejected') and old.status = 'pending' then new.reviewed_at := now(); new.reviewed_by := auth.uid(); end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

