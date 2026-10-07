// ---------------------------------------------------------------------
// lib/email/templates.ts
// HTML + plain-text versions of every transactional email the site
// sends itself. Verification and reset emails are sent by Supabase Auth
// (see supabase/email-templates/), so only emails our own code sends
// live here. Every variable has a fallback so "{{first_name}}" can never
// go out as literal text.
// ---------------------------------------------------------------------

import { companyProfile as C, links } from './config';

export interface EmailData {
  firstName?: string | null;
  changedAt?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  // Marketing mail only: shown in the footer and sent as List-Unsubscribe.
  unsubscribeUrl?: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const nameOf = (d: EmailData) => (d.firstName || '').trim();
const greet = (d: EmailData) => (nameOf(d) ? `Dear ${esc(nameOf(d))},` : 'Hello,');
const greetText = (d: EmailData) => (nameOf(d) ? `Dear ${nameOf(d)},` : 'Hello,');
const p = (t: string, style = '') => `<p style="margin:0 0 16px;${style}">${t}</p>`;
const section = (inner: string) =>
  `<tr><td class="pad" style="padding:32px 32px 8px;font:16px/1.7 Arial,Helvetica,sans-serif;color:#2b2540;">${inner}</td></tr>`;

export const button = (label: string, url: string, primary = true) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto;"><tr><td align="center" style="border-radius:10px;background:${primary ? '#6d28d9' : '#ffffff'};border:2px solid #6d28d9;">
    <a href="${url}" style="display:inline-block;padding:14px 28px;font:600 15px/1 Arial,Helvetica,sans-serif;letter-spacing:.5px;color:${primary ? '#ffffff' : '#6d28d9'};text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;

export const officialNotice = () => `
  <tr><td class="pad" style="padding:0 32px 24px;">
    <div style="background:#f5f3ff;border-left:4px solid #6d28d9;border-radius:8px;padding:18px 20px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#3b3355;">
      <p style="margin:0 0 8px;font-weight:700;color:#2e1065;">A quick note about our official email</p>
      <p style="margin:0 0 8px;">${C.companyName} is currently an early-stage business, and our official customer communication is handled through our single official email address: <a href="mailto:${C.officialEmail}" style="color:#6d28d9;font-weight:700;">${C.officialEmail}</a></p>
      <p style="margin:0 0 8px;">If you receive a message claiming to be from ${C.companyName}, please verify that it was sent from this exact address before interacting with links or providing information.</p>
      <p style="margin:0;font-weight:700;">${C.companyName} will never ask you to send your password, verification code, or other confidential account credentials by email.</p>
    </div>
  </td></tr>`;

const footer = (unsubscribeUrl?: string) => `
  <tr><td style="padding:24px 32px 32px;border-top:1px solid #ece9f5;text-align:center;font:13px/1.6 Arial,Helvetica,sans-serif;color:#6b6580;">
    <p style="margin:0;font-weight:700;color:#2e1065;">${C.companyName}</p>
    <p style="margin:4px 0;">Official email: <a href="mailto:${C.officialEmail}" style="color:#6d28d9;">${C.officialEmail}</a></p>
    <p style="margin:4px 0;font-style:italic;">${C.tagline}</p>
    <p style="margin:10px 0 0;">
      <a href="${C.website}" style="color:#6b6580;">Website</a> &nbsp;|&nbsp;
      <a href="${links.privacy}" style="color:#6b6580;">Privacy Policy</a> &nbsp;|&nbsp;
      <a href="${links.terms}" style="color:#6b6580;">Terms of Service</a>
      ${unsubscribeUrl ? `&nbsp;|&nbsp; <a href="${unsubscribeUrl}" style="color:#6b6580;">Unsubscribe</a>` : ''}
    </p>
    ${unsubscribeUrl ? `<p style="margin:8px 0 0;font-size:12px;">You are receiving this because you chose to get offers and news from ${C.companyName}.</p>` : ''}
    <p style="margin:10px 0 0;font-size:12px;">This email was sent by ${C.companyName} from our official email address.</p>
  </td></tr>`;

export const layout = (preheader: string, body: string, unsubscribeUrl?: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${C.companyName}</title>
<style>@media (max-width:620px){.card{width:100%!important;border-radius:0!important}.pad{padding-left:20px!important;padding-right:20px!important}.feat{display:block!important;width:100%!important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f2fa;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fa;padding:24px 0;"><tr><td align="center">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#6d28d9,#db2777);background-color:#6d28d9;padding:28px 32px;text-align:center;">
    <span style="font:700 22px/1 Georgia,'Times New Roman',serif;color:#ffffff;letter-spacing:.5px;">&#10022; ${C.companyName}</span>
  </td></tr>
  ${body}
  ${footer(unsubscribeUrl)}
</table>
</td></tr></table>
</body></html>`;

const textFooter = () => `
---
A quick note about our official email
${C.companyName} is currently an early-stage business, and our official customer communication is handled through our single official email address: ${C.officialEmail}
If you receive a message claiming to be from ${C.companyName}, please verify that it was sent from this exact address before interacting with links or providing information.
${C.companyName} will never ask you to send your password, verification code, or other confidential account credentials by email.

${C.companyName}
Official email: ${C.officialEmail}
${C.website}`;

function finish(subject: string, preheader: string, body: string, text: string): RenderedEmail {
  const out = { subject, html: layout(preheader, body), text: `${text}\n${textFooter()}` };
  if (/\{\{.*?\}\}/.test(out.subject + out.html + out.text)) throw new Error('Unfilled template variable');
  return out;
}

export function welcomeEmail(d: EmailData): RenderedEmail {
  const n = nameOf(d);
  const feature = (t: string, s: string) =>
    `<td class="feat" width="50%" valign="top" style="padding:8px;"><div style="background:#faf9fe;border:1px solid #ece9f5;border-radius:12px;padding:16px;"><p style="margin:0 0 6px;font-weight:700;color:#2e1065;">${t}</p><p style="margin:0;font-size:14px;line-height:1.5;color:#5b5570;">${s}</p></div></td>`;

  const body =
    `<tr><td class="pad" style="padding:36px 32px 0;text-align:center;">
      <h1 style="margin:0;font:700 28px/1.3 Georgia,'Times New Roman',serif;color:#2e1065;">Welcome to ${C.companyName}${n ? `, ${esc(n)}` : ''}</h1>
      <p style="margin:10px 0 0;font:italic 16px/1.5 Arial,Helvetica,sans-serif;color:#6b6580;">Your creative journey with ${C.companyName} starts here.</p>
    </td></tr>` +
    section(`
      ${p(greet(d))}
      ${p(`<strong>Welcome to ${C.companyName}.</strong>`)}
      ${p('I am delighted to welcome you to our creative platform.')}
      ${p(`We started ${C.companyName} with a simple vision: to create a place where people can turn their ideas into professional designs using powerful and accessible creative tools.`)}
      ${p('As an early-stage company, every person who joins our platform is an important part of our journey.')}
      ${p('Whether you are creating a business card, poster, social media design, marketing material, presentation, event artwork, or something completely unique, our goal is to give you the creative freedom and tools you need to bring your ideas to life.')}
      ${p(`We are continuously working to improve ${C.companyName}, expand our creative tools, introduce new templates, and build a better experience for our users.`)}
    `) +
    `<tr><td class="pad" style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;">
      <h2 style="margin:0 8px 8px;font:700 20px/1.3 Georgia,'Times New Roman',serif;color:#2e1065;text-align:center;">Your creativity starts here.</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>${feature('Explore Templates', 'Find professionally designed starting points and customize them for your needs.')}${feature('Create From Scratch', 'Choose your canvas and build your design from the ground up.')}</tr>
        <tr>${feature('Work in Your Workspace', 'Keep your creative projects organized and continue working on them when you are ready.')}${feature('Bring Your Ideas to Life', 'Customize text, images, shapes, layouts and other design elements.')}</tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 8px;">
      ${button('START CREATING', links.dashboard)}
      ${button('EXPLORE TEMPLATES', links.templates, false)}
    </td></tr>` +
    section(`
      ${p('<strong>Thank you for choosing to join us at this early stage.</strong>')}
      ${p('We are genuinely excited to have you here, and we look forward to seeing what you create.')}
      <p style="margin:24px 0 4px;">Warm regards,</p>
      ${C.ceoName ? `<p style="margin:0;font:700 18px/1.4 Georgia,serif;color:#2e1065;">${esc(C.ceoName)}</p>` : ''}
      <p style="margin:0;font-weight:700;">${esc(C.ceoTitle)}</p>
      <p style="margin:0 0 16px;font-weight:700;">${C.companyName}</p>
    `) +
    officialNotice();

  const text = `${greetText(d)}

Welcome to ${C.companyName}.

I am delighted to welcome you to our creative platform.

We started ${C.companyName} with a simple vision: to create a place where people can turn their ideas into professional designs using powerful and accessible creative tools.

As an early-stage company, every person who joins our platform is an important part of our journey.

Whether you are creating a business card, poster, social media design, marketing material, presentation, event artwork, or something completely unique, our goal is to give you the creative freedom and tools you need to bring your ideas to life.

We are continuously working to improve ${C.companyName}, expand our creative tools, introduce new templates, and build a better experience for our users.

START CREATING: ${links.dashboard}
EXPLORE TEMPLATES: ${links.templates}

Thank you for choosing to join us at this early stage.
We are genuinely excited to have you here, and we look forward to seeing what you create.

Warm regards,
${C.ceoName ? `${C.ceoName}\n` : ''}${C.ceoTitle}
${C.companyName}`;

  return finish(
    n ? `Welcome to Magical Touch Design, ${n}` : 'Welcome to Magical Touch Design',
    'Your creative journey with Magical Touch Design starts here.',
    body,
    text,
  );
}

export function passwordChangedEmail(d: EmailData): RenderedEmail {
  const when = d.changedAt ? ` on ${d.changedAt}` : '';
  const body =
    section(`
      ${p(greet(d))}
      ${p(`Your ${C.companyName} password was successfully changed${esc(when)}.`)}
      ${p(`If you did not make this change, contact us right away at <a href="mailto:${C.officialEmail}" style="color:#6d28d9;font-weight:700;">${C.officialEmail}</a>.`)}
      ${button('LOG IN', links.login)}
    `) + officialNotice();
  const text = `${greetText(d)}

Your ${C.companyName} password was successfully changed${when}.
If you did not make this change, contact us right away at ${C.officialEmail}.

Log in: ${links.login}`;
  return finish('Your Magical Touch Design password was changed', 'A security notice about your account.', body, text);
}

// Templates pasted into Supabase Auth (it sends verification/reset
// itself). `link` is Supabase's own Go-template placeholder, so these
// two skip the "unfilled variable" guard on purpose.
export function supabaseConfirmTemplate(link = '{{ .ConfirmationURL }}'): string {
  return layout(
    'One quick step to activate your account.',
    section(`
      ${p('Hello,')}
      ${p(`Thanks for creating your ${C.companyName} account. Please confirm your email address to activate it.`)}
      ${button('VERIFY EMAIL', link)}
      ${p("If you didn't create an account, you can safely ignore this email.", 'font-size:14px;color:#6b6580;margin-top:16px;')}
    `) + officialNotice(),
  );
}

export function supabaseResetTemplate(link = '{{ .ConfirmationURL }}'): string {
  return layout(
    'A secure link to reset your password.',
    section(`
      ${p('Hello,')}
      ${p(`We received a request to reset the password for your ${C.companyName} account.`)}
      ${button('RESET PASSWORD', link)}
      ${p('For your security, this link expires after a short time and can only be used once.', 'font-size:14px;color:#6b6580;margin-top:16px;')}
      ${p('If you did not request a password reset, you can safely ignore this email. Your password will not change unless you complete the reset process.')}
    `) + officialNotice(),
  );
}

// ---------------------------------------------------------------------
// Marketing campaigns (offers, announcements, newsletters, new templates).
// Only ever sent to people who opted in; always carries an unsubscribe
// link. Content is plain text from the admin (escaped), split into
// paragraphs on blank lines.
// ---------------------------------------------------------------------
export interface CampaignContent {
  subject: string;
  preheader?: string | null;
  content: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

const safeUrl = (u?: string | null) => (u && /^https:\/\//i.test(u.trim()) ? u.trim() : null);

export function campaignEmail(c: CampaignContent, d: EmailData & { unsubscribeUrl: string }): RenderedEmail {
  const paragraphs = c.content.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  const img = safeUrl(c.imageUrl);
  const cta = safeUrl(c.ctaUrl);
  const body = section(`
      ${p(greet(d))}
      ${img ? `<img src="${esc(img)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:12px;margin:0 0 20px;">` : ''}
      ${paragraphs.map((t) => p(esc(t).replace(/\n/g, '<br>'))).join('')}
      ${cta && c.ctaLabel ? button(c.ctaLabel.toUpperCase(), esc(cta)) : ''}
    `) + officialNotice();
  const text = `${greetText(d)}

${paragraphs.join('\n\n')}${cta ? `\n\n${c.ctaLabel || 'Learn more'}: ${cta}` : ''}

Unsubscribe: ${d.unsubscribeUrl}`;
  const subject = c.subject.trim() || C.companyName;
  const out: RenderedEmail = {
    subject,
    html: layout(c.preheader || subject, body, d.unsubscribeUrl),
    text: `${text}\n${textFooter()}`,
    unsubscribeUrl: d.unsubscribeUrl,
  };
  return out;
}

export function unsubscribeUrlFor(token: string, campaignId?: string): string {
  return `${links.unsubscribe}?t=${encodeURIComponent(token)}${campaignId ? `&c=${encodeURIComponent(campaignId)}` : ''}`;
}
