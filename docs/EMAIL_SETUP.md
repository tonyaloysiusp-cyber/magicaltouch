# Email setup

Official sender: **Magical Touch Design <hellomagicaltouch.design@gmail.com>**

## Who sends what

| Email | Sent by | Where |
|---|---|---|
| Verify your email | Supabase Auth | `supabase/email-templates/confirm-signup.html` (paste into Supabase) |
| Reset your password | Supabase Auth | `supabase/email-templates/reset-password.html` (paste into Supabase) |
| CEO welcome | This app | `app/api/email/welcome` — called by the dashboard after the user's email is verified; sent once per user |
| Password changed | This app | `app/api/email/password-changed` — called by `/reset-password` after a successful change |

All app-sent emails go through `lib/email/send.ts`; wording lives in `lib/email/templates.ts`; company identity in `lib/email/config.ts`.

## One-time setup

1. **Vercel env vars** (Production + Preview): `EMAIL_FROM_ADDRESS`, `EMAIL_APP_PASSWORD` (a Gmail App Password, never the normal password). Optional: `CEO_NAME`, `CEO_TITLE`, `SITE_URL`.
2. **Supabase SQL editor**: run `supabase/migrations/0009_welcome_email.sql`. Until it runs, the welcome route refuses to send (it needs the column to prevent duplicates).
3. **Supabase → Authentication → Emails → SMTP Settings**: enable custom SMTP
   - Host `smtp.gmail.com`, Port `465`
   - Username `hellomagicaltouch.design@gmail.com`, Password = the same App Password
   - Sender email `hellomagicaltouch.design@gmail.com`, Sender name `Magical Touch Design`
4. **Supabase → Authentication → Emails → Templates**:
   - *Confirm signup*: subject `Verify your Magical Touch Design email address`, body = `confirm-signup.html`
   - *Reset password*: subject `Reset your Magical Touch Design password`, body = `reset-password.html`
5. **Supabase → Authentication → URL Configuration**: Site URL `https://www.magicaltouchdesign.com`, and add `https://www.magicaltouchdesign.com/reset-password` to Redirect URLs.

## Limits

Gmail allows roughly 500 messages/day. That covers account emails for an early-stage site. Marketing campaigns should go through a dedicated provider (Brevo, Resend, etc.) — swap the transport in `lib/email/send.ts`.
