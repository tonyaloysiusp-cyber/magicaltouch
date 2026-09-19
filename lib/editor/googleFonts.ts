// ---------------------------------------------------------------------
// lib/editor/googleFonts.ts
// A curated set of free, open-license (SIL OFL) Google Fonts offered
// alongside the original system font list. These are real webfonts
// loaded from Google's CDN rather than OS-installed font names, which
// silently vary — or are simply missing — across Windows/Mac/Linux/
// mobile, and previously caused the editor's canvas (and any exported
// PDF) to quietly substitute a different font than the one picked.
// ---------------------------------------------------------------------

export interface GoogleFontDef {
  family: string;
  category: 'Sans Serif' | 'Serif' | 'Display' | 'Script' | 'Monospace';
  // Weights this family is requested at. 400 (regular) always renders;
  // 700 (bold) is only listed for families that actually ship a bold cut
  // — asking Google's API for a weight a family doesn't have returns
  // nothing useful, so callers should treat an unlisted weight as
  // "fall back to 400".
  weights: number[];
}

export const GOOGLE_FONTS: GoogleFontDef[] = [
  // Sans serif
  { family: 'Poppins', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Montserrat', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Inter', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Roboto', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Open Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Lato', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Raleway', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Nunito', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Work Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Rubik', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Manrope', category: 'Sans Serif', weights: [400, 700] },
  { family: 'DM Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Sora', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Outfit', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Urbanist', category: 'Sans Serif', weights: [400, 700] },

  // Serif
  { family: 'Playfair Display', category: 'Serif', weights: [400, 700] },
  { family: 'Merriweather', category: 'Serif', weights: [400, 700] },
  { family: 'Lora', category: 'Serif', weights: [400, 700] },
  { family: 'PT Serif', category: 'Serif', weights: [400, 700] },
  { family: 'Cormorant Garamond', category: 'Serif', weights: [400, 700] },
  { family: 'Libre Baskerville', category: 'Serif', weights: [400, 700] },
  { family: 'Crimson Text', category: 'Serif', weights: [400, 700] },
  { family: 'EB Garamond', category: 'Serif', weights: [400, 700] },
  { family: 'Bitter', category: 'Serif', weights: [400, 700] },
  { family: 'Source Serif Pro', category: 'Serif', weights: [400, 700] },

  // Display / headline
  { family: 'Bebas Neue', category: 'Display', weights: [400] },
  { family: 'Anton', category: 'Display', weights: [400] },
  { family: 'Oswald', category: 'Display', weights: [400, 700] },
  { family: 'Archivo Black', category: 'Display', weights: [400] },
  { family: 'Righteous', category: 'Display', weights: [400] },
  { family: 'Alfa Slab One', category: 'Display', weights: [400] },
  { family: 'Passion One', category: 'Display', weights: [400, 700] },
  { family: 'Fjalla One', category: 'Display', weights: [400] },
  { family: 'Staatliches', category: 'Display', weights: [400] },
  { family: 'Baloo 2', category: 'Display', weights: [400, 700] },

  // Script / handwriting
  { family: 'Pacifico', category: 'Script', weights: [400] },
  { family: 'Dancing Script', category: 'Script', weights: [400, 700] },
  { family: 'Caveat', category: 'Script', weights: [400, 700] },
  { family: 'Great Vibes', category: 'Script', weights: [400] },
  { family: 'Sacramento', category: 'Script', weights: [400] },
  { family: 'Satisfy', category: 'Script', weights: [400] },
  { family: 'Kalam', category: 'Script', weights: [400, 700] },
  { family: 'Shadows Into Light', category: 'Script', weights: [400] },
  { family: 'Amatic SC', category: 'Script', weights: [400, 700] },
  { family: 'Permanent Marker', category: 'Script', weights: [400] },

  // Monospace
  { family: 'Space Mono', category: 'Monospace', weights: [400, 700] },
  { family: 'JetBrains Mono', category: 'Monospace', weights: [400, 700] },
  { family: 'IBM Plex Mono', category: 'Monospace', weights: [400, 700] },
  { family: 'Roboto Mono', category: 'Monospace', weights: [400, 700] },
  { family: 'Fira Code', category: 'Monospace', weights: [400, 700] },
];

export const GOOGLE_FONT_NAMES = GOOGLE_FONTS.map((f) => f.family);

export function googleFontByName(family: string): GoogleFontDef | undefined {
  return GOOGLE_FONTS.find((f) => f.family === family);
}

// One stylesheet request that loads every listed family (at its real
// weights) from Google's CDN, for accurate in-canvas text rendering —
// not just an approximation via whatever similarly-named font the OS
// happens to have installed.
export function googleFontsStylesheetHref(): string {
  const parts = GOOGLE_FONTS.map((f) => `family=${encodeURIComponent(f.family)}:wght@${f.weights.join(';')}`);
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}
