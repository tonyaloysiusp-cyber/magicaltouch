-- Certificate registry: every certificate Magical Touch Design issues gets a
-- unique, unguessable code that is printed on it (with a QR code). Anyone
-- can check a code at /verify/<code>; a copied or edited certificate either
-- has no code, a code that doesn't exist, or a code whose name/title don't
-- match what the public page shows. Failed checks are logged so admins can
-- see when someone is passing round fakes.

create table if not exists public.certificate_issues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  recipient text not null,
  title text not null,
  description text,
  issued_on date not null default current_date,
  issuer text not null default 'Magical Touch Design',
  template_id uuid references public.templates(id) on delete set null,
  status text not null default 'valid' check (status in ('valid', 'revoked')),
  revoked_reason text,
  revoked_at timestamptz,
  verify_count integer not null default 0,
  last_verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_checks (
  id bigserial primary key,
  code_tried text not null,
  found boolean not null,
  status text,
  checked_at timestamptz not null default now()
);

alter table public.certificate_issues enable row level security;
alter table public.certificate_checks enable row level security;

create policy "admin certificates" on public.certificate_issues for all using (public.is_admin()) with check (public.is_admin());
create policy "admin certificate checks" on public.certificate_checks for select using (public.is_admin());

-- Public check: returns only what is printed on the certificate, and logs
-- the attempt. Codes are matched case-insensitively, ignoring spaces.
create or replace function public.verify_certificate(p_code text)
returns table (code text, recipient text, title text, description text, issued_on date, issuer text, status text, revoked_reason text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  c text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  r public.certificate_issues%rowtype;
  hit boolean;
begin
  if length(c) < 6 or length(c) > 40 then
    return;
  end if;
  select * into r from public.certificate_issues ci where ci.code = c;
  hit := found;
  insert into public.certificate_checks (code_tried, found, status) values (left(c, 40), hit, r.status);
  if not hit then
    return;
  end if;
  update public.certificate_issues set verify_count = verify_count + 1, last_verified_at = now() where id = r.id;
  return query select r.code, r.recipient, r.title, r.description, r.issued_on, r.issuer, r.status, r.revoked_reason;
end;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
