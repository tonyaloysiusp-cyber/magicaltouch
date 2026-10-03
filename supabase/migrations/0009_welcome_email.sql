-- ---------------------------------------------------------------------
-- 0009_welcome_email.sql
-- Records when the CEO welcome email was sent, so it goes out exactly
-- once per user (see app/api/email/welcome/route.ts, which claims this
-- column atomically before sending). Until this is applied the route
-- refuses to send rather than risk duplicates.
--
-- Users can already update their own profiles row (policy from 0001),
-- which is all the route needs -- it runs as the signed-in user.
--
-- This app has no migration runner wired up -- apply this by hand in the
-- Supabase SQL editor (or via `supabase db push` if you adopt the CLI).
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
