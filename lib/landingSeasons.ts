// Festival landing pages are seasonal: switched ON a few weeks before the
// festival and OFF a week after, every year (dates from Admin → Festivals).
// They are never deleted for "no visitors" — out of season nobody searches.

export interface OccasionDate { name: string; date: string } // YYYY-MM-DD
export const SEASON_BEFORE = 60; // days before the festival the page goes live (Google needs time to find it)
export const SEASON_AFTER = 7; // days after the festival it switches off

// Words that tie a page (by its address or heading) to a festival name.
const LINKS: [RegExp, RegExp][] = [
  [/christmas|xmas/, /christmas/i],
  [/new-?year|nye/, /new year/i],
  [/diwali|deepavali/, /diwali/i],
  [/\beid\b|eid-|ramadan|iftar|nikah-eid/, /eid|ramadan/i],
  [/valentine/, /valentine/i],
  [/mothers?-?day|mother/, /mother/i],
  [/fathers?-?day|father/, /father/i],
  [/halloween/, /halloween/i],
  [/easter/, /easter/i],
  [/thanksgiving/, /thanksgiving/i],
  [/black-friday|cyber-monday|white-friday/, /black friday|cyber monday|white friday/i],
  [/holi\b|holi-/, /\bholi\b/i],
  [/pongal|sankranti/, /pongal|sankranti/i],
  [/onam/, /onam/i],
  [/navratri|durga|dussehra/, /navratri|durga|dussehra/i],
  [/ganesh/, /ganesh/i],
  [/raksha|rakhi/, /raksha|rakhi/i],
  [/uae-national-day|national-day/, /national day/i],
  [/independence/, /independence/i],
  [/lunar|chinese-new-year/, /lunar|chinese new year/i],
  [/hanukkah/, /hanukkah/i],
];

const toDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();

/** The festival dates a page belongs to (empty = not a seasonal page). */
export function festivalDates(slug: string, h1: string, occasions: OccasionDate[]): string[] {
  const text = `${slug} ${h1.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const link = LINKS.find(([page]) => page.test(text));
  if (!link) return [];
  return occasions.filter((o) => link[1].test(o.name)).map((o) => o.date).sort();
}

/** In season = within [date − 60 days, date + 7 days] of any of its dates. */
export function seasonState(dates: string[], today = new Date()): { seasonal: boolean; inSeason: boolean; next: string | null; offAfter: string | null } {
  if (!dates.length) return { seasonal: false, inSeason: false, next: null, offAfter: null };
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const day = 86400000;
  for (const d of dates) {
    const at = toDay(d);
    if (t >= at - SEASON_BEFORE * day && t <= at + SEASON_AFTER * day) {
      return { seasonal: true, inSeason: true, next: d, offAfter: new Date(at + SEASON_AFTER * day).toISOString().slice(0, 10) };
    }
  }
  const upcoming = dates.find((d) => toDay(d) > t) || null;
  return { seasonal: true, inSeason: false, next: upcoming ? new Date(toDay(upcoming) - SEASON_BEFORE * day).toISOString().slice(0, 10) : null, offAfter: null };
}
