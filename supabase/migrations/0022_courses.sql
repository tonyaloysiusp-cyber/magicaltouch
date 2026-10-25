-- Courses & lessons (managed by admins), learner progress, and a
-- certificate workflow enforced in the database:
--   learner completes every visible lesson → requests a certificate with
--   their full name → status "pending" → an admin approves (or rejects with
--   a reason) → an admin releases it (certificate issued, PDF stored) →
--   only then can the learner download it.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Pro')),
  objectives text[] not null default '{}',
  certificate_title text not null default '',
  final_task text not null default '',
  prerequisite_slug text,
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  tool text not null default '',
  minutes integer not null default 5 check (minutes between 1 and 600),
  intro text not null default '',
  steps text[] not null default '{}',
  task text not null default '',
  try_href text not null default '/templates',
  try_label text not null default 'Try it',
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
create policy "Visible courses are public" on public.courses for select using (visible or public.is_admin());
create policy "Admins manage courses" on public.courses for all using (public.is_admin()) with check (public.is_admin());
create policy "Visible lessons are public" on public.course_lessons for select
  using (public.is_admin() or (visible and exists (select 1 from public.courses c where c.id = course_id and c.visible)));
create policy "Admins manage lessons" on public.course_lessons for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- progress
create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed_lessons uuid[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'pending', 'approved', 'rejected')),
  learner_name text,
  review_note text,
  certificate_code text unique,
  certificate_path text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
alter table public.course_progress enable row level security;
create policy "Learners read own course progress" on public.course_progress for select using (auth.uid() = user_id or public.is_admin());
create policy "Learners start own course progress" on public.course_progress for insert with check (auth.uid() = user_id or public.is_admin());
create policy "Learners update own course progress" on public.course_progress for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "Admins delete course progress" on public.course_progress for delete using (public.is_admin());

-- All rules live here, so nothing can be bypassed from the browser.
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

    if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
      select coalesce(array_agg(l.id), '{}') into required from public.course_lessons l where l.course_id = new.course_id and l.visible;
      if not (required <@ new.completed_lessons) then raise exception 'Finish every lesson before requesting a certificate'; end if;
      if length(btrim(coalesce(new.learner_name, ''))) < 3 then raise exception 'Enter your full name as it should appear on the certificate'; end if;
      new.learner_name := regexp_replace(btrim(new.learner_name), '\s+', ' ', 'g');
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

create trigger course_progress_guard before insert or update on public.course_progress for each row execute function public.course_progress_guard();
