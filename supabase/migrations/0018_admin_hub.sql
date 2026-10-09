-- ---------------------------------------------------------------------
-- 0018_admin_hub.sql
-- Admin hub: services & renewals (hosting, domain, email…), an admin
-- inbox (renewal alerts, festival reminders, contact messages), editable
-- wording for the site's own emails, and the festival calendar with a
-- daily check that posts reminders 10 days ahead.
-- ---------------------------------------------------------------------

-- ---------- Services & renewals ----------
create table if not exists public.admin_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'other' check (kind in ('hosting', 'domain', 'email', 'database', 'ssl', 'software', 'storage', 'other')),
  provider text,
  plan text,
  account_url text,
  cost numeric(12, 2),
  currency text not null default 'AED',
  billing_cycle text not null default 'yearly' check (billing_cycle in ('monthly', 'yearly', 'one-time', 'free')),
  renews_on date,
  auto_renew boolean not null default false,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_services enable row level security;
create policy "admin services" on public.admin_services for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Admin inbox ----------
create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('renewal', 'occasion', 'contact', 'system')),
  title text not null,
  body text,
  link text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  dedupe_key text unique,
  due_on date,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived boolean not null default false,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_messages_created_idx on public.admin_messages (created_at desc);
alter table public.admin_messages enable row level security;
create policy "admin messages" on public.admin_messages for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Festival & occasion calendar ----------
create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  occasion_date date not null,
  region text not null default 'Global',
  template_category text,
  ideas text,
  lead_days integer not null default 10 check (lead_days between 1 and 90),
  active boolean not null default true,
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name, occasion_date)
);
alter table public.occasions enable row level security;
create policy "admin occasions" on public.occasions for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Editable email wording ----------
create table if not exists public.email_copy (
  key text primary key check (key in ('welcome', 'password_changed')),
  subject text,
  heading text,
  intro text,
  body text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.email_copy enable row level security;
create policy "email copy read" on public.email_copy for select using (true);
create policy "email copy write" on public.email_copy for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Private token for the daily e-mail digest ----------
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.cron_token (token text primary key);
insert into app_private.cron_token (token)
select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from app_private.cron_token);

-- ---------- Daily check ----------
create or replace function public.admin_daily_check()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  k integer;
begin
  if not (public.is_admin() or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'Administrators only';
  end if;

  -- Festivals and occasions coming up within their lead time (10 days).
  insert into public.admin_messages (kind, title, body, link, priority, dedupe_key, due_on, meta)
  select 'occasion',
         o.name || ' — ' || case when o.occasion_date = current_date then 'today'
                                 when o.occasion_date - current_date = 1 then 'tomorrow'
                                 else 'in ' || (o.occasion_date - current_date) || ' days' end
                || ' (' || to_char(o.occasion_date, 'FMDay, FMDD Mon YYYY') || ')',
         'Create and publish templates now so customers find them in time. Ideas: ' || coalesce(o.ideas, ''),
         '/admin?tab=occasions',
         case when o.occasion_date - current_date <= 3 then 'high' else 'normal' end,
         'occasion:' || o.id,
         o.occasion_date,
         jsonb_build_object('occasion_id', o.id, 'region', o.region, 'category', o.template_category)
  from public.occasions o
  where o.active and o.occasion_date between current_date and current_date + o.lead_days
  on conflict (dedupe_key) do nothing;
  get diagnostics k = row_count; n := n + k;

  -- Hosting, domain and other renewals: 30, 14, 7 and 1 day ahead, and when expired.
  insert into public.admin_messages (kind, title, body, link, priority, dedupe_key, due_on, meta)
  select 'renewal',
         case when s.renews_on < current_date then s.name || ' expired ' || (current_date - s.renews_on) || ' day(s) ago'
              when s.renews_on = current_date then s.name || ' renews/expires today'
              else s.name || ' renews/expires in ' || (s.renews_on - current_date) || ' day(s)' end
           || ' (' || to_char(s.renews_on, 'FMDD Mon YYYY') || ')',
         concat_ws(' · ', nullif(s.provider, ''), nullif(s.plan, ''),
                   case when s.cost is not null then s.currency || ' ' || s.cost::text end,
                   case when s.auto_renew then 'auto-renew is ON' else 'auto-renew is OFF — renew it manually' end),
         '/admin?tab=services',
         case when s.renews_on - current_date <= 7 then 'high' else 'normal' end,
         'renewal:' || s.id || ':' || s.renews_on || ':' ||
           case when s.renews_on < current_date then 'expired'
                when s.renews_on - current_date <= 1 then '1'
                when s.renews_on - current_date <= 7 then '7'
                when s.renews_on - current_date <= 14 then '14'
                else '30' end,
         s.renews_on,
         jsonb_build_object('service_id', s.id, 'kind', s.kind)
  from public.admin_services s
  where s.status = 'active' and s.renews_on is not null and s.renews_on <= current_date + 30
  on conflict (dedupe_key) do nothing;
  get diagnostics k = row_count; n := n + k;

  update public.admin_services set status = 'expired', updated_at = now()
  where status = 'active' and renews_on < current_date - 30 and not auto_renew;

  return n;
end;
$$;
revoke all on function public.admin_daily_check() from public, anon;
grant execute on function public.admin_daily_check() to authenticated;

-- The digest route reads new alerts with the private token (no keys in code).
create or replace function public.cron_digest(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_private.cron_token where token = p_token) then
    raise exception 'Not allowed';
  end if;
  return json_build_object(
    'messages', coalesce((select json_agg(m order by m.priority desc, m.due_on nulls last) from (
        select id, kind, title, body, link, priority, due_on from public.admin_messages
        where emailed_at is null and not archived and kind <> 'contact' and created_at > now() - interval '3 days') m), '[]'::json),
    'contacts', coalesce((select json_agg(m order by m.created_at) from (
        select id, title, body, meta, created_at from public.admin_messages
        where emailed_at is null and kind = 'contact' and created_at > now() - interval '3 days') m), '[]'::json),
    'admins', coalesce((select json_agg(u.email) from auth.users u join public.profiles p on p.id = u.id where p.is_admin and u.email is not null), '[]'::json)
  );
end;
$$;
revoke all on function public.cron_digest(text) from public;
grant execute on function public.cron_digest(text) to anon, authenticated;

create or replace function public.cron_mark_emailed(p_token text, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_private.cron_token where token = p_token) then
    raise exception 'Not allowed';
  end if;
  update public.admin_messages set emailed_at = now() where id = any(p_ids);
end;
$$;
revoke all on function public.cron_mark_emailed(text, uuid[]) from public;
grant execute on function public.cron_mark_emailed(text, uuid[]) to anon, authenticated;

-- ---------- Contact form ----------
create or replace function public.submit_contact_message(p_name text, p_email text, p_subject text, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid e-mail address'; end if;
  if length(trim(coalesce(p_message, ''))) < 5 then raise exception 'Please write a message'; end if;
  if length(p_message) > 5000 or length(coalesce(p_name, '')) > 120 or length(coalesce(p_subject, '')) > 200 then
    raise exception 'Message is too long';
  end if;
  if (select count(*) from public.admin_messages where kind = 'contact' and meta->>'email' = e and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Thanks — we already have your messages. Please wait a little before sending more.';
  end if;
  insert into public.admin_messages (kind, title, body, link, priority, meta)
  values ('contact', coalesce(nullif(trim(p_subject), ''), 'New message') || ' — ' || coalesce(nullif(trim(p_name), ''), e),
          trim(p_message), '/admin?tab=messages', 'normal',
          jsonb_build_object('name', trim(coalesce(p_name, '')), 'email', e));
end;
$$;
revoke all on function public.submit_contact_message(text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text) to anon, authenticated;

-- ---------- Overview numbers ----------
create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  return json_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'designs', (select count(*) from public.designs),
    'designs_7d', (select count(*) from public.designs where created_at > now() - interval '7 days'),
    'templates_published', (select count(*) from public.templates where status = 'published'),
    'templates_draft', (select count(*) from public.templates where status in ('draft', 'review')),
    'subscribers', (select count(*) from public.profiles where marketing_status = 'subscribed'),
    'unread', (select count(*) from public.admin_messages where read_at is null and not archived),
    'renewals_30d', (select count(*) from public.admin_services where status = 'active' and renews_on <= current_date + 30),
    'emails_24h', (select count(*) from public.email_log where status in ('SENT', 'DELIVERED') and sent_at > now() - interval '24 hours')
  );
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
insert into public.occasions (name, occasion_date, region, template_category, ideas, built_in) values
('World Teachers'' Day', '2026-10-05', 'Global', 'Cards', 'Teacher appreciation card & post', true),
('Halloween', '2026-10-31', 'Global', 'Events', 'Party invitation, spooky sale post, kids event poster', true),
('UAE Flag Day', '2026-11-03', 'UAE / Gulf', 'Social Media', 'Flag Day greeting post, office celebration poster', true),
('Diwali', '2026-11-08', 'India / Hindu', 'Cards', 'Diwali greeting card & post, diya-themed sale flyer, party invite, sweet-box label', true),
('Children''s Day (India)', '2026-11-14', 'India', 'Social Media', 'Kids greeting post, school event poster', true),
('Thanksgiving (US)', '2026-11-26', 'US', 'Cards', 'Thanksgiving card, dinner menu, gratitude post', true),
('Black Friday', '2026-11-27', 'Global', 'Marketing', 'Black Friday sale post & story, discount coupon, flash-sale banner, email header', true),
('Cyber Monday', '2026-11-30', 'Global', 'Marketing', 'Online sale post, discount code story', true),
('UAE Commemoration Day', '2026-11-30', 'UAE / Gulf', 'Social Media', 'Martyrs’ Day remembrance post', true),
('UAE National Day', '2026-12-02', 'UAE / Gulf', 'Social Media', 'Eid Al Etihad greeting, national-day sale, event poster, corporate card', true),
('Christmas', '2026-12-25', 'Global', 'Cards', 'Christmas card, party invite, carol night poster, holiday sale post, gift tag', true),
('New Year''s Eve', '2026-12-31', 'Global', 'Events', 'NYE party invitation, countdown poster, year-in-review post', true),
('New Year''s Day', '2027-01-01', 'Global', 'Social Media', 'New Year greeting post & story, countdown story, “Happy New Year” card, new-year offer flyer', true),
('Pongal / Makar Sankranti', '2027-01-14', 'India / Hindu', 'Social Media', 'Pongal greeting post, kite-festival poster', true),
('Republic Day (India)', '2027-01-26', 'India', 'Social Media', 'Tricolour greeting post, school/office event poster', true),
('Chinese New Year', '2027-02-06', 'Chinese', 'Social Media', 'Lunar New Year greeting (Year of the Goat), red-and-gold sale post', true),
('Ramadan begins', '2027-02-08', 'Islamic', 'Social Media', 'Ramadan Kareem post, iftar menu, iftar invitation, Ramadan offer flyer, prayer timetable', true),
('Valentine''s Day', '2027-02-14', 'Global', 'Cards', 'Love card, couple photo collage, Valentine offer post, dinner menu, gift voucher', true),
('Mothering Sunday (UK)', '2027-03-07', 'UK', 'Cards', 'Mother’s Day card (UK)', true),
('International Women''s Day', '2027-03-08', 'Global', 'Social Media', 'Celebrating women post, quote card, team appreciation post, event flyer', true),
('Eid al-Fitr', '2027-03-09', 'Islamic', 'Cards', 'Eid Mubarak card & post, Eid sale flyer, family gathering invite', true),
('Mother''s Day (UAE & Arab world)', '2027-03-21', 'UAE / Gulf', 'Cards', 'Mother’s Day card, photo tribute post, spa/salon/gift offer flyer', true),
('Palm Sunday', '2027-03-21', 'Christian', 'Social Media', 'Church service poster, greeting post', true),
('Holi', '2027-03-23', 'India / Hindu', 'Social Media', 'Colourful Holi greeting post, party invite, festive sale', true),
('Good Friday', '2027-03-26', 'Christian', 'Social Media', 'Reflective church post, service timings poster', true),
('Easter', '2027-03-28', 'Christian', 'Cards', 'Easter card, egg-hunt invite, church service poster, brunch menu', true),
('Vishu', '2027-04-14', 'India (Kerala)', 'Social Media', 'Vishu greeting post (kani konna yellow), sadya menu, family photo card', true),
('Earth Day', '2027-04-22', 'Global', 'Social Media', 'Eco awareness post, green campaign poster', true),
('Labour Day', '2027-05-01', 'Global', 'Social Media', 'Thank-you-workers post, holiday notice', true),
('Mother''s Day (US, India & more)', '2027-05-09', 'Global', 'Cards', 'Mother’s Day card, photo collage, gift offer post', true),
('Eid al-Adha', '2027-05-16', 'Islamic', 'Cards', 'Eid al-Adha greeting post & card, holiday notice', true),
('Islamic New Year', '2027-06-06', 'Islamic', 'Social Media', 'Hijri New Year greeting post', true),
('Father''s Day', '2027-06-20', 'Global', 'Cards', 'Father’s Day card, “Best Dad” post, gift offer flyer', true),
('Friendship Day', '2027-08-01', 'India', 'Social Media', 'Friendship quote post, photo collage, friends story', true),
('Prophet''s Birthday (Mawlid)', '2027-08-14', 'Islamic', 'Social Media', 'Mawlid greeting post', true),
('Independence Day (India)', '2027-08-15', 'India', 'Social Media', 'Independence Day greeting, tricolour poster, event invite', true),
('Raksha Bandhan', '2027-08-17', 'India / Hindu', 'Cards', 'Rakhi greeting card, gift offer post', true),
('Janmashtami', '2027-08-24', 'India / Hindu', 'Social Media', 'Krishna Janmashtami greeting post', true),
('Emirati Women''s Day', '2027-08-28', 'UAE / Gulf', 'Social Media', 'Tribute post, corporate greeting', true),
('Ganesh Chaturthi', '2027-09-04', 'India / Hindu', 'Social Media', 'Ganesh Chaturthi greeting post, puja invite', true),
('Teachers'' Day (India)', '2027-09-05', 'India', 'Cards', 'Thank-you teacher card, school poster, certificate', true),
('Onam (Thiruvonam)', '2027-09-12', 'India (Kerala)', 'Cards', 'Onam greeting card & post (pookalam), sadya menu, Onam celebration invite, Onam sale flyer', true),
('Saudi National Day', '2027-09-23', 'UAE / Gulf', 'Social Media', 'Green national-day greeting, offer post', true),
('Navratri begins', '2027-09-30', 'India / Hindu', 'Events', 'Garba/Dandiya night poster, Navratri greeting', true),
('World Teachers'' Day', '2027-10-05', 'Global', 'Cards', 'Teacher appreciation card & post', true),
('Dussehra', '2027-10-09', 'India / Hindu', 'Social Media', 'Dussehra greeting post', true),
('Diwali', '2027-10-29', 'India / Hindu', 'Cards', 'Diwali greeting card & post, sale flyer, party invite', true),
('Halloween', '2027-10-31', 'Global', 'Events', 'Party invitation, spooky sale post, kids event poster', true),
('UAE Flag Day', '2027-11-03', 'UAE / Gulf', 'Social Media', 'Flag Day greeting post, office celebration poster', true),
('Children''s Day (India)', '2027-11-14', 'India', 'Social Media', 'Kids greeting post, school event poster', true),
('Update the festival calendar for 2028', '2027-11-15', 'Magical Touch', 'Social Media', 'Moon-based festival dates for 2028 (Diwali, Holi, Onam, Eid…) need adding in Admin → Occasions.', true),
('Thanksgiving (US)', '2027-11-25', 'US', 'Cards', 'Thanksgiving card, dinner menu, gratitude post', true),
('Black Friday', '2027-11-26', 'Global', 'Marketing', 'Black Friday sale post & story, discount coupon, flash-sale banner, email header', true),
('Cyber Monday', '2027-11-29', 'Global', 'Marketing', 'Online sale post, discount code story', true),
('UAE Commemoration Day', '2027-11-30', 'UAE / Gulf', 'Social Media', 'Martyrs’ Day remembrance post', true),
('UAE National Day', '2027-12-02', 'UAE / Gulf', 'Social Media', 'Eid Al Etihad greeting, national-day sale, event poster, corporate card', true),
('Christmas', '2027-12-25', 'Global', 'Cards', 'Christmas card, party invite, carol night poster, holiday sale post, gift tag', true),
('New Year''s Eve', '2027-12-31', 'Global', 'Events', 'NYE party invitation, countdown poster, year-in-review post', true),
('New Year''s Day', '2028-01-01', 'Global', 'Social Media', 'New Year greeting post & story, countdown story, “Happy New Year” card, new-year offer flyer', true),
('Republic Day (India)', '2028-01-26', 'India', 'Social Media', 'Tricolour greeting post, school/office event poster', true),
('Chinese New Year', '2028-01-26', 'Chinese', 'Social Media', 'Lunar New Year greeting (Year of the Monkey)', true),
('Ramadan begins', '2028-01-28', 'Islamic', 'Social Media', 'Ramadan Kareem post, iftar menu & invite, offer flyer', true),
('Valentine''s Day', '2028-02-14', 'Global', 'Cards', 'Love card, couple photo collage, Valentine offer post, dinner menu, gift voucher', true),
('Eid al-Fitr', '2028-02-26', 'Islamic', 'Cards', 'Eid Mubarak card & post, Eid sale flyer', true),
('International Women''s Day', '2028-03-08', 'Global', 'Social Media', 'Celebrating women post, quote card, team appreciation post, event flyer', true),
('Mother''s Day (UAE & Arab world)', '2028-03-21', 'UAE / Gulf', 'Cards', 'Mother’s Day card, photo tribute post, spa/salon/gift offer flyer', true),
('Mothering Sunday (UK)', '2028-03-26', 'UK', 'Cards', 'Mother’s Day card (UK)', true),
('Palm Sunday', '2028-04-09', 'Christian', 'Social Media', 'Church service poster, greeting post', true),
('Vishu', '2028-04-14', 'India (Kerala)', 'Social Media', 'Vishu greeting post (kani konna yellow), sadya menu, family photo card', true),
('Good Friday', '2028-04-14', 'Christian', 'Social Media', 'Reflective church post, service timings poster', true),
('Easter', '2028-04-16', 'Christian', 'Cards', 'Easter card, egg-hunt invite, church service poster, brunch menu', true),
('Earth Day', '2028-04-22', 'Global', 'Social Media', 'Eco awareness post, green campaign poster', true),
('Labour Day', '2028-05-01', 'Global', 'Social Media', 'Thank-you-workers post, holiday notice', true),
('Eid al-Adha', '2028-05-05', 'Islamic', 'Cards', 'Eid al-Adha greeting post & card', true),
('Mother''s Day (US, India & more)', '2028-05-14', 'Global', 'Cards', 'Mother’s Day card, photo collage, gift offer post', true),
('Islamic New Year', '2028-05-25', 'Islamic', 'Social Media', 'Hijri New Year greeting post', true),
('Father''s Day', '2028-06-18', 'Global', 'Cards', 'Father’s Day card, “Best Dad” post, gift offer flyer', true),
('Prophet''s Birthday (Mawlid)', '2028-08-03', 'Islamic', 'Social Media', 'Mawlid greeting post', true),
('Friendship Day', '2028-08-06', 'India', 'Social Media', 'Friendship quote post, photo collage, friends story', true),
('Independence Day (India)', '2028-08-15', 'India', 'Social Media', 'Independence Day greeting, tricolour poster, event invite', true),
('Emirati Women''s Day', '2028-08-28', 'UAE / Gulf', 'Social Media', 'Tribute post, corporate greeting', true),
('Teachers'' Day (India)', '2028-09-05', 'India', 'Cards', 'Thank-you teacher card, school poster, certificate', true),
('Saudi National Day', '2028-09-23', 'UAE / Gulf', 'Social Media', 'Green national-day greeting, offer post', true),
('World Teachers'' Day', '2028-10-05', 'Global', 'Cards', 'Teacher appreciation card & post', true),
('Halloween', '2028-10-31', 'Global', 'Events', 'Party invitation, spooky sale post, kids event poster', true),
('UAE Flag Day', '2028-11-03', 'UAE / Gulf', 'Social Media', 'Flag Day greeting post, office celebration poster', true),
('Children''s Day (India)', '2028-11-14', 'India', 'Social Media', 'Kids greeting post, school event poster', true),
('Thanksgiving (US)', '2028-11-23', 'US', 'Cards', 'Thanksgiving card, dinner menu, gratitude post', true),
('Black Friday', '2028-11-24', 'Global', 'Marketing', 'Black Friday sale post & story, discount coupon, flash-sale banner, email header', true),
('Cyber Monday', '2028-11-27', 'Global', 'Marketing', 'Online sale post, discount code story', true),
('UAE Commemoration Day', '2028-11-30', 'UAE / Gulf', 'Social Media', 'Martyrs’ Day remembrance post', true),
('UAE National Day', '2028-12-02', 'UAE / Gulf', 'Social Media', 'Eid Al Etihad greeting, national-day sale, event poster, corporate card', true),
('Christmas', '2028-12-25', 'Global', 'Cards', 'Christmas card, party invite, carol night poster, holiday sale post, gift tag', true),
('New Year''s Eve', '2028-12-31', 'Global', 'Events', 'NYE party invitation, countdown poster, year-in-review post', true),
('New Year''s Day', '2029-01-01', 'Global', 'Social Media', 'New Year greeting post & story, countdown story, “Happy New Year” card, new-year offer flyer', true),
('Republic Day (India)', '2029-01-26', 'India', 'Social Media', 'Tricolour greeting post, school/office event poster', true),
('Valentine''s Day', '2029-02-14', 'Global', 'Cards', 'Love card, couple photo collage, Valentine offer post, dinner menu, gift voucher', true),
('International Women''s Day', '2029-03-08', 'Global', 'Social Media', 'Celebrating women post, quote card, team appreciation post, event flyer', true),
('Mothering Sunday (UK)', '2029-03-11', 'UK', 'Cards', 'Mother’s Day card (UK)', true),
('Mother''s Day (UAE & Arab world)', '2029-03-21', 'UAE / Gulf', 'Cards', 'Mother’s Day card, photo tribute post, spa/salon/gift offer flyer', true),
('Palm Sunday', '2029-03-25', 'Christian', 'Social Media', 'Church service poster, greeting post', true),
('Good Friday', '2029-03-30', 'Christian', 'Social Media', 'Reflective church post, service timings poster', true),
('Easter', '2029-04-01', 'Christian', 'Cards', 'Easter card, egg-hunt invite, church service poster, brunch menu', true),
('Vishu', '2029-04-14', 'India (Kerala)', 'Social Media', 'Vishu greeting post (kani konna yellow), sadya menu, family photo card', true),
('Earth Day', '2029-04-22', 'Global', 'Social Media', 'Eco awareness post, green campaign poster', true),
('Labour Day', '2029-05-01', 'Global', 'Social Media', 'Thank-you-workers post, holiday notice', true),
('Mother''s Day (US, India & more)', '2029-05-13', 'Global', 'Cards', 'Mother’s Day card, photo collage, gift offer post', true),
('Father''s Day', '2029-06-17', 'Global', 'Cards', 'Father’s Day card, “Best Dad” post, gift offer flyer', true),
('Friendship Day', '2029-08-05', 'India', 'Social Media', 'Friendship quote post, photo collage, friends story', true),
('Independence Day (India)', '2029-08-15', 'India', 'Social Media', 'Independence Day greeting, tricolour poster, event invite', true),
('Emirati Women''s Day', '2029-08-28', 'UAE / Gulf', 'Social Media', 'Tribute post, corporate greeting', true),
('Teachers'' Day (India)', '2029-09-05', 'India', 'Cards', 'Thank-you teacher card, school poster, certificate', true),
('Saudi National Day', '2029-09-23', 'UAE / Gulf', 'Social Media', 'Green national-day greeting, offer post', true),
('World Teachers'' Day', '2029-10-05', 'Global', 'Cards', 'Teacher appreciation card & post', true),
('Halloween', '2029-10-31', 'Global', 'Events', 'Party invitation, spooky sale post, kids event poster', true),
('UAE Flag Day', '2029-11-03', 'UAE / Gulf', 'Social Media', 'Flag Day greeting post, office celebration poster', true),
('Children''s Day (India)', '2029-11-14', 'India', 'Social Media', 'Kids greeting post, school event poster', true),
('Thanksgiving (US)', '2029-11-22', 'US', 'Cards', 'Thanksgiving card, dinner menu, gratitude post', true),
('Black Friday', '2029-11-23', 'Global', 'Marketing', 'Black Friday sale post & story, discount coupon, flash-sale banner, email header', true),
('Cyber Monday', '2029-11-26', 'Global', 'Marketing', 'Online sale post, discount code story', true),
('UAE Commemoration Day', '2029-11-30', 'UAE / Gulf', 'Social Media', 'Martyrs’ Day remembrance post', true),
('UAE National Day', '2029-12-02', 'UAE / Gulf', 'Social Media', 'Eid Al Etihad greeting, national-day sale, event poster, corporate card', true),
('Christmas', '2029-12-25', 'Global', 'Cards', 'Christmas card, party invite, carol night poster, holiday sale post, gift tag', true),
('New Year''s Eve', '2029-12-31', 'Global', 'Events', 'NYE party invitation, countdown poster, year-in-review post', true),
('New Year''s Day', '2030-01-01', 'Global', 'Social Media', 'New Year greeting post & story, countdown story, “Happy New Year” card, new-year offer flyer', true),
('Republic Day (India)', '2030-01-26', 'India', 'Social Media', 'Tricolour greeting post, school/office event poster', true),
('Valentine''s Day', '2030-02-14', 'Global', 'Cards', 'Love card, couple photo collage, Valentine offer post, dinner menu, gift voucher', true),
('International Women''s Day', '2030-03-08', 'Global', 'Social Media', 'Celebrating women post, quote card, team appreciation post, event flyer', true),
('Mother''s Day (UAE & Arab world)', '2030-03-21', 'UAE / Gulf', 'Cards', 'Mother’s Day card, photo tribute post, spa/salon/gift offer flyer', true),
('Mothering Sunday (UK)', '2030-03-31', 'UK', 'Cards', 'Mother’s Day card (UK)', true),
('Vishu', '2030-04-14', 'India (Kerala)', 'Social Media', 'Vishu greeting post (kani konna yellow), sadya menu, family photo card', true),
('Palm Sunday', '2030-04-14', 'Christian', 'Social Media', 'Church service poster, greeting post', true),
('Good Friday', '2030-04-19', 'Christian', 'Social Media', 'Reflective church post, service timings poster', true),
('Easter', '2030-04-21', 'Christian', 'Cards', 'Easter card, egg-hunt invite, church service poster, brunch menu', true),
('Earth Day', '2030-04-22', 'Global', 'Social Media', 'Eco awareness post, green campaign poster', true),
('Labour Day', '2030-05-01', 'Global', 'Social Media', 'Thank-you-workers post, holiday notice', true),
('Mother''s Day (US, India & more)', '2030-05-12', 'Global', 'Cards', 'Mother’s Day card, photo collage, gift offer post', true),
('Father''s Day', '2030-06-16', 'Global', 'Cards', 'Father’s Day card, “Best Dad” post, gift offer flyer', true),
('Friendship Day', '2030-08-04', 'India', 'Social Media', 'Friendship quote post, photo collage, friends story', true),
('Independence Day (India)', '2030-08-15', 'India', 'Social Media', 'Independence Day greeting, tricolour poster, event invite', true),
('Emirati Women''s Day', '2030-08-28', 'UAE / Gulf', 'Social Media', 'Tribute post, corporate greeting', true),
('Teachers'' Day (India)', '2030-09-05', 'India', 'Cards', 'Thank-you teacher card, school poster, certificate', true),
('Saudi National Day', '2030-09-23', 'UAE / Gulf', 'Social Media', 'Green national-day greeting, offer post', true),
('World Teachers'' Day', '2030-10-05', 'Global', 'Cards', 'Teacher appreciation card & post', true),
('Halloween', '2030-10-31', 'Global', 'Events', 'Party invitation, spooky sale post, kids event poster', true),
('UAE Flag Day', '2030-11-03', 'UAE / Gulf', 'Social Media', 'Flag Day greeting post, office celebration poster', true),
('Children''s Day (India)', '2030-11-14', 'India', 'Social Media', 'Kids greeting post, school event poster', true),
('Thanksgiving (US)', '2030-11-28', 'US', 'Cards', 'Thanksgiving card, dinner menu, gratitude post', true),
('Black Friday', '2030-11-29', 'Global', 'Marketing', 'Black Friday sale post & story, discount coupon, flash-sale banner, email header', true),
('UAE Commemoration Day', '2030-11-30', 'UAE / Gulf', 'Social Media', 'Martyrs’ Day remembrance post', true),
('Cyber Monday', '2030-12-02', 'Global', 'Marketing', 'Online sale post, discount code story', true),
('UAE National Day', '2030-12-02', 'UAE / Gulf', 'Social Media', 'Eid Al Etihad greeting, national-day sale, event poster, corporate card', true),
('Christmas', '2030-12-25', 'Global', 'Cards', 'Christmas card, party invite, carol night poster, holiday sale post, gift tag', true),
('New Year''s Eve', '2030-12-31', 'Global', 'Events', 'NYE party invitation, countdown poster, year-in-review post', true)
on conflict (name, occasion_date) do nothing;

-- ---------- Every morning (08:05 Dubai time): check, then e-mail the admins ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $do$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'mt-daily-admin-check';
  perform cron.schedule('mt-daily-admin-check', '5 4 * * *', $job$
    select public.admin_daily_check();
    select net.http_post(
      url := 'https://www.magicaltouchdesign.com/api/cron/daily-digest',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select token from app_private.cron_token limit 1)),
      body := '{}'::jsonb
    );
  $job$);
end
$do$;
