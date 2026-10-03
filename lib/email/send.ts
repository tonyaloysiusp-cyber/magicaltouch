// ---------------------------------------------------------------------
// lib/email/send.ts
// Server-only. The one function every part of the site uses to send an
// email. Today it sends through Gmail with an App Password stored in the
// EMAIL_APP_PASSWORD Vercel env var (never the normal Gmail password,
// never in code). To switch providers later, change only this file.
// ---------------------------------------------------------------------

import nodemailer from 'nodemailer';
import { companyProfile as C } from './config';
import type { RenderedEmail } from './templates';

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  const pass = (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!pass) throw new Error('EMAIL_APP_PASSWORD is not set');
  if (!transport) {
    transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: C.officialEmail, pass },
    });
  }
  return transport;
}

export async function sendEmail(to: string, email: RenderedEmail): Promise<string> {
  const info = await getTransport().sendMail({
    from: { name: C.fromName, address: C.officialEmail },
    replyTo: C.officialEmail,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  return info.messageId;
}
