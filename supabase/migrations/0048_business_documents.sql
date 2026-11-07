-- Applied 7 Nov 2026. Admin → Business documents: the company's official
-- papers in one private place — registration, tax, trademark, domain,
-- bank and policy documents — with the official website for each, numbers,
-- dates, expiry reminders and the scanned file (private bucket, admins only).

create table if not exists public.admin_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other'
    check (category in ('registration','tax','trademark','domain','bank','policy','identity','contract','insurance','other')),
  issuer text,
  doc_number text,
  issued_on date,
  expires_on date,
  official_url text,
  account_email text,
  notes text,
  file_path text,
  file_name text,
  status text not null default 'todo' check (status in ('todo','active','renew','expired','not_needed')),
  sort int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_documents enable row level security;
drop policy if exists "Admins manage business documents" on public.admin_documents;
create policy "Admins manage business documents" on public.admin_documents for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('business-docs', 'business-docs', false, 20971520)
on conflict (id) do nothing;
drop policy if exists "Admins read business docs" on storage.objects;
drop policy if exists "Admins write business docs" on storage.objects;
drop policy if exists "Admins update business docs" on storage.objects;
drop policy if exists "Admins delete business docs" on storage.objects;
create policy "Admins read business docs" on storage.objects for select using (bucket_id = 'business-docs' and public.is_admin());
create policy "Admins write business docs" on storage.objects for insert with check (bucket_id = 'business-docs' and public.is_admin());
create policy "Admins update business docs" on storage.objects for update using (bucket_id = 'business-docs' and public.is_admin());
create policy "Admins delete business docs" on storage.objects for delete using (bucket_id = 'business-docs' and public.is_admin());

-- A starting checklist (nothing filled in: Tony adds his own numbers and files).
insert into public.admin_documents (title, category, issuer, official_url, notes, status, sort)
select * from (values
  ('Business registration / trade licence', 'registration', 'Government business registry', null::text, 'Udyam (India MSME), a GST-registered business, or a trade licence where the company is based. Add the number, dates and the certificate.', 'todo', 10),
  ('Tax registration (GST / VAT)', 'tax', 'Tax authority', 'https://www.gst.gov.in', 'Needed once sales pass the local limit or for paid plans. Keep the certificate and login email here.', 'todo', 20),
  ('Trademark — "Magical Touch Design" name and logo', 'trademark', 'Trademark office', 'https://ipindia.gov.in', 'Protects the name and logo. File in the logo class (Class 42 for online design software). Keep the application number and status.', 'todo', 30),
  ('Domain — magicaltouchdesign.com', 'domain', 'Cloudflare Registrar', 'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/domains/registrations', 'Proof of ownership of the website address. Renewal date is also tracked in Hosting & renewals.', 'active', 40),
  ('Google Business Profile', 'registration', 'Google', 'https://business.google.com', 'The verified business listing shown on Google Search and Maps.', 'active', 50),
  ('Business bank account', 'bank', 'Bank', null, 'Account holder name, bank and branch. Never store full card numbers or passwords here.', 'todo', 60),
  ('Payment provider account (Stripe)', 'bank', 'Stripe', 'https://dashboard.stripe.com', 'Business verification documents for receiving payments.', 'todo', 70),
  ('Privacy policy', 'policy', 'Magical Touch Design', 'https://www.magicaltouchdesign.com/privacy', 'Public page. Review once a year or when a new service is added.', 'active', 80),
  ('Terms of use', 'policy', 'Magical Touch Design', 'https://www.magicaltouchdesign.com/terms', 'Public page. Review once a year.', 'active', 90),
  ('Founder ID and address proof', 'identity', null, null, 'Needed for registrations and bank / payment verification. Store a scan here only if you are comfortable — this area is private to admins.', 'todo', 100)
) v(title, category, issuer, official_url, notes, status, sort)
where not exists (select 1 from public.admin_documents);
