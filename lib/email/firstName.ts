// Picks a real-looking first name for email greetings. The profiles row
// defaults its name to the email's local part (e.g. "tony.p92") when the
// user never typed one, and greeting someone as "Dear tony.p92" reads
// worse than a plain "Hello," -- so that default is treated as no name.
export function firstNameFor(profileName: string | null | undefined, email: string | null | undefined): string {
  const name = (profileName || '').trim();
  if (!name) return '';
  const localPart = (email || '').split('@')[0].toLowerCase();
  if (name.toLowerCase() === localPart) return '';
  const first = name.split(/\s+/)[0];
  // Built from a string: tsconfig targets ES2017, where TypeScript rejects
  // \p{..} regex literals, but every runtime this site uses supports it.
  if (!new RegExp("^\\p{L}[\\p{L}'-]{0,39}$", 'u').test(first)) return '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}
