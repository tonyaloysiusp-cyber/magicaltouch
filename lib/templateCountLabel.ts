/** 1868 → "1,850+": rounded down to the nearest 50 (shared by server and browser). */
export const roundedCountLabel = (n: number) => (n >= 100 ? `${(Math.floor(n / 50) * 50).toLocaleString('en-US')}+` : n > 0 ? `${n}+` : '');
