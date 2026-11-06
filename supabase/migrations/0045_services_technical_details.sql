-- Applied 6 Nov 2026. Admin → Hosting & renewals becomes the full map of
-- what the site runs on: technical details and the owner account for each
-- service, more service types, and "standby" for kept-but-unused services.
-- Also records the move from Vercel to Cloudflare Workers (6 Nov 2026).
alter table public.admin_services add column if not exists details text;
alter table public.admin_services add column if not exists account_email text;
alter table public.admin_services add column if not exists sort int;

alter table public.admin_services drop constraint if exists admin_services_kind_check;
alter table public.admin_services add constraint admin_services_kind_check check (kind = any (array['hosting','domain','dns','email','database','storage','code','payments','ai','analytics','ssl','software','other']));
alter table public.admin_services drop constraint if exists admin_services_status_check;
alter table public.admin_services add constraint admin_services_status_check check (status = any (array['active','standby','cancelled','expired']));

-- Existing rows, corrected.
update public.admin_services set provider = 'Cloudflare Registrar', sort = 10,
  account_url = 'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/domains/registrations',
  notes = 'If the domain lapses the whole site and email links go offline. Turn on auto-renew in Cloudflare and keep the card up to date.',
  details = E'Registrar: Cloudflare (at-cost pricing, no markup)\nNameservers: georgia.ns.cloudflare.com, ryan.ns.cloudflare.com\nBoth magicaltouchdesign.com and www are served by the Cloudflare Worker "magicaltouch".',
  updated_at = now()
where id = 'cbf8df7b-da1e-4e31-b43b-b400369527fc';

update public.admin_services set name = 'Old hosting (backup)', status = 'standby', plan = 'Hobby (free)', billing_cycle = 'free', sort = 90,
  account_url = 'https://vercel.com/dashboard',
  notes = 'Not used since 6 Nov 2026. Paused on 4 Nov for going over the free Hobby limits. Kept as a backup; can be deleted once Cloudflare has run well for a month.',
  details = E'Project: magicaltouch (team_zoo1OMIF7P2ZHH4iWxo17z4a)\nHobby plan is for non-commercial sites only; Pro is US$20/month.',
  updated_at = now()
where id = '7cc010ff-60fc-42c6-858d-f9c1a3d96aaa';

update public.admin_services set sort = 30,
  details = E'Project: rqkjogzljsbufbrdlbfr\nHolds: templates, users and sign-in, saved designs, settings, landing pages, search stats.\nFree plan limits: 500 MB database, 1 GB file storage, 5 GB data transfer a month.\nWatch: Supabase → Usage. Upgrade to Pro (US$25/month) if limits are hit.',
  updated_at = now()
where id = 'b6a6f4a7-30b4-4cc0-8404-054751845e1f';

update public.admin_services set sort = 40, account_email = 'hellomagicaltouch.design@gmail.com',
  details = E'Sends: welcome, password-changed and campaign emails.\nHow: Gmail SMTP (smtp.gmail.com, port 465) with a Google App Password.\nCloudflare secrets: EMAIL_APP_PASSWORD, EMAIL_FROM_ADDRESS.\nGmail sends up to about 500 emails a day; use a bulk email service for larger campaigns.',
  updated_at = now()
where id = 'fe975d8b-71ca-4ddc-9c22-74b4518d5163';

-- New rows (skipped if a row with the same name exists).
insert into public.admin_services (name, kind, provider, plan, cost, currency, billing_cycle, renews_on, auto_renew, status, account_url, notes, details, sort)
select * from (values
  ('Website hosting', 'hosting', 'Cloudflare Workers', 'Workers Paid', 5::numeric, 'USD', 'monthly', null::date, true, 'active',
   'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/workers/plans',
   'Runs magicaltouchdesign.com since 6 Nov 2026. Billed monthly to the card on the Cloudflare account; set the next date from Billing.',
   E'Worker: magicaltouch (test address: magicaltouch.tonyaloysiusp.workers.dev)\nIncluded: 10 million requests and 30 million CPU-ms a month, up to 100,000 static files.\nDeploys: automatic on every push to GitHub main (Workers Builds). Build: npx opennextjs-cloudflare build.\nRoutes: magicaltouchdesign.com/* and www.magicaltouchdesign.com/*.\nSecrets: Worker → Settings → Variables and Secrets.', 20),
  ('DNS, SSL & security', 'dns', 'Cloudflare', 'Free', null, 'USD', 'free', null, false, 'active',
   'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/magicaltouchdesign.com/dns/records',
   'DNS records, free SSL certificate and DDoS protection.',
   E'Zone: magicaltouchdesign.com\nSSL certificate renews itself automatically.\nDo not change DNS records without checking the website routes first.', 15),
  ('Code repository', 'code', 'GitHub', 'Free', null, 'USD', 'free', null, false, 'active',
   'https://github.com/tonyaloysiusp-cyber/magicaltouch',
   'All website code. Every change pushed to main is built and published by Cloudflare automatically.',
   E'Repository: tonyaloysiusp-cyber/magicaltouch (branch main)\nChecks: Editor E2E tests, lockfile update.', 50),
  ('Page cache storage (R2)', 'storage', 'Cloudflare R2', 'Free tier', null, 'USD', 'free', null, false, 'standby',
   'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/r2/overview',
   'Bucket made for the page cache; not used at the moment (pages are cached in static files instead). Free up to 10 GB.',
   'Bucket: magicaltouch-cache', 60),
  ('Google Search Console', 'analytics', 'Google', 'Free', null, 'USD', 'free', null, false, 'active',
   'https://search.google.com/search-console',
   'How the site shows up on Google: searches, clicks, indexing problems.',
   'Property: magicaltouchdesign.com. Sitemap: https://www.magicaltouchdesign.com/sitemap.xml', 70),
  ('Card payments', 'payments', 'Stripe', 'Pay as you go', null, 'USD', 'free', null, false, 'standby',
   'https://dashboard.stripe.com',
   'Not switched on yet: no Stripe webhook secret is set.',
   'Needs Cloudflare secret STRIPE_WEBHOOK_SECRET. Webhook URL: https://www.magicaltouchdesign.com/api/payments/stripe', 80),
  ('AI Template Studio', 'ai', 'Google Gemini API', 'Pay as you go', null, 'USD', 'free', null, false, 'standby',
   'https://aistudio.google.com/apikey',
   'Not switched on yet: no Gemini key is set.',
   'Needs Cloudflare secrets GEMINI_API_KEY (and optional GEMINI_MODEL).', 85)
) v(name, kind, provider, plan, cost, currency, billing_cycle, renews_on, auto_renew, status, account_url, notes, details, sort)
where not exists (select 1 from public.admin_services s where s.name = v.name and s.provider = v.provider);
