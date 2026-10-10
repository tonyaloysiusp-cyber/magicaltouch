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

import { useEffect, useState } from 'react';
import { markFontUnavailable, isFontUnavailable, subscribeFontAvailability } from './fontAvailability';

export interface GoogleFontDef {
  family: string;
  category: 'Classic' | 'Sans Serif' | 'Serif' | 'Display' | 'Script' | 'Monospace' | 'World';
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

  // Even more sans serif
  { family: 'Nunito Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Cabin', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Asap', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Overpass', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Exo 2', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Titillium Web', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Hind', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Inter Tight', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Public Sans', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Be Vietnam Pro', category: 'Sans Serif', weights: [400, 700] },
  { family: 'Sarabun', category: 'Sans Serif', weights: [400, 700] },

  // Even more serif
  { family: 'Arvo', category: 'Serif', weights: [400, 700] },
  { family: 'Noto Serif', category: 'Serif', weights: [400, 700] },
  { family: 'Vidaloka', category: 'Serif', weights: [400] },
  { family: 'Playfair Display SC', category: 'Serif', weights: [400, 700] },
  { family: 'Cinzel', category: 'Serif', weights: [400, 700] },
  { family: 'Marcellus', category: 'Serif', weights: [400] },
  { family: 'Josefin Slab', category: 'Serif', weights: [400, 700] },

  // Even more display / headline
  { family: 'Rubik Mono One', category: 'Display', weights: [400] },
  { family: 'Yeseva One', category: 'Display', weights: [400] },
  { family: 'Special Elite', category: 'Display', weights: [400] },
  { family: 'Unica One', category: 'Display', weights: [400] },
  { family: 'Monoton', category: 'Display', weights: [400] },
  { family: 'Faster One', category: 'Display', weights: [400] },
  { family: 'Press Start 2P', category: 'Display', weights: [400] },
  { family: 'Orbitron', category: 'Display', weights: [400, 700] },
  { family: 'Audiowide', category: 'Display', weights: [400] },

  // Even more script / handwriting
  { family: 'Tangerine', category: 'Script', weights: [400, 700] },
  { family: 'Mrs Saint Delafield', category: 'Script', weights: [400] },
  { family: 'Kaushan Script', category: 'Script', weights: [400] },
  { family: 'Norican', category: 'Script', weights: [400] },
  { family: 'Mea Culpa', category: 'Script', weights: [400] },
  { family: 'Homemade Apple', category: 'Script', weights: [400] },

  // Even more monospace
  { family: 'VT323', category: 'Monospace', weights: [400] },
  { family: 'Silkscreen', category: 'Monospace', weights: [400, 700] },
  // World scripts: used when a design is translated (Arabic, Indian,
  // East-Asian, Hebrew, Thai…), so the words show and export correctly.
  { family: 'Cairo', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Tajawal', category: 'World', weights: [200, 300, 400, 500, 700, 800, 900] },
  { family: 'Vazirmatn', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Naskh Arabic', category: 'World', weights: [400, 500, 600, 700] },
  { family: 'Amiri', category: 'World', weights: [400, 700] },
  { family: 'Lalezar', category: 'World', weights: [400] },
  { family: 'Reem Kufi', category: 'World', weights: [400, 500, 600, 700] },
  { family: 'Aref Ruqaa', category: 'World', weights: [400, 700] },
  { family: 'Noto Nastaliq Urdu', category: 'World', weights: [400, 500, 600, 700] },
  { family: 'Frank Ruhl Libre', category: 'World', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Secular One', category: 'World', weights: [400] },
  { family: 'Mukta', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Noto Serif Devanagari', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Rozha One', category: 'World', weights: [400] },
  { family: 'Hind Siliguri', category: 'World', weights: [300, 400, 500, 600, 700] },
  { family: 'Noto Serif Bengali', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Galada', category: 'World', weights: [400] },
  { family: 'Atma', category: 'World', weights: [300, 400, 500, 600, 700] },
  { family: 'Noto Sans Tamil', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Tamil', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Catamaran', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Kavivanar', category: 'World', weights: [400] },
  { family: 'Noto Sans Malayalam', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Malayalam', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Gayathri', category: 'World', weights: [100, 400, 700] },
  { family: 'Chilanka', category: 'World', weights: [400] },
  { family: 'Noto Sans Telugu', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Telugu', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Ramaraja', category: 'World', weights: [400] },
  { family: 'Ponnala', category: 'World', weights: [400] },
  { family: 'Noto Sans Kannada', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Kannada', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Baloo Tamma 2', category: 'World', weights: [400, 500, 600, 700, 800] },
  { family: 'Akaya Kanadaka', category: 'World', weights: [400] },
  { family: 'Noto Sans Gujarati', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Gujarati', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Baloo Bhai 2', category: 'World', weights: [400, 500, 600, 700, 800] },
  { family: 'Farsan', category: 'World', weights: [400] },
  { family: 'Noto Sans Gurmukhi', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Gurmukhi', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Baloo Paaji 2', category: 'World', weights: [400, 500, 600, 700, 800] },
  { family: 'Noto Sans Sinhala', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Sinhala', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Yaldevi', category: 'World', weights: [200, 300, 400, 500, 600, 700] },
  { family: 'Noto Sans Thai', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif Thai', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Kanit', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Charm', category: 'World', weights: [400, 700] },
  { family: 'Noto Sans SC', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif SC', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'ZCOOL QingKe HuangYou', category: 'World', weights: [400] },
  { family: 'Ma Shan Zheng', category: 'World', weights: [400] },
  { family: 'Noto Sans TC', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif TC', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'LXGW WenKai TC', category: 'World', weights: [300, 400, 700] },
  { family: 'Noto Sans JP', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif JP', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Dela Gothic One', category: 'World', weights: [400] },
  { family: 'Yuji Syuku', category: 'World', weights: [400] },
  { family: 'Noto Sans KR', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Noto Serif KR', category: 'World', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Black Han Sans', category: 'World', weights: [400] },
  { family: 'Nanum Pen Script', category: 'World', weights: [400] },
  { family: 'Noto Sans', category: 'World', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
];

// Every weight Google Fonts ships for the families that have more than
// regular and bold (thin … black), so the weight menu offers them all.
const MORE_WEIGHTS: Record<string, number[]> = {"Poppins": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Montserrat": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Inter": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Roboto": [100, 300, 400, 500, 700, 900], "Open Sans": [300, 400, 500, 600, 700, 800], "Lato": [100, 300, 400, 700, 900], "Raleway": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Nunito": [200, 300, 400, 500, 600, 700, 800, 900], "Work Sans": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Rubik": [300, 400, 500, 600, 700, 800, 900], "Manrope": [200, 300, 400, 500, 600, 700, 800], "DM Sans": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Sora": [100, 200, 300, 400, 500, 600, 700, 800], "Outfit": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Urbanist": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Quicksand": [300, 400, 500, 600, 700], "Comfortaa": [300, 400, 500, 600, 700], "Josefin Sans": [100, 200, 300, 400, 500, 600, 700], "Playfair Display": [400, 500, 600, 700, 800, 900], "Merriweather": [300, 400, 700, 900], "Lora": [400, 500, 600, 700], "Cormorant Garamond": [300, 400, 500, 600, 700], "EB Garamond": [400, 500, 600, 700, 800], "Bitter": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Oswald": [200, 300, 400, 500, 600, 700], "Baloo 2": [400, 500, 600, 700, 800], "Dancing Script": [400, 500, 600, 700], "Caveat": [400, 500, 600, 700], "Mulish": [200, 300, 400, 500, 600, 700, 800, 900], "Barlow": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Karla": [200, 300, 400, 500, 600, 700, 800], "Heebo": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Prompt": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Plus Jakarta Sans": [200, 300, 400, 500, 600, 700, 800], "Figtree": [300, 400, 500, 600, 700, 800, 900], "Epilogue": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Red Hat Display": [300, 400, 500, 600, 700, 800, 900], "Fredoka": [300, 400, 500, 600, 700], "Zilla Slab": [300, 400, 500, 600, 700], "Spectral": [200, 300, 400, 500, 600, 700, 800], "Vollkorn": [400, 500, 600, 700, 800, 900], "Nunito Sans": [200, 300, 400, 500, 600, 700, 800, 900], "Cabin": [400, 500, 600, 700], "Asap": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Overpass": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Exo 2": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Titillium Web": [200, 300, 400, 600, 700, 900], "Hind": [300, 400, 500, 600, 700], "Inter Tight": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Public Sans": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Be Vietnam Pro": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Sarabun": [100, 200, 300, 400, 500, 600, 700, 800], "Noto Serif": [100, 200, 300, 400, 500, 600, 700, 800, 900], "Cinzel": [400, 500, 600, 700, 800, 900], "Josefin Slab": [100, 200, 300, 400, 500, 600, 700], "JetBrains Mono": [100, 200, 300, 400, 500, 600, 700, 800], "IBM Plex Mono": [100, 200, 300, 400, 500, 600, 700], "Roboto Mono": [100, 200, 300, 400, 500, 600, 700], "Fira Code": [300, 400, 500, 600, 700], "Source Code Pro": [200, 300, 400, 500, 600, 700, 800, 900], "Inconsolata": [200, 300, 400, 500, 600, 700, 800, 900], "Arial": [400, 700]};
GOOGLE_FONTS.forEach((f) => {
  const w = MORE_WEIGHTS[f.family];
  if (w) f.weights = w;
});

export const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi bold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

export const GOOGLE_FONT_NAMES = GOOGLE_FONTS.map((f) => f.family);

export function googleFontByName(family: string): GoogleFontDef | undefined {
  return GOOGLE_FONTS.find((f) => f.family === family);
}

// The font picker's real source of truth: the curated list minus
// whatever's actually been detected as broken this session (see
// ensureFontLoaded/validateAllFonts in fontAvailability.ts). Re-renders
// automatically the moment a font is marked unavailable, so a broken
// entry disappears from the dropdown instead of lingering as a dead
// selectable option.
export function useAvailableGoogleFonts(): GoogleFontDef[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribeFontAvailability(() => forceUpdate((v) => v + 1)), []);
  return GOOGLE_FONTS.filter((f) => !isFontUnavailable(f.family));
}

// Every font in the picker — aliased classics AND the ~86 direct Google
// Fonts alike — is declared via @font-face rules sourced from this app's
// own same-origin /api/font-file proxy, rather than a <link> straight to
// fonts.googleapis.com/fonts.gstatic.com.
//
// This used to be a two-tier system: the 5 aliased classics went through
// the proxy (since Google's API doesn't know names like "Arial"), while
// the other ~86 families loaded directly from Google's CDN via one big
// <link rel="stylesheet">. That direct link is exactly the kind of
// third-party, cross-site request that ad blockers, tracker blockers
// (uBlock Origin, Brave, Firefox Enhanced Tracking Protection) and many
// corporate/school network filters block by default — Google Fonts is
// one of the most commonly blocklisted font CDNs precisely because it's
// a cross-origin request every visitor's browser makes. Any visitor with
// one of those active would see EVERY direct font silently fall back to
// the browser default, while only the 5 proxied aliases kept working —
// "some fonts just don't show up" with no error anywhere. Routing every
// family through this app's own domain (same origin as the editor
// itself) means there's nothing third-party left to block.
//
// Each weight gets both a normal and an italic @font-face (the proxy's
// own `italic=1` param). A family with no real italic or bold cut just
// gets a proxy response for a weight/style Google's own API silently
// omits — handled the same as any other 404 by ensureFontLoaded's catch,
// falling back to the nearest weight the family actually has.
export function allFontFacesCSS(): string {
  return GOOGLE_FONTS.flatMap((f) => {
    const sourceFamily = f.googleFamily || f.family;
    // World-script fonts have no italic cut: no italic face is declared,
    // so the browser slants the regular one when text is set in italic.
    if (f.category === 'World')
      return f.weights.map(
        (w) => `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  font-style: normal;
  src: url('/api/font-file?family=${encodeURIComponent(sourceFamily)}&weight=${w}') format('truetype');
  font-display: swap;
}`
      );
    return f.weights.flatMap((w) => [
      `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  font-style: normal;
  src: url('/api/font-file?family=${encodeURIComponent(sourceFamily)}&weight=${w}') format('truetype');
  font-display: swap;
}`,
      `@font-face {
  font-family: '${f.family}';
  font-weight: ${w};
  font-style: italic;
  src: url('/api/font-file?family=${encodeURIComponent(sourceFamily)}&weight=${w}&italic=1') format('truetype');
  font-display: swap;
}`,
    ]);
  }).join('\n');
}

// Declaring an @font-face rule above does NOT actually fetch its bytes —
// the browser only downloads a webfont once something on the page is
// rendered WITH that font, and even
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
//
// Also doubles as the font-availability check: a failure (or a load that
// resolves without the font actually being usable) on the plain REGULAR
// weight is a reliable signal the family itself is broken, so it gets
// marked unavailable and the picker stops offering it. A family that's
// merely missing a bold or italic cut is normal (most display/script
// fonts only ship 400) and is handled by falling back to the nearest
// weight that exists, not by hiding the whole family — so only the
// plain 400/non-italic check ever marks something unavailable.
// The closest weight a family actually has (e.g. 600 → 700 for a family
// that only ships 400 and 700).
export function nearestWeight(fontFamily: string, weight: number | string = 400): number {
  const want = typeof weight === 'number' ? weight : weight === 'bold' ? 700 : parseInt(String(weight), 10) || 400;
  const def = googleFontByName(fontFamily);
  const list = def?.weights?.length ? def.weights : [400, 700];
  return list.reduce((best, w) => (Math.abs(w - want) < Math.abs(best - want) ? w : best), list[0]);
}

// After web fonts arrive, Fabric must forget the letter widths it measured
// with the fallback font, or wrapping, justified text and the cursor stay
// wrong until the text is edited.
export function refreshTextMetrics(canvas: any) {
  const F = typeof window !== 'undefined' ? (window as any).fabric : null;
  if (!canvas) return;
  try {
    F?.util?.clearFabricFontCache?.();
  } catch {
    // older Fabric: nothing to clear
  }
  const visit = (o: any) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach(visit);
    if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
      o.initDimensions?.();
      o.setCoords?.();
      o.dirty = true;
    }
  };
  canvas.getObjects?.().forEach(visit);
  // Text frames re-flow with the real letter widths (lib/editor/textFrames.ts).
  canvas.fire?.('text:metrics');
  canvas.requestRenderAll?.();
}

export function ensureFontLoaded(fontFamily: string, weight: number | string = 400, italic = false): Promise<void> {
  if (typeof document === 'undefined' || !(document as any).fonts?.load) return Promise.resolve();
  const w = nearestWeight(fontFamily, weight);
  const spec = `${italic ? 'italic ' : ''}${w} 16px "${fontFamily}"`;
  const isAvailabilityProbe = !italic && w === 400;
  return (document as any).fonts
    .load(spec)
    .then(() => {
      if (isAvailabilityProbe && !(document as any).fonts.check(spec)) {
        markFontUnavailable(fontFamily);
      }
    })
    .catch(() => {
      if (isAvailabilityProbe) markFontUnavailable(fontFamily);
    });
}

// Kicks off a background availability check for every font in the picker
// — fire-and-forget, non-blocking, so a broken family (a typo'd name, a
// family Google has since renamed/removed, a proxy fetch that 404s) gets
// detected and pruned from the picker even if the user never happens to
// select it. Cheap after the first run in a session: every request goes
// through this app's own cached /api/font-file proxy, not a fresh
// third-party fetch each time.
export function validateAllFonts(): void {
  if (typeof document === 'undefined') return;
  // World-script fonts (Chinese, Japanese… files are many megabytes) are
  // only loaded when a design actually uses them, never all up front.
  GOOGLE_FONTS.forEach((f) => {
    if (f.category !== 'World') ensureFontLoaded(f.family, 400, false);
  });
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
  // Every family / weight / style actually used — including formatting
  // given to single letters.
  const wanted = new Map<string, { family: string; weight: number | string; italic: boolean }>();
  const add = (family: any, weight: any, style: any) => {
    if (typeof family !== 'string' || !family) return;
    const w = weight ?? 400;
    const it = style === 'italic';
    wanted.set(`${family}|${w}|${it}`, { family, weight: w, italic: it });
  };
  const visit = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.fontFamily === 'string') {
      add(obj.fontFamily, obj.fontWeight, obj.fontStyle);
      add(obj.fontFamily, 400, 'normal');
      const styles = obj.styles;
      if (styles && typeof styles === 'object') {
        const rows = Array.isArray(styles) ? styles : Object.values(styles);
        rows.forEach((row: any) => {
          // Fabric 5 keeps letters as {line: {char: style}}; newer saves as [{start,end,style}].
          const cells = Array.isArray(row) ? row.map((r: any) => r?.style || r) : Object.values(row || {});
          cells.forEach((st: any) => st && add(st.fontFamily || obj.fontFamily, st.fontWeight ?? obj.fontWeight, st.fontStyle ?? obj.fontStyle));
        });
      }
    }
    if (Array.isArray(obj.objects)) obj.objects.forEach(visit);
  };
  visit(json);
  if (wanted.size === 0) return Promise.resolve();
  return Promise.all([...wanted.values()].map((f) => ensureFontLoaded(f.family, f.weight, f.italic))).then(() => undefined);
}
