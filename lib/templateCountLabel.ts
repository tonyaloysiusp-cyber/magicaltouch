// How the live template count is written on the site (Admin → Templates →
// "Template count on the site"). Shared by server and browser.
//   rounded50   5,470 → "5,450+"  (default: honest, never over-claims)
//   rounded100  5,470 → "5,400+"
//   exact       5,470 → "5,470"
export type CountStyle = 'rounded50' | 'rounded100' | 'exact';
export const COUNT_STYLES: { id: CountStyle; label: string }[] = [
  { id: 'rounded50', label: 'Rounded down to 50 — e.g. 5,450+' },
  { id: 'rounded100', label: 'Rounded down to 100 — e.g. 5,400+' },
  { id: 'exact', label: 'Exact number — e.g. 5,470' },
];
export const parseCountStyle = (v: unknown): CountStyle => (v === 'exact' || v === 'rounded100' ? v : 'rounded50');

export function countLabel(n: number, style: CountStyle = 'rounded50'): string {
  if (!(n > 0)) return '';
  if (style === 'exact') return n.toLocaleString('en-US');
  const step = style === 'rounded100' ? 100 : 50;
  return n >= step * 2 ? `${(Math.floor(n / step) * step).toLocaleString('en-US')}+` : `${n}+`;
}

/** 1868 → "1,850+": rounded down to the nearest 50. */
export const roundedCountLabel = (n: number) => countLabel(n, 'rounded50');
