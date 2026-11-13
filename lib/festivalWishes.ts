// Festival wishes on the home page: on a festival day (only that day, in the
// visitor's own time zone) every visitor sees a greeting and a short
// festival animation — crackers for Diwali, snow for Christmas, lanterns
// for Eid… Managed in Admin → Festival wishes, which publishes the schedule
// to site_settings "festival_wishes" (public read).

export type WishEffect = 'fireworks' | 'snow' | 'lanterns' | 'colours' | 'hearts' | 'confetti' | 'leaves' | 'stars' | 'diyas' | 'flowers' | 'moon';

export interface WishItem { date: string; name: string; title: string; message: string; effect: WishEffect; emoji: string; enabled: boolean }
export interface WishSettings { enabled: boolean; items: WishItem[]; updated_at?: string }

/** Built-in wishes for well-known festivals (by the festival calendar's name). */
export const DEFAULT_WISHES: Record<string, { title: string; message: string; effect: WishEffect; emoji: string }> = {
  'Diwali': { title: 'Happy Diwali!', message: 'May your home glow with light, colour and joy. From all of us at Magical Touch Design.', effect: 'diyas', emoji: '🪔 🪷 🎆' },
  'Christmas': { title: 'Merry Christmas!', message: 'Wishing you a season of warmth, wonder and beautiful moments.', effect: 'snow', emoji: '🎄 🎁 ❄️' },
  "New Year's Eve": { title: 'Happy New Year’s Eve!', message: 'Here’s to a creative year ahead.', effect: 'fireworks', emoji: '🎉 🥳 ✨' },
  "New Year's Day": { title: 'Happy New Year!', message: 'New year, new ideas — let’s make it the most creative one yet.', effect: 'fireworks', emoji: '🎉 🥳 ✨' },
  'Eid al-Fitr': { title: 'Eid Mubarak!', message: 'May this Eid bring peace, happiness and blessings to you and your family.', effect: 'moon', emoji: '🌙 🕌 🎁' },
  'Eid al-Adha': { title: 'Eid al-Adha Mubarak!', message: 'Wishing you and your loved ones a blessed Eid.', effect: 'moon', emoji: '🌙 🕌 🎁' },
  'Ramadan begins': { title: 'Ramadan Kareem!', message: 'Wishing you a blessed month of peace and kindness.', effect: 'moon', emoji: '🌙 ✨ 🕌' },
  'Islamic New Year': { title: 'Happy Islamic New Year!', message: 'May the new Hijri year bring peace and hope.', effect: 'moon', emoji: '🌙 ✨' },
  'Holi': { title: 'Happy Holi!', message: 'Play with colour and celebrate together!', effect: 'colours', emoji: '🎨 🌈 💐' },
  'Chinese New Year': { title: 'Happy Lunar New Year!', message: 'Wishing you luck, health and prosperity.', effect: 'fireworks', emoji: '🧧 🐉 🏮' },
  "Valentine's Day": { title: 'Happy Valentine’s Day!', message: 'Love is in the details — say it beautifully.', effect: 'hearts', emoji: '❤️ 🌹 💝' },
  'International Women\'s Day': { title: 'Happy Women’s Day!', message: 'To every woman who creates, leads and inspires.', effect: 'flowers', emoji: '💜 🌸 ✨' },
  'Easter': { title: 'Happy Easter!', message: 'Wishing you a joyful Easter full of hope.', effect: 'flowers', emoji: '🐣 🐰 🌷' },
  "Mother's Day (US, India & more)": { title: 'Happy Mother’s Day!', message: 'For the one who makes everything beautiful.', effect: 'flowers', emoji: '💐 ❤️' },
  "Mother's Day (UAE & Arab world)": { title: 'Happy Mother’s Day!', message: 'For the one who makes everything beautiful.', effect: 'flowers', emoji: '💐 ❤️' },
  "Father's Day": { title: 'Happy Father’s Day!', message: 'To the heroes who inspire us every day.', effect: 'confetti', emoji: '👨‍👧 🎁' },
  'Halloween': { title: 'Happy Halloween!', message: 'Spooky, sweet and free to design.', effect: 'leaves', emoji: '🎃 👻 🕸️' },
  'Thanksgiving (US)': { title: 'Happy Thanksgiving!', message: 'Grateful for you — thank you for creating with us.', effect: 'leaves', emoji: '🍂 🦃 🍁' },
  'UAE National Day': { title: 'Happy UAE National Day!', message: 'Celebrating the spirit of the Union — Eid Al Etihad.', effect: 'fireworks', emoji: '🇦🇪 🎆' },
  'Republic Day (India)': { title: 'Happy Republic Day!', message: 'Proud of our nation and its spirit.', effect: 'confetti', emoji: '🇮🇳 🎉' },
  'Independence Day (India)': { title: 'Happy Independence Day!', message: 'Celebrating freedom and unity.', effect: 'fireworks', emoji: '🇮🇳 🎆' },
  'Pongal / Makar Sankranti': { title: 'Happy Pongal!', message: 'May the harvest bring sweetness and prosperity.', effect: 'colours', emoji: '🌾 🪴 🏺' },
  'Onam (Thiruvonam)': { title: 'Happy Onam!', message: 'May Onam bring prosperity and togetherness.', effect: 'flowers', emoji: '🌼 🌺 🌾' },
  'Vishu': { title: 'Happy Vishu!', message: 'Wishing you a bright new year full of abundance.', effect: 'flowers', emoji: '🌼 🪔 🌾' },
  'Ganesh Chaturthi': { title: 'Happy Ganesh Chaturthi!', message: 'May new beginnings bring wisdom and success.', effect: 'flowers', emoji: '🪷 🪔' },
  'Navratri begins': { title: 'Happy Navratri!', message: 'Nine nights of music, dance and colour.', effect: 'diyas', emoji: '🪔 🌺' },
  'Dussehra': { title: 'Happy Dussehra!', message: 'May good always win.', effect: 'fireworks', emoji: '🪔 ✨' },
  'Raksha Bandhan': { title: 'Happy Raksha Bandhan!', message: 'A thread of love, a lifetime of care.', effect: 'hearts', emoji: '🪷 🎀' },
  'Janmashtami': { title: 'Happy Janmashtami!', message: 'May joy and devotion fill your home.', effect: 'stars', emoji: '🦚 🪈' },
  'Saudi National Day': { title: 'Happy Saudi National Day!', message: 'Celebrating the Kingdom’s heritage and pride.', effect: 'fireworks', emoji: '🇸🇦 💚' },
  "Children's Day (India)": { title: 'Happy Children’s Day!', message: 'To every young creator — keep dreaming in colour.', effect: 'confetti', emoji: '🎈 🎨 🧸' },
  'Black Friday': { title: 'Happy Black Friday!', message: 'Big ideas, bold designs — make your sale shine.', effect: 'confetti', emoji: '🛍️ ✨' },
  'Cyber Monday': { title: 'Happy Cyber Monday!', message: 'Design your best deals in minutes.', effect: 'stars', emoji: '🛍️ 💻 ✨' },
  'UAE Commemoration Day': { title: 'Commemoration Day', message: 'Honouring the heroes of the UAE with gratitude and respect.', effect: 'stars', emoji: '🇦🇪 🕊️' },
  'Earth Day': { title: 'Happy Earth Day!', message: 'Create with care for our planet.', effect: 'leaves', emoji: '🌍 🌱 🌳' },
  'Labour Day': { title: 'Happy Labour Day!', message: 'Thank you to everyone who builds our world.', effect: 'confetti', emoji: '🛠️ 👷' },
  'Friendship Day': { title: 'Happy Friendship Day!', message: 'Here’s to the friends who make life colourful.', effect: 'hearts', emoji: '🤝 💛' },
  "Teachers' Day (India)": { title: 'Happy Teachers’ Day!', message: 'Thank you for teaching us to create and grow.', effect: 'stars', emoji: '📚 🍎' },
  'UAE Flag Day': { title: 'Happy UAE Flag Day!', message: 'Raising the flag with pride.', effect: 'fireworks', emoji: '🇦🇪 🎉' },
  'Emirati Women\'s Day': { title: 'Happy Emirati Women’s Day!', message: 'Honouring the women who inspire and lead.', effect: 'flowers', emoji: '🇦🇪 🌸' },
};

export const EFFECTS: { id: WishEffect; label: string }[] = [
  { id: 'fireworks', label: 'Fireworks / crackers' }, { id: 'snow', label: 'Snow' }, { id: 'lanterns', label: 'Lanterns & stars' },
  { id: 'colours', label: 'Colour bursts' }, { id: 'hearts', label: 'Hearts' }, { id: 'confetti', label: 'Confetti' },
  { id: 'leaves', label: 'Falling leaves' }, { id: 'stars', label: 'Twinkling stars' },
  { id: 'diyas', label: 'Diwali lamps (diyas)' }, { id: 'flowers', label: 'Floating flowers' }, { id: 'moon', label: 'Crescent moon & stars' },
];

export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parseWishes(v: unknown): WishSettings {
  try {
    const o = typeof v === 'string' ? JSON.parse(v) : v;
    if (!o || typeof o !== 'object') return { enabled: true, items: [] };
    const x = o as WishSettings;
    return { enabled: x.enabled !== false, items: Array.isArray(x.items) ? x.items : [], updated_at: x.updated_at };
  } catch {
    return { enabled: true, items: [] };
  }
}
