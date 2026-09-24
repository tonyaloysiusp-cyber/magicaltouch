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
  { family: 'Source Code Pro', category: 'Monospace', weights: [400, 700] },
  { family: 'Inconsolata', category: 'Monospace', weights: [400, 700] },
  { family: 'Ubuntu Mono', category: 'Monospace', weights: [400, 700] },

  // More sans serif
  { family: 'Mulish', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Barlow', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Karla', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Heebo', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Prompt', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Plus Jakarta Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Figtree', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Epilogue', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Red Hat Display', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Fredoka', category: 'Sans Serif', weights: [400, 700] },

  // More serif
  { family: 'Zilla Slab', category: 'Serif', weights: [400, 700] },
  { family: 'Spectral', category: 'Serif', weights: [400, 700] },
  { family: 'Vollkorn', category: 'Serif', weights: [400, 700] },
  { family: 'Cardo', category: 'Serif', weights: [400, 700] },
  { family: 'Domine', category: 'Serif', weights: [400, 700] },

  // More display / headline
  { family: 'Bungee', category: 'Display', weights: [400] },
  { family: 'Black Ops One', category: 'Display', weights: [400] },
  { family: 'Rammetto One', category: 'Display', weights: [400] },
  { family: 'Luckiest Guy', category: 'Display', weights: [400] },
  { family: 'Bangers', category: 'Display', weights: [400] },
  { family: 'Chewy', category: 'Display', weights: [400] },

  // More script / handwriting
  { family: 'Parisienne', category: 'Script', weights: [400] },
  { family: 'Yellowtail', category: 'Script', weights: [400] },
  { family: 'Alex Brush', category: 'Script', weights: [400] },
  { family: 'Marck Script', category: 'Script', weights: [400] },
  { family: 'Handlee', category: 'Script', weights: [400] },
  { family: 'Indie Flower', category: 'Script', weights: [400] },
  { family: 'Patrick Hand', category: 'Script', weights: [400] },
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
//
// Each weight gets BOTH a normal and an italic @font-face (the proxy's
// own `italic=1` param already existed for this). Without the italic
// entry, toggling Italic on any of these families had no real slanted
// face to select — the browser just synthesized a fake oblique from the
// upright glyphs, forever, since nothing ever told it a real italic
// existed.
export function aliasedFontFaceCSS(): string {
  const aliased = GOOGLE_FONTS.filter((f) => f.googleFamily);
  return aliased
    .flatMap((f) =>
      f.weights.flatMap((w) => [
        `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  font-style: normal;
  src: url('/api/font-file?family=${encodeURIComponent(f.googleFamily!)}&weight=${w}') format('truetype');
  font-display: swap;
}`,
        `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  font-style: italic;
  src: url('/api/font-file?family=${encodeURIComponent(f.googleFamily!)}&weight=${w}&italic=1') format('truetype');
  font-display: swap;
}`,
      ])
    )
    .join('\n');
}

// Builds the `ital,wght@...` axis value for Google's CSS2 API: every
// weight at both italic=0 and italic=1, in the ascending (ital, weight)
// tuple order the API requires. A family with no real italic cut just
// gets no italic @font-face back (Google silently omits it, the same
// graceful behavior as requesting a weight a family doesn't have) — this
// never hurts, so it's requested unconditionally rather than tracked
// per-family.
function italWeightAxis(weights: number[]): string {
  const tuples = [...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)];
  return `ital,wght@${tuples.join(';')}`;
}

// One stylesheet request that loads every directly-supported family (at
// its real weights, both upright and italic) from Google's CDN, for
// accurate in-canvas text rendering — not just an approximation via
// whatever similarly-named font the OS happens to have installed, and not
// a fake browser-synthesized slant standing in for a real italic design.
export function googleFontsStylesheetHref(): string {
  const parts = DIRECT_FONTS.map((f) => `family=${encodeURIComponent(f.family)}:${italWeightAxis(f.weights)}`);
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}

// Declaring an @font-face (or listing a family in the Google Fonts <link>
// above) does NOT actually fetch its bytes — the browser only downloads a
// webfont once something on the page is rendered WITH that font, and even
// then the swap from a fallback happens invisibly to Fabric: a <canvas>
// text object drawn before the swap completes just stays wrong forever,
// since nothing tells Fabric to re-render once the real glyphs arrive.
// This is the actual root cause behind "editor shows the wrong font, but
// export is correct" — PDF export fetches the font's real bytes directly
// and always waits for that fetch, so it never hits this gap.
//
// Call this anywhere a font is about to be used for the first time in a
// session (a brand new text object, or text objects coming back from
// canvas_json on design/tab load) and re-render once it resolves, rather
// than trusting whatever the canvas already drew.
export function ensureFontLoaded(fontFamily: string, weight: number | string = 400, italic = false): Promise<void> {
  if (typeof document === 'undefined' || !(document as any).fonts?.load) return Promise.resolve();
  const w = typeof weight === 'number' ? (weight >= 600 ? 700 : 400) : weight === 'bold' ? 700 : 400;
  const spec = `${italic ? 'italic ' : ''}${w} 16px "${fontFamily}"`;
  return (document as any).fonts
    .load(spec)
    .then(() => undefined)
    .catch(() => undefined);
}

// Loads every distinct font family (at both weights and both italic
// states, to be safe) used by any text-bearing object in a Fabric canvas
// JSON payload — used right after loadFromJSON, before the first paint,
// so a design that uses a font nobody in this browser session has
// requested yet doesn't render with the wrong glyphs the first time it's
// opened. Loading a combination the restored objects don't actually use
// is harmless (the browser just caches it for later), so this over-loads
// rather than trying to track exactly which weight/style pairs appear.
export function ensureFontsLoadedForCanvasJSON(json: any): Promise<void> {
  if (typeof document === 'undefined' || !(document as any).fonts?.load) return Promise.resolve();
  const families = new Set<string>();
  const visit = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.fontFamily === 'string') families.add(obj.fontFamily);
    if (Array.isArray(obj.objects)) obj.objects.forEach(visit);
  };
  visit(json);
  if (families.size === 0) return Promise.resolve();
  const loads: Promise<void>[] = [];
  families.forEach((f) => {
    loads.push(ensureFontLoaded(f, 400));
    loads.push(ensureFontLoaded(f, 700));
    loads.push(ensureFontLoaded(f, 400, true));
    loads.push(ensureFontLoaded(f, 700, true));
  });
  return Promise.all(loads).then(() => undefined);
}
