// ---------------------------------------------------------------------
// lib/editor/pdfFonts.ts
// Embeds the actual Google Font a text object uses into a jsPDF document,
// instead of the old behavior of collapsing every font family down to
// whichever of jsPDF's three built-in fonts (helvetica/times/courier)
// looked closest by name. jsPDF ships those three and nothing else — any
// other family has to be registered with real glyph data via addFont(),
// or the exported PDF silently shows the wrong typeface.
//
// The TTF bytes come from /api/font-file, a same-origin proxy in front
// of Google Fonts (see that route for why it has to be server-side).
// ---------------------------------------------------------------------

import { googleFontByName } from './googleFonts';

export interface RegisteredPdfFont {
  // The name jsPDF knows this font by — always registered under all four
  // style slots ('normal' | 'bold' | 'italic' | 'bolditalic') so
  // pdf.setFont(name, anyOfThose) never fails to resolve, even though a
  // family without a real bold/italic cut reuses its regular glyph data
  // for those slots. That's still a correct typeface, which is the part
  // that was actually broken — a faked weight/slant is a much smaller gap.
  name: string;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

async function fetchFontBase64(family: string, weight: 400 | 700): Promise<string | null> {
  try {
    const res = await fetch(`/api/font-file?family=${encodeURIComponent(family)}&weight=${weight}`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return arrayBufferToBase64(buf);
  } catch {
    return null;
  }
}

// One export call may render many objects using the same font — cache by
// family so each is only fetched and registered with jsPDF once.
type FontCache = Map<string, RegisteredPdfFont | null>;

export function createPdfFontCache(): FontCache {
  return new Map();
}

// Registers `family` with the given jsPDF document if it's one of our
// curated Google Fonts, fetching bold glyphs too when the design actually
// uses bold text for it and the family ships a real bold cut. Returns
// null for anything else (system fonts, unrecognized names), so the
// caller falls back to the old family-name approximation.
export async function ensurePdfFont(
  pdf: any,
  cache: FontCache,
  family: string | undefined,
  needsBold: boolean
): Promise<RegisteredPdfFont | null> {
  const key = family || '';
  if (cache.has(key)) return cache.get(key)!;

  const def = googleFontByName(key);
  if (!def) {
    cache.set(key, null);
    return null;
  }

  const regularB64 = await fetchFontBase64(def.family, 400);
  if (!regularB64) {
    cache.set(key, null);
    return null;
  }

  const canBold = needsBold && def.weights.includes(700);
  const boldB64 = canBold ? await fetchFontBase64(def.family, 700) : null;

  const vfsName = `${def.family.replace(/\s+/g, '-')}.ttf`;
  const boldVfsName = boldB64 ? `${def.family.replace(/\s+/g, '-')}-Bold.ttf` : vfsName;
  const pdfName = def.family;

  pdf.addFileToVFS(vfsName, regularB64);
  pdf.addFont(vfsName, pdfName, 'normal');
  pdf.addFont(vfsName, pdfName, 'italic');

  if (boldB64) {
    pdf.addFileToVFS(boldVfsName, boldB64);
    pdf.addFont(boldVfsName, pdfName, 'bold');
    pdf.addFont(boldVfsName, pdfName, 'bolditalic');
  } else {
    // No real bold cut available — reuse the regular glyphs so
    // setFont(name, 'bold') still resolves to the *correct family*
    // rather than falling back to a generic default.
    pdf.addFont(vfsName, pdfName, 'bold');
    pdf.addFont(vfsName, pdfName, 'bolditalic');
  }

  const result: RegisteredPdfFont = { name: pdfName };
  cache.set(key, result);
  return result;
}
