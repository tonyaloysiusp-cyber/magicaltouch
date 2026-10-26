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

// Wording an admin can change in Admin → Email wording (table email_copy).
// {first_name} is replaced with the person's first name (or left out).
export interface EmailCopy {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
  body?: string | null;
}

export function fillName(t: string, firstName?: string | null) {
  const n = (firstName || '').trim();
  return n ? t.replace(/\{first_name\}/g, n) : t.replace(/,?\s*\{first_name\}/g, '');
}
const paras = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  // Marketing mail only: shown in the footer and sent as List-Unsubscribe.
  unsubscribeUrl?: string;
}

// The logo's colours, shown as a thin band under the e-mail header.
const SPECTRUM = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];

// The official logo (white version for the dark header), served from the
// website so every email client can load it. 480 px wide, shown at 280 px
// for sharp retina rendering. If images are blocked, the alt text shows
// the company name in white on the same dark band.
export const EMAIL_LOGO_URL = `${C.website}/email/logo-white-480.png`;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const nameOf = (d: EmailData) => (d.firstName || '').trim();
const greet = (d: EmailData) => (nameOf(d) ? `Dear ${esc(nameOf(d))},` : 'Hello,');
const greetText = (d: EmailData) => (nameOf(d) ? `Dear ${nameOf(d)},` : 'Hello,');
const p = (t: string, style = '') => `<p style="margin:0 0 16px;${style}">${t}</p>`;
const section = (inner: string) =>
  `<tr><td class="pad" style="padding:32px 32px 8px;font:16px/1.7 Arial,Helvetica,sans-serif;color:#1f2937;">${inner}</td></tr>`;

export const button = (label: string, url: string, primary = true) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto;"><tr><td align="center" style="border-radius:10px;background:${primary ? '#0B0B0D' : '#ffffff'};border:2px solid #0B0B0D;">
    <a href="${url}" style="display:inline-block;padding:14px 28px;font:600 15px/1 Arial,Helvetica,sans-serif;letter-spacing:.5px;color:${primary ? '#ffffff' : '#0B0B0D'};text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;

export const officialNotice = () => `
  <tr><td class="pad" style="padding:0 32px 24px;">
    <div style="background:#f3f4f6;border-left:4px solid #35C2F1;border-radius:8px;padding:18px 20px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#374151;">
      <p style="margin:0 0 8px;font-weight:700;color:#0B0B0D;">A quick note about our official email</p>
      <p style="margin:0 0 8px;">${C.companyName} is currently an early-stage business, and our official customer communication is handled through our single official email address: <a href="mailto:${C.officialEmail}" style="color:#0B0B0D;font-weight:700;">${C.officialEmail}</a></p>
      <p style="margin:0 0 8px;">If you receive a message claiming to be from ${C.companyName}, please verify that it was sent from this exact address before interacting with links or providing information.</p>
      <p style="margin:0;font-weight:700;">${C.companyName} will never ask you to send your password, verification code, or other confidential account credentials by email.</p>
    </div>
  </td></tr>`;

// Every email to a user ends with the team's sign-off — no personal names.
export const signature = () =>
  `<p style="margin:24px 0 4px;">${C.signOff}</p><p style="margin:0 0 16px;font:700 17px/1.4 Georgia,serif;color:#0B0B0D;">${C.teamName}</p>`;
const signatureText = () => `${C.signOff}\n${C.teamName}`;

const footer = (unsubscribeUrl?: string) => `
  <tr><td style="padding:24px 32px 32px;border-top:1px solid #ece9f5;text-align:center;font:13px/1.6 Arial,Helvetica,sans-serif;color:#6b6580;">
    <p style="margin:0;font-weight:700;color:#0B0B0D;">${C.companyName}</p>
    <p style="margin:4px 0;">Official email: <a href="mailto:${C.officialEmail}" style="color:#0B0B0D;">${C.officialEmail}</a></p>
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
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#0B0B0D;padding:28px 32px;text-align:center;">
    <a href="${C.website}" style="text-decoration:none;color:#ffffff;"><img src="${EMAIL_LOGO_URL}" width="280" height="33" alt="${C.companyName}" style="display:block;margin:0 auto;width:280px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font:700 20px/33px Georgia,'Times New Roman',serif;color:#ffffff;"></a>
  </td></tr>
  <tr><td style="padding:0;line-height:0;font-size:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${SPECTRUM.map((c) => `<td height="5" style="height:5px;background:${c};"></td>`).join('')}</tr></table></td></tr>
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

export function welcomeEmail(d: EmailData, copy: EmailCopy = {}): RenderedEmail {
  const n = nameOf(d);
  const customBody = copy.body?.trim() ? paras(fillName(copy.body, n)) : null;
  const heading = copy.heading?.trim() ? esc(fillName(copy.heading, n)) : `Welcome to ${C.companyName}${n ? `, ${esc(n)}` : ''}`;
  const intro = copy.intro?.trim() ? esc(fillName(copy.intro, n)) : `Your creative journey with ${C.companyName} starts here.`;
  const feature = (t: string, s: string) =>
    `<td class="feat" width="50%" valign="top" style="padding:8px;"><div style="background:#faf9fe;border:1px solid #ece9f5;border-radius:12px;padding:16px;"><p style="margin:0 0 6px;font-weight:700;color:#0B0B0D;">${t}</p><p style="margin:0;font-size:14px;line-height:1.5;color:#5b5570;">${s}</p></div></td>`;

  const body =
    `<tr><td class="pad" style="padding:36px 32px 0;text-align:center;">
      <h1 style="margin:0;font:700 28px/1.3 Georgia,'Times New Roman',serif;color:#0B0B0D;">${heading}</h1>
      <p style="margin:10px 0 0;font:italic 16px/1.5 Arial,Helvetica,sans-serif;color:#6b6580;">${intro}</p>
    </td></tr>` +
    section(
      customBody
        ? `${p(greet(d))}${customBody.map((t) => p(esc(t).replace(/\n/g, '<br>'))).join('')}`
        : `
      ${p(greet(d))}
      ${p(`<strong>Welcome to ${C.companyName}.</strong>`)}
      ${p('We are delighted to welcome you to our creative platform.')}
      ${p(`We started ${C.companyName} with a simple vision: to create a place where people can turn their ideas into professional designs using powerful and accessible creative tools.`)}
      ${p('As an early-stage company, every person who joins our platform is an important part of our journey.')}
      ${p('Whether you are creating a business card, poster, social media design, marketing material, presentation, event artwork, or something completely unique, our goal is to give you the creative freedom and tools you need to bring your ideas to life.')}
      ${p(`We are continuously working to improve ${C.companyName}, expand our creative tools, introduce new templates, and build a better experience for our users.`)}
`
    ) +
    `<tr><td class="pad" style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;">
      <h2 style="margin:0 8px 8px;font:700 20px/1.3 Georgia,'Times New Roman',serif;color:#0B0B0D;text-align:center;">Your creativity starts here.</h2>
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
      ${signature()}
    `) +
    officialNotice();

  const defaultText = `${greetText(d)}

Welcome to ${C.companyName}.

We are delighted to welcome you to our creative platform.

We started ${C.companyName} with a simple vision: to create a place where people can turn their ideas into professional designs using powerful and accessible creative tools.

As an early-stage company, every person who joins our platform is an important part of our journey.

Whether you are creating a business card, poster, social media design, marketing material, presentation, event artwork, or something completely unique, our goal is to give you the creative freedom and tools you need to bring your ideas to life.

We are continuously working to improve ${C.companyName}, expand our creative tools, introduce new templates, and build a better experience for our users.

`;
  const text = `${customBody ? `${greetText(d)}\n\n${customBody.join('\n\n')}\n\n` : defaultText}START CREATING: ${links.dashboard}
EXPLORE TEMPLATES: ${links.templates}

Thank you for choosing to join us at this early stage.
We are genuinely excited to have you here, and we look forward to seeing what you create.

${signatureText()}`;

  return finish(
    copy.subject?.trim() ? fillName(copy.subject, n) : n ? `Welcome to Magical Touch Design, ${n}` : 'Welcome to Magical Touch Design',
    copy.intro?.trim() ? fillName(copy.intro, n) : 'Your creative journey with Magical Touch Design starts here.',
    body,
    text,
  );
}

export function passwordChangedEmail(d: EmailData, copy: EmailCopy = {}): RenderedEmail {
  const when = d.changedAt ? ` on ${d.changedAt}` : '';
  const n = nameOf(d);
  const custom = copy.body?.trim() ? paras(fillName(copy.body, n)) : null;
  const body =
    section(`
      ${p(greet(d))}
      ${p(`Your ${C.companyName} password was successfully changed${esc(when)}.`)}
      ${custom ? custom.map((t) => p(esc(t).replace(/\n/g, '<br>'))).join('') : p(`If you did not make this change, contact us right away at <a href="mailto:${C.officialEmail}" style="color:#0B0B0D;font-weight:700;">${C.officialEmail}</a>.`)}
      ${button('LOG IN', links.login)}
      ${signature()}
    `) + officialNotice();
  const text = `${greetText(d)}

Your ${C.companyName} password was successfully changed${when}.
${custom ? custom.join('\n\n') : `If you did not make this change, contact us right away at ${C.officialEmail}.`}

Log in: ${links.login}

${signatureText()}`;
  return finish(copy.subject?.trim() ? fillName(copy.subject, n) : 'Your Magical Touch Design password was changed', 'A security notice about your account.', body, text);
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
      ${signature()}
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
      ${signature()}
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
      ${signature()}
    `) + officialNotice();
  const text = `${greetText(d)}

${paragraphs.join('\n\n')}${cta ? `\n\n${c.ctaLabel || 'Learn more'}: ${cta}` : ''}

${signatureText()}

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

// ---------------------------------------------------------------------
// Daily admin digest: festival reminders, renewals and new messages.
// ---------------------------------------------------------------------
export interface DigestItem {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  priority?: string;
}

export function adminDigestEmail(items: DigestItem[], contacts: { title: string; body: string; email: string; name: string }[]): RenderedEmail {
  const label: Record<string, string> = { occasion: 'Coming up', renewal: 'Renewal', system: 'Notice' };
  const row = (i: DigestItem) => `
    <div style="border:1px solid #e5e7eb;border-left:4px solid ${i.priority === 'high' ? '#E11D48' : i.kind === 'occasion' ? '#35C2F1' : '#8CC84B'};border-radius:10px;padding:14px 16px;margin:0 0 12px;">
      <p style="margin:0 0 4px;font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${esc(label[i.kind] || i.kind)}</p>
      <p style="margin:0 0 6px;font:700 16px/1.4 Arial,Helvetica,sans-serif;color:#0B0B0D;">${esc(i.title)}</p>
      ${i.body ? `<p style="margin:0;font:14px/1.6 Arial,Helvetica,sans-serif;color:#4b5563;">${esc(i.body)}</p>` : ''}
    </div>`;
  const contactRow = (c: { title: string; body: string; email: string; name: string }) => `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:0 0 12px;">
      <p style="margin:0 0 6px;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:#0B0B0D;">${esc(c.title)}</p>
      <p style="margin:0 0 6px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#4b5563;">${esc(c.body).replace(/\n/g, '<br>')}</p>
      <p style="margin:0;font:13px/1.5 Arial,Helvetica,sans-serif;"><a href="mailto:${esc(c.email)}" style="color:#0B0B0D;font-weight:700;">Reply to ${esc(c.name || c.email)}</a></p>
    </div>`;
  const body = section(`
      ${p('Good morning,')}
      ${p(`Here is what needs your attention at ${C.companyName} today.`)}
      ${items.map(row).join('')}
      ${contacts.length ? `<p style="margin:20px 0 10px;font:700 18px/1.3 Georgia,serif;color:#0B0B0D;">New messages from customers</p>${contacts.map(contactRow).join('')}` : ''}
      ${button('OPEN ADMIN', `${C.website}/admin`)}
    `);
  const text = `Good morning,

Here is what needs your attention at ${C.companyName} today.

${items.map((i) => `• ${i.title}${i.body ? `\n  ${i.body}` : ''}`).join('\n\n')}
${contacts.length ? `\nNew messages from customers:\n${contacts.map((c) => `• ${c.title}\n  ${c.body}\n  Reply: ${c.email}`).join('\n\n')}` : ''}

Open admin: ${C.website}/admin`;
  const n = items.length + contacts.length;
  return finish(`${n} update${n === 1 ? '' : 's'} for ${C.companyName} today`, items[0]?.title || contacts[0]?.title || 'Your daily admin summary', body, text);
}

// ---------------------------------------------------------------------
// Tutorials & courses: certificate request, approval/release, rejection.
// Only the learner's own name and course title are included — never codes
// that grant access. The certificate itself is downloaded from the site
// after signing in.
// ---------------------------------------------------------------------
export interface CourseEmailData extends EmailData {
  courseTitle: string;
  courseUrl: string;
  certificateName?: string | null;
  certificateCode?: string | null;
  verifyUrl?: string | null;
  reason?: string | null;
}

const courseBox = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf9fe;border:1px solid #ece9f5;border-radius:12px;"><tr><td style="padding:16px 18px;font:14px/1.7 Arial,Helvetica,sans-serif;color:#374151;">${rows
    .map(([k, v]) => `<span style="color:#6b6580;">${esc(k)}:</span> <strong style="color:#0B0B0D;">${esc(v)}</strong>`)
    .join('<br>')}</td></tr></table>`;

export function certificateRequestedEmail(d: CourseEmailData): RenderedEmail {
  const rows: [string, string][] = [['Course', d.courseTitle], ['Name on certificate', d.certificateName || '—'], ['Status', 'Pending approval']];
  const body =
    section(`
      ${p(greet(d))}
      ${p(`Well done — you finished every lesson in <strong>${esc(d.courseTitle)}</strong> and asked for your certificate.`)}
      ${courseBox(rows)}
      ${p('Our team checks every request before a certificate is issued. You will get another email when it has been reviewed. Until then, nothing else is needed from you.')}
      ${p('If the name above is not exactly how you want it printed, reply to this email before it is approved.', 'font-size:14px;color:#6b6580;')}
      ${button('VIEW YOUR COURSE', d.courseUrl)}
      ${signature()}
    `) + officialNotice();
  const text = `${greetText(d)}

Well done — you finished every lesson in "${d.courseTitle}" and asked for your certificate.

${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}

Our team checks every request before a certificate is issued. You will get another email when it has been reviewed.
If the name above is not exactly how you want it printed, reply to this email before it is approved.

View your course: ${d.courseUrl}

${signatureText()}`;
  return finish(`Certificate requested: ${d.courseTitle}`, 'Your certificate request is waiting for review.', body, text);
}

export function certificateReleasedEmail(d: CourseEmailData): RenderedEmail {
  const rows: [string, string][] = [['Course', d.courseTitle], ['Awarded to', d.certificateName || '—']];
  if (d.certificateCode) rows.push(['Certificate ID', d.certificateCode]);
  const body =
    section(`
      ${p(greet(d))}
      ${p(`Congratulations! Your certificate for <strong>${esc(d.courseTitle)}</strong> has been approved and is ready.`)}
      ${courseBox(rows)}
      ${p('Sign in and open the course page to download it as a PDF. Anyone can check that it is genuine with the certificate ID.')}
      ${button('DOWNLOAD YOUR CERTIFICATE', d.courseUrl)}
      ${d.verifyUrl ? button('CHECK IT ONLINE', d.verifyUrl, false) : ''}
      ${signature()}
    `) + officialNotice();
  const text = `${greetText(d)}

Congratulations! Your certificate for "${d.courseTitle}" has been approved and is ready.

${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}

Sign in and open the course page to download it as a PDF: ${d.courseUrl}${d.verifyUrl ? `\nCheck it online: ${d.verifyUrl}` : ''}

${signatureText()}`;
  return finish(`Your certificate is ready: ${d.courseTitle}`, 'Your certificate has been approved and released.', body, text);
}

export function certificateRejectedEmail(d: CourseEmailData): RenderedEmail {
  const reason = (d.reason || '').trim() || 'No reason was given.';
  const body =
    section(`
      ${p(greet(d))}
      ${p(`We reviewed your certificate request for <strong>${esc(d.courseTitle)}</strong> and could not approve it yet.`)}
      <div style="margin:0 0 20px;border-left:4px solid #F59E0B;background:#FFFBEB;border-radius:8px;padding:14px 16px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#78350F;"><strong>Reason:</strong> ${esc(reason).replace(/\n/g, '<br>')}</div>
      ${p('You can fix this and send a new request from the course page at any time.')}
      ${button('OPEN THE COURSE', d.courseUrl)}
      ${signature()}
    `) + officialNotice();
  const text = `${greetText(d)}

We reviewed your certificate request for "${d.courseTitle}" and could not approve it yet.

Reason: ${reason}

You can fix this and send a new request from the course page: ${d.courseUrl}

${signatureText()}`;
  return finish(`About your certificate request: ${d.courseTitle}`, 'Your certificate request needs a change.', body, text);
}
