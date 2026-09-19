// ---------------------------------------------------------------------
// lib/editor/googleFonts.ts
// Every font in the editor's font picker, all backed by real, free,
// open-license (SIL OFL) webfont files — no OS-installed "system font"
// names left in the list. Those used to silently vary (or be missing
// entirely) across Windows/Mac/Linux/mobile, and — since they weren't
// real webfonts — always fell back to the wrong typeface on PDF export
// too, no matter what the canvas showed.
//
// A few familiar classic names (Arial, Times New Roman, ...) are kept
// because people search for them out of habit, but each is an *alias*:
// its `googleFamily` points at a real, open, metric-compatible Google
// Fonts replacement (Arimo/Tinos/Cousine/Gelasio — the same fonts
// ChromeOS itself uses to stand in for the proprietary originals), so
// the name on screen is familiar but the glyphs are real and embeddable.
// Names with no reasonable open equivalent (Impact, Trebuchet MS,
// Verdana) were dropped rather than kept as fonts that don't actually
// exist anywhere in this pipeline.
// ---------------------------------------------------------------------

export interface GoogleFontDef {
  family: string;
  category: 'Classic' | 'Sans Serif' | 'Serif' | 'Display' | 'Script' | 'Monospace';
  // Weights this family is requested at. 400 (regular) always renders;
  // 700 (bold) is only listed for families that actually ship a bold cut
  // — asking Google's API for a weight a family doesn't have returns
  // nothing useful, so callers should treat an unlisted weight as
  // "fall back to 400".
  weights: number[];
  // The real Google Fonts family name to fetch, when it differs from the
  // display name above (an alias). Omitted when family === googleFamily.
  googleFamily?: string;
}

export const GOOGLE_FONTS: GoogleFontDef[] = [
  // Classic names, aliased to real open metric-compatible replacements
  { family: 'Arial', category: 'Classic', weights: [400, 700], googleFamily: 'Arimo' },
  { family: 'Helvetica', category: 'Classic', weights: [400, 700], googleFamily: 'Arimo' },
  { family: 'Times New Roman', category: 'Classic', weights: [400, 700], googleFamily: 'Tinos' },
  { family: 'Georgia', category: 'Classic', weights: [400, 700], googleFamily: 'Gelasio' },
  { family: 'Courier New', category: 'Classic', weights: [400, 700], googleFamily: 'Cousine' },

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
  { family: 'Quicksand', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Comfortaa', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Josefin Sans', category: 'Sans Serif', weights: [400, 700] },

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
  { family: 'Abril Fatface', category: 'Display', weights: [400] },

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
  { family: 'Lobster', category: 'Script', weights: [400] },

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

// The subset that maps straight onto Google's CSS2 API by name — every
// non-aliased font. These load in one batched stylesheet request.
const DIRECT_FONTS = GOOGLE_FONTS.filter((f) => !f.googleFamily);

// The aliased classics (Arial, Times New Roman, ...): Google's CSS2 API
// doesn't know these names, so each needs its own @font-face rule that
// declares the *display* name but sources the real replacement font's
// bytes from this app's own /api/font-file proxy (the same TTF the PDF
// exporter embeds — canvas and export always show the same glyphs).
export function aliasedFontFaceCSS(): string {
  const aliased = GOOGLE_FONTS.filter((f) => f.googleFamily);
  return aliased
    .flatMap((f) =>
      f.weights.map(
        (w) => `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  src: url('/api/font-file?family=${encodeURIComponent(f.googleFamily!)}&weight=${w}') format('truetype');
  font-display: swap;
}`
      )
    )
    .join('\n');
}

// One stylesheet request that loads every directly-supported family (at
// its real weights) from Google's CDN, for accurate in-canvas text
// rendering — not just an approximation via whatever similarly-named
// font the OS happens to have installed.
export function googleFontsStylesheetHref(): string {
  const parts = DIRECT_FONTS.map((f) => `family=${encodeURIComponent(f.family)}:wght@${f.weights.join(';')}`);
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}
