// ---------------------------------------------------------------------
// lib/email/config.ts
// The single place the company's email identity lives. Every email the
// site sends reads from here, so moving from Gmail to a domain address
// later is a Vercel env-var change, not a code change.
// ---------------------------------------------------------------------

const site = (process.env.SITE_URL || 'https://www.magicaltouchdesign.com').replace(/\/$/, '');

export const companyProfile = {
  companyName: 'Magical Touch Design',
  officialEmail: process.env.EMAIL_FROM_ADDRESS || 'hellomagicaltouch.design@gmail.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Magical Touch Design',
  website: site,
  // Founder name confirmed by the owner (CEO_NAME can override it).
  ceoName: process.env.CEO_NAME || 'Tony Aloysius',
  ceoTitle: process.env.CEO_TITLE || 'Founder & CEO',
  tagline: 'Create without limits. Turn your ideas into reality.',
};

export const links = {
  dashboard: `${site}/dashboard`,
  templates: `${site}/templates`,
  login: `${site}/login`,
  privacy: `${site}/privacy`,
  terms: `${site}/terms`,
  unsubscribe: `${site}/unsubscribe`,
};
