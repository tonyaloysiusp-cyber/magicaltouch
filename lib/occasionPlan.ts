// One-tap posting plan for a festival or occasion (Admin → Festivals).
// Builds a short, proven sequence — teaser, countdown, the day itself and
// a thank-you — across the channels that matter, with a ready caption and
// the template size for each post. Admins can then add, edit or remove
// posts by hand. Saved as promo_items (kind = 'post').

export interface PlanPost {
  title: string;
  post_on: string; // YYYY-MM-DD
  channel: 'Instagram' | 'Instagram story' | 'Facebook' | 'LinkedIn' | 'WhatsApp status' | 'Pinterest' | 'X / Threads';
  format: string; // SPEC_FORMATS id used by the AI Studio
  caption: string;
}

export const CHANNELS: PlanPost['channel'][] = ['Instagram', 'Instagram story', 'Facebook', 'LinkedIn', 'WhatsApp status', 'Pinterest', 'X / Threads'];
export const CHANNEL_FORMAT: Record<PlanPost['channel'], string> = {
  Instagram: 'post45', 'Instagram story': 'story', Facebook: 'square', LinkedIn: 'square', 'WhatsApp status': 'story', Pinterest: 'story', 'X / Threads': 'fb',
};

const addDays = (iso: string, d: number) => {
  const t = new Date(`${iso}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};
const tag = (s: string) => `#${s.replace(/[^a-z0-9]/gi, '')}`;

export function buildPlan(o: { name: string; occasion_date: string }, opts: { today?: string } = {}): PlanPost[] {
  const n = o.name.trim();
  const isSale = /friday|sale|cyber|offer|shopping/i.test(n);
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const tags = [tag(n), '#magicaltouchdesign', isSale ? '#sale' : '#greetings'].join(' ');
  const posts: PlanPost[] = [
    { title: `${n} — teaser`, post_on: addDays(o.occasion_date, -7), channel: 'Instagram story', format: 'story', caption: isSale ? `Something big is coming for ${n} 👀 Turn on notifications so you don’t miss it.` : `${n} is one week away ✨ Get your greetings ready — free templates, link in bio.` },
    { title: `${n} — templates are ready`, post_on: addDays(o.occasion_date, -5), channel: 'Instagram', format: 'post45', caption: `${n} templates are here 🎉\nGreeting posts, stories and cards — pick one, add your name or logo, download free. No watermark.\n\nLink in bio.\n${tags}` },
    { title: `${n} — Pinterest pins`, post_on: addDays(o.occasion_date, -5), channel: 'Pinterest', format: 'story', caption: `Free ${n} templates — edit online and download. ${n} greeting post ideas for business and family.` },
    { title: `${n} — for businesses`, post_on: addDays(o.occasion_date, -3), channel: 'LinkedIn', format: 'square', caption: `${n} is in 3 days. If your team still needs a greeting for clients, our free templates take two minutes: add your logo and brand colours, download, post.\n\n#marketing #smallbusiness ${tag(n)}` },
    { title: `${n} — countdown`, post_on: addDays(o.occasion_date, -1), channel: 'WhatsApp status', format: 'story', caption: `Tomorrow is ${n}! Last chance to make your greeting — free and quick.` },
    { title: `${n} — the day`, post_on: o.occasion_date, channel: 'Instagram', format: 'post45', caption: isSale ? `${n} is ON 🔥 Every template, every tool — free. Make your sale post in 2 minutes.\n${tags}` : `Happy ${n} from all of us at Magical Touch Design ✨\nWishing you and your family joy and peace.\n${tags}` },
    { title: `${n} — the day (Facebook)`, post_on: o.occasion_date, channel: 'Facebook', format: 'square', caption: isSale ? `${n} is here — make your sale posters free.` : `Happy ${n}! 🎉 Share your greeting — made free on Magical Touch Design.` },
    { title: `${n} — thank you`, post_on: addDays(o.occasion_date, 2), channel: 'Instagram story', format: 'story', caption: `Thank you for celebrating ${n} with us 💜 Share what you made and tag us!` },
  ];
  // Keep only what is still ahead (a plan made 2 days before skips the teaser).
  return posts.filter((p) => p.post_on >= today);
}

/** The AI Studio brief for a post: what it is, for which occasion, at which size. */
export function studioTopic(o: { name: string }, p: Pick<PlanPost, 'channel' | 'title'>) {
  return `${o.name} — ${p.channel} design (${p.title.replace(`${o.name} — `, '')})`;
}
