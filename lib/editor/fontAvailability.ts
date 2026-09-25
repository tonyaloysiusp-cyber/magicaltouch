// ---------------------------------------------------------------------
// lib/editor/fontAvailability.ts
// Tracks which fonts have actually failed to load in this browser
// session, so the font picker can stop offering a font the moment it's
// proven broken instead of silently leaving a dead entry in the list
// forever. A tiny module-level store + pub-sub (not React state) since
// this needs to be readable/writable from a plain function
// (ensureFontLoaded, deep in googleFonts.ts) as well as subscribed to by
// React components (the font picker).
// ---------------------------------------------------------------------

const unavailable = new Set<string>();
const listeners = new Set<() => void>();

export function isFontUnavailable(family: string): boolean {
  return unavailable.has(family);
}

export function markFontUnavailable(family: string): void {
  if (unavailable.has(family)) return;
  unavailable.add(family);
  listeners.forEach((l) => l());
}

export function subscribeFontAvailability(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUnavailableFonts(): string[] {
  return Array.from(unavailable);
}
